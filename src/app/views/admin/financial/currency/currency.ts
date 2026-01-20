import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { ICurrency } from "../../../../shared/models/admin/currency.interface";
import { CurrencyService } from "../../../../shared/services/admin/currency.service";



@Component({
    selector: 'app-currency',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginatorModule],
    providers: [CurrencyService],
    templateUrl: './currency.html'
})
export class Currency {
    currencies = signal<ICurrency[]>([]);

    baseCurrencyForm = {
        code: '',
        name: '',
        symbol: '',
        exchangeRate: 1
    };

    currencyForm = {
        code: '',
        name: '',
        symbol: '',
        exchangeRate: ''
    };

    searchTerm = signal('');
    editingCurrency = signal<ICurrency | null>(null);
    isLoading = signal(false);
    isAddCurrency = signal(false);
    isUpdateCurrency = signal(false);
    isDeleteCurrency = signal(false);

    constructor(private currencyService: CurrencyService) {
    }
    ngOnInit(): void {
        this.getCurrencies();
    }
    getCurrencies(): void {
        this.isLoading.set(true);
        this.currencyService.getCurrencies().subscribe({
            next: (currencies) => {
                this.currencies.set(currencies.data);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error(error);
                this.isLoading.set(false);
            },
            complete: () => {
                this.isLoading.set(false);
            }
        });
    }
    filteredCurrencies() {
        const search = this.searchTerm().toLowerCase();
        if (!search) return this.currencies();
        return this.currencies().filter(c => 
            c.code.toLowerCase().includes(search) ||
            c.name.toLowerCase().includes(search) ||
            c.symbol.toLowerCase().includes(search)
        );
    }

    onSubmitBaseCurrency() {
        if (!this.baseCurrencyForm.code || !this.baseCurrencyForm.name || !this.baseCurrencyForm.symbol) {
            alert('Please fill in all required fields');
            return;
        }

        // Set all other currencies as non-base
        this.currencies().forEach(c => c.isBase = false);

        // Add new base currency
        const newCurrency: ICurrency = {
            id: this.currencies().length + 1,
            code: this.baseCurrencyForm.code.toUpperCase(),
            name: this.baseCurrencyForm.name,
            symbol: this.baseCurrencyForm.symbol,
            exchangeRate: 1,
            isBase: true
        };

        //this.currencies.set([...this.currencies(), newCurrency]);
        
        // Reset form
        this.baseCurrencyForm = { code: '', name: '', symbol: '', exchangeRate: 1 };
    }

    onSubmitCurrency() {
        if (!this.currencyForm.code || !this.currencyForm.name || !this.currencyForm.symbol || !this.currencyForm.exchangeRate) {
            alert('Please fill in all required fields');
            return;
        }

        if (this.editingCurrency()) {
            // Update existing currency
            // const updated = this.currencies().map(c => 
            //     c.id === this.editingCurrency()!.id
            //         ? { ...c, code: this.currencyForm.code.toUpperCase(), name: this.currencyForm.name, symbol: this.currencyForm.symbol, rate: parseFloat(this.currencyForm.rate) }
            //         : c
            // );
            // this.currencies.set(updated);
            this.currencyService.updateCurrency({
                id: this.editingCurrency()!.id,
                code: this.currencyForm.code.toUpperCase(),
                name: this.currencyForm.name,
                symbol: this.currencyForm.symbol,
                exchangeRate: parseFloat(this.currencyForm.exchangeRate),
                isBase: false
            }).subscribe({
                next: (currency) => {
                    this.currencies.set([...this.currencies(), currency.data]);
                },
                error: (error) => {
                    console.error(error);
                },
                complete: () => {
                    this.isUpdateCurrency.set(false);
                    this.getCurrencies();
                }
            });
            this.editingCurrency.set(null);
        } else {
            // Add new currency
            // const newCurrency: ICurrency = {
            //     id: this.currencies().length + 1,
            //     code: this.currencyForm.code.toUpperCase(),
            //     name: this.currencyForm.name,
            //     symbol: this.currencyForm.symbol,
            //     rate: parseFloat(this.currencyForm.rate),
            //     isBase: false
            // };
            // this.currencies.set([...this.currencies(), newCurrency]);
            this.currencyService.addCurrency({
                code: this.currencyForm.code.toUpperCase(),
                name: this.currencyForm.name,
                symbol: this.currencyForm.symbol,
                exchangeRate: parseFloat(this.currencyForm.exchangeRate),
                isBase: false
            }).subscribe({
                next: (currency) => {
                    this.currencies.set([...this.currencies(), currency.data]);
                },
                error: (error) => {
                    console.error(error);
                },
                complete: () => {
                    this.isAddCurrency.set(false);
                    this.getCurrencies();
                }
            });
        }

        // Reset form
        this.currencyForm = { code: '', name: '', symbol: '', exchangeRate: '' };
    }

    editCurrency(currency: ICurrency) {
        this.editingCurrency.set(currency);
        this.currencyForm = {
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            exchangeRate: currency.exchangeRate.toString()
        };
    }

    cancelEdit() {
        this.editingCurrency.set(null);
        this.currencyForm = { code: '', name: '', symbol: '', exchangeRate: '' };
    }

    deleteCurrency(currency: ICurrency) {
        if (currency.isBase) {
            alert('Cannot delete the base currency. Please set another currency as base first.');
            return;
        }

        if (confirm(`Are you sure you want to delete ${currency.name} (${currency.code})?`)) {
            this.currencies.set(this.currencies().filter(c => c.id !== currency.id));
        }
    }

    setAsBase(currency: ICurrency) {
        if (confirm(`Set ${currency.name} (${currency.code}) as the base currency?`)) {
            const updated = this.currencies().map(c => ({
                ...c,
                isBase: c.id === currency.id,
                exchangeRate: c.id === currency.id ? 1 : (c.exchangeRate / currency.exchangeRate)
            }));
            this.currencies.set(updated);
        }
    }
}
import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { CurrencyService } from "../../../shared/services/admin/currency.service";
import { ICurrency } from "../../../shared/models/admin/currency.interface";
import { Select } from "primeng/select";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'taleemiyat-currency-selector',
    templateUrl: './currency-selector.html',
    imports: [CommonModule, Select, FormsModule],
    providers: [CurrencyService]
})
export class CurrencySelector {
    currencies = signal<ICurrency[]>([]);
    selectedCurrency = signal<string | null>(null);
    constructor(
        private currencyService: CurrencyService
    ) {
        this.getCurrencies();
        this.listenToCurrencyChange();
    }
    getCurrencies() {
        this.currencyService.getCurrencies().subscribe({
            next: (currencies) => {
                this.currencies.set(currencies.data);
                const dd = document.cookie.split('; currency=')
                const currencyFromCookie = dd.pop()?.split(';').shift() ?? 'USD';
                this.selectedCurrency.set(currencyFromCookie);
                localStorage.setItem('currencies', JSON.stringify(currencies.data));
            },
            error: (error) => {
                console.error(error);
            },
            complete: () => {
                console.log('complete');
            }
        });
    }
    onCurrencyChange(event: any) {
        document.cookie = `currency=${event}; path=/; samesite=Lax;`;
    }


    listenToCurrencyChange() {
        setInterval(() => {
           const currency = this.currencyService.getSelectedCurrency();
           if(currency !== this.selectedCurrency()) {
            this.selectedCurrency.set(currency);
           }
        }, 1000);
    }
}
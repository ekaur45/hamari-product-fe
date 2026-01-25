import { Pipe, PipeTransform } from "@angular/core";
import { CurrencyService } from "../services/admin/currency.service";
import { ICurrency } from "../models/admin/currency.interface";

@Pipe({
    name: 'taleemiyatCurrency',
    standalone: true
})
export class CurrencyPipe implements PipeTransform {
    constructor(private currencyService: CurrencyService) {
    }
    transform(value: number): string {
        if(!value) return '0.00';
        const currency = this.currencyService.getSelectedCurrency();
        const cachedCurrency = this.currencyService.getCachedCurrency(currency);
        // if the selected currency is base currency, return the value
        if(cachedCurrency.find((c: ICurrency) => c.code === currency && c.isBase)) {
            return Number(value).toFixed(2);
        }
        const getSelectedCurrencySymbol = cachedCurrency.find((c: ICurrency) => c.code === currency)?.symbol ?? '';
        // if the selected currency is not base currency, return the value in the selected currency
        const exchangeRate = cachedCurrency.find((c: ICurrency) => c.code === currency)?.exchangeRate ?? 1;
        return (Number(value) * exchangeRate).toFixed(2);
    }
}
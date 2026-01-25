import { Injectable } from "@angular/core";
import { ApiService } from "../../../utils";
import { ICurrency } from "../../models/admin/currency.interface";

@Injectable({
    providedIn: 'root'
})
export class CurrencyService {
    constructor(private api: ApiService) { }
    getCurrencies() {
        return this.api.get<ICurrency[]>('/currencies/list');
    }
    addCurrency(currency: ICurrency) {
        return this.api.post<ICurrency>('/currencies/create', currency);
    }
    updateCurrency(currency: ICurrency) {
        return this.api.put<ICurrency>('/currencies/update/' + currency.id, currency);
    }


    getSelectedCurrency() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; currency=`);
        let currencyFromCookie = "USD";
        if (parts.length === 2) 
            currencyFromCookie = parts.pop()?.split(';').shift() ?? "USD";
        return currencyFromCookie;
    }
    getCachedCurrency(code: string) {
        this.getCurrencies().subscribe((currencies) => {
            localStorage.setItem('currencies', JSON.stringify(currencies.data));
        });
        return JSON.parse(localStorage.getItem('currencies') ?? '[]') ?? [] as ICurrency[];
    }
}
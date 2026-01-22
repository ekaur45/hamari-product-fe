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
        return document.cookie.split('; currency=')?.pop()?.split(';').shift() ?? 'USD';
    }
    getCachedCurrency(code: string) {
        this.getCurrencies().subscribe((currencies) => {
            localStorage.setItem('currencies', JSON.stringify(currencies.data));
        });
        return JSON.parse(localStorage.getItem('currencies') ?? '[]') ?? [] as ICurrency[];
    }
}
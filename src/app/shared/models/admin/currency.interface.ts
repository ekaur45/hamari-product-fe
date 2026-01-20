export interface ICurrency {
    id?: number;
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    isBase: boolean;
}
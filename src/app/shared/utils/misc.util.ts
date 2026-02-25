import { effect, signal } from "@angular/core";
import { ReviewType } from "../models/review.model";

export function debounceSignal<T>(source: () => T, delay = 300) {
    const debounced = signal(source());

    effect(() => {
        const timer = setTimeout(() => {
            debounced.set(source());
        }, delay);

        return () => clearTimeout(timer);
    });

    return debounced;
}

export function mapRatingToNumber(input: ReviewType) : number {
    switch (input) {
        case 'excellent':
            return 5;
        case 'good':
            return 4;
        case 'average':
            return 3;
        case 'poor':
            return 2;
        case 'very poor':
            return 1;
        default:
            return 0;
    }
}
export function mapNumberToRating(input: number) : ('excellent' | 'good' | 'average' | 'poor' | 'very poor' | null) {
    switch (input){
        case 5:
            return 'excellent';
        case 4:
            return 'good';
        case 3:
            return 'average';
        case 2:
            return 'poor';
        case 1:
            return 'very poor';
        default:
            return null;
    }
}
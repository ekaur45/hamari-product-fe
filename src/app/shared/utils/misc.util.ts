import { effect, signal } from "@angular/core";

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

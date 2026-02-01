import { CommonModule } from "@angular/common";
import { Component, input, model, output } from "@angular/core";

@Component({
    selector: 'taleemiyat-ui-rating',
    templateUrl: './ui-rating.html',
    standalone: true,
    imports: [CommonModule],
})
export class UIRating {
    rating = model<('excellent' | 'good' | 'average' | 'poor' | 'very poor' | null)>(null);
    title = input<string>('');
    onRatingChange = output<'excellent' | 'good' | 'average' | 'poor' | 'very poor'>();

    onRatingChangeHandler(rating: 'excellent' | 'good' | 'average' | 'poor' | 'very poor'): void {
        this.rating.set(rating);
        this.onRatingChange.emit(rating);
    }
}
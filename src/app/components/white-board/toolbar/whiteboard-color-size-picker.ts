import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-color-size-picker',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-color-size-picker.html'
})
export class WhiteboardColorSizePicker {
    currentColor = input<string>('#000000');
    currentLineWidth = input<number>(3);
    showMoreColors = signal<boolean>(false);
    
    colorChangeEvent = output<string>();
    lineWidthChangeEvent = output<number>();
    toggleMoreColorsEvent = output<boolean>();
    
    onColorChange(color: string): void {
        this.colorChangeEvent.emit(color);
    }
    
    onLineWidthChange(value: number): void {
        this.lineWidthChangeEvent.emit(value);
    }
    
    onToggleMoreColors(): void {
        this.showMoreColors.set(!this.showMoreColors());
        this.toggleMoreColorsEvent.emit(this.showMoreColors());
    }
}


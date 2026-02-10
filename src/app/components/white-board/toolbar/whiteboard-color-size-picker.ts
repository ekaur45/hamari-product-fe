import { Component, input, output } from "@angular/core";
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
    
    colorChangeEvent = output<string>();
    lineWidthChangeEvent = output<number>();
    
    onColorChange(color: string): void {
        this.colorChangeEvent.emit(color);
    }
    
    onLineWidthChange(value: number): void {
        this.lineWidthChangeEvent.emit(value);
    }
}


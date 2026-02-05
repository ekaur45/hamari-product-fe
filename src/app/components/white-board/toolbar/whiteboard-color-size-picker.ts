import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DialogModule } from "primeng/dialog";

@Component({
    selector: 'app-whiteboard-color-size-picker',
    standalone: true,
    imports: [CommonModule, DialogModule],
    templateUrl: './whiteboard-color-size-picker.html'
})
export class WhiteboardColorSizePicker {
    currentColor = input<string>('#000000');
    currentLineWidth = input<number>(3);
    showDialog = signal<boolean>(false);
    
    colorChangeEvent = output<string>();
    lineWidthChangeEvent = output<number>();
    
    onColorChange(color: string): void {
        this.colorChangeEvent.emit(color);
    }
    
    onLineWidthChange(value: number): void {
        this.lineWidthChangeEvent.emit(value);
    }
    
    openDialog(): void {
        this.showDialog.set(true);
    }
    
    closeDialog(): void {
        this.showDialog.set(false);
    }
}


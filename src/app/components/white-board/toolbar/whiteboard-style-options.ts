import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-style-options',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-style-options.html'
})
export class WhiteboardStyleOptions {
    fillShapes = input<boolean>(false);
    lineStyle = input<string>('solid');
    
    toggleFillEvent = output<void>();
    lineStyleChangeEvent = output<string>();
    
    onToggleFill(): void {
        this.toggleFillEvent.emit();
    }
    
    onLineStyleChange(style: string): void {
        this.lineStyleChangeEvent.emit(style);
    }
    
    getFillStatus(): string {
        return this.fillShapes() ? 'On' : 'Off';
    }
}


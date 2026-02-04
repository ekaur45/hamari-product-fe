import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-canvas-options',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-canvas-options.html'
})
export class WhiteboardCanvasOptions {
    gridVisible = input<boolean>(false);
    
    backgroundColorChangeEvent = output<string>();
    toggleGridEvent = output<void>();
    
    onBackgroundColorChange(color: string): void {
        this.backgroundColorChangeEvent.emit(color);
    }
    
    onToggleGrid(): void {
        this.toggleGridEvent.emit();
    }
    
    getGridStatus(): string {
        return this.gridVisible() ? 'On' : 'Off';
    }
}


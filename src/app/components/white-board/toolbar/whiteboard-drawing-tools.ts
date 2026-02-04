import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-drawing-tools',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-drawing-tools.html'
})
export class WhiteboardDrawingTools {
    currentTool = input<string>('pen');
    imageUploadRef = input<HTMLInputElement | undefined>(undefined);
    
    toolSelectEvent = output<string>();
    imageUploadEvent = output<Event>();
    
    selectTool(toolId: string): void {
        this.toolSelectEvent.emit(toolId);
    }
    
    onImageUpload(event: Event): void {
        this.imageUploadEvent.emit(event);
    }
    
    isActive(tool: string): boolean {
        return this.currentTool() === tool;
    }
}


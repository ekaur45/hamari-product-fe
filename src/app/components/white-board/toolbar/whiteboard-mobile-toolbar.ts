import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

interface MobileTool {
    id: string;
    value: string;
    title: string;
    icon: string;
}

@Component({
    selector: 'app-whiteboard-mobile-toolbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-mobile-toolbar.html'
})
export class WhiteboardMobileToolbar {
    currentTool = input<string>('pen');
    
    toolSelectEvent = output<string>();
    imageUploadEvent = output<Event>();
    closeEvent = output<void>();
    
    tools: MobileTool[] = [
        { id: 'penToolMobile', value: 'pen', title: 'Pen', icon: 'fas fa-pen text-lg' },
        { id: 'highlighterToolMobile', value: 'highlighter', title: 'Highlighter', icon: 'fas fa-highlighter text-lg' },
        { id: 'eraserToolMobile', value: 'eraser', title: 'Eraser', icon: 'fas fa-eraser text-lg' },
        { id: 'shapeToolMobile', value: 'rectangle', title: 'Rectangle', icon: 'fas fa-square text-lg' },
        { id: 'circleToolMobile', value: 'circle', title: 'Circle', icon: 'far fa-circle text-lg' },
        { id: 'arrowToolMobile', value: 'arrow', title: 'Arrow', icon: 'fas fa-arrow-right text-lg' },
        { id: 'lineToolMobile', value: 'line', title: 'Line', icon: 'fas fa-minus text-lg' },
        { id: 'textToolMobile', value: 'text', title: 'Text', icon: 'fas fa-font text-lg' },
        { id: 'imageToolMobile', value: 'image', title: 'Image', icon: 'fas fa-image text-lg' }
    ];
    
    selectTool(toolId: string): void {
        this.toolSelectEvent.emit(toolId);
    }
    
    onImageUpload(event: Event): void {
        this.imageUploadEvent.emit(event);
    }
    
    onClose(): void {
        this.closeEvent.emit();
    }
    
    isActive(tool: string): boolean {
        return this.currentTool() === tool;
    }
}


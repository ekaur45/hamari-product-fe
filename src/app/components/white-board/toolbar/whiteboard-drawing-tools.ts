import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

@Component({
    selector: 'app-whiteboard-drawing-tools',
    standalone: true,
    imports: [CommonModule,MenuModule],
    templateUrl: './whiteboard-drawing-tools.html'
})
export class WhiteboardDrawingTools {
    currentTool = input<string>('pen');
    imageUploadRef = input<HTMLInputElement | undefined>(undefined);
    showTools = signal<boolean>(false);
    toolSelectEvent = output<string>();
    imageUploadEvent = output<Event>();

    tools: MenuItem[] = [
        { label: 'Pen', icon: 'fas fa-pen', command: () => this.selectTool('penTool') },
        { label: 'Highlighter', icon: 'fas fa-highlighter', command: () => this.selectTool('highlighterTool') },
        { label: 'Eraser', icon: 'fas fa-eraser', command: () => this.selectTool('eraserTool') },
        { label: 'Rectangle', icon: 'fas fa-square', command: () => this.selectTool('shapeTool') },
        { label: 'Circle', icon: 'far fa-circle', command: () => this.selectTool('circleTool') },
        { label: 'Oval', icon: 'far fa-circle', command: () => this.selectTool('ovalTool') },
        { label: 'Triangle', icon: 'fas fa-play', command: () => this.selectTool('triangleTool') },
        { label: 'Line', icon: 'fas fa-minus', command: () => this.selectTool('lineTool') },
        { label: 'Arrow', icon: 'fas fa-arrow-right', command: () => this.selectTool('arrowTool') },
        { label: 'Text', icon: 'fas fa-font', command: () => this.selectTool('textTool') },
    ];
    
    selectTool(toolId: string): void {
        this.toolSelectEvent.emit(toolId);
    }
    
    onImageUpload(event: Event): void {
        this.imageUploadEvent.emit(event);
    }
    
    isActive(tool: string): boolean {
        return this.currentTool() === tool;
    }

    onToolsClick(): void {
        this.showTools.set(!this.showTools());
    }
}


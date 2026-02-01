import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-select-tool',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-select-tool.html'
})
export class WhiteboardSelectTool {
    isActive = input<boolean>(false);
    hasSelection = input<boolean>(false);
    hasClipboard = input<boolean>(false);
    
    activateEvent = output<void>();
    copyEvent = output<void>();
    cutEvent = output<void>();
    pasteEvent = output<void>();
    alignEvent = output<'left' | 'center' | 'right' | 'top' | 'bottom'>();
    layerEvent = output<'front' | 'back'>();
    deleteEvent = output<void>();
    
    activateSelectTool(): void {
        this.activateEvent.emit();
    }
    
    copySelection(): void {
        this.copyEvent.emit();
    }
    
    cutSelection(): void {
        this.cutEvent.emit();
    }
    
    pasteSelection(): void {
        this.pasteEvent.emit();
    }
    
    alignLeft(): void {
        this.alignEvent.emit('left');
    }
    
    alignCenter(): void {
        this.alignEvent.emit('center');
    }
    
    alignRight(): void {
        this.alignEvent.emit('right');
    }
    
    bringToFront(): void {
        this.layerEvent.emit('front');
    }
    
    sendToBack(): void {
        this.layerEvent.emit('back');
    }
    
    deleteSelection(): void {
        this.deleteEvent.emit();
    }
}


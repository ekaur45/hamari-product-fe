import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

@Component({
    selector: 'app-whiteboard-select-tool',
    standalone: true,
    imports: [CommonModule, MenuModule],
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
    
    menuItems = computed<MenuItem[]>(() => {
        const items: MenuItem[] = [
            {
                label: 'Select Tool',
                icon: 'fas fa-mouse-pointer',
                command: () => this.activateEvent.emit()
            },
            { separator: true }
        ];
        
        if (this.hasSelection()) {
            items.push(
                { label: 'Copy', icon: 'fas fa-copy', command: () => this.copyEvent.emit() },
                { label: 'Cut', icon: 'fas fa-cut', command: () => this.cutEvent.emit() },
                { 
                    label: 'Paste', 
                    icon: 'fas fa-paste', 
                    command: () => this.pasteEvent.emit(),
                    disabled: !this.hasClipboard()
                },
                { separator: true },
                { label: 'Align Left', icon: 'fas fa-align-left', command: () => this.alignEvent.emit('left') },
                { label: 'Align Center', icon: 'fas fa-align-center', command: () => this.alignEvent.emit('center') },
                { label: 'Align Right', icon: 'fas fa-align-right', command: () => this.alignEvent.emit('right') },
                { separator: true },
                { label: 'Bring to Front', icon: 'fas fa-arrow-up', command: () => this.layerEvent.emit('front') },
                { label: 'Send to Back', icon: 'fas fa-arrow-down', command: () => this.layerEvent.emit('back') },
                { separator: true },
                { label: 'Delete', icon: 'fas fa-trash', command: () => this.deleteEvent.emit() }
            );
        }
        
        return items;
    });
}


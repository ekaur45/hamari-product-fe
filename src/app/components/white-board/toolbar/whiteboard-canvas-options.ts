import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

@Component({
    selector: 'app-whiteboard-canvas-options',
    standalone: true,
    imports: [CommonModule, MenuModule],
    templateUrl: './whiteboard-canvas-options.html'
})
export class WhiteboardCanvasOptions {
    gridVisible = input<boolean>(false);
    
    backgroundColorChangeEvent = output<string>();
    toggleGridEvent = output<void>();
    
    menuItems = computed<MenuItem[]>(() => [
        {
            label: `Grid: ${this.gridVisible() ? 'On' : 'Off'}`,
            icon: 'fas fa-th',
            command: () => this.toggleGridEvent.emit()
        },
        { separator: true },
        { label: 'White', command: () => this.backgroundColorChangeEvent.emit('#ffffff') },
        { label: 'Gray', command: () => this.backgroundColorChangeEvent.emit('#f9fafb') },
        { label: 'Yellow', command: () => this.backgroundColorChangeEvent.emit('#fef3c7') },
        { label: 'Blue', command: () => this.backgroundColorChangeEvent.emit('#dbeafe') },
        { label: 'Pink', command: () => this.backgroundColorChangeEvent.emit('#fce7f3') },
        { label: 'Purple', command: () => this.backgroundColorChangeEvent.emit('#e0e7ff') },
        { label: 'Green', command: () => this.backgroundColorChangeEvent.emit('#d1fae5') }
    ]);
}


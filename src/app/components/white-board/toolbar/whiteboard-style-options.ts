import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

@Component({
    selector: 'app-whiteboard-style-options',
    standalone: true,
    imports: [CommonModule, MenuModule],
    templateUrl: './whiteboard-style-options.html'
})
export class WhiteboardStyleOptions {
    fillShapes = input<boolean>(false);
    lineStyle = input<string>('solid');
    
    toggleFillEvent = output<void>();
    lineStyleChangeEvent = output<string>();
    
    menuItems = computed<MenuItem[]>(() => [
        {
            label: `Fill Shapes: ${this.fillShapes() ? 'On' : 'Off'}`,
            icon: 'fas fa-fill-drip',
            command: () => this.toggleFillEvent.emit()
        },
        { separator: true },
        {
            label: 'Solid Line',
            icon: this.lineStyle() === 'solid' ? 'fas fa-check' : undefined,
            command: () => this.lineStyleChangeEvent.emit('solid')
        },
        {
            label: 'Dashed Line',
            icon: this.lineStyle() === 'dashed' ? 'fas fa-check' : undefined,
            command: () => this.lineStyleChangeEvent.emit('dashed')
        },
        {
            label: 'Dotted Line',
            icon: this.lineStyle() === 'dotted' ? 'fas fa-check' : undefined,
            command: () => this.lineStyleChangeEvent.emit('dotted')
        }
    ]);
}


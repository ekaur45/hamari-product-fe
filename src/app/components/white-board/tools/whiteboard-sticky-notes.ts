import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

export interface StickyNote {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    userId?: string;
    userName?: string;
}

@Component({
    selector: 'app-whiteboard-sticky-notes',
    standalone: true,
    imports: [CommonModule, MenuModule],
    templateUrl: './whiteboard-sticky-notes.html'
})
export class WhiteboardStickyNotes {
    isActive = input<boolean>(false);
    
    activateEvent = output<void>();
    addNoteEvent = output<{ x: number; y: number; color: string }>();
    
    menuItems = computed<MenuItem[]>(() => [
        {
            label: 'Activate Sticky Note Tool',
            icon: 'fas fa-sticky-note',
            command: () => this.activateEvent.emit()
        }
    ]);
}


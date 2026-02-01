import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

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
    imports: [CommonModule, FormsModule],
    templateUrl: './whiteboard-sticky-notes.html'
})
export class WhiteboardStickyNotes {
    isActive = input<boolean>(false);
    selectedColor = signal<string>('#fef08a'); // Default yellow
    
    activateEvent = output<void>();
    addNoteEvent = output<{ x: number; y: number; color: string }>();
    
    noteColors = [
        '#fef08a', // Yellow
        '#fecaca', // Red
        '#bfdbfe', // Blue
        '#bbf7d0', // Green
        '#e9d5ff', // Purple
        '#fed7aa', // Orange
        '#fce7f3', // Pink
    ];
    
    activateStickyNoteTool(): void {
        this.activateEvent.emit();
    }
    
    selectColor(color: string): void {
        this.selectedColor.set(color);
    }
}


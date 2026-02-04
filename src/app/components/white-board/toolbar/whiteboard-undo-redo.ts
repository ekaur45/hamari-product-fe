import { Component, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-undo-redo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-undo-redo.html'
})
export class WhiteboardUndoRedo {
    undoEvent = output<void>();
    redoEvent = output<void>();
    
    onUndo(): void {
        this.undoEvent.emit();
    }
    
    onRedo(): void {
        this.redoEvent.emit();
    }
}


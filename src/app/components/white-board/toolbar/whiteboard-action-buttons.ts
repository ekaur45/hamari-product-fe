import { Component, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-action-buttons',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-action-buttons.html'
})
export class WhiteboardActionButtons {
    clearEvent = output<void>();
    saveEvent = output<void>();
    exportPDFEvent = output<void>();
    
    onClear(): void {
        this.clearEvent.emit();
    }
    
    onSave(): void {
        this.saveEvent.emit();
    }
    
    onExportPDF(): void {
        this.exportPDFEvent.emit();
    }
}


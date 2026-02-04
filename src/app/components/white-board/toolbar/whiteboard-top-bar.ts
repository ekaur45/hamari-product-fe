import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DialogModule } from "primeng/dialog";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-whiteboard-top-bar',
    standalone: true,
    imports: [CommonModule, DialogModule, FormsModule],
    templateUrl: './whiteboard-top-bar.html'
})
export class WhiteboardTopBar {
    tabs = input<('pen' | 'screen-sharing')[]>([]);
    showAddTabDialog = signal<boolean>(false);
    newTabName = signal<string>('');
    
    closeEvent = output<void>();
    addTabEvent = output<string>();
    
    onClose(): void {
        this.closeEvent.emit();
    }
    
    onShowAddTabDialog(): void {
        this.showAddTabDialog.set(true);
    }
    
    onAddTab(): void {
        const name = this.newTabName();
        if (name && name.trim()) {
            this.addTabEvent.emit(name.trim());
            this.newTabName.set('');
            this.showAddTabDialog.set(false);
        }
    }
}


import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UserRole } from "@/app/shared";

@Component({
    selector: 'app-whiteboard-permissions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-permissions.html'
})
export class WhiteboardPermissions {
    currentRole = input.required<UserRole>();
    isEditable = input<boolean>(true);
    isLocked = input<boolean>(false);
    
    toggleLockEvent = output<boolean>();
    clearStudentsEvent = output<void>();
    
    UserRole = UserRole;
    
    toggleLock(): void {
        this.toggleLockEvent.emit(!this.isLocked());
    }
    
    clearStudentDrawings(): void {
        if (confirm('Clear all student drawings? This action cannot be undone.')) {
            this.clearStudentsEvent.emit();
        }
    }
}


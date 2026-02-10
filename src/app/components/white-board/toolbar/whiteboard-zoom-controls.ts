import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-zoom-controls',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-zoom-controls.html'
})
export class WhiteboardZoomControls {
    zoomLevel = input<number>(1);
    
    zoomInEvent = output<void>();
    zoomOutEvent = output<void>();
    zoomResetEvent = output<void>();
    centerContentEvent = output<void>();
    
    onZoomIn(): void {
        this.zoomInEvent.emit();
    }
    
    onZoomOut(): void {
        this.zoomOutEvent.emit();
    }
    
    onZoomReset(): void {
        this.zoomResetEvent.emit();
    }
    
    onCenterContent(): void {
        this.centerContentEvent.emit();
    }
    
    getZoomLevel(): string {
        return Math.round(this.zoomLevel() * 100) + '%';
    }
}


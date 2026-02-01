import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface WhiteboardTemplate {
    id: string;
    name: string;
    icon: string;
    preview: string;
    type: 'lined' | 'graph' | 'coordinate' | 'isometric' | 'blank' | 'storyboard';
}

@Component({
    selector: 'app-whiteboard-templates',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-templates.html'
})
export class WhiteboardTemplates {
    templates = input<WhiteboardTemplate[]>([]);
    showTemplates = signal<boolean>(false);
    
    templateSelectEvent = output<string>(); // templateId
    
    defaultTemplates: WhiteboardTemplate[] = [
        {
            id: 'blank',
            name: 'Blank',
            icon: 'fas fa-square',
            preview: '',
            type: 'blank'
        },
        {
            id: 'lined',
            name: 'Lined Paper',
            icon: 'fas fa-grip-lines',
            preview: '',
            type: 'lined'
        },
        {
            id: 'graph',
            name: 'Graph Paper',
            icon: 'fas fa-th',
            preview: '',
            type: 'graph'
        },
        {
            id: 'coordinate',
            name: 'Coordinate Plane',
            icon: 'fas fa-chart-line',
            preview: '',
            type: 'coordinate'
        },
        {
            id: 'isometric',
            name: 'Isometric Grid',
            icon: 'fas fa-cube',
            preview: '',
            type: 'isometric'
        },
        {
            id: 'storyboard',
            name: 'Storyboard',
            icon: 'fas fa-film',
            preview: '',
            type: 'storyboard'
        }
    ];
    
    selectTemplate(templateId: string): void {
        this.templateSelectEvent.emit(templateId);
        this.showTemplates.set(false);
    }
}


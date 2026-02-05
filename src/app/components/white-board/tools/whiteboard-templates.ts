import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

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
    imports: [CommonModule, MenuModule],
    templateUrl: './whiteboard-templates.html'
})
export class WhiteboardTemplates {
    templates = input<WhiteboardTemplate[]>([]);
    
    templateSelectEvent = output<string>(); // templateId
    
    defaultTemplates: WhiteboardTemplate[] = [
        { id: 'blank', name: 'Blank', icon: 'fas fa-square', preview: '', type: 'blank' },
        { id: 'lined', name: 'Lined Paper', icon: 'fas fa-grip-lines', preview: '', type: 'lined' },
        { id: 'graph', name: 'Graph Paper', icon: 'fas fa-th', preview: '', type: 'graph' },
        { id: 'coordinate', name: 'Coordinate Plane', icon: 'fas fa-chart-line', preview: '', type: 'coordinate' },
        { id: 'isometric', name: 'Isometric Grid', icon: 'fas fa-cube', preview: '', type: 'isometric' },
        { id: 'storyboard', name: 'Storyboard', icon: 'fas fa-film', preview: '', type: 'storyboard' }
    ];
    
    menuItems = computed<MenuItem[]>(() => {
        const allTemplates = this.templates().length > 0 ? this.templates() : this.defaultTemplates;
        return allTemplates.map(template => ({
            label: template.name,
            icon: template.icon,
            command: () => this.templateSelectEvent.emit(template.id)
        }));
    });
}


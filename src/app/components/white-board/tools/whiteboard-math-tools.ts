import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";

@Component({
    selector: 'app-whiteboard-math-tools',
    standalone: true,
    imports: [CommonModule, MenuModule],
    templateUrl: './whiteboard-math-tools.html'
})
export class WhiteboardMathTools {
    activeTool = input<string | null>(null);
    
    toolActivateEvent = output<'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'>();
    
    menuItems = computed<MenuItem[]>(() => [
        {
            label: 'Ruler',
            icon: 'fas fa-ruler',
            command: () => this.toolActivateEvent.emit('ruler')
        },
        {
            label: 'Protractor',
            icon: 'fas fa-circle-notch',
            command: () => this.toolActivateEvent.emit('protractor')
        },
        {
            label: 'Equation Editor',
            icon: 'fas fa-square-root-alt',
            command: () => this.toolActivateEvent.emit('equation')
        },
        {
            label: 'Graphing Tool',
            icon: 'fas fa-chart-line',
            command: () => this.toolActivateEvent.emit('graph')
        },
        { separator: true },
        {
            label: 'Calculator',
            icon: 'fas fa-calculator',
            command: () => this.toolActivateEvent.emit('calculator')
        }
    ]);
}


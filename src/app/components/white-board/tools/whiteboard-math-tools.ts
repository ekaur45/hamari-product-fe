import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-math-tools',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-math-tools.html'
})
export class WhiteboardMathTools {
    activeTool = signal<string | null>(null);
    showMathTools = signal<boolean>(false);
    
    toolActivateEvent = output<'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'>();
    
    activateTool(tool: 'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'): void {
        if (this.activeTool() === tool) {
            this.activeTool.set(null);
        } else {
            this.activeTool.set(tool);
            this.toolActivateEvent.emit(tool);
        }
        this.showMathTools.set(false);
    }
}


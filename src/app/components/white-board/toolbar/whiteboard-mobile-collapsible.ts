import { Component, input, output, signal, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-whiteboard-mobile-collapsible',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-mobile-collapsible.html'
})
export class WhiteboardMobileCollapsible implements AfterViewInit {
    title = input<string>('');
    icon = input<string>('');
    iconColor = input<string>('blue');
    isOpen = signal<boolean>(false);
    
    @ViewChild('panel') panel?: ElementRef<HTMLDivElement>;
    @ViewChild('chevron') chevron?: ElementRef<HTMLElement>;
    
    ngAfterViewInit(): void {
        // Ensure initial state is set
        this.updatePanelState();
    }
    
    toggle(): void {
        this.isOpen.set(!this.isOpen());
        this.updatePanelState();
    }
    
    private updatePanelState(): void {
        if (this.panel?.nativeElement && this.chevron?.nativeElement) {
            const panelEl = this.panel.nativeElement;
            const chevronEl = this.chevron.nativeElement;
            
            if (this.isOpen()) {
                panelEl.classList.remove('hidden');
                chevronEl.classList.remove('rotate-0');
                chevronEl.classList.add('rotate-180');
            } else {
                panelEl.classList.add('hidden');
                chevronEl.classList.remove('rotate-180');
                chevronEl.classList.add('rotate-0');
            }
        }
    }
    
    getIconColorClass(): string {
        const colorMap: { [key: string]: string } = {
            'blue': 'from-blue-50 to-blue-100 text-blue-600',
            'purple': 'from-purple-50 to-purple-100 text-purple-600',
            'green': 'from-green-50 to-green-100 text-green-600',
            'orange': 'from-orange-50 to-orange-100 text-orange-600',
            'indigo': 'from-indigo-50 to-indigo-100 text-indigo-600'
        };
        return colorMap[this.iconColor()] || colorMap['blue'];
    }
}


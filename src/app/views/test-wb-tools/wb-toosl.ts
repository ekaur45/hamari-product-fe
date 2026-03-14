import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, QueryList, signal, ViewChild, ViewChildren, ViewEncapsulation } from "@angular/core";

@Component({
    selector: 'app-wb-tools',
    templateUrl: './wb-toosl.html',
    standalone: true,
    imports: [CommonModule],
    styleUrls: ['./t.css'],
    encapsulation: ViewEncapsulation.None
})
export class WbToolsComponent implements AfterViewInit, OnDestroy {
    ngOnDestroy(): void {
    }
    showDropDown = signal<boolean>(false);
    /** 'above' | 'below' – where the dropdown is shown relative to the button */
    dropdownPlacement = signal<'above' | 'below'>('below');

    @ViewChild("dropdownRef") dropdown!: ElementRef;
    @ViewChild("toggleBtn") toggleBtn!: ElementRef;

    ngAfterViewInit(): void { }

    toggleDropdown() {
        const next = !this.showDropDown();
        this.showDropDown.set(next);
        if (next) {
            setTimeout(() => this.updateDropdownPosition(), 0);
        }
    }

    private updateDropdownPosition(): void {
        const btn = this.toggleBtn?.nativeElement as HTMLElement;
        const panel = this.dropdown?.nativeElement as HTMLElement;
        if (!btn || !panel) return;

        const btnRect = btn.getBoundingClientRect();
        const panelHeight = panel.offsetHeight;
        const gap = 4;
        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;

        if (spaceBelow >= panelHeight + gap || spaceBelow >= spaceAbove) {
            this.dropdownPlacement.set('below');
        } else {
            this.dropdownPlacement.set('above');
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        if (this.showDropDown()) this.updateDropdownPosition();
    }

    // Detect click outside
    @HostListener('document:click', ['$event.target'])
    public onClick(targetElement: any) {
        const clickedInsideDropdown = this.dropdown?.nativeElement.contains(targetElement);
        const clickedToggleButton = this.toggleBtn?.nativeElement.contains(targetElement);

        if (!clickedInsideDropdown && !clickedToggleButton) {
            this.showDropDown.set(false);
        }
    }
}


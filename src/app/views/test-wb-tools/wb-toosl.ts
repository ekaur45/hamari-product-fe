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

    @ViewChild("dropdownRef") dropdown!: ElementRef;
    @ViewChild("toggleBtn") toggleBtn!: ElementRef;

    ngAfterViewInit(): void { }

    toggleDropdown() {
        this.showDropDown.set(!this.showDropDown());
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


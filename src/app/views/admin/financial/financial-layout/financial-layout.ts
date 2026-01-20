import { Component, OnInit, OnDestroy, signal, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewChild } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { filter, Subscription } from "rxjs";

@Component({
    selector: 'app-financial-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './financial-layout.html'
})
export class FinancialLayout implements OnInit, OnDestroy, AfterViewInit {
    activeTabIndex = signal(0);
    private routerSubscription?: Subscription;
    @ViewChild('indicator', { static: false }) indicator?: ElementRef<HTMLDivElement>;
    @ViewChildren('tabLink') tabLinks?: QueryList<ElementRef<HTMLAnchorElement>>;

    tabs = [
        { path: '/admin/financial/payouts', label: 'Payouts' },
        { path: '/admin/financial/refunds', label: 'Refunds' },
        { path: '/admin/financial/currency', label: 'Currency' }
    ];

    constructor(public router: Router) {}

    ngOnInit() {
        this.updateActiveTab();
        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.updateActiveTab();
                setTimeout(() => this.updateIndicatorPosition(), 100);
            });
    }

    ngAfterViewInit() {
        setTimeout(() => this.updateIndicatorPosition(), 100);
    }

    ngOnDestroy() {
        this.routerSubscription?.unsubscribe();
    }

    private updateActiveTab() {
        const currentUrl = this.router.url;
        const index = this.tabs.findIndex(tab => currentUrl.includes(tab.path.split('/').pop() || ''));
        this.activeTabIndex.set(index >= 0 ? index : 0);
    }

    isActive(path: string): boolean {
        return this.router.url.includes(path.split('/').pop() || '');
    }

    updateIndicatorPosition(element?: HTMLElement) {
        const indicator = this.indicator?.nativeElement;
        if (!indicator) return;

        const activeIndex = this.activeTabIndex();
        const tabElements = this.tabLinks?.toArray() || [];
        
        let targetElement: HTMLElement | null = null;
        
        if (element) {
            // Hover effect - use the hovered element
            targetElement = element;
        } else if (tabElements[activeIndex]) {
            // Active tab position - use the active tab
            targetElement = tabElements[activeIndex].nativeElement;
        }
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const container = targetElement.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const left = rect.left - containerRect.left;
                const width = rect.width;
                indicator.style.left = `${left}px`;
                indicator.style.width = `${width}px`;
            }
        }
    }

    resetIndicatorPosition() {
        setTimeout(() => this.updateIndicatorPosition(), 50);
    }

    onTabHover(event: MouseEvent) {
        const target = event.currentTarget as HTMLElement;
        if (target) {
            this.updateIndicatorPosition(target);
        }
    }
}
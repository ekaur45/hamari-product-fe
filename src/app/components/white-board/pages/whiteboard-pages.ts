import { Component, input, output, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface WhiteboardPage {
    id: string;
    name: string;
    thumbnail?: string;
    template?: string;
}

@Component({
    selector: 'app-whiteboard-pages',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-pages.html'
})
export class WhiteboardPages {
    pages = input.required<WhiteboardPage[]>();
    currentPageIndex = input<number>(0);
    
    pageChangeEvent = output<string>(); // pageId
    addPageEvent = output<void>();
    deletePageEvent = output<string>(); // pageId
    duplicatePageEvent = output<string>(); // pageId
    
    showPageManager = signal<boolean>(false);
    
    currentPage = computed(() => {
        const index = this.currentPageIndex();
        return this.pages()[index] || null;
    });
    
    totalPages = computed(() => this.pages().length);
    
    goToPrevious(): void {
        if (this.currentPageIndex() > 0) {
            const prevPage = this.pages()[this.currentPageIndex() - 1];
            this.pageChangeEvent.emit(prevPage.id);
        }
    }
    
    goToNext(): void {
        if (this.currentPageIndex() < this.totalPages() - 1) {
            const nextPage = this.pages()[this.currentPageIndex() + 1];
            this.pageChangeEvent.emit(nextPage.id);
        }
    }
    
    selectPage(pageId: string): void {
        this.pageChangeEvent.emit(pageId);
        this.showPageManager.set(false);
    }
    
    addNewPage(): void {
        this.addPageEvent.emit();
    }
    
    deleteCurrentPage(): void {
        const page = this.currentPage();
        if (page && this.totalPages() > 1) {
            if (confirm(`Delete page "${page.name}"? This action cannot be undone.`)) {
                this.deletePageEvent.emit(page.id);
            }
        }
    }
    
    duplicateCurrentPage(): void {
        const page = this.currentPage();
        if (page) {
            this.duplicatePageEvent.emit(page.id);
        }
    }
}


import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface Stamp {
    id: string;
    name: string;
    icon: string;
    emoji?: string;
    category: 'feedback' | 'marks' | 'symbols' | 'arrows';
}

@Component({
    selector: 'app-whiteboard-stamps',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './whiteboard-stamps.html'
})
export class WhiteboardStamps {
    stamps = input<Stamp[]>([]);
    isActive = input<boolean>(false);
    showStamps = signal<boolean>(false);
    
    stampSelectEvent = output<string>(); // stampId
    
    defaultStamps: Stamp[] = [
        // Feedback
        { id: 'good-job', name: 'Good Job', emoji: '👍', icon: 'fas fa-thumbs-up', category: 'feedback' },
        { id: 'excellent', name: 'Excellent', emoji: '⭐', icon: 'fas fa-star', category: 'feedback' },
        { id: 'well-done', name: 'Well Done', emoji: '🎉', icon: 'fas fa-trophy', category: 'feedback' },
        { id: 'needs-work', name: 'Needs Work', emoji: '⚠️', icon: 'fas fa-exclamation-triangle', category: 'feedback' },
        
        // Marks
        { id: 'check', name: 'Check', emoji: '✅', icon: 'fas fa-check', category: 'marks' },
        { id: 'cross', name: 'Cross', emoji: '❌', icon: 'fas fa-times', category: 'marks' },
        { id: 'question', name: 'Question', emoji: '❓', icon: 'fas fa-question', category: 'marks' },
        { id: 'star', name: 'Star', emoji: '⭐', icon: 'fas fa-star', category: 'marks' },
        
        // Symbols
        { id: 'arrow-up', name: 'Arrow Up', icon: 'fas fa-arrow-up', category: 'symbols' },
        { id: 'arrow-down', name: 'Arrow Down', icon: 'fas fa-arrow-down', category: 'symbols' },
        { id: 'heart', name: 'Heart', emoji: '❤️', icon: 'fas fa-heart', category: 'symbols' },
        { id: 'lightbulb', name: 'Idea', icon: 'fas fa-lightbulb', category: 'symbols' },
    ];
    
    getStampsByCategory(category: Stamp['category']): Stamp[] {
        const allStamps = this.stamps().length > 0 ? this.stamps() : this.defaultStamps;
        return allStamps.filter(s => s.category === category);
    }
    
    selectStamp(stampId: string): void {
        this.stampSelectEvent.emit(stampId);
        this.showStamps.set(false);
    }
}


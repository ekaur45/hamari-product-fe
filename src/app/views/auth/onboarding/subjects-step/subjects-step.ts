import { Component, DestroyRef, effect, Inject, OnInit, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { BehaviorSubject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject as SubjectModel } from "../../../../shared/models";
import { ProfileService } from "../../../../shared/services/profile.service";
import { SubjectService } from "../../../../shared/services/subject.service";
import { AuthService } from "../../../../shared/services/auth.service";
import { User } from "../../../../shared";

@Component({
    selector: 'app-subjects-step',
    templateUrl: './subjects-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ToastModule],
    providers: [MessageService]
})
export class SubjectsStep implements OnInit {
    currentUser = signal<User | null>(null);
    subjects = signal<SubjectModel[]>([]);
    searchedSubjects = signal<SubjectModel[]>([]);
    searchValue$ = new BehaviorSubject<string>('');
    subjectNotFound = signal(false);
    isSaving = signal(false);
    showSearchResults = signal(false);

    constructor(
        private profileService: ProfileService,
        private subjectService: SubjectService,
        private messageService: MessageService,
        private authService: AuthService,
        private router: Router,
        @Inject(DestroyRef) private destroyRef: DestroyRef
    ) {
        // Debounced search
        this.searchValue$.pipe(
            debounceTime(100),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((searchValue) => {
            if (searchValue.length > 2) {
                this.showSearchResults.set(true);
                this.subjectService.searchSubjects(searchValue).subscribe({
                    next: (subjects) => {
                        this.searchedSubjects.set(subjects);
                        if (subjects.length === 0) {
                            this.subjectNotFound.set(true);
                        } else {
                            this.subjectNotFound.set(false);
                        }
                    },
                    error: (error) => {
                        this.searchedSubjects.set([]);
                        this.subjectNotFound.set(false);
                    }
                });
            } else {
                this.searchedSubjects.set([]);
                this.subjectNotFound.set(false);
                if (searchValue.length === 0) {
                    this.showSearchResults.set(false);
                }
            }
        });

        effect(() => {
            const user = this.currentUser();
            if (user) {
                this.subjects.set(
                    user.teacher?.teacherSubjects?.map(ts => ({
                        id: ts.subject?.id || '',
                        name: ts.subject?.name || ''
                    })) as SubjectModel[] || []
                );
            }
        });
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    searchSubjects(event: Event): void {
        const value = (event.target as HTMLInputElement).value.trim();
        this.searchValue$.next(value);
    }

    addSearchedSubject(subject: SubjectModel): void {
        if (!subject) return;

        this.subjects.update(subjects => {
            const exists = subjects.some(s => 
                s.id === subject.id || 
                (s.name || '').toLowerCase() === (subject.name || '').toLowerCase()
            );
            if (exists) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Already Added',
                    detail: 'This subject is already in your list'
                });
                return subjects;
            }

            return [subject, ...subjects];
        });

        // Clear search
        this.searchValue$.next('');
        this.searchedSubjects.set([]);
        this.showSearchResults.set(false);
    }

    suggestSubject(): void {
        const name = this.searchValue$.value.trim();
        if (!name) return;

        this.subjects.update(subjects => {
            // Prevent duplicate by case-insensitive name match
            const exists = subjects.some(s => (s.name || '').toLowerCase() === name.toLowerCase());
            if (exists) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Already Added',
                    detail: 'This subject is already in your list'
                });
                return subjects;
            }

            return [{
                id: '',
                name
            }, ...subjects];
        });

        // Clear search
        this.searchValue$.next('');
        this.searchedSubjects.set([]);
        this.showSearchResults.set(false);
    }

    removeSubject(subject: SubjectModel): void {
        this.subjects.update(subjects => subjects.filter(s => s.id !== subject.id));
    }

    onContinue(): void {
        const userId = this.currentUser()?.id;
        if (!userId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'User not found'
            });
            return;
        }

        // Save subjects before continuing
        this.isSaving.set(true);
        this.profileService.updateUserSubjects(userId, this.subjects()).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Subjects saved successfully'
                });
                // Reload user profile
                this.authService.refreshUser().subscribe({
                    complete: () => {
                        // Navigate to next step
                        this.router.navigate(['/auth/onboarding/availability-step']);
                    }
                });
            },
            error: (error: any) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error?.error?.message || error?.message || 'Failed to save subjects'
                });
                this.isSaving.set(false);
            },
            complete: () => {
                this.isSaving.set(false);
            }
        });
    }
}
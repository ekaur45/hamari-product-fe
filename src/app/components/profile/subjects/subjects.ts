import { CommonModule } from "@angular/common";
import { Component, DestroyRef, effect, Inject, input, OnInit, output, signal } from "@angular/core";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ProfileService } from "../../../shared/services/profile.service";
import { SubjectService, User } from "../../../shared";
import { debounceTime } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BehaviorSubject, of, Subject } from "rxjs";
import { Subject as SubjectModel } from "../../../shared/models";
@Component({
    standalone: true,
    imports: [CommonModule, FormsModule, ToastModule],
    selector: 'app-subjects',
    templateUrl: './subjects.html',
    providers: [MessageService]
})  
export default class Subjects implements OnInit {
    profile = input<User | null>(null);
    reloadProfile = output<void>();
    isLoading = signal(false);
    subjects = signal<SubjectModel[]>([]);
    searchedSubjects = signal<SubjectModel[]>([]);
    searchValue$ = new BehaviorSubject<string>('');
    subjectNotFound = signal(false);

    isSaving = signal(false);

    constructor(private profileService: ProfileService, 
        private subjectService: SubjectService,
        private messageService: MessageService,
        @Inject(DestroyRef) private destroyRef: DestroyRef) {
            this.searchValue$.pipe(
                debounceTime(100),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe((searchValue) => {
                if (searchValue.length > 2) {
                this.subjectService.searchSubjects(searchValue).subscribe({
                    next: (subjects) => {
                        this.searchedSubjects.set(subjects);
                        if (subjects.length === 0) {
                            this.subjectNotFound.set(true);
                        } else {
                            this.subjectNotFound.set(false);
                        }
                    },
                });
                }
            });

        effect(() => {
            const p = this.profile();
            if (p) {
                this.subjects.set(p.teacher?.teacherSubjects?.map(subject => ({
                    id: subject.subject?.id,
                    name: subject.subject?.name
                })) as SubjectModel[] || []);
            }
        });
    }
    ngOnInit(): void {

    }

    searchSubjects(event: Event): void {
        const value = (event.target as HTMLInputElement).value.trim();
        this.searchValue$.next(value);
    }

    addSubject(): void {
    }
    suggestSubject(): void {
        this.subjects.update(subjects => [{
            id: '',
            name: this.searchValue$.value
        }, ...subjects]);
    }
    addSearchedSubject(subject: SubjectModel): void {
        this.subjects.update(subjects => [subject, ...subjects]);
    }
    removeSubject(subject: SubjectModel): void {
        this.subjects.update(subjects => subjects.filter(s => s.id !== subject.id));
    }
    saveSubjects(): void {
        this.isSaving.set(true);
        this.profileService.updateUserSubjects(this.profile()?.id as string, this.subjects()).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Subjects updated successfully' });
                this.reloadProfile.emit();
            },
            error: (error: any) => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            },
            complete: () => {
                this.isSaving.set(false);
            }
        });
    }
}   
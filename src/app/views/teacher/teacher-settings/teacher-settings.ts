import { CommonModule } from "@angular/common";
import { Component, effect, OnInit, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ProfileService } from "../../../shared/services/profile.service";
import { Teacher, TeacherSubject, User } from "../../../shared";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";

interface SubjectRate {
    id: string;
    name: string;
    hourlyRate?: number;
    monthlyRate?: number;
}

@Component({
    selector: 'app-teacher-settings',
    standalone: true,
    templateUrl: './teacher-settings.html',
    imports: [CommonModule, ReactiveFormsModule, ToastModule],
    providers: [MessageService, CurrencyPipe]
})
export default class TeacherSettings implements OnInit {
    profile = signal<User | null>(null);
    subjects = signal<SubjectRate[]>([]);
    isLoading = signal(false);
    isSavingOverallRates = signal(false);
    isSavingSubjectRates = signal(false);

    overallRatesForm = new FormGroup({
        hourlyRate: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        monthlyRate: new FormControl<number | null>(null, [Validators.required, Validators.min(0)])
    });

    subjectRatesForm = new FormGroup({});

    constructor(
        private profileService: ProfileService,
        private messageService: MessageService,
        private currencyPipe: CurrencyPipe
    ) {
        effect(() => {
            const p = this.profile();
            if (p?.teacher) {
                // Set overall rates
                this.overallRatesForm.patchValue({
                    hourlyRate: Number(this.currencyPipe.transform(p.teacher.hourlyRate || 0)) || null,
                    monthlyRate: Number(this.currencyPipe.transform(p.teacher.monthlyRate || 0)) || null
                }, { emitEvent: false });
                // Build subject rates
                const subjectRates: SubjectRate[] = (p.teacher.teacherSubjects || []).map(ts => ({
                    id: ts.id,
                    name: ts.subject?.name || 'Unknown Subject',
                    hourlyRate: Number(ts.hourlyRate || 0),
                    monthlyRate: Number(ts.monthlyRate || 0)
                }));

                this.subjects.set(subjectRates);

                // Build form controls for each subject
                const formControls: { [key: string]: FormControl } = {};
                subjectRates.forEach(subject => {

                    formControls[`hourly_${subject.id}`] = new FormControl<number | null>(
                        Number(this.currencyPipe.transform(subject.hourlyRate || 0)) || null,
                        [Validators.min(0)]
                    );
                    formControls[`monthly_${subject.id}`] = new FormControl<number | null>(
                        Number(this.currencyPipe.transform(subject.monthlyRate || 0)) || null,
                        [Validators.min(0)]
                    );
                });

                // Rebuild form group
                this.subjectRatesForm = new FormGroup(formControls);
            }
        });

        // this.overallRatesForm.valueChanges.subscribe((changes: any) => {
        //     this.overallRatesForm.patchValue({
        //         hourlyRate: changes.hourlyRate ? Number(changes.hourlyRate) : null,
        //         monthlyRate: changes.monthlyRate ? Number(changes.monthlyRate) : null
        //     }, { emitEvent: false });
        // })
    }

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        this.isLoading.set(true);
        this.profileService.getProfile().subscribe({
            next: (profile) => {
                this.profile.set(profile);
                this.isLoading.set(false);
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load profile: ' + (error.message || 'Unknown error')
                });
            }
        });
    }

    saveOverallRates(): void {
        if (!this.overallRatesForm.valid || !this.profile()?.teacher) {
            return;
        }

        this.isSavingOverallRates.set(true);
        const currentTeacher = this.profile()!.teacher!;
        const teacherData: Teacher = {
            ...currentTeacher,
            hourlyRate: this.overallRatesForm.value.hourlyRate || 0,
            monthlyRate: this.overallRatesForm.value.monthlyRate || undefined
        };

        this.profileService.updateOverallRates(
            this.profile()!.teacher!.id,
            { hourlyRate: this.overallRatesForm.value.hourlyRate || 0, monthlyRate: this.overallRatesForm.value.monthlyRate || 0 }
        ).subscribe({
            next: (updatedTeacher) => {
                // Update local profile
                const currentProfile = this.profile();
                if (currentProfile) {
                    this.profile.set({
                        ...currentProfile,
                        teacher: {
                            ...currentProfile.teacher!,
                            ...updatedTeacher
                        }
                    });
                }
                this.overallRatesForm.markAsPristine();
                this.isSavingOverallRates.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Overall rates updated successfully'
                });
                this.loadProfile();
            },
            error: (error) => {
                this.isSavingOverallRates.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update overall rates: ' + (error.message || 'Unknown error')
                });
            }
        });
    }

    saveSubjectRates(): void {
        if (!this.subjectRatesForm.valid || !this.profile()?.teacher) {
            return;
        }

        this.isSavingSubjectRates.set(true);
        const formValue: { [key: string]: any } = this.subjectRatesForm.value;

        // Update teacher subjects with new rates
        const updatedTeacherSubjects: TeacherSubject[] = this.subjects().map(subject => {
            const hourlyKey = `hourly_${subject.id}`;
            const monthlyKey = `monthly_${subject.id}`;

            const existingSubject = this.profile()!.teacher!.teacherSubjects?.find(
                ts => ts.id === subject.id
            );
            return {
                ...existingSubject!,
                hourlyRate: formValue[hourlyKey] ? Number(formValue[hourlyKey]) : undefined,
                monthlyRate: formValue[monthlyKey] ? Number(formValue[monthlyKey]) : undefined
            } as TeacherSubject;
        });

        const currentTeacher = this.profile()!.teacher!;
        const teacherData: Teacher = {
            ...currentTeacher,
            teacherSubjects: updatedTeacherSubjects
        };

        this.profileService.updateSubjectRates(
            this.profile()!.teacher!.id,
            updatedTeacherSubjects.map(subject => ({
                id: subject.id,
                hourlyRate: subject.hourlyRate || 0,
                monthlyRate: subject.monthlyRate || 0
            }))
        ).subscribe({
            next: (updatedTeacher) => {
                // Update local profile
                const currentProfile = this.profile();
                if (currentProfile) {
                    this.profile.set({
                        ...currentProfile,
                        teacher: {
                            ...currentProfile.teacher!,
                            ...updatedTeacher
                        }
                    });
                }
                this.subjectRatesForm.markAsPristine();
                this.isSavingSubjectRates.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Subject rates updated successfully'
                });
                this.loadProfile();
            },
            error: (error) => {
                this.isSavingSubjectRates.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update subject rates: ' + (error.message || 'Unknown error')
                });
            }
        });
    }
}

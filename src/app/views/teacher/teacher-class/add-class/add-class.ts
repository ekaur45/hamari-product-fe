import { CommonModule } from "@angular/common";
import { Component, EventEmitter, OnInit, Output, signal, input } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators, ValidationErrors, ValidatorFn, AbstractControl } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { Class, CreateClassDto, ClassSchedule, TeacherService, Subject } from "../../../../shared";
import { ClassService } from "../../../../shared/services/class.service";
import { UserService } from "../../../../shared/services/user.service";
import { ProgressBarModule } from "primeng/progressbar";
import { MessageService } from "primeng/api";
import { DatePickerModule } from "primeng/datepicker";

@Component({
    selector: 'app-add-class',
    standalone: true,
    templateUrl: './add-class.html',
    imports: [CommonModule, ReactiveFormsModule, SelectModule, ProgressBarModule, DatePickerModule],
})
export class AddClass implements OnInit {
    @Output() onClassAdded = new EventEmitter<Class>();
    @Output() onCancel = new EventEmitter<void>();
    
    teacherId = input.required<string>();
    academies = signal<any[]>([]);
    academyOptions = signal<{ label: string; value: string }[]>([]);
    isLoading = signal(false);
    selectedDays = signal<string[]>([]);
    subjects = signal<Subject[]>([]);
    // Days of the week options
    daysOfWeek = [
        { label: 'Monday', value: 'monday' },
        { label: 'Tuesday', value: 'tuesday' },
        { label: 'Wednesday', value: 'wednesday' },
        { label: 'Thursday', value: 'thursday' },
        { label: 'Friday', value: 'friday' },
        { label: 'Saturday', value: 'saturday' },
        { label: 'Sunday', value: 'sunday' }
    ];

    // Grade options
    gradeOptions = [
        { label: 'Grade 1', value: '1' },
        { label: 'Grade 2', value: '2' },
        { label: 'Grade 3', value: '3' },
        { label: 'Grade 4', value: '4' },
        { label: 'Grade 5', value: '5' },
        { label: 'Grade 6', value: '6' },
        { label: 'Grade 7', value: '7' },
        { label: 'Grade 8', value: '8' },
        { label: 'Grade 9', value: '9' },
        { label: 'Grade 10', value: '10' },
        { label: 'Grade 11', value: '11' },
        { label: 'Grade 12', value: '12' }
    ];

    addClassForm: FormGroup = new FormGroup({
        name: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
        description: new FormControl('', [Validators.maxLength(500)]),
        academyId: new FormControl('', [Validators.required]),
        subject: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
        grade: new FormControl('', [Validators.required]),
        section: new FormControl('', [Validators.maxLength(10)]),
        maxStudents: new FormControl(30, [Validators.required, Validators.min(1), Validators.max(100)]),
        startDate: new FormControl('', [Validators.required]),
        endDate: new FormControl('', [Validators.required]),
        scheduleDays: new FormControl([], [Validators.required, this.daysValidator()]),
        startTime: new FormControl('', [Validators.required]),
        endTime: new FormControl('', [Validators.required]),
    });

    constructor(
        private classService: ClassService,
        private userService: UserService,
        private messageService: MessageService,
        private teacherService: TeacherService
    ) {}

    ngOnInit(): void {
        this.loadAcademies();
        this.loadSubjects();
    }

    daysValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (!value || (Array.isArray(value) && value.length === 0)) {
                return { required: true };
            }
            return null;
        };
    }
    loadSubjects(): void {
        this.teacherService.getTeacherSubjects(this.teacherId()).subscribe({
            next: (subjects) => {
                this.subjects.set(subjects);
            },
        });
    }
    loadAcademies(): void {
        this.userService.getUserAcademies(this.teacherId()).subscribe({
            next: (academies) => {
                this.academies.set(academies);
                // Map academies to options format
                const options = academies.map(a => ({
                    label: a.name || a.academy?.name || 'Unknown Academy',
                    value: a.id || a.academyId || ''
                }));
                this.academyOptions.set(options);
            },
            error: (error) => {
                console.error('Error loading academies:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load academies'
                });
            }
        });
    }

    onSubmit(): void {
        if (this.addClassForm.valid) {
            this.isLoading.set(true);
            
            const formValue = this.addClassForm.value;
            const schedule: ClassSchedule = {
                days: formValue.scheduleDays,
                startTime: formValue.startTime,
                endTime: formValue.endTime,
                duration: this.calculateDuration(formValue.startTime, formValue.endTime)
            };

            const classDto: CreateClassDto = {
                name: formValue.name,
                description: formValue.description || undefined,
                academyId: formValue.academyId,
                teacherId: this.teacherId(),
                subject: formValue.subject,
                grade: formValue.grade,
                section: formValue.section || undefined,
                maxStudents: formValue.maxStudents,
                startDate: new Date(formValue.startDate),
                endDate: new Date(formValue.endDate),
                schedule: schedule
            };

            this.classService.createClass(classDto).subscribe({
                next: (newClass: Class) => {
                    this.isLoading.set(false);
                    this.addClassForm.reset();
                    this.selectedDays.set([]);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Class created successfully'
                    });
                    this.onClassAdded.emit(newClass);
                },
                error: (error) => {
                    this.isLoading.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error?.error?.message || 'Failed to create class'
                    });
                }
            });
        } else {
            // Mark all fields as touched to show validation errors
            Object.keys(this.addClassForm.controls).forEach(key => {
                this.addClassForm.get(key)?.markAsTouched();
            });
        }
    }

    calculateDuration(startTime: string, endTime: string): number {
        if (!startTime || !endTime) return 0;
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        return Math.round(diffMs / 60000); // Convert to minutes
    }

    getFieldError(fieldName: string): string {
        const field = this.addClassForm.get(fieldName);
        if (field?.errors && field.touched) {
            if (field.errors['required']) {
                return `${this.getFieldName(fieldName)} is required`;
            }
            if (field.errors['minlength']) {
                return `${this.getFieldName(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
            }
            if (field.errors['maxlength']) {
                return `${this.getFieldName(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
            }
            if (field.errors['min']) {
                return `${this.getFieldName(fieldName)} must be at least ${field.errors['min'].min}`;
            }
            if (field.errors['max']) {
                return `${this.getFieldName(fieldName)} must not exceed ${field.errors['max'].max}`;
            }
        }
        return '';
    }

    getFieldName(fieldName: string): string {
        const labels: { [key: string]: string } = {
            name: 'Class Name',
            description: 'Description',
            academyId: 'Academy',
            subject: 'Subject',
            grade: 'Grade',
            section: 'Section',
            maxStudents: 'Max Students',
            startDate: 'Start Date',
            endDate: 'End Date',
            scheduleDays: 'Schedule Days',
            startTime: 'Start Time',
            endTime: 'End Time'
        };
        return labels[fieldName] || fieldName;
    }

    toggleDay(day: string): void {
        const currentDays = this.selectedDays();
        const index = currentDays.indexOf(day);
        if (index > -1) {
            currentDays.splice(index, 1);
        } else {
            currentDays.push(day);
        }
        this.selectedDays.set([...currentDays]);
        this.addClassForm.patchValue({ scheduleDays: this.selectedDays() });
    }

    isDaySelected(day: string): boolean {
        return this.selectedDays().includes(day);
    }
}


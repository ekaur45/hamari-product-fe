import { CommonModule } from "@angular/common";
import { Component, EventEmitter, OnInit, Output, signal, input, computed } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators, ValidationErrors, ValidatorFn, AbstractControl } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { Class, CreateClassDto, ClassSchedule, TeacherService, Subject } from "../../../../shared";
import { ClassService } from "../../../../shared/services/class.service";
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

    addClassForm: FormGroup = new FormGroup({
        subject: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
        maxStudents: new FormControl(30, [Validators.required, Validators.min(1), Validators.max(100)]),
        startDate: new FormControl(new Date(), [Validators.required]),
        scheduleDays: new FormControl([], [Validators.required, this.daysValidator()]),
        startTime: new FormControl('', [Validators.required]),
        endTime: new FormControl('', [Validators.required]),
        duration: new FormControl('', [Validators.required]),
    });

    constructor(
        private messageService: MessageService,
        private teacherService: TeacherService
    ) {}

    ngOnInit(): void {
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
                teacherId: this.teacherId(),
                subjectId: formValue.subject.id,
                price: formValue.price,
                startTime: formValue.startTime,
                endTime: formValue.endTime,
                duration: formValue.duration,
                maxStudents: formValue.maxStudents,
                schedule: formValue.scheduleDays,
            };

            this.teacherService.createTeacherClass(classDto).subscribe({
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
    get calculateEndTime(): string {
        const startTime = this.addClassForm.get('startTime')?.value;
        const duration = this.addClassForm.get('duration')?.value;
        if (!startTime || !duration) return '';
        const start = new Date(`2000-01-01T${startTime}`);
        start.setMinutes(start.getMinutes() + duration);
        const endTimeCalculated = start.toTimeString().split(' ')[0];
        this.addClassForm.get('endTime')?.setValue(endTimeCalculated);
        return endTimeCalculated;
    }
}


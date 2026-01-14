import { CommonModule } from "@angular/common";
import { Component, computed, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Subject, Teacher, TeacherService } from "../../../shared";
import { AvailabilitySlot, TeacherSubject } from "../../../shared/models";
import BookingCalendar from "../../../components/misc/booking-calendar/booking-calendar";

@Component({
    selector: 'app-book-teacher',
    standalone: true,
    templateUrl: './book-teacher.html',
    imports: [CommonModule, RouterModule, BookingCalendar],
})
export default class BookTeacher {
    teacherId = signal<string>('');
    isLoading = signal(false);
    teacher = signal<Teacher | null>(null);
    teacherSubjects = signal<Subject[]>([]);
    selectedSubject = signal<Subject | null>(null);
    subject = signal<Subject | null>(null);
    selectedTeacher = signal<TeacherSubject | null>(null);

    availableTeachers = computed(() => {
        const subj = this.subject();
        return subj?.teacherSubjects?.filter(ts => ts.teacher) || [];
    });

    constructor(
        private readonly route: ActivatedRoute,
        private readonly teacherService: TeacherService,
        private readonly router: Router
    ) {
        this.route.params.subscribe((params: any) => {
            this.teacherId.set(params['id']);
            this.getTeacherSubjects();
            this.getTeacherById();
        });
    }

    getTeacherById(): void {
        this.isLoading.set(true);
        this.teacherService.getTeacherById(this.teacherId()).subscribe({
            next: (teacher: Teacher) => {
                this.teacher.set(teacher);
                this.isLoading.set(false);
            }
        });
    }

    getTeacherSubjects(): void {
        this.isLoading.set(true);
        this.teacherService.getTeacherSubjects(this.teacherId()).subscribe({
            next: (subjects: Subject[]) => {
                this.teacherSubjects.set(subjects);
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error(error);
                this.isLoading.set(false);
            }
        });
    }

    selectSubject(subject: Subject): void {
        this.selectedSubject.set(subject);
        // Create a Subject object with teacherSubjects populated from the teacher
        const teacher = this.teacher();
        if (teacher && teacher.teacherSubjects) {
            // Find the teacherSubject that matches this subject
            const matchingTeacherSubject = teacher.teacherSubjects.find(
                ts => ts.subjectId === subject.id
            );
            
            if (matchingTeacherSubject) {
                // Populate the teacherSubject with teacher and subject data
                const populatedTeacherSubject: TeacherSubject = {
                    ...matchingTeacherSubject,
                    teacher: teacher,
                    subject: subject
                };
                
                // Automatically select the teacher since we already know which teacher it is
                this.selectedTeacher.set(populatedTeacherSubject);
                
                // Set the subject with populated teacherSubjects
                const populatedSubject: Subject = {
                    ...subject,
                    teacherSubjects: [populatedTeacherSubject]
                };
                this.subject.set(populatedSubject);
            } else {
                this.subject.set(subject);
            }
        } else {
            this.subject.set(subject);
        }
    }

    selectTeacher(teacherSubject: TeacherSubject): void {
        this.selectedTeacher.set(teacherSubject);
    }

    goBackToSubjects(): void {
        this.selectedSubject.set(null);
        this.subject.set(null);
        this.selectedTeacher.set(null);
    }

    bookSlot(data: {slot: AvailabilitySlot, selectedDate: Date | null}): void {
        const subj = this.subject();
        if (subj && this.selectedTeacher()) {
            this.router.navigate(
                ['/booking', subj.id, 'teacher', this.selectedTeacher()?.teacherId, 'checkout'],
                {
                    queryParams: {
                        slot: JSON.stringify(data.slot),
                        selectedDate: data.selectedDate?.toISOString()
                    }
                }
            );
        }
    }
}
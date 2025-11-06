import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SubjectService } from "../../../shared/services/subject.service";
import { Subject, Teacher, TeacherService } from "../../../shared";

@Component({
    selector: 'app-browse-and-book',
    templateUrl: './browse-and-book.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
    providers: [SubjectService]
})
export default class BrowseAndBook implements OnInit{
    subjects = signal<Subject[]>([]);
    isLoading = signal(false);
    page = signal(1);
    limit = signal(3);
    total = signal(0);
    totalPages = signal(0);
    currentPage = signal(1);
    currentLimit = signal(10);
    currentTotal = signal(0);
    currentTotalPages = signal(0);
    teachers = signal<Teacher[]>([]);
    constructor(private subjectService: SubjectService,private readonly teacherService: TeacherService) {
        
    }
    ngOnInit(): void {
        this.getSubjects();
        this.getTeachers();
    }

    getSubjects(): void {
        this.subjectService.getSubjects(this.page(), this.limit()).subscribe((subjects) => {
            this.subjects.set(subjects.data);
            this.total.set(subjects.pagination.total);
            this.totalPages.set(subjects.pagination.totalPages);
        });
    }
    getTeachers(): void {
        this.teacherService.getTeachersWithPagination(this.page(), this.limit()).subscribe((teachers) => {
            this.teachers.set(teachers.data);
        });
    }
    formatAvailabilityDays(availabilities: any[] | undefined): string {
        if (!availabilities || availabilities.length === 0) {
            return '-';
        }
        const days = availabilities.map(a => a.dayOfWeek);
        const uniqueDays = [...new Set(days)];
        return uniqueDays.join(', ') || '-';
    }
}
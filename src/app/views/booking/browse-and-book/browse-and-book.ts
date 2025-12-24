import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SubjectService } from "../../../shared/services/subject.service";
import { Class, EnrollmentService, Subject, Teacher, TeacherSubject } from "../../../shared";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";
import { FormsModule } from "@angular/forms";
@Component({
    selector: 'app-browse-and-book',
    templateUrl: './browse-and-book.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ProfilePhoto, FormsModule],
    providers: [SubjectService]
})
export default class BrowseAndBook implements OnInit {
    subjects = signal<Subject[]>([]);
    isLoading = signal(false);

    // View state
    viewMode = signal<'teachers' | 'classes'>('teachers');
    searchQuery = signal('');
    selectedSubject = signal('');
    priceRange = signal(50000);

    // Pagination
    page = signal(1);
    limit = signal(12);
    total = signal(0);
    totalPages = signal(0);

    teachers = signal<Teacher[]>([]);
    classes = signal<Class[]>([]);
    constructor(private subjectService: SubjectService, private readonly enrollmentService: EnrollmentService) {

    }
    ngOnInit(): void {
        this.getSubjects();
        this.getTeachers();
        this.getClasses();
    }


    getClasses(): void {
        this.isLoading.set(true);
        const filters = {
            search: this.searchQuery(),
            subject: this.selectedSubject(),
            maxPrice: this.priceRange()
        };
        this.enrollmentService.browseClasses(this.page(), this.limit(), filters).subscribe({
            next: (res: any) => {
                this.classes.set(res.data);
                this.total.set(res.pagination.total);
                this.totalPages.set(res.pagination.totalPages);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    getSubjects(): void {
        this.subjectService.getSubjects(1, 100).subscribe((subjects) => {
            this.subjects.set(subjects.data);
        });
    }

    getTeachers(): void {
        this.isLoading.set(true);
        const filters = {
            search: this.searchQuery(),
            subject: this.selectedSubject(),
            maxPrice: this.priceRange()
        };
        this.enrollmentService.browseTeachers(this.page(), this.limit(), filters).subscribe({
            next: (res: any) => {
                this.teachers.set(res.data);
                this.total.set(res.pagination.total);
                this.totalPages.set(res.pagination.totalPages);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    applyFilters() {
        this.page.set(1);
        if (this.viewMode() === 'teachers') {
            this.getTeachers();
        } else {
            this.getClasses();
        }
    }

    switchView(mode: 'teachers' | 'classes') {
        this.viewMode.set(mode);
        this.page.set(1);
        this.applyFilters();
    }

    formatAvailabilityDays(availabilities: any[] | undefined): string {
        if (!availabilities || availabilities.length === 0) {
            return '-';
        }
        const days = availabilities.map(a => a.dayOfWeek);
        const uniqueDays = [...new Set(days)];
        return uniqueDays.join(', ') || '-';
    }
    // find min non zero monthly rate
    findMinRate(teacherSubjects: TeacherSubject[]): number {
        const nonZeroMonthlyRates = teacherSubjects.filter(ts => Number(ts.monthlyRate) > 0);
        if (nonZeroMonthlyRates.length === 0) {
            return 0;
        }
        return Math.min(...nonZeroMonthlyRates.map(ts => Number(ts.monthlyRate)));
    }

    isDayAvailable(availabilities: any[] | undefined, dayIndex: number): boolean {
        if (!availabilities) return false;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        // dayIndex 0 is Monday in our UI loop usually, but JS Date uses 0 for Sunday
        // Our UI loop indices for ['M','T','W','T','F','S','S'] are 0-6
        // Map 0 -> Monday, 1 -> Tuesday, ... 6 -> Sunday
        const uiToDayMap = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const targetDay = uiToDayMap[dayIndex];
        return availabilities.some(a => a.dayOfWeek === targetDay);
    }
}

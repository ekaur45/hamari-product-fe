import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Class, ClassService, TeacherService } from "../../../shared";
import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MONTH_MAP, MONTHS } from "../../../shared/constants/months";

@Component({
    selector: 'app-book-class',
    templateUrl: './book-class.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export default class BookClass {
    classId = signal<string>('');
    class = signal<Class | null>(null);
    isLoading = signal(false);
    months:{id: number, name: string}[] = MONTHS;
    selectedMonth = signal<string>( MONTH_MAP[new Date().getMonth() + 1].name);
    constructor(
        private route: ActivatedRoute,
        private classService: ClassService,
        private router: Router
    ) {
        this.route.params.subscribe(params => {
            this.classId.set(params['id']);
            this.getClasses();
        });
    }
    ngOnInit(): void {
    }

    getClasses(): void {
        this.isLoading.set(true);
        this.classService.getClassById(this.classId()).subscribe({
            next: (classes) => {
                this.class.set(classes);
                this.isLoading.set(false);
            },
            error: (error) => {
                this.isLoading.set(false);
            }
        });
    }
    bookClass(): void {
        const data = {
            month: this.selectedMonth(),
            year: new Date().getFullYear()
        }
        this.classService.bookClass(this.classId(), data).subscribe({
            next: (response) => {
                console.log(response);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }
}
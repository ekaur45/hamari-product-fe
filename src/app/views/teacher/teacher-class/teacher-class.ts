import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { DialogModule } from "primeng/dialog";
import { TeacherService } from "../../../shared/services/teacher.service";
import { AuthService, Class, User } from "../../../shared";
import { AddClass } from "./add-class/add-class";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";

@Component({
    selector: 'app-teacher-class',
    standalone: true,
    templateUrl: './teacher-class.html',
    imports: [CommonModule, RouterModule, DialogModule, AddClass, ToastModule],
    providers: [MessageService]
})
export default class TeacherClass implements OnInit {
    currentUser = signal<User | null>(null);
    classes = signal<Class[]>([]);
    isLoading = signal(false);
    showAddClassDialog = signal(false);

    constructor(
        private teacherService: TeacherService,
        private authService: AuthService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.currentUser.set(this.authService.getCurrentUser());
        this.getTeacherClasses();
    }

    getTeacherClasses() {
        this.isLoading.set(true);
        this.teacherService.getTeacherClasses(this.authService.getCurrentUser()?.id!).subscribe({
            next: (classes) => {
                this.classes.set(classes);
                this.isLoading.set(false);
            },
            error: (error) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load classes'
                });
            }
        });
    }

    onAddNewClass() {
        this.showAddClassDialog.set(true);
    }

    onClassAdded(newClass: Class) {
        this.showAddClassDialog.set(false);
        // Refresh the classes list
        this.getTeacherClasses();
    }

    onDialogClose() {
        this.showAddClassDialog.set(false);
    }
}
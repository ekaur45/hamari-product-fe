import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, ViewEncapsulation } from "@angular/core";
import { RouterModule } from "@angular/router";
import { DialogModule } from "primeng/dialog";
import { TeacherService } from "../../../shared/services/teacher.service";
import { AuthService, Class, User } from "../../../shared";
import { AddClass } from "./add-class/add-class";
import { ConfirmationService, MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ConfirmDialog, ConfirmDialogModule } from "primeng/confirmdialog";
import { ButtonModule } from "primeng/button";

@Component({
    selector: 'app-teacher-class',
    standalone: true,
    templateUrl: './teacher-class.html',
    styleUrls: ['./teacher-class.css'],
    imports: [CommonModule, RouterModule, DialogModule, AddClass, ToastModule, ConfirmDialogModule, ButtonModule],
    providers: [MessageService],
    encapsulation: ViewEncapsulation.None
})
export default class TeacherClass implements OnInit {
    currentUser = signal<User | null>(null);
    classes = signal<Class[]>([]);
    isLoading = signal(false);
    showAddClassDialog = signal(false);
    constructor(
        private teacherService: TeacherService,
        private authService: AuthService,
        private messageService: MessageService,
        private confirmDialog: ConfirmationService
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
    onDeleteClass(_class: Class,event: Event) {
        this.confirmDialog.confirm({
            target: event.target as EventTarget,
            header: 'Delete Class',
            message: 'Are you sure you want to delete this class?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            acceptButtonStyleClass: 'p-confirmdialog-accept-button',
            rejectButtonStyleClass: 'p-confirmdialog-reject-button',
            accept: () => {
              this.onDeleteClassConfirmed(_class,event);
            }
        });
    }
    onDeleteClassConfirmed(_class: Class,event: Event) {
        const button = event.target as HTMLButtonElement;
        button.disabled = true;
        button.textContent = 'Deleting...';
        this.teacherService.deleteClass(_class.teacher.id!, _class.id!).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Class deleted successfully' });
                button.disabled = false;
                button.textContent = 'Delete';
                this.getTeacherClasses();
            },
            error: (error) => {
                button.disabled = false;
                button.textContent = 'Delete';
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete class' });
            }
        });
    }

}
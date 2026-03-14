import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ReactiveFormsModule, Validators } from "@angular/forms";
import { FormControl } from "@angular/forms";
import { FormGroup } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { SelectModule } from "primeng/select";
import { UserRole } from "@/app/shared";
@Component({
    selector: 'app-add-teacher',
    standalone: true,
    templateUrl: './add-teacher.html',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, PasswordModule, SelectModule],
})
export class AddTeacher implements OnInit {
    addTeacherForm: FormGroup = new FormGroup({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    });
    UserRole = UserRole;
    constructor() { }
    ngOnInit(): void {
        throw new Error("Method not implemented.");
    }

    getFieldError(fieldName: string): string {
        const field = this.addTeacherForm.get(fieldName);
        if (field?.errors && field.touched) {
            if (field.errors['required']) {
                return `${fieldName} is required`;
            }
        }
        return '';
    }
    onSubmit() {

    }
}
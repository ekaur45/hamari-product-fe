import { CommonModule } from "@angular/common";
import { Component, EventEmitter, OnInit, Output, signal } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { User, UserRole } from "../../../../shared";
import { UserService } from "../../../../shared/services/user.service";
import { Router } from "@angular/router";
import { ProgressBarModule } from "primeng/progressbar";



@Component({
    selector: 'app-add-user',
    standalone: true,
    templateUrl: './add-user.html',
    imports: [CommonModule,ReactiveFormsModule,SelectModule,ProgressBarModule],
})
export class AddUser implements OnInit {
    @Output() onUserAdded = new EventEmitter<User>();
    @Output() onCancel = new EventEmitter<void>();


    passwordMatchValidator: ValidatorFn = (group) => {
        const password = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return password === confirm ? null : { passwordMismatch: true } as ValidationErrors;
      };
    addUserForm: FormGroup = new FormGroup({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
        role: new FormControl('', [Validators.required]),
    }, {
        validators: this.passwordMatchValidator
    });
    UserRole = UserRole;
    isLoading = signal(false);
        constructor(private userService: UserService, private router: Router
    ) {
    }
    ngOnInit(): void {
    }
    onSubmit(): void {
        if (this.addUserForm.valid) {
            this.isLoading.set(true);
            const userData = this.addUserForm.value;
            delete userData.confirmPassword;
            this.userService.createUser(userData).subscribe({
                next: (response: User) => {
                    this.isLoading.set(false);
                    this.addUserForm.reset();
                    this.onUserAdded.emit(response);
                },
                error: (error) => {
                    this.isLoading.set(false);
                }
            });
        }
    }

    getFieldError(fieldName: string): string {
        const field = this.addUserForm.get(fieldName);
        if (field?.errors && field.touched) {
            if (field.errors['required']) {
                return `${this.getFieldName(fieldName)} is required`;
            }
        }
        return '';
    }
    getFieldName(fieldName: string): string {
        const labels: { [key: string]: string } = {
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            password: 'Password',
            confirmPassword: 'Confirm Password',
            role: 'Role'
        };
        return labels[fieldName] || fieldName;
    }
}
import { CommonModule } from "@angular/common";
import { Component, computed, effect, input, Input, OnInit, output } from "@angular/core";
import { User } from "../../../shared";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { ProfileService } from "../../../shared/services/profile.service";

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    selector: 'app-userinfo',
    templateUrl: './userinfo.html',
    providers: [ProfileService]
})
export class UserInfo implements OnInit {
    user = input<User | null>(null);
    nextStep = output<void>();

    userForm = new FormGroup({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    });
    constructor(private profileService: ProfileService) {
        effect(() => {
            const u = this.user();
            if (u) {
                this.userForm.patchValue({
                    firstName: u.firstName,
                    lastName: u.lastName,
                });
            }
        });
    }
    ngOnInit(): void {

    }
   

    get hasChanges() {
        return this.userForm.dirty && this.userForm.valid;
    }

    onSaveChanges() {
        this.profileService.updateProfile( this.user()?.id as string, this.userForm.value as User).subscribe((profile) => {
            //this.user.set(profile);
            this.nextStep.emit();
        });
    }
}
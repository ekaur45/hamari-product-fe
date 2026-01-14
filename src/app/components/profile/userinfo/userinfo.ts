import { CommonModule } from "@angular/common";
import { Component, computed, effect, input, Input, OnInit, output, signal, ViewEncapsulation } from "@angular/core";
import { User } from "../../../shared";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { ProfileService } from "../../../shared/services/profile.service";
import { CountryISO, NgxIntlTelInputModule, PhoneNumberFormat, SearchCountryField } from "ngx-intl-tel-input";
import { Select } from "primeng/select";
import { DatePicker } from "primeng/datepicker";
import { NationalityService } from "../../../shared/services/nationality.service";
import { Nationality } from "../../../shared/models/nationality.interface";

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgxIntlTelInputModule, Select, DatePicker],
    selector: 'app-userinfo',
    templateUrl: './userinfo.html',
    providers: [ProfileService, NationalityService],
    styleUrls: ['./userinfo.css'],
    encapsulation: ViewEncapsulation.None,
})
export class UserInfo implements OnInit {
    user = input<User | null>(null);
    nextStep = output<void>();
    isSaving = signal(false);
    CountryISO: typeof CountryISO = CountryISO;
    SearchCountryField: typeof SearchCountryField = SearchCountryField;
    PhoneNumberFormat: typeof PhoneNumberFormat = PhoneNumberFormat;
    nationalities = signal<Nationality[]>([]);
    userForm = new FormGroup({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2)]),
        phone: new FormControl('', [Validators.required, Validators.minLength(10)]),
        nationality: new FormControl('', [Validators.required]),
        dob: new FormControl('', [Validators.required]),
        gender: new FormControl('', [Validators.required]),
        address: new FormControl('', [Validators.required]),
        city: new FormControl('', [Validators.required]),
        state: new FormControl('', [Validators.required]),
        zip: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required])
    });
    constructor(private profileService: ProfileService, private nationalityService: NationalityService) {
        effect(() => {
            const u = this.user();
            if (u) {
                this.userForm.patchValue({
                    firstName: u.firstName,
                    lastName: u.lastName,
                    phone: u.details?.phone ?? '',
                });
            }
        });
    }
    ngOnInit(): void {
        this.getNationalities();
    }
    getNationalities() {
        this.nationalityService.getNationalities().subscribe({
            next: (nationalities) => {
                this.nationalities.set(nationalities);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }

    get hasChanges() {
        return this.userForm.dirty && this.userForm.valid;
    }

    onSaveChanges() {
        this.isSaving.set(true);
        this.profileService.updateProfile( this.user()?.id as string, this.userForm.value as User).subscribe((profile) => {
            this.isSaving.set(false);
            //this.user.set(profile);
            this.nextStep.emit();
        });
    }
}
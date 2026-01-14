import { CommonModule } from "@angular/common";
import { Component, computed, effect, input, Input, OnInit, output, signal, ViewEncapsulation } from "@angular/core";
import { UpdateUserDetailsDto, User, UserDetails } from "../../../shared";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { ProfileService } from "../../../shared/services/profile.service";
import { CountryISO, NgxIntlTelInputModule, PhoneNumberFormat, SearchCountryField } from "ngx-intl-tel-input";
import { Select } from "primeng/select";
import { DatePicker } from "primeng/datepicker";
import { NationalityService } from "../../../shared/services/nationality.service";
import { Nationality } from "../../../shared/models/nationality.interface";
import { MessageService } from "primeng/api";


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
        phone: new FormControl<any | null>(null, [Validators.required, Validators.minLength(10)]),
        nationalityId: new FormControl('', []),
        dateOfBirth: new FormControl<Date | null>(null, []),
        gender: new FormControl('', []),
        address: new FormControl('', []),
        city: new FormControl('', []),
        state: new FormControl('', []),
        zipCode: new FormControl('', []),
        country: new FormControl('', [])
    });
    constructor(private profileService: ProfileService, private nationalityService: NationalityService, private messageService: MessageService) {
        effect(() => {
            const u = this.user();
            if (u) {
                this.userForm.patchValue({
                    firstName: u.firstName,
                    lastName: u.lastName,
                    phone: u.details?.phone ?? '',
                    dateOfBirth: u.details?.dateOfBirth ? new Date(u.details.dateOfBirth) : null,
                    nationalityId: u.details?.nationalityId ?? '',
                    gender: u.details?.gender ?? '',
                    address: u.details?.address ?? '',
                    city: u.details?.city ?? '',
                    state: u.details?.state ?? '',
                    zipCode: u.details?.zipCode ?? '',
                    country: u.details?.country ?? ''
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
        const userDetails: UpdateUserDetailsDto = {
            ...(this.userForm.value as UpdateUserDetailsDto),
            phone: this.userForm.value.phone?.e164Number ?? '',
            dateOfBirth: this.userForm.value.dateOfBirth ?? null as Date | null,
            gender: this.userForm.value.gender ?? '',
        }
        this.profileService.updateProfile( this.user()?.id as string, userDetails).subscribe({
            next: (profile) => {
                this.isSaving.set(false);
                this.nextStep.emit();
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
                this.isSaving.set(false);
            }
        });
    }
}
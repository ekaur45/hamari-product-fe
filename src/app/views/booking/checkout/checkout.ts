import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AvailabilitySlot, Subject, Teacher } from "../../../shared/models";
import { PaymentService, SubjectService, TeacherService } from "../../../shared";
import { CommonModule, DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-checkout',
    templateUrl: './checkout.html',
    standalone: true,
    imports: [DatePipe, RouterModule, DialogModule, FormsModule, CommonModule],
})
export default class Checkout implements OnInit {
    subjectId = signal<string>('');
    teacherId = signal<string>('');
    slot = signal<AvailabilitySlot | null>(null);
    selectedDate = signal<Date | null>(null);
    teacher = signal<Teacher | null>(null);
    subject = signal<Subject | null>(null);
    isLoading = signal<boolean>(true);
    showPaymentDialog = signal<boolean>(false);
    selectedPaymentMethod = signal<string>('');

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private teacherService: TeacherService,
        private subjectService: SubjectService,
        private paymentService: PaymentService
    ) {
        this.route.params.subscribe(params => {
            this.subjectId.set(params['subjectId']);
            this.teacherId.set(params['teacherId']);
            this.getTeacherById();
            this.getSubjectById();
        });

        this.route.queryParams.subscribe(params => {
            this.slot.set(JSON.parse(params['slot']));
            this.selectedDate.set(params['selectedDate']);
        });
    }

    ngOnInit(): void {
        // Set loading to false once data is loaded
        Promise.all([
            new Promise(resolve => {
                if (this.teacherId()) {
                    this.getTeacherById();
                    setTimeout(resolve, 100);
                } else {
                    resolve(null);
                }
            }),
            new Promise(resolve => {
                if (this.subjectId()) {
                    this.getSubjectById();
                    setTimeout(resolve, 100);
                } else {
                    resolve(null);
                }
            })
        ]).then(() => {
            this.isLoading.set(false);
        });
    }

    // get teacher by id when teacher id is available
    getTeacherById(): void {
        this.teacherService.getTeacherById(this.teacherId()).subscribe({
            next: (teacher) => {
                this.teacher.set(teacher);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }

    // get subject by id when subject id is available
    getSubjectById(): void {
        this.subjectService.getSubjectById(this.subjectId()).subscribe({
            next: (subject) => {
                this.subject.set(subject);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }

    proceedToCheckout(): void {
        this.showPaymentDialog.set(true);
    }

    selectPaymentMethod(method: string): void {
        this.selectedPaymentMethod.set(method);
    }

    confirmPayment(): void {
        if (!this.selectedPaymentMethod()) {
            return;
        }
        this.paymentService.createPaymentIntent({
            subjectId: this.subjectId(),
            teacherId: this.teacherId(),
            slotId: this.slot()!.id!,
            selectedDate: this.selectedDate(),
            paymentMethod: this.selectedPaymentMethod()
        }).subscribe({
            next: (paymentIntent) => {
                console.log('Payment intent created:', paymentIntent);
                this.router.navigate(['/booking', paymentIntent.id, 'test-payment']);
            },
            error: (error) => {
                console.error('Error creating payment intent:', error);
            }
        });

        // Close dialog and process payment
        this.showPaymentDialog.set(false);
        // Add your payment processing logic here based on selectedPaymentMethod
    }

    closePaymentDialog(): void {
        this.showPaymentDialog.set(false);
        this.selectedPaymentMethod.set('');
    }
}
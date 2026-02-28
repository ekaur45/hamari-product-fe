import { AuthService, HTTP_STATUS, Review, StudentService, TeacherBookingDto } from "@/app/shared";
import { CommonModule } from "@angular/common";
import { Component, HostListener, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Dialog, DialogModule } from "primeng/dialog";
import { ProfilePhoto } from "@/app/components/misc/profile-photo/profile-photo";
import { RelativeTimePipe } from "@/app/shared/pipes/relative-time.pipe";

@Component({
    templateUrl:'./student-booking-details.html',
    imports: [CommonModule, DialogModule, RouterModule, ProfilePhoto,RelativeTimePipe]
})
export class StudentBookingDetails{
    bookingDetails = signal<TeacherBookingDto | null>(null);
    isLoading = signal<boolean>(true);
    bookingId = signal<string>("");
    constructor(
        private router:Router,
        private ar:ActivatedRoute,
        private authService:AuthService,
        private studentService:StudentService
    ){
        this.ar.params.subscribe(param=>{
            if(param["bookingId"]){
                this.bookingId.set(param["bookingId"]);
                this.getBookingDetails();
            }
        })
    }

    getBookingDetails(){
        this.studentService.getBookingDetails(this.authService.getCurrentUser()!.id,this.bookingId()).subscribe({
            next:(resp)=>{
                this.isLoading.set(false);
                if(resp.statusCode === HTTP_STATUS.OK){
                    this.bookingDetails.set(resp.data);
                }
            },
            error:()=>{
                this.isLoading.set(false);
            }
        })
    }
    @HostListener("window:keydown", ["$event"])
    onKeydown(e: KeyboardEvent): void {

        if (e.key === "Escape") {
            e.preventDefault();
            this.router.navigate(['/student/bookings']);
        }
        return;
    }

    checkIsOwnReview(review:Review){
        return this.authService.getCurrentUser()!.id == review.reviewerId;
    }
}
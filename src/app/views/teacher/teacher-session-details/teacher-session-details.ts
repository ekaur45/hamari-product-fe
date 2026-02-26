import { ApiResponse, AuthService, HTTP_STATUS, TeacherBookingDto, TeacherService, TeacherSessionDetailsDto } from "@/app/shared";
import { CommonModule } from "@angular/common";
import { Component, HostListener, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink, RouterModule } from "@angular/router";
import { ProfilePhoto } from "@/app/components/misc/profile-photo/profile-photo";

@Component({
    templateUrl: './teacher-session-details.html',
    imports: [CommonModule, RouterModule, RouterLink, ProfilePhoto]
})
export class TeacherSessionDetails {
    sessionId = signal<string | null>(null);
    isLoading = signal<boolean>(true);
    sessionDetails = signal<TeacherBookingDto | null>(null);
    constructor(
        private router: Router,
        private ar: ActivatedRoute,
        private teacherService:TeacherService,
        private authService:AuthService
    ) {
        this.ar.params.subscribe(param => {
            if (param['sessionId']) {
                this.sessionId.set(param['sessionId'])
                this.getTeacherSessionDetails();
            }
        });
    }
    getTeacherSessionDetails(){
        this.isLoading.set(true);
        this.teacherService.getTeacherSessionDetails(this.authService.getCurrentUser()!.id,this.sessionId()!).subscribe({
            next:(resp:ApiResponse<TeacherSessionDetailsDto>)=>{
                this.isLoading.set(false);
                if(resp.statusCode === HTTP_STATUS.OK){
                    this.sessionDetails.set(resp.data.details)
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
            this.router.navigate(['/teacher/sessions']);
        }
        return;
    }
}
import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AuthService } from "../../shared/services/auth.service";
import { ROUTES_MAP } from "../../shared/constants/routes-map";

@Component({
    selector: 'app-class-room',
    standalone: true,
    templateUrl: './class-room.html',
    styleUrls: ['./class-room.css'],
    imports: [CommonModule, RouterModule],
})
export default class ClassRoom {
    bookingId = signal<string>('');
    dashboardLink = signal<string>('');
    constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router) {
        this.dashboardLink.set(ROUTES_MAP[this.authService.getCurrentUser()!.role]['SCHEDULE']);
        this.route.params.subscribe(params => {
            this.bookingId.set(params['bookingId']);
        });
    }

    leaveSession(): void {
        this.router.navigate([this.dashboardLink()]);
    }
}
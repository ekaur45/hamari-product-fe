import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { ProfileService } from "../services/profile.service";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, of, take } from "rxjs";
import { AuthService } from "../services/auth.service";

@Injectable({
    providedIn: 'root'
})
export class ProfileGuard implements CanActivate {
    constructor(private router: Router, private authService: AuthService) {
    }
    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {
        if (this.authService.getCurrentUser()?.hasCompletedProfile) {
            return true;
        } else {
            this.router.navigate(['/auth/onboarding']);
            return false;
        }
        return false;
        // return .pipe(
        //     take(1),
        //     map(user => {
        //         debugger;
        //     }),
        //     catchError(() => of(false))
        // );
    }
}
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, catchError, map, of, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Guard
 * Protects routes that require user authentication
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Ensure auth state is restored on hard refresh
    return this.authService.pingAuth().pipe(
      map((user) => {
        if(user.statusCode === 200) {
          return true;
        } else {
          return false;
        }
      }),
      catchError((error) => {
        this.authService.logout().subscribe(() => {
          this.router.navigate(['/auth/login']);
        });
        return of(false);
      })
    );
    // this.authService.restoreFromStorage();
    // return this.authService.isAuthenticated$.pipe(
    //   take(1),
    //   map(isAuthenticated => {
    //     if (isAuthenticated) {
    //       return true;
    //     } else {
    //       // Redirect to login page with return URL
    //       this.router.navigate(['/auth/login'], { 
    //         queryParams: { returnUrl: state.url } 
    //       });
    //       return false;
    //     }
    //   })
    // );
  }
}

/**
 * Role-based Authentication Guard
 * Protects routes that require specific user roles
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {


    const requiredRoles = route.data['roles'] as string[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role requirements
    }
    // return this.authService.getProfile().pipe(
    //   map((user) => {
    //     this.authService.setCurrentUser(user);
    //     const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
    //     if (!hasRequiredRole) {
    //       this.router.navigate(['/dashboard']); // Redirect to dashboard if no permission
    //       return false;
    //     }
    //     return true;
    //   }),
    //   catchError((error) => {
    //     this.authService.logout();
    //     return of(false);
    //   })
    // );



    return this.authService.pingAuth().pipe(
      take(1),
      map(response => {
        if(response.statusCode === 200) {
          const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
          if (!hasRequiredRole) {
            this.router.navigate(['/dashboard']); // Redirect to dashboard if no permission
            return false;
          }
          return true;
        } else {
          return false;
        }       
      })
    );
  }
}

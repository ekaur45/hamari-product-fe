import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User, UserRole } from '../models';

/**
 * Authentication Guard
 * Protects routes that require user authentication.
 * Asks the backend (/auth/ping) whether the session cookie is still valid,
 * and sends users with an unverified email to the OTP page.
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
  ): Observable<boolean | UrlTree> {
    return this.authService.pingAuth().pipe(
      take(1),
      map((response) => {
        const user = response.data as User | null;
        if (response.statusCode !== 200 || !user) {
          return this.loginUrl(state.url);
        }
        if (user.isEmailVerified === false && user.role !== UserRole.ADMIN) {
          return this.router.createUrlTree(['/auth/otp', btoa(user.email)], {
            queryParams: { returnUrl: state.url }
          });
        }
        return true;
      }),
      catchError(() => {
        // Session is missing, expired or the account is deactivated.
        this.authService.clearSession();
        this.authService.logout().subscribe({ error: () => { } });
        return of(this.loginUrl(state.url));
      })
    );
  }

  private loginUrl(returnUrl: string): UrlTree {
    return this.router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
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

    // Use the role from the server-validated session, not the copy in localStorage.
    return this.authService.pingAuth().pipe(
      take(1),
      map(response => {
        if (response.statusCode === 200 && response.data) {
          const hasRequiredRole = requiredRoles.includes(response.data.role);
          if (!hasRequiredRole) {
            this.router.navigate(['/dashboard']); // Redirect to dashboard if no permission
            return false;
          }
          return true;
        } else {
          return false;
        }
      }),
      catchError(() => of(false))
    );
  }
}

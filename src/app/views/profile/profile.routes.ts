import { Routes } from "@angular/router";

export const profileRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./profile-view/profile-view').then(m => m.ProfileView)
    },
    {
        path: 'edit/:step',
        loadComponent: () => import('./profile-edit/profile-edit').then(m => m.ProfileEdit)
    }
]
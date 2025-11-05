import { Routes } from "@angular/router";
import { ProfileView } from "./profile-view/profile-view";
import { ProfileEdit } from "./profile-edit/profile-edit";

export const profileRoutes: Routes = [
    {
        path: '',
        component: ProfileView
    },
    {
        path: 'edit/:step',
        component: ProfileEdit
    }
]
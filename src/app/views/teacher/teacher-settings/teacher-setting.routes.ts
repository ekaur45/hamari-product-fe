import { Routes } from "@angular/router";

export const teacherRoutes: Routes = [
    {
        path:'',
        loadComponent:()=>import('./teacher-settings').then(c=>c.TeacherSettings),
        children:[
            {
                path:'',redirectTo:'general',pathMatch:'full'
            },
            {
                path:'general',
                loadComponent:()=>import('./general-settings/general-settings').then(c=>c.GeneralSettings)
            },
            {
                path:'change-password',
                loadComponent:()=>import('./change-password/change-password').then(c=>c.ChangePassword)
            },
            {
                path:'rate',
                loadComponent: () => import('./rate-setting/rate-setting').then(m => m.RateSettings)
            }
        ]
    }
]
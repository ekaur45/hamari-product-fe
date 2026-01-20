import { Routes } from "@angular/router";
import { Onboarding } from "./onboarding";

export const onboardingRoutes: Routes = [
    {
        path: '',
        component: Onboarding,
        children: [
            {
                path: 'profile-photo-step',
                loadComponent: () => import('./profile-photo-step/profile-photo-step').then(m => m.ProfilePhotoStep)
            },
            {
                path: 'personal-info-step',
                loadComponent: () => import('./personal-info-step/personal-info-step').then(m => m.PersonalInfoStep)
            },
            {
                path: 'introduction-step',
                loadComponent: () => import('./introduction-step/introduction-step').then(m => m.IntroductionStep)
            },
            {
                path: 'education-step',
                loadComponent: () => import('./education-step/education-step').then(m => m.EducationStep)
            },
            {
                path: 'subjects-step',
                loadComponent: () => import('./subjects-step/subjects-step').then(m => m.SubjectsStep)
            },
            {
                path: 'availability-step',
                loadComponent: () => import('./availability-step/availability-step').then(m => m.AvailabilityStep)
            },
            {
                path: 'final-step',
                loadComponent: () => import('./final-step/final-step').then(m => m.FinalStep)
            }
            
        ]
    }
]
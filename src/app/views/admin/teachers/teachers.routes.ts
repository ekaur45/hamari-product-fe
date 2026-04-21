import { Routes } from '@angular/router';
import { TeacherList } from './teacher-list/teacher-list';
import { TeacherDetails } from './teacher-details/teacher-details';
import { AddTeacher } from './add-teacher/steps/add/add-teacher';
import { AddTeacherLayout } from './add-teacher/add-teacher-layout';
import { ProfilePhoto } from '@/app/components/misc/profile-photo/profile-photo';
import { PersonalInfoStep } from '../../auth/onboarding/personal-info-step/personal-info-step';
import { EducationStep } from '../../auth/onboarding/education-step/education-step';
import { SubjectsStep } from '../../auth/onboarding/subjects-step/subjects-step';
import { AvailabilityStep } from '../../auth/onboarding/availability-step/availability-step';
import { RatesStep } from '../../auth/onboarding/rates-step/rates-step';
import { FinalStep } from '../../auth/onboarding/final-step/final-step';


export const teachersRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: TeacherList,
    children: [
        {
            path: ':teacherId',
            component: TeacherDetails,
            outlet: 'teacherDetailsOutlet'
        },
        {
            path: 'add',
            component: AddTeacherLayout,
            outlet: 'addTeacherOutlet',
            children: [
                {
                    path:'',redirectTo:'add',pathMatch:'full'
                },
                {
                    path:'add',
                    component: AddTeacher
                },
                {
                    path:'profile-photo',
                    component: ProfilePhoto
                },
                {
                    path:'personal-info',
                    component: PersonalInfoStep
                },
                {
                    path:'education',
                    component: EducationStep
                },
                {
                    path:'subjects',
                    component: SubjectsStep
                },
                {
                    path:'availability',
                    component: AvailabilityStep
                },
                {
                    path:'rates',
                    component: RatesStep
                },
                {
                    path:'final',
                    component: FinalStep
                }
            ]
        }
    ]
 }
];



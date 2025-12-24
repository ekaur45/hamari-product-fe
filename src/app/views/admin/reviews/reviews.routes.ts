import { Routes } from '@angular/router';
import { ReviewList } from './review-list/review-list';

export const reviewsRoutes: Routes = [
 {
    path:'',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: ReviewList
 },
];


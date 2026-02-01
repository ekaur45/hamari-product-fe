import { Routes } from "@angular/router";

export const bookingRoutes: Routes = [
    {
        path: '',
        redirectTo: 'teachers',
        pathMatch: 'full'
    },
    {
        path: ':viewMode',
        loadComponent: () => import('./browse-and-book/browse-and-book').then(m => m.BrowseAndBook)        
    },
    {
        path:':id/session',
        loadComponent: () => import('./book-session/book-session').then(m => m.BookSession)
    },
    {
        path:':id/class',
        loadComponent: () => import('./book-class/book-class').then(m => m.BookClass)
    },
    {
        path:':id/teacher',
        loadComponent: () => import('./book-teacher/book-teacher').then(m => m.BookTeacher)
    },
    {
        path:':subjectId/teacher/:teacherId/checkout',
        loadComponent: () => import('./checkout/checkout').then(m => m.Checkout)
    },
    {
        path:':bookingId/test-payment',
        loadComponent: () => import('./test-payment/test-payment').then(m => m.TestPayment)
    }
]
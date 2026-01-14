import { Routes } from "@angular/router";
import BrowseAndBook from "./browse-and-book/browse-and-book";
import BookClass from "./book-class/book-class";
import BookSession from "./book-session/book-session";
import BookTeacher from "./book-teacher/book-teacher";
import Checkout from "./checkout/checkout";
import TestPayment from "./test-payment/test-payment";

export const bookingRoutes: Routes = [
    {
        path: '',
        redirectTo: 'teachers',
        pathMatch: 'full'
    },
    {
        path: ':viewMode',
        component: BrowseAndBook        
    },
    {
        path:':id/session',
        component: BookSession
    },
    {
        path:':id/class',
        component: BookClass
    },
    {
        path:':id/teacher',
        component: BookTeacher
    },
    {
        path:':subjectId/teacher/:teacherId/checkout',
        component: Checkout
    },
    {
        path:':bookingId/test-payment',
        component: TestPayment
    }
]
import { Routes } from "@angular/router";
import BrowseAndBook from "./browse-and-book/browse-and-book";
import BookClass from "./book-class/book-class";
import BookTeacher from "./book-teacher/book-teacher";

export const bookingRoutes: Routes = [
    {
        path: '',
        component: BrowseAndBook
    },
    {
        path:':id/class',
        component: BookClass
    },
    {
        path:':id/teacher',
        component: BookTeacher
    }
]
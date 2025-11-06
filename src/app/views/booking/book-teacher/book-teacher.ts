import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
    selector: 'app-book-teacher',
    standalone: true,
    templateUrl: './book-teacher.html',
    imports: [CommonModule],
})
export default class BookTeacher {
    constructor() {
    }
}
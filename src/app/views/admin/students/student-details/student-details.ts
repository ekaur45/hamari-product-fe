import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
    selector: 'app-student-details',
    templateUrl: './student-details.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export class StudentDetails implements OnInit {
    constructor() { }
    ngOnInit(): void {
        throw new Error("Method not implemented.");
    }
}
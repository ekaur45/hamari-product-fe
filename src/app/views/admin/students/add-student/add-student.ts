import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
    selector: 'app-add-student',
    templateUrl: './add-student.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export class AddStudent implements OnInit {
    constructor() { }
    ngOnInit(): void {
        throw new Error("Method not implemented.");
    }
}
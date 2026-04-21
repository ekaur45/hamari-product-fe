import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule, RouterOutlet } from "@angular/router";

@Component({
    selector: 'app-add-teacher-layout',
    templateUrl: './add-teacher-layout.html',
    standalone: true,
    imports: [CommonModule, RouterModule, RouterOutlet],
})
export class AddTeacherLayout implements OnInit {
    constructor() { }
    ngOnInit(): void {
        throw new Error("Method not implemented.");
    }
}
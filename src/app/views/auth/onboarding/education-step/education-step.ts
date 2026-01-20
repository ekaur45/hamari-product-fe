import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
@Component({
    selector: 'app-education-step',
    templateUrl: './education-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class EducationStep {
    constructor() {
    }
}
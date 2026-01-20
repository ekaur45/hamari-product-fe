import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
@Component({
    selector: 'app-subjects-step',
    templateUrl: './subjects-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class SubjectsStep {
    constructor() {
    }
}
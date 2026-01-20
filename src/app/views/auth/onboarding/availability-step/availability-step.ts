import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
@Component({
    selector: 'app-availability-step',
    templateUrl: './availability-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class AvailabilityStep {
    constructor() {
    }
}
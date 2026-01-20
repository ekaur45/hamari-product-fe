import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
    selector: 'app-final-step',
    templateUrl: './final-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class FinalStep {
}
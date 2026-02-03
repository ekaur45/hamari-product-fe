import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { SharedNotification } from "../../shared/shared-notification/shared-notification";

@Component({
    selector: 'app-student-notifications',
    templateUrl: './student-notifications.html',
    imports: [CommonModule, SharedNotification],
})
export class StudentNotifications implements OnInit {
    constructor() {
    }
    ngOnInit(): void {
    }
}
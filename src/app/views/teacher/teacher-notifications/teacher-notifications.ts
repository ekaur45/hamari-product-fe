import { Component, OnInit } from "@angular/core";
import { SharedNotification } from "../../shared/shared-notification/shared-notification";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-teacher-notifications',
    templateUrl: './teacher-notifications.html',
    imports: [CommonModule, SharedNotification],
})
export class TeacherNotifications implements OnInit {
    constructor() {
    }
    ngOnInit(): void {
    }
}
import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
    selector: 'app-teacher-settings',
    standalone: true,
    templateUrl: './teacher-settings.html',
    imports: [CommonModule],
})
export default class TeacherSettings {
    constructor() {
    }
}
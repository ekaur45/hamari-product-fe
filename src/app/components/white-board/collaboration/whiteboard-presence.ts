import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProfilePhoto } from "../../misc/profile-photo/profile-photo";

export interface WhiteboardUser {
    userId: string;
    userName: string;
    userAvatar?: string;
    role: 'teacher' | 'student';
    cursorX?: number;
    cursorY?: number;
    isActive: boolean;
}

@Component({
    selector: 'app-whiteboard-presence',
    standalone: true,
    imports: [CommonModule, ProfilePhoto],
    templateUrl: './whiteboard-presence.html'
})
export class WhiteboardPresence {
    activeUsers = input.required<WhiteboardUser[]>();
}


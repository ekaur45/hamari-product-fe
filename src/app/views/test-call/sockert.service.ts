// src/app/services/socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    socket: Socket;

    constructor() {
        this.socket = io(environment.socketUrl);
    }

    joinRoom(roomId: string, userId: string) {
        this.socket.emit('joinRoom', { roomId, userId });
    }

    sendSignal(roomId: string, userId: string, signal: any) {
        this.socket.emit('signal', { roomId, userId, signal });
    }

    on(event: string, callback: (...args: any[]) => void) {
        this.socket.on(event, callback);
    }
}

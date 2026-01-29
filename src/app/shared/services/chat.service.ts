import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS, SOCKET } from '../constants';
import { Chat, ChatResource, ChatUser, Conversation } from '../models/chat.interface';
import { ApiResponse, PaginatedApiResponse } from '../models';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private readonly socketUrl = environment.socketUrl;
    private socket!: Socket; // Shared socket instance
    constructor(private apiService: ApiService) { }
    getChatUsers(): Observable<ApiResponse<Conversation[]>> {
        return this.apiService.get<Conversation[]>(API_ENDPOINTS.CHATS.USERS);
    }
    getChatMessages(conversationId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedApiResponse<Chat>>> {
        return this.apiService.getPaginated<Chat>(API_ENDPOINTS.CHATS.BASE, page, limit, { params: { conversationId: conversationId } });
    }

    sendMessage(conversationId: string, receiverId: string, message: string, resources: ChatResource[] = []): Observable<ApiResponse<Chat>> {
        return this.apiService.post<Chat>(API_ENDPOINTS.CHATS.SEND, { conversationId: conversationId, receiverId: receiverId, message: message, resources: resources });
    }
    uploadFile(file: File): Observable<ApiResponse<{url: string}>> {
        return this.apiService.uploadFile<{url: string}>(API_ENDPOINTS.FILES.UPLOAD, file);
    }








    
    private checkSocketConnection(): void {
        if (!this.socket) {
            const socketUrl = environment.socketUrl.endsWith('/')
                ? environment.socketUrl.slice(0, -1)
                : environment.socketUrl;
            this.socket = io(`${socketUrl}/${SOCKET.NAMESPACE.CHAT}`);
        }
    }
    joinChat(conversationId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<Chat>((observer) => {
            this.socket!.emit(SOCKET.EVENTS.CHAT.JOIN, { conversationId: conversationId });
            //socket.emit(SOCKET.EVENTS.CHAT.MESSAGE(conversationId), { conversationId: conversationId });
            this.socket!.on(SOCKET.EVENTS.CHAT.MESSAGE(conversationId), (message: any) => {
                console.log('✅ Message received', message);
                observer.next(message);
            });

        });
    }
    listenTyping(conversationId: string,senderId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<any>((observer) => {
            console.log('✅ Listening to typing', conversationId, senderId);
            this.socket!.on(SOCKET.EVENTS.CHAT.TYPING(conversationId,senderId), (message: any) => {
                console.log('✅ Typing received', message);
                observer.next(message);
            });
        });
    }
    sendTyping(conversationId: string,senderId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<any>((observer) => {
            this.socket!.emit(SOCKET.EVENTS.CHAT.SEND_TYPING, { conversationId: conversationId, senderId: senderId });
        });
    }
}
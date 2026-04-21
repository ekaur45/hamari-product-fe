import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS, SOCKET } from '../constants';
import { Chat, ChatResource, ChatUser, Conversation } from '../models/chat.interface';
import { ApiResponse, PaginatedApiResponse } from '../models';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private readonly socketUrl = environment.socketUrl;
    private socket!: Socket; // Shared socket instance
    constructor(private apiService: ApiService, private http: HttpClient) { }
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

    uploadFileWithProgress(file: File): Observable<{ progress?: number; url?: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${environment.apiUrl}${API_ENDPOINTS.FILES.UPLOAD}`;
        return this.http.post<ApiResponse<{ url: string }>>(url, formData, {
            withCredentials: true,
            reportProgress: true,
            observe: 'events',
            headers: new HttpHeaders({
                'Accept': 'application/json'
            })
        }).pipe(
            map((event: HttpEvent<ApiResponse<{ url: string }>>) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const total = event.total ?? 0;
                    const progress = total ? Math.round((event.loaded / total) * 100) : 0;
                    return { progress };
                }
                if (event.type === HttpEventType.Response) {
                    const body = event.body;
                    return { progress: 100, url: body?.data?.url };
                }
                return {};
            })
        );
    }








    
    private checkSocketConnection(): void {
        if (!this.socket) {
            const socketUrl = environment.socketUrl.endsWith('/')
                ? environment.socketUrl.slice(0, -1)
                : environment.socketUrl;
            this.socket = io(`${socketUrl}/${SOCKET.NAMESPACE.CHAT}`, {
                withCredentials: true,
                transports: ['websocket', 'polling'],
            });
        }
    }
    joinChat(conversationId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<Chat>((observer) => {
            this.socket!.emit(SOCKET.EVENTS.CHAT.JOIN, { conversationId: conversationId });
            //socket.emit(SOCKET.EVENTS.CHAT.MESSAGE(conversationId), { conversationId: conversationId });
            this.socket!.off(SOCKET.EVENTS.CHAT.MESSAGE(conversationId));
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
            this.socket!.off(SOCKET.EVENTS.CHAT.TYPING(conversationId,senderId));
            this.socket!.on(SOCKET.EVENTS.CHAT.TYPING(conversationId,senderId), (message: any) => {
                console.log('✅ Typing received', message);
                observer.next(message);
            });
        });
    }
    listenRead(conversationId: string, readerId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<any>((observer) => {
            this.socket!.off(`read_${conversationId}_${readerId}`);
            this.socket!.on(`read_${conversationId}_${readerId}`, (payload: any) => {
                observer.next(payload);
            });
        });
    }

    listenMessageUpdate(conversationId: string): Observable<Chat> {
        this.checkSocketConnection();
        return new Observable<Chat>((observer) => {
            this.socket!.off(`message_update_${conversationId}`);
            this.socket!.on(`message_update_${conversationId}`, (payload: any) => {
                observer.next(payload as Chat);
            });
        });
    }
    sendTyping(conversationId: string,senderId: string): Observable<any> {
        this.checkSocketConnection();
        return new Observable<any>((observer) => {
            this.socket!.emit(SOCKET.EVENTS.CHAT.SEND_TYPING, { conversationId: conversationId, senderId: senderId });
        });
    }

    markConversationRead(conversationId: string): Observable<ApiResponse<any>> {
        return this.apiService.patch<any>(`${API_ENDPOINTS.CHATS.BASE}/${conversationId}/read`, {});
    }

    searchMessages(conversationId: string, q: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedApiResponse<Chat>>> {
        return this.apiService.getPaginated<Chat>(`${API_ENDPOINTS.CHATS.BASE}/${conversationId}/search`, page, limit, {
            params: { q }
        });
    }

    unsendMessage(messageId: string): Observable<ApiResponse<Chat>> {
        return this.apiService.patch<Chat>(`${API_ENDPOINTS.CHATS.BASE}/messages/${messageId}/unsend`, {});
    }

    deleteMessage(messageId: string): Observable<ApiResponse<Chat>> {
        return this.apiService.patch<Chat>(`${API_ENDPOINTS.CHATS.BASE}/messages/${messageId}/delete`, {});
    }

    restoreMessage(messageId: string): Observable<ApiResponse<Chat>> {
        return this.apiService.patch<Chat>(`${API_ENDPOINTS.CHATS.BASE}/messages/${messageId}/restore`, {});
    }
}
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse } from '../models';
import { AiChat, AiChatMessagesResponse, AiMessage } from '../models/ai-chat.interface';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  constructor(private apiService: ApiService) {}

  listChats(): Observable<ApiResponse<AiChat[]>> {
    return this.apiService.get<AiChat[]>(API_ENDPOINTS.AI.CHATS);
  }

  createChat(title?: string | null): Observable<ApiResponse<AiChat>> {
    return this.apiService.post<AiChat>(API_ENDPOINTS.AI.CHATS, { title: title ?? undefined });
  }

  deleteChat(chatId: string): Observable<ApiResponse<boolean>> {
    return this.apiService.delete<boolean>(API_ENDPOINTS.AI.CHATS + `/${chatId}`);
  }

  renameChat(chatId: string, title: string | null): Observable<ApiResponse<AiChat>> {
    return this.apiService.patch<AiChat>(API_ENDPOINTS.AI.CHATS + `/${chatId}`, { title });
  }

  getMessages(chatId: string): Observable<ApiResponse<AiChatMessagesResponse>> {
    return this.apiService.get<AiChatMessagesResponse>(API_ENDPOINTS.AI.CHAT_MESSAGES(chatId));
  }

  sendMessage(
    chatId: string,
    message: string,
  ): Observable<ApiResponse<{ userMessage: AiMessage; assistantMessage: AiMessage; usage?: { date: string; usedMessages: number; dailyMessageLimit: number } }>> {
    return this.apiService.post<{ userMessage: AiMessage; assistantMessage: AiMessage; usage?: { date: string; usedMessages: number; dailyMessageLimit: number } }>(
      API_ENDPOINTS.AI.CHAT_MESSAGES(chatId),
      { message },
    );
  }

  getUsage(): Observable<ApiResponse<{ date: string; usedMessages: number; dailyMessageLimit: number }>> {
    return this.apiService.get<{ date: string; usedMessages: number; dailyMessageLimit: number }>(API_ENDPOINTS.AI.USAGE);
  }
}


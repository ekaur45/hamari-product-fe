export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiChat {
  id: string;
  studentUserId: string;
  title: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  chatId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export interface AiChatMessagesResponse {
  chat: AiChat;
  messages: AiMessage[];
}


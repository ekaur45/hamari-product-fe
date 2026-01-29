import { PaginationDto, User } from "./user.interface";


export interface ChatUser {
    user: User;
    lastMessage: string;
    createdAt: Date; // ISO date string
    isRead: boolean;
  }
export interface Conversation {
    id: string;
    name: string;
    participants: User[];
    chats?: Chat[];
    createdAt: Date;
    updatedAt: Date;
    lastMessageChat: Chat;
    isOnline: boolean;
}

export interface Chat {
    id: string;
    senderId: string;
    sender: User;
    receiverId: string;
    receiver: User;
    message?: string | null;
    isRead: boolean;
    isDeleted: boolean;
    resources?: ChatResource[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ChatResource {
    id: string;
    chatId: string;
    chat: Chat;
    mimeType: string;
    fileName: string;
    filePath: string;
    fileSize: number;
}

export interface StudentListDto {
    chats: Chat[];
    pagination: PaginationDto;
  }
  
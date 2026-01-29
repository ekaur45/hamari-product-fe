import { User } from "./user.interface";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  isRead: boolean;
  redirectPath?: string; 
  redirectParams?: Record<string, any>;
  user: User;
  createdAt: Date;
}

export enum NotificationType {
    CHAT = 'chat',
    MESSAGE = 'message',
    BOOKING = 'booking',
    PAYMENT = 'payment',
    OTHER = 'other',
  }
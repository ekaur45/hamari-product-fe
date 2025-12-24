import { User } from "./user.interface";

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface SupportTicket {
  id: string;
  userId: string;
  user?: User;
  title: string;
  description?: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigneeId?: string | null;
  assignee?: User | null;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSupportListDto {
  tickets: SupportTicket[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}


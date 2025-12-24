export interface Log {
  id: number;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  context?: string | null;
  trace?: string | null;
  metadata?: Record<string, any> | null;
  timestamp: Date;
}

export interface AdminLogListDto {
  logs: Log[];
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


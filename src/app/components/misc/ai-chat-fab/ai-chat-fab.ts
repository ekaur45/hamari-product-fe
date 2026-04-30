import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiChatService } from '../../../shared/services/ai-chat.service';
import { AiMessage } from '../../../shared/models/ai-chat.interface';

type UiMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timeLabel: string;
};

type ApiError = {
  statusCode?: number;
  message?: string;
  error?: { code?: string };
  data?: any;
};

@Component({
  selector: 'app-ai-chat-fab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-fab.html',
})
export class AiChatFab {
  @ViewChild('fabMessagesContainer') private fabMessagesContainer?: ElementRef<HTMLElement>;

  isOpen = signal(false);

  isDesktop = signal(window.innerWidth >= 1024);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isDesktop.set(event?.target?.innerWidth >= 1024);
  }

  activeChatId = signal<string | null>(null);
  messages = signal<UiMessage[]>([]);

  isLoading = signal(false);
  isSending = signal(false);
  error = signal<string | null>(null);
  usage = signal<{ dailyMessageLimit?: number; usedMessages?: number; date?: string } | null>(null);

  draftMessage = signal<string>('');

  panelWidth = computed(() => (this.isDesktop() ? 'w-[420px]' : 'w-[calc(100vw-2rem)]'));
  panelHeight = computed(() => (this.isDesktop() ? 'h-[560px]' : 'h-[70vh]'));

  sendDisabledReason = computed(() => {
    if (this.isQuotaOver()) return 'Daily limit reached. Upgrade to increase your limit.';
    return '';
  });

  isQuotaOver = computed(() => {
    const u = this.usage();
    const used = u?.usedMessages;
    const limit = u?.dailyMessageLimit;
    if (used == null || limit == null) return false;
    return used >= limit;
  });

  aiThinking = computed(() => this.isSending());

  showScrollToBottom = signal(false);
  private isNearBottom = signal(true);

  constructor(private aiChatService: AiChatService) {}

  toggle() {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.ensureChatLoaded();
    }
  }

  close() {
    this.isOpen.set(false);
  }

  private formatTimeLabel(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private mapMessage(m: AiMessage): UiMessage {
    return {
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: m.content,
      timeLabel: this.formatTimeLabel(m.createdAt),
    };
  }

  private ensureChatLoaded() {
    if (this.activeChatId()) {
      this.loadMessages(this.activeChatId()!);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.refreshUsage();

    this.aiChatService.listChats().subscribe({
      next: (res) => {
        const existing = res.data?.[0];
        if (existing?.id) {
          this.activeChatId.set(existing.id);
          this.loadMessages(existing.id);
        } else {
          this.aiChatService.createChat(null).subscribe({
            next: (createdRes) => {
              const chatId = createdRes.data?.id ?? null;
              this.activeChatId.set(chatId);
              if (chatId) this.loadMessages(chatId);
              this.isLoading.set(false);
            },
            error: (e: ApiError) => {
              this.isLoading.set(false);
              this.error.set(e?.message || 'Failed to start chat');
            },
          });
        }
      },
      error: (e: ApiError) => {
        this.isLoading.set(false);
        this.error.set(e?.message || 'Failed to load chats');
      },
    });
  }

  private refreshUsage() {
    this.aiChatService.getUsage().subscribe({
      next: (res) => {
        const u = res.data || null;
        this.usage.set(u);
      },
      error: () => {},
    });
  }

  private loadMessages(chatId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.aiChatService.getMessages(chatId).subscribe({
      next: (res) => {
        this.messages.set((res.data?.messages || []).map((m) => this.mapMessage(m)));
        this.isLoading.set(false);
        this.scheduleScrollToBottom(true);
      },
      error: (e: ApiError) => {
        this.isLoading.set(false);
        this.error.set(e?.message || 'Failed to load messages');
      },
    });
  }

  sendMessage() {
    const chatId = this.activeChatId();
    const text = (this.draftMessage() || '').trim();
    if (!chatId || !text) return;
    if (this.isSending()) return;

    this.isSending.set(true);
    this.error.set(null);

    const optimisticId = `tmp_${Date.now()}`;
    const optimistic: UiMessage = { id: optimisticId, role: 'user', text, timeLabel: this.formatTimeLabel(new Date().toISOString()) };
    this.messages.set([...this.messages(), optimistic]);
    this.draftMessage.set('');
    this.scheduleScrollToBottom(false);

    this.aiChatService.sendMessage(chatId, text).subscribe({
      next: (res) => {
        const user = res.data?.userMessage ? this.mapMessage(res.data.userMessage) : null;
        const assistant = res.data?.assistantMessage ? this.mapMessage(res.data.assistantMessage) : null;
        const current = this.messages().filter((m) => m.id !== optimisticId);
        const nextMsgs: UiMessage[] = [...current];
        if (user) nextMsgs.push(user);
        if (assistant) nextMsgs.push(assistant);
        this.messages.set(nextMsgs);
        this.scheduleScrollToBottom(false);
        if (res.data?.usage) {
          const u = res.data.usage;
          this.usage.set(u);
        } else {
          this.refreshUsage();
        }
        this.isSending.set(false);
      },
      error: (e: ApiError) => {
        this.messages.set(this.messages().filter((m) => m.id !== optimisticId));
        this.isSending.set(false);

        if (e?.statusCode === 402 || e?.error?.code === 'AI_USAGE_LIMIT_REACHED') {
          this.usage.set(e?.data || null);
          this.error.set(e?.message || 'AI usage limit reached');
          return;
        }
        this.error.set(e?.message || 'Failed to send message');
      },
    });
  }

  onMessagesScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (!el) return;
    const threshold = 120;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < threshold;
    this.isNearBottom.set(near);
    this.showScrollToBottom.set(!near);
  }

  scrollToBottom(force: boolean = false) {
    const el = this.fabMessagesContainer?.nativeElement;
    if (!el) return;
    if (!force && !this.isNearBottom()) {
      this.showScrollToBottom.set(true);
      return;
    }
    el.scrollTop = el.scrollHeight;
    this.showScrollToBottom.set(false);
    this.isNearBottom.set(true);
  }

  private scheduleScrollToBottom(force: boolean = false) {
    setTimeout(() => this.scrollToBottom(force), 0);
  }
}


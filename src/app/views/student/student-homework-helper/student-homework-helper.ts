import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiChatService } from '../../../shared/services/ai-chat.service';
import { AiChat, AiMessage } from '../../../shared/models/ai-chat.interface';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

type ApiError = {
  statusCode?: number;
  message?: string;
  error?: { code?: string };
  data?: any;
};

type UiChat = {
  id: string;
  title: string;
  updatedAtLabel: string;
};

type UiMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timeLabel: string;
  ai?: ParsedAiResponse;
};

type ParsedAiResponse = {
  summary: string;
  steps: string[];
  final: string;
  nextQuestion: string;
  raw: string;
};

@Component({
  selector: 'app-student-homework-helper',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-homework-helper.html',
})
export class StudentHomeworkHelper {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  chats = signal<UiChat[]>([]);

  selectedChatId = signal<string | null>(null);

  messagesByChat = signal<Record<string, UiMessage[]>>({});

  isLoadingChats = signal(false);
  isLoadingMessages = signal(false);
  isSending = signal(false);
  error = signal<string | null>(null);
  usage = signal<{ dailyMessageLimit?: number; usedMessages?: number; date?: string } | null>(null);

  newMessage = signal<string>('');

  selectedChat = computed(() => {
    const id = this.selectedChatId();
    if (!id) return null;
    return this.chats().find((c) => c.id === id) ?? null;
  });
  selectedMessages = computed(() => {
    const id = this.selectedChatId();
    if (!id) return [];
    return this.messagesByChat()[id] ?? [];
  });

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

  showHelp = signal(false);
  showScrollToBottom = signal(false);
  private isNearBottom = signal(true);

  renamingChatId = signal<string | null>(null);
  renameDraft = signal<string>('');
  isRenaming = computed(() => !!this.renamingChatId());

  constructor(
    private aiChatService: AiChatService,
    private router: Router,
    private route: ActivatedRoute,
    private confirmDialog: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.refreshUsage();
    this.loadChats();

    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        const id = this.getChatIdFromAuxUrl();
        if (id && id !== this.selectedChatId()) {
          this.selectedChatId.set(id);
          this.loadMessages(id);
        }
        if (!id && this.selectedChatId()) {
          // aux outlet cleared
          this.selectedChatId.set(null);
        }
      }
    });
  }

  private getChatIdFromAuxUrl(): string | null {
    const tree = this.router.parseUrl(this.router.url);
    const outlet = tree.root.children['primary'].children['ai'];
    const segments = outlet?.segments ?? [];
    // expected: chat/:chatId
    if (segments.length >= 2 && segments[0]?.path === 'chat') {
      return segments[1]?.path ?? null;
    }
    return null;
  }

  private setAuxChat(chatId: string | null) {
    this.router.navigate(
      [
        {
          outlets: {
            ai: chatId ? ['chat', chatId] : null,
          },
        },
      ],
      { relativeTo: this.route, replaceUrl: true },
    );
  }

  toggleHelp() {
    this.showHelp.set(!this.showHelp());
  }

  closeHelp() {
    this.showHelp.set(false);
  }

  onMessagesScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (!el) return;

    const threshold = 120; // px from bottom treated as "near bottom"
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < threshold;
    this.isNearBottom.set(near);
    this.showScrollToBottom.set(!near);
  }

  scrollToBottom(force: boolean = false) {
    const el = this.messagesContainer?.nativeElement;
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

  refreshUsage() {
    this.aiChatService.getUsage().subscribe({
      next: (res) => {
        const u = res.data || null;
        this.usage.set(u);
      },
      error: () => {
        // non-blocking
      },
    });
  }

  private formatDateLabel(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (day === today) return 'Today';
    const diffDays = Math.round((today - day) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatTimeLabel(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private mapChat(c: AiChat): UiChat {
    return {
      id: c.id,
      title: c.title || 'Homework chat',
      updatedAtLabel: this.formatDateLabel(c.updatedAt),
    };
  }

  private mapMessage(m: AiMessage): UiMessage {
    const role: UiMessage['role'] = m.role === 'assistant' ? 'assistant' : 'user';
    const rawText = m.content ?? '';

    return {
      id: m.id,
      role,
      text: rawText,
      timeLabel: this.formatTimeLabel(m.createdAt),
      ai: role === 'assistant' ? this.parseAiResponse(rawText) : undefined,
    };
  }

  private parseAiResponse(text: string): ParsedAiResponse {
    const raw = (text ?? '').trim();

    const wrapper = /\[\[AI_HOMEWORK_HELPER\]\]([\s\S]*?)\[\[\/AI_HOMEWORK_HELPER\]\]/i.exec(raw);
    const body = (wrapper?.[1] ?? raw).trim();

    const getSection = (name: string) => {
      const re = new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n(?:SUMMARY|STEPS|FINAL|NEXT_QUESTION):|$)`, 'i');
      return (re.exec(body)?.[1] ?? '').trim();
    };

    const summary = getSection('SUMMARY') || raw;
    const stepsBlock = getSection('STEPS');
    const final = getSection('FINAL');
    const nextQuestion = getSection('NEXT_QUESTION');

    const steps = (stepsBlock || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^-+\s*/, ''))
      .filter(Boolean);

    return {
      summary,
      steps,
      final,
      nextQuestion,
      raw,
    };
  }

  /**
   * Very small markdown renderer (safe-by-default):
   * - Escapes any HTML first (prevents injection)
   * - Supports: code fences, inline code, bold/italic, links, line breaks
   */
  renderMarkdown(input: string): string {
    const raw = (input ?? '').toString();

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    let text = escapeHtml(raw);

    // code fences ```...```
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
      return `<pre class="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs md:text-sm"><code>${code}</code></pre>`;
    });

    // inline code `...`
    text = text.replace(/`([^`]+)`/g, (_m, code) => {
      return `<code class="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-[0.85em]">${code}</code>`;
    });

    // bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // italic *text*
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

    // links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
      return `<a class="text-primary underline hover:opacity-90" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    // line breaks
    text = text.replace(/\n/g, '<br />');

    return text;
  }

  loadChats() {
    this.isLoadingChats.set(true);
    this.error.set(null);

    this.aiChatService.listChats().subscribe({
      next: (res) => {
        const items = (res.data || []).map((c) => this.mapChat(c));
        this.chats.set(items);
        this.isLoadingChats.set(false);

        const fromUrl = this.getChatIdFromAuxUrl();
        if (fromUrl) {
          // if chat exists, open it; otherwise fall back
          const exists = items.some((c) => c.id === fromUrl);
          if (exists) {
            this.onSelectChat(fromUrl);
            return;
          }
        }

        if (!this.selectedChatId() && items.length > 0) {
          this.onSelectChat(items[0].id);
        }
      },
      error: (e: ApiError) => {
        this.isLoadingChats.set(false);
        this.error.set(e?.message || 'Failed to load AI chats');
      },
    });
  }

  onSelectChat(id: string, opts?: { resetMessages?: boolean }) {
    if (this.isRenaming()) return;
    this.selectedChatId.set(id);

    if (opts?.resetMessages) {
      this.messagesByChat.set({ ...this.messagesByChat(), [id]: [] });
    }

    this.loadMessages(id);
    this.setAuxChat(id);
  }

  startRename(chatId: string, currentTitle: string, event?: Event) {
    event?.stopPropagation();
    this.renamingChatId.set(chatId);
    this.renameDraft.set(currentTitle || '');
  }

  cancelRename(event?: Event) {
    event?.stopPropagation();
    this.renamingChatId.set(null);
    this.renameDraft.set('');
  }

  saveRename(chatId: string, event?: Event) {
    event?.stopPropagation();

    const next = (this.renameDraft() || '').trim();

    // If user clears title, we'll reset to default label.
    const payload = next ? next : null;

    this.aiChatService.renameChat(chatId, payload).subscribe({
      next: (res) => {
        const updated = res.data;
        const title = updated?.title || 'Homework chat';
        this.chats.set(this.chats().map((c) => (c.id === chatId ? { ...c, title } : c)));
        this.renamingChatId.set(null);
        this.renameDraft.set('');
      },
      error: (e: ApiError) => {
        this.error.set(e?.message || 'Failed to rename chat');
      },
    });
  }

  onRenameKeydown(event: KeyboardEvent, chatId: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveRename(chatId, event);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelRename(event);
      return;
    }
  }

  goBackToSidebar() {
    this.selectedChatId.set(null);
    this.setAuxChat(null);
  }

  loadMessages(chatId: string) {
    this.isLoadingMessages.set(true);
    this.error.set(null);

    this.aiChatService.getMessages(chatId).subscribe({
      next: (res) => {
        const msgs = (res.data?.messages || []).map((m) => this.mapMessage(m));
        this.messagesByChat.set({ ...this.messagesByChat(), [chatId]: msgs });
        this.isLoadingMessages.set(false);
        this.scheduleScrollToBottom(true);
      },
      error: (e: ApiError) => {
        this.isLoadingMessages.set(false);
        this.error.set(e?.message || 'Failed to load messages');
      },
    });
  }

  createNewChat() {
    this.error.set(null);
    this.refreshUsage();

    this.aiChatService.createChat(null).subscribe({
      next: (res) => {
        const created = res.data;
        if (!created?.id) return;
        const ui = this.mapChat(created);
        this.chats.set([ui, ...this.chats()]);
        // Ensure we don't briefly show messages from a previously selected chat.
        this.onSelectChat(created.id, { resetMessages: true });
      },
      error: (e: ApiError) => {
        this.error.set(e?.message || 'Failed to create chat');
      },
    });
  }

  deleteChat(chatId: string, event?: Event) {
    event?.stopPropagation();

    this.confirmDialog.confirm({
      header: 'Delete chat',
      message: 'Are you sure you want to delete this chat? This cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.error.set(null);

        this.aiChatService.deleteChat(chatId).subscribe({
          next: () => {
            const remaining = this.chats().filter((c) => c.id !== chatId);
            this.chats.set(remaining);

            const { [chatId]: _, ...rest } = this.messagesByChat();
            this.messagesByChat.set(rest);

            if (this.selectedChatId() === chatId) {
              const nextChatId = remaining[0]?.id ?? null;
              if (nextChatId) {
                this.onSelectChat(nextChatId);
              } else {
                this.selectedChatId.set(null);
                this.setAuxChat(null);
              }
            }
          },
          error: (e: ApiError) => {
            this.error.set(e?.message || 'Failed to delete chat');
          },
        });
      },
    });
  }

  sendMessage() {
    const chatId = this.selectedChatId();
    const text = (this.newMessage() || '').trim();
    if (!chatId || !text) return;
    if (this.isSending()) return;

    this.isSending.set(true);
    this.error.set(null);

    // optimistic append user message
    const optimisticId = `tmp_${Date.now()}`;
    const optimistic: UiMessage = {
      id: optimisticId,
      role: 'user',
      text,
      timeLabel: this.formatTimeLabel(new Date().toISOString()),
    };
    const prev = this.messagesByChat()[chatId] ?? [];
    this.messagesByChat.set({ ...this.messagesByChat(), [chatId]: [...prev, optimistic] });
    this.newMessage.set('');
    this.scheduleScrollToBottom(false);

    this.aiChatService.sendMessage(chatId, text).subscribe({
      next: (res) => {
        const user = res.data?.userMessage ? this.mapMessage(res.data.userMessage) : null;
        const assistant = res.data?.assistantMessage ? this.mapMessage(res.data.assistantMessage) : null;

        const current = (this.messagesByChat()[chatId] ?? []).filter((m) => m.id !== optimisticId);
        const nextMsgs: UiMessage[] = [...current];
        if (user) nextMsgs.push(user);
        if (assistant) nextMsgs.push(assistant);
        this.messagesByChat.set({ ...this.messagesByChat(), [chatId]: nextMsgs });
        this.scheduleScrollToBottom(false);

        if (res.data?.usage) {
          const u = res.data.usage;
          this.usage.set(u);
        } else {
          // fallback
          this.refreshUsage();
        }
        this.isSending.set(false);
      },
      error: (e: ApiError) => {
        // remove optimistic message
        const current = (this.messagesByChat()[chatId] ?? []).filter((m) => m.id !== optimisticId);
        this.messagesByChat.set({ ...this.messagesByChat(), [chatId]: current });
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

  onComposerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return; // allow newline with Shift+Enter

    event.preventDefault();

    if (this.isSending() || this.isQuotaOver()) return;
    if (!this.newMessage().trim()) return;

    this.sendMessage();
  }
}


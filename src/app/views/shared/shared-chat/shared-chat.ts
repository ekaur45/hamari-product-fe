import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, ViewChild, ElementRef, SimpleChanges } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";
import { AuthService, PaginatedApiResponse, User, ApiResponse, UserRole } from "../../../shared";
import { environment } from "../../../../environments/environment";
import { ChatService } from "../../../shared/services/chat.service";
import { Chat, ChatResource, ChatUser, Conversation } from "../../../shared/models/chat.interface";
import { MainSocketService } from "../../../shared/services/main-socket.service";

interface ChatFile {
    id: string;
    file: File;
    isUploaded: boolean;
    isUploading: boolean;
    uploadProgress: number;
    error?: string | null;
    filePath: string;
    fileSize: number;
    mimeType: string;
    fileName: string;
}


@Component({
    selector: 'app-shared-chat',
    templateUrl: './shared-chat.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ProfilePhoto],
})
export class SharedChat implements OnInit {
    @ViewChild('chatContainer') private chatContainer!: ElementRef;
    chats = signal<Chat[]>([]);
    selectedConversationId = signal<string | null>(null);
    selectedConversation = signal<Conversation | null>(null);
    chatMessages = signal<Chat[]>([]);
    newMessage = signal<string>('');
    searchQuery = signal<string>('');
    selectedFiles = signal<ChatFile[]>([]);
    showFileInput = signal(false);
    hoveredMessageId = signal<string | null>(null);
    conversations = signal<Conversation[]>([]);
    isLoadingConversations = signal<boolean>(false);
    isLoadingMessages = signal<boolean>(false);
    isLoadingMoreMessages = signal<boolean>(false);
    messagesPage = signal<number>(1);
    messagesLimit = signal<number>(20);
    hasMoreMessages = signal<boolean>(false);
    readonly assetsUrl = environment.assetsUrl;
    typing = signal<boolean>(false);
    threadSearchQuery = signal<string>('');
    isThreadSearchMode = signal<boolean>(false);
    isSearchingThread = signal<boolean>(false);
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    timeoutRef: any;


    constructor(private chatService: ChatService,public authService: AuthService, private route: ActivatedRoute, private router: Router,
        private mainSocketService: MainSocketService

    ) {

        this.route.params.subscribe(params => {
            const conversationId = params['selectedConversationId'];
            this.selectedConversationId.set(conversationId);
            if (conversationId) {
                // conversations may not be loaded yet; defer work until selection exists
                const conv = this.conversations().find(conversation => conversation.id === conversationId) || null;
                this.selectedConversation.set(conv);
                if (conv) {
                    this.joinChat();
                    this.getChatMessages(true);
                }
            } else {
                this.selectedConversation.set(null);
            }
        });
     }

    ngOnInit(): void {
        this.mainSocketService.connectToSocket();
        this.getChaUsers();
        this.mainSocketService.onlineUsers$.subscribe((onlineUsers) => {
            console.log('✅ Online users', onlineUsers);
            this.conversations.update((conversations) => conversations.map(conversation => {
                const other = this.getOtherParticipant(conversation);
                return {
                    ...conversation,
                    isOnline: !!onlineUsers[other.id]
                }
            }));
        });
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedConversationId']) {
            this.scrollToBottom();
        }
    }
    ngAfterViewInit(): void {
        this.scrollToBottom();
    }
    listenToUser(userId: string) {
        this.mainSocketService.listenToUserStatus(userId).subscribe(status => {
            this.conversations.update(convs =>
                convs.map(conv => {
                    const other = this.getOtherParticipant(conv);
                    if (other.id === userId) {
                        return { ...conv, isOnline: status.isOnline };
                    }
                    return conv;
                })
            );
        });
    }
    joinChat(): void {
        if (!this.selectedConversationId() || !this.selectedConversation()) return;
        this.listenTyping();
        this.listenRead();
        this.listenMessageUpdates();
        this.chatService.joinChat(this.selectedConversationId()!).subscribe({
            next: (res: Chat) => {
                // append incoming message instead of refetching whole thread
                if (!res || res.conversationId !== this.selectedConversationId()) return;

                const existing = this.chatMessages().some(m => m.id === res.id);
                if (!existing) {
                    this.chatMessages.set([...this.chatMessages(), res]);
                    this.scrollToBottom();
                }

                if (res.receiverId === this.authService.getCurrentUser()?.id) {
                    this.markConversationRead();
                }

                // update conversation preview + ordering
                this.conversations.update((conversations) => {
                    const idx = conversations.findIndex(c => c.id === res.conversationId);
                    if (idx === -1) return conversations;
                    const updated = [...conversations];
                    const conv = updated[idx];
                    updated[idx] = { ...conv, lastMessageChat: res as any };
                    // move to top
                    const [moved] = updated.splice(idx, 1);
                    return [moved, ...updated];
                });
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    listenMessageUpdates(): void {
        if (!this.selectedConversationId()) return;
        this.chatService.listenMessageUpdate(this.selectedConversationId()!).subscribe({
            next: (updated) => {
                if (!updated || updated.conversationId !== this.selectedConversationId()) return;
                this.chatMessages.set(this.chatMessages().map(m => m.id === updated.id ? ({ ...m, ...updated }) : m));
                this.conversations.update(conversations => conversations.map(c => c.id === updated.conversationId ? ({ ...c, lastMessageChat: updated as any }) : c));
            },
            error: (err) => console.error(err),
        });
    }

    listenRead(): void {
        if (!this.selectedConversationId() || !this.selectedConversation()) return;
        const other = this.getOtherParticipant(this.selectedConversation()!);
        if (!other) return;
        this.chatService.listenRead(this.selectedConversationId()!, other.id).subscribe({
            next: () => {
                const otherId = other.id;
                this.chatMessages.set(this.chatMessages().map(m => {
                    if (m.senderId === this.authService.getCurrentUser()?.id && m.receiverId === otherId) {
                        return { ...m, isRead: true };
                    }
                    return m;
                }));
            },
            error: (err) => console.error(err),
        });
    }
    listenTyping(): void {
        if (!this.selectedConversationId() || !this.selectedConversation()) return;
        const other = this.getOtherParticipant(this.selectedConversation()!);
        if (!other) return;
        this.chatService.listenTyping(this.selectedConversationId()!, other.id).subscribe({
            next: (res: any) => {
                this.typing.set(true);
                clearTimeout(this.timeoutRef);
                this.timeoutRef = setTimeout(() => {
                    this.typing.set(false);
                }, 1000);
            },
            error: (err) => {
                console.error(err);
            }
        });
    }
    getChaUsers(): void {
        this.isLoadingConversations.set(true);
        this.chatService.getChatUsers().subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.conversations.set(res.data || []);
                    const selectedId = this.selectedConversationId();
                    const selected = (selectedId
                        ? (this.conversations().find(conversation => conversation.id === selectedId) || null)
                        : (this.conversations()[0] || null));
                    this.selectedConversation.set(selected);

                    // If we navigated directly to /chat/:id, complete setup now.
                    if (selectedId && selected) {
                        this.joinChat();
                        this.getChatMessages(true);
                    }
                }
                this.isLoadingConversations.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isLoadingConversations.set(false);
            }
        });
    }


    selectConversation(conversation: Conversation): void {
        this.selectedConversation.set(conversation);
        this.selectedConversationId.set(conversation.id);
        console.log('✅ Selected conversation', this.selectedConversation()?.name);
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            this.router.navigate(['/student/chat', conversation.id]);
        } else {
            this.router.navigate(['/teacher/chat', conversation.id]);
        }
    }

    toggleSidebar(): void {
        
    }

    goBackToSidebar(): void {        
        this.selectedConversation.set(null);
        this.selectedConversationId.set(null);
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            this.router.navigate(['/student/chat']);
        } else {
            this.router.navigate(['/teacher/chat']);
        }
    }
    getChatMessages(reset: boolean = true){
        if (!this.selectedConversationId()) return;
        if (reset) {
            this.isLoadingMessages.set(true);
            this.messagesPage.set(1);
        } else {
            this.isLoadingMoreMessages.set(true);
        }

        const page = this.messagesPage();
        const limit = this.messagesLimit();

        this.chatService.getChatMessages(this.selectedConversationId()!, page, limit).subscribe({
            next: (res: ApiResponse<PaginatedApiResponse<Chat>>) => {
                if (res.statusCode === 200 && res.data) {
                    const batch = [...(res.data.data || [])].reverse(); // oldest-first

                    if (reset) {
                        this.chatMessages.set(batch);
                    } else {
                        // prepend older messages
                        this.chatMessages.set([...batch, ...this.chatMessages()]);
                    }

                    const p: any = res.data.pagination as any;
                    this.hasMoreMessages.set(!!p?.hasNext);

                    if (reset) {
                        this.markConversationRead();
                    }
                    // scroll to bottom
                    if (reset) {
                        setTimeout(() => {
                            const chatMessagesContainer = document.getElementById('chat-messages-container');
                            if (chatMessagesContainer) {
                                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                            }
                        }, 100);
                    }
                }
                this.isLoadingMessages.set(false);
                this.isLoadingMoreMessages.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isLoadingMessages.set(false);
                this.isLoadingMoreMessages.set(false);
            }
        });
    }

    onMessagesScroll(event: Event): void {
        const el = event.target as HTMLElement;
        if (!el) return;
        if (el.scrollTop > 5) return;
        if (this.isLoadingMoreMessages() || this.isLoadingMessages()) return;
        if (!this.hasMoreMessages()) return;

        const prevHeight = el.scrollHeight;
        this.messagesPage.set(this.messagesPage() + 1);
        this.getChatMessages(false);

        // keep scroll anchored after DOM update
        setTimeout(() => {
            const newHeight = el.scrollHeight;
            el.scrollTop = newHeight - prevHeight;
        }, 120);
    }

    searchInThread(): void {
        const q = (this.threadSearchQuery() || '').trim();
        if (!this.selectedConversationId() || !q) return;

        this.isSearchingThread.set(true);
        this.chatService.searchMessages(this.selectedConversationId()!, q, 1, 50).subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.isThreadSearchMode.set(true);
                    this.chatMessages.set([...(res.data.data || [])].reverse());
                }
                this.isSearchingThread.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isSearchingThread.set(false);
            }
        });
    }

    clearThreadSearch(): void {
        this.threadSearchQuery.set('');
        this.isThreadSearchMode.set(false);
        this.getChatMessages();
    }

    markConversationRead(): void {
        if (!this.selectedConversationId()) return;
        this.chatService.markConversationRead(this.selectedConversationId()!).subscribe({
            next: () => {
                const me = this.authService.getCurrentUser()?.id;
                this.chatMessages.set(this.chatMessages().map(m => m.receiverId === me ? ({ ...m, isRead: true }) : m));
                this.conversations.update(convs => convs.map(c => c.id === this.selectedConversationId() ? ({ ...c, unreadCount: 0 }) : c));
            },
            error: (err) => console.error(err),
        });
    }

    sendMessage(): void {
        const message = this.newMessage().trim();
        const files = this.selectedFiles();

        if ((!message && files.length === 0) || !this.selectedConversationId()) {
            return;
        }


        const receiverId = this.getOtherParticipant(this.selectedConversation()!).id;
        const resources = this.selectedFiles().map(file => {
            return {
                id: file.id,
                mimeType: file.mimeType,
                fileName: file.fileName,
                filePath: file.filePath,
                fileSize: file.fileSize
            } as ChatResource;
        });
        this.chatService.sendMessage(this.selectedConversationId()!,receiverId,message,resources).subscribe({
            next: (res: ApiResponse<Chat>) => {
                if (res.statusCode === 200 && res.data) {
                    this.chatMessages.set([...this.chatMessages(), res.data]);
                    this.newMessage.set('');
                    this.selectedFiles.set([]);
                }
            },
            error: (err) => {
                console.error(err);
            }
        });


    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const files = Array.from(input.files);
            for(const file of files) {
                const validationError = this.validateAttachment(file);
                const chatFile: ChatFile = {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    file: file,
                    isUploaded: false,
                    isUploading: false,
                    uploadProgress: 0,
                    error: validationError,
                    filePath: '',
                    fileSize: file.size,
                    mimeType: file.type,
                    fileName: file.name
                };
                this.selectedFiles.set( [...this.selectedFiles(), chatFile]);
                if (!validationError) {
                    this.uploadFile(chatFile);
                }
            }
        }
        // Reset input
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }
    uploadFile(file: ChatFile): void {
        file.isUploading = true;
        file.error = null;
        file.uploadProgress = 0;

        this.chatService.uploadFileWithProgress(file.file).subscribe({
            next: (evt) => {
                if (typeof evt.progress === 'number') {
                    file.uploadProgress = evt.progress;
                }
                if (evt.url) {
                    file.isUploaded = true;
                    file.isUploading = false;
                    file.filePath = evt.url;
                }
            },
            error: (err) => {
                console.error(err);
                file.isUploading = false;
                file.isUploaded = false;
                file.error = err?.message || 'Upload failed';
            }
        });
    }

    removeFile(index: number): void {
        const files = this.selectedFiles();
        files.splice(index, 1);
        this.selectedFiles.set([...files]);
    }

    retryUpload(file: ChatFile): void {
        if (!file) return;
        this.uploadFile(file);
    }

    validateAttachment(file: File): string | null {
        const max = 25 * 1024 * 1024; // 25MB
        if (file.size > max) {
            return `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.`;
        }
        // allow common types; block unknown empty mime types
        if (!file.type) {
            return 'Unsupported file type';
        }
        return null;
    }

    getResourceUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        // files/upload commonly returns paths like /uploads/...
        return `${this.assetsUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFileIcon(fileType: string): string {
        if (fileType.startsWith('image/')) {
            return 'fa-image';
        } else if (fileType.includes('pdf')) {
            return 'fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('document')) {
            return 'fa-file-word';
        } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
            return 'fa-file-excel';
        } else if (fileType.includes('video')) {
            return 'fa-file-video';
        } else if (fileType.includes('audio')) {
            return 'fa-file-audio';
        } else {
            return 'fa-file';
        }
    }

    unsendMessage(messageId: string): void {
        this.chatService.unsendMessage(messageId).subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.chatMessages.set(this.chatMessages().map(m => m.id === messageId ? ({ ...m, ...res.data }) : m));
                }
            },
            error: (err) => console.error(err),
        });
    }

    deleteMessage(messageId: string): void {
        this.chatService.deleteMessage(messageId).subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.chatMessages.set(this.chatMessages().map(m => m.id === messageId ? ({ ...m, ...res.data }) : m));
                }
            },
            error: (err) => console.error(err),
        });
    }

    markAsRead(messageId: string): void {
       
    }
    getFilteredConversations(): Conversation[] {
        const q = (this.searchQuery() || '').trim().toLowerCase();
        if (!q) return this.conversations();

        return this.conversations().filter(c => {
            const other = this.getOtherParticipant(c);
            const name = `${other.firstName ?? ''} ${other.lastName ?? ''}`.toLowerCase();
            const email = (other.email ?? '').toLowerCase();
            const last = (c.lastMessageChat?.message ?? '').toLowerCase();
            return name.includes(q) || email.includes(q) || last.includes(q);
        });
    }

    formatTime(date: Date): string {
        if(!date) {
            return '';
        }
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    formatMessageTime(_date: Date): string {
        const date = new Date(_date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        }
    }

    getInitials(name: string): string {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    handleEnterKey(event: KeyboardEvent): void {
        this.onTyping();
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
        // Shift+Enter will allow new line (default behavior)
    }
    onTyping(): void {
        this.chatService.sendTyping(this.selectedConversationId()!,this.authService.getCurrentUser()?.id!).subscribe({
            next: (res: any) => {
            },
            error: (err) => {
                console.error(err);
            }
        });
    }
    autoResizeTextarea(event: Event): void {
        this.onTyping();
        const textarea = event.target as HTMLTextAreaElement;
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height to scrollHeight, but cap at max-h-32 (128px)
        const maxHeight = 128; // 32 * 4px = 128px
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
    }

    undeleteMessage(messageId: string): void {
        // restore (undelete)
        this.chatService.restoreMessage(messageId).subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.chatMessages.set(this.chatMessages().map(m => m.id === messageId ? ({ ...m, ...res.data }) : m));
                }
            },
            error: (err) => console.error(err),
        });
    }
    getOtherParticipant(conversation: Conversation): User {
        if (!conversation || !conversation.participants) return null as any;
        return conversation.participants.find(participant => participant.id !== this.authService.getCurrentUser()?.id) ?? null as any;
    }
    scrollToBottom(): void {
        setTimeout(() => {
            if(this.chatContainer) {
                const chatContainer = this.chatContainer.nativeElement;
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
    }

    
}
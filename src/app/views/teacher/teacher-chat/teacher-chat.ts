import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, ViewChild, ElementRef } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";
import { AuthService, PaginatedApiResponse, User, ApiResponse } from "../../../shared";
import { environment } from "../../../../environments/environment";
import { ChatService } from "../../../shared/services/chat.service";
import { Chat, ChatUser, Conversation } from "../../../shared/models/chat.interface";

interface ChatFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    thumbnail?: string;
}


@Component({
    selector: 'app-teacher-chat',
    templateUrl: './teacher-chat.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ProfilePhoto],
})
export class TeacherChat implements OnInit {
    chats = signal<Chat[]>([]);
    selectedConversationId = signal<string | null>(null);
    selectedConversation = signal<Conversation | null>(null);
    chatMessages = signal<Chat[]>([]);
    newMessage = signal<string>('');
    searchQuery = signal<string>('');
    selectedFiles = signal<File[]>([]);
    showFileInput = signal(false);
    hoveredMessageId = signal<string | null>(null);
    conversations = signal<Conversation[]>([]);
    readonly assetsUrl = environment.assetsUrl;
    typing = signal<boolean>(false);
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    constructor(private chatService: ChatService,public authService: AuthService, private route: ActivatedRoute, private router: Router) {

        this.route.params.subscribe(params => {
            this.selectedConversationId.set(params['selectedConversationId']);
            this.selectedConversation.set(this.conversations()[0]);
            this.joinChat();
            this.getChatMessages();
        });
     }

    ngOnInit(): void {
        this.getChaUsers();
    }
    joinChat(): void {
        this.chatService.joinChat(this.selectedConversationId()!).subscribe({
            next: (res: any) => {
                this.getChatMessages();
            },
            error: (err) => {
                console.error(err);
            }
        });
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
    listenTyping(): void {
        this.chatService.listenTyping(this.selectedConversationId()!,this.getOtherParticipant(this.selectedConversation()!).id).subscribe({
            next: (res: any) => {
                this.typing.set(true);
                setTimeout(() => {
                    this.typing.set(false);
                }, 1000);
            },
        });
    }
    getChaUsers(): void {
        this.chatService.getChatUsers().subscribe({
            next: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.conversations.set(res.data || []);
                    this.selectedConversation.set(this.conversations().find(conversation => conversation.id === this.selectedConversationId()) || this.conversations()[0]);
                    if(this.selectedConversationId()) {
                        this.listenTyping();
                    }
                }
            },
            error: (err) => {
                console.error(err);
            }
        });
    }


    selectConversation(conversation: Conversation): void {
        this.selectedConversation.set(conversation);
        this.selectedConversationId.set(conversation.id);
        this.router.navigate(['/teacher/chat', conversation.id]);
    }
    getChatMessages(){
        this.chatService.getChatMessages(this.selectedConversationId()!).subscribe({
            next: (res: ApiResponse<PaginatedApiResponse<Chat>>) => {
                if (res.statusCode === 200 && res.data) {
                    this.chatMessages.set(res.data.data || []);
                    // scroll to bottom
                    setTimeout(() => {
                        const chatMessagesContainer = document.getElementById('chat-messages-container');
                        if (chatMessagesContainer) {
                            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                        }
                    }, 100);
                }
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    sendMessage(): void {
        const message = this.newMessage().trim();
        const files = this.selectedFiles();

        if ((!message && files.length === 0) || !this.selectedConversationId()) {
            return;
        }

        // Convert File objects to ChatFile objects
        const chatFiles: ChatFile[] = files.map((file, index) => ({
            id: `file-${Date.now()}-${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file) // For preview, in real app this would be uploaded to server
        }));
        const receiverId = this.getOtherParticipant(this.selectedConversation()!).id;
        this.chatService.sendMessage(this.selectedConversationId()!,receiverId,message,[]).subscribe({
            next: (res: ApiResponse<Chat>) => {
                if (res.statusCode === 200 && res.data) {
                    this.newMessage.set('');
                    this.selectedFiles.set([]);
                    this.chatMessages.set([...this.chatMessages(), res.data]);
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
            this.selectedFiles.set([...this.selectedFiles(), ...files]);
        }
        // Reset input
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    removeFile(index: number): void {
        const files = this.selectedFiles();
        files.splice(index, 1);
        this.selectedFiles.set([...files]);
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
    
    }

    markAsRead(messageId: string): void {
       
    }
    getFilteredConversations(): Conversation[] {
        return this.conversations();
    }

    formatTime(date: Date): string {
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
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    }
    getOtherParticipant(conversation: Conversation): User {
        return conversation.participants.find(participant => participant.id !== this.authService.getCurrentUser()?.id)!;
    }
}
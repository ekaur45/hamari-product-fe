import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, ViewChild, ElementRef } from "@angular/core";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";
import { User } from "../../../shared";
import { environment } from "../../../../environments/environment";

interface ChatFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    thumbnail?: string;
}

interface ChatMessage {
    id: string;
    text?: string;
    timestamp: Date;
    isSent: boolean;
    senderName?: string;
    senderId?: string;
    files?: ChatFile[];
    isRead?: boolean;
    isDeleted?: boolean;
}

interface Conversation {
    id: string;
    name: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    avatar?: string;
    isOnline?: boolean;
    messages: ChatMessage[];
    user?: User; // For profile picture
}

@Component({
    selector: 'app-student-chat',
    templateUrl: './student-chat.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ProfilePhoto],
})
export class StudentChat implements OnInit {
    conversations = signal<Conversation[]>([]);
    selectedConversation = signal<Conversation | null>(null);
    newMessage = signal<string>('');
    searchQuery = signal<string>('');
    selectedFiles = signal<File[]>([]);
    showFileInput = signal(false);
    hoveredMessageId = signal<string | null>(null);
    readonly assetsUrl = environment.assetsUrl;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    constructor() { }

    ngOnInit(): void {
        // Initialize with dummy data
        this.initializeDummyData();
    }

    initializeDummyData(): void {
        const dummyConversations: Conversation[] = [
            {
                id: '1',
                name: 'Dr. Sarah Johnson',
                lastMessage: 'Great work on the assignment!',
                lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                unreadCount: 2,
                isOnline: true,
                user: {
                    id: '1',
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    email: 'sarah.johnson@example.com',
                    role: 'TEACHER' as any,
                    details: {
                        profileImage: '/uploads/profiles/sarah.jpg'
                    }
                } as User,
                messages: [
                    {
                        id: '1',
                        text: 'Hello! How can I help you today?',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        isSent: false,
                        senderName: 'Dr. Sarah Johnson',
                        senderId: '1',
                        isRead: true
                    },
                    {
                        id: '2',
                        text: 'Hi Dr. Johnson, I have a question about the homework.',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
                        isSent: true,
                        isRead: true
                    },
                    {
                        id: '3',
                        text: 'Sure! What would you like to know?',
                        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
                        isSent: false,
                        senderName: 'Dr. Sarah Johnson',
                        senderId: '1',
                        isRead: true
                    },
                    {
                        id: '4',
                        text: 'Great work on the assignment!',
                        timestamp: new Date(Date.now() - 5 * 60 * 1000),
                        isSent: false,
                        senderName: 'Dr. Sarah Johnson',
                        senderId: '1',
                        isRead: false
                    },
                    {
                        id: '5',
                        text: 'Here is the document you requested.',
                        timestamp: new Date(Date.now() - 10 * 60 * 1000),
                        isSent: false,
                        senderName: 'Dr. Sarah Johnson',
                        senderId: '1',
                        files: [
                            {
                                id: 'f1',
                                name: 'assignment_guidelines.pdf',
                                size: 245760,
                                type: 'application/pdf',
                                url: '#'
                            }
                        ],
                        isRead: false
                    }
                ]
            },
            {
                id: '2',
                name: 'Prof. Michael Chen',
                lastMessage: 'The class will be rescheduled to next week.',
                lastMessageTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                unreadCount: 0,
                isOnline: false,
                user: {
                    id: '2',
                    firstName: 'Michael',
                    lastName: 'Chen',
                    email: 'michael.chen@example.com',
                    role: 'TEACHER' as any
                } as User,
                messages: [
                    {
                        id: '1',
                        text: 'Hi, I wanted to inform you about a schedule change.',
                        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                        isSent: false,
                        senderName: 'Prof. Michael Chen',
                        senderId: '2',
                        isRead: true
                    },
                    {
                        id: '2',
                        text: 'The class will be rescheduled to next week.',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000),
                        isSent: false,
                        senderName: 'Prof. Michael Chen',
                        senderId: '2',
                        isRead: true
                    }
                ]
            },
            {
                id: '3',
                name: 'Ms. Emily Davis',
                lastMessage: 'Thanks for your question!',
                lastMessageTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                unreadCount: 1,
                isOnline: true,
                user: {
                    id: '3',
                    firstName: 'Emily',
                    lastName: 'Davis',
                    email: 'emily.davis@example.com',
                    role: 'TEACHER' as any,
                    details: {
                        profileImage: '/uploads/profiles/emily.jpg'
                    }
                } as User,
                messages: [
                    {
                        id: '1',
                        text: 'Hello, I have a question about the project deadline.',
                        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
                        isSent: true,
                        isRead: true
                    },
                    {
                        id: '2',
                        text: 'Thanks for your question!',
                        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
                        isSent: false,
                        senderName: 'Ms. Emily Davis',
                        senderId: '3',
                        isRead: false
                    }
                ]
            },
            {
                id: '4',
                name: 'Dr. Robert Williams',
                lastMessage: 'See you in class tomorrow!',
                lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                unreadCount: 0,
                isOnline: false,
                user: {
                    id: '4',
                    firstName: 'Robert',
                    lastName: 'Williams',
                    email: 'robert.williams@example.com',
                    role: 'TEACHER' as any
                } as User,
                messages: [
                    {
                        id: '1',
                        text: 'See you in class tomorrow!',
                        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
                        isSent: false,
                        senderName: 'Dr. Robert Williams',
                        senderId: '4',
                        isRead: true
                    }
                ]
            }
        ];

        this.conversations.set(dummyConversations);
        // Select first conversation by default
        if (dummyConversations.length > 0) {
            this.selectedConversation.set(dummyConversations[0]);
        }
    }

    selectConversation(conversation: Conversation): void {
        this.selectedConversation.set(conversation);
        // Mark all messages as read
        conversation.messages.forEach(msg => {
            if (!msg.isSent) {
                msg.isRead = true;
            }
        });
        conversation.unreadCount = 0;
        this.conversations.set([...this.conversations()]);
    }

    sendMessage(): void {
        const message = this.newMessage().trim();
        const files = this.selectedFiles();
        
        if ((!message && files.length === 0) || !this.selectedConversation()) {
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

        const newMsg: ChatMessage = {
            id: Date.now().toString(),
            text: message || undefined,
            timestamp: new Date(),
            isSent: true,
            files: chatFiles.length > 0 ? chatFiles : undefined,
            isRead: false
        };

        const conversation = this.selectedConversation()!;
        conversation.messages.push(newMsg);
        conversation.lastMessage = message || `${files.length} file${files.length > 1 ? 's' : ''}`;
        conversation.lastMessageTime = new Date();

        // Update the conversation in the list
        this.conversations.set([...this.conversations()]);
        this.selectedConversation.set({ ...conversation });

        // Clear input and files
        this.newMessage.set('');
        this.selectedFiles.set([]);
        this.showFileInput.set(false);

        // Simulate a reply after 2 seconds
        setTimeout(() => {
            const reply: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: 'Thanks for your message! I\'ll get back to you soon.',
                timestamp: new Date(),
                isSent: false,
                senderName: conversation.name,
                senderId: conversation.user?.id,
                isRead: false
            };
            conversation.messages.push(reply);
            conversation.lastMessage = reply.text || 'New message';
            conversation.lastMessageTime = new Date();
            conversation.unreadCount++;
            this.conversations.set([...this.conversations()]);
            if (this.selectedConversation()?.id === conversation.id) {
                this.selectedConversation.set({ ...conversation });
            }
        }, 2000);
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
        const conversation = this.selectedConversation();
        if (!conversation) return;

        const message = conversation.messages.find(m => m.id === messageId);
        if (message && message.isSent) {
            message.isDeleted = true;
            message.text = 'This message was unsent';
            this.conversations.set([...this.conversations()]);
            this.selectedConversation.set({ ...conversation });
        }
    }

    markAsRead(messageId: string): void {
        const conversation = this.selectedConversation();
        if (!conversation) return;

        const message = conversation.messages.find(m => m.id === messageId);
        if (message && !message.isSent) {
            message.isRead = !message.isRead;
            if (message.isRead) {
                conversation.unreadCount = Math.max(0, conversation.unreadCount - 1);
            } else {
                conversation.unreadCount++;
            }
            this.conversations.set([...this.conversations()]);
            this.selectedConversation.set({ ...conversation });
        }
    }

    markAsUnread(messageId: string): void {
        this.markAsRead(messageId); // Toggle function
    }

    getFilteredConversations(): Conversation[] {
        const query = this.searchQuery().toLowerCase();
        if (!query) {
            return this.conversations();
        }
        return this.conversations().filter(conv =>
            conv.name.toLowerCase().includes(query) ||
            conv.lastMessage.toLowerCase().includes(query)
        );
    }

    formatTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
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

    formatMessageTime(date: Date): string {
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
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
        // Shift+Enter will allow new line (default behavior)
    }

    autoResizeTextarea(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement;
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height to scrollHeight, but cap at max-h-32 (128px)
        const maxHeight = 128; // 32 * 4px = 128px
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
    }

    undeleteMessage(messageId: string): void {
        const conversation = this.selectedConversation();
        if (!conversation) return;

        const message = conversation.messages.find(m => m.id === messageId);
        if (message && message.isDeleted) {
            message.isDeleted = false;
            this.conversations.set([...this.conversations()]);
            this.selectedConversation.set({ ...conversation });
        }
    }
}
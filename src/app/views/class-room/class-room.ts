import { CommonModule } from "@angular/common";
import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, OnInit, computed, WritableSignal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../shared/services/auth.service";
import { ROUTES_MAP } from "../../shared/constants/routes-map";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { User, UserRole } from "../../shared/models/user.interface";
import TeacherBooking, { Teacher } from "../../shared/models/teacher.interface";
import { TeacherService } from "../../shared/services/teacher.service";
import { ClassRoomSocket } from "../../shared/models/class-room.interface";
import { WhiteBoard } from "../../components/white-board/white-board";
import { Student } from "../../shared";

@Component({
    selector: 'app-class-room',
    standalone: true,
    templateUrl: './class-room.html',
    styleUrls: ['./class-room.css'],
    imports: [CommonModule, RouterModule, FormsModule, WhiteBoard],
})
export default class ClassRoom implements AfterViewInit, OnDestroy, OnInit {
    socket!: Socket;
    bookingId = signal<string>('');
    dashboardLink = signal<string>('');
    
    // Session Timer
    sessionStartTime = Date.now();
    sessionTime = signal<string>('00:00:00');
    private timerInterval?: number;
    
    // Tab State
    activeTab = signal<'chat' | 'participants'>('chat');
    
    // Chat
    chatInput = signal<string>('');
    
    // Media Controls
    micOn = signal<boolean>(true);
    videoOn = signal<boolean>(true);
    
    // Grid
    gridSize = signal<number>(4);
    
    // Sidebar (Mobile)
    sidebarOpen = signal<boolean>(false);
    isMobile = signal<boolean>(false);
    // Whiteboard
    whiteboardOpen = signal<boolean>(false);
    
    
    booking = signal<TeacherBooking | null>(null);
    classRoomSocket = signal<ClassRoomSocket>({
        isStarted: false,
        hasStudentJoined: false,
        hasTeacherJoined: false,
        studentStream: null,
        teacherStream: null,
        teacherControls: {
            micOn: true,
            videoOn: true,
        },
        studentControls: {
            micOn: true,
            videoOn: true,
        },
    });
    videoTrack = signal<MediaStreamTrack | null>(null);
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    UserRole = UserRole;
   
    
    // ViewChild References
    @ViewChild('sessionTimeEl') sessionTimeEl?: ElementRef<HTMLSpanElement>;
    @ViewChild('chatTab') chatTab?: ElementRef<HTMLButtonElement>;
    @ViewChild('participantsTab') participantsTab?: ElementRef<HTMLButtonElement>;
    @ViewChild('chatPanel') chatPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('participantsPanel') participantsPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('chatInput') chatInputEl?: ElementRef<HTMLInputElement>;
    @ViewChild('sendMessage') sendMessageBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleMic') toggleMicBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleVideo') toggleVideoBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('leaveSessionBtn') leaveSessionBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleGrid') toggleGridBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('studentsGrid') studentsGrid?: ElementRef<HTMLDivElement>;
    @ViewChild('sidebarPanel') sidebarPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('sidebarToggle') sidebarToggle?: ElementRef<HTMLButtonElement>;
    @ViewChild('mobileSidebarClose') mobileSidebarClose?: ElementRef<HTMLButtonElement>;
    @ViewChild('mobileChatToggle') mobileChatToggle?: ElementRef<HTMLButtonElement>;
    @ViewChild('whiteboardView') whiteboardView?: ElementRef<HTMLDivElement>;
    @ViewChild('videoView') videoView?: ElementRef<HTMLDivElement>;
    @ViewChild('toggleWhiteboard') toggleWhiteboardBtn?: ElementRef<HTMLButtonElement>;

    
    
    

    
    constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router, private teacherService: TeacherService) {
        this.dashboardLink.set(ROUTES_MAP[this.authService.getCurrentUser()!.role]['SCHEDULE']);
        this.route.params.subscribe(params => {
            this.bookingId.set(params['bookingId']);

        });
    }

    ngOnInit(): void {
        
        this.getBookingDetails();
        this.checkMicAndCameraStatus().then((status) => {
            console.log('Mic and camera status:', status);
        });
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];
          
            console.log('🎤 Mic muted:', audioTrack.muted);
            console.log('📷 Camera muted:', videoTrack.muted);
            console.log('🎤 Mic enabled:', audioTrack.enabled);
            console.log('📷 Camera enabled:', videoTrack.enabled);
            debugger;
            if(this.videoElement) {
                this.videoElement.nativeElement.srcObject = stream;
                this.videoElement.nativeElement.autoplay = true;
                this.videoElement.nativeElement.playsInline = true;
                this.videoElement.nativeElement.muted = true;
                this.videoElement.nativeElement.className = 'w-full h-full flex items-center justify-center object-cover';
                this.videoTrack.set(videoTrack);
            }
            if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
                this.classRoomSocket.set({
                    ...this.classRoomSocket(),
                    teacherControls: {
                        micOn: audioTrack.enabled,
                        videoOn: videoTrack.enabled,
                    },
                });
            }
            if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
                this.classRoomSocket.set({
                    ...this.classRoomSocket(),
                    studentControls: {
                        micOn: audioTrack.enabled,
                        videoOn: videoTrack.enabled,
                    },
                });
            }
        });
    }
    currentUserControls = computed<{ micOn: boolean, videoOn: boolean }>(() => {
        if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            return this.classRoomSocket().teacherControls ?? { micOn: false, videoOn: false };
        }
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            return this.classRoomSocket().studentControls ?? { micOn: false, videoOn: false };
        }
        return { micOn: false, videoOn: false };
    });
    async checkMicAndCameraStatus() {
        try {
          const mic = await navigator.permissions.query({ name: 'microphone' });
          const cam = await navigator.permissions.query({ name: 'camera' });
          if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                teacherControls: {
                    micOn: mic.state === 'granted',
                    videoOn: cam.state === 'granted',
                },
            });
        }
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                studentControls: {
                    micOn: mic.state === 'granted',
                    videoOn: cam.state === 'granted',
                },
            });
        }
          console.log('🎤 Mic permission:', mic.state); // "granted", "denied", or "prompt"
          console.log('📷 Camera permission:', cam.state);
        } catch (error) {
          console.error('Permissions API not supported or error:', error);
        }
      }
    getBookingDetails(): void {
        this.teacherService.getTeacherBookingById(this.bookingId()).subscribe({
            next: (booking: TeacherBooking) => {
                this.booking.set(booking);
                this.initializeListeners();
            },
            error: (error: any) => {
                console.error('Error getting booking details:', error);
            }
        });
    }

    ngAfterViewInit(): void {
        this.checkScreenSize();
        this.initializeSessionTimer();
        this.initializeTabs();
        this.initializeChat();
        this.initializeMediaControls();
        this.initializeGridToggle();
        this.initializeSidebar();
        
        this.setupClickOutsideListener();
    }
    
    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }
    
    private checkScreenSize(): void {
        this.isMobile.set(window.innerWidth < 768);
    }
    
    ngOnDestroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
    
    // Session Timer
    private initializeSessionTimer(): void {
        this.updateTimer();
        this.timerInterval = window.setInterval(() => this.updateTimer(), 1000);
    }
    
    private updateTimer(): void {
        const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        this.sessionTime.set(`${hours}:${minutes}:${seconds}`);
        if (this.sessionTimeEl) {
            this.sessionTimeEl.nativeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    
    // Tab Switching
    private initializeTabs(): void {
        // Tabs are handled via click handlers in template
    }
    
    onChatTabClick(): void {
        this.activeTab.set('chat');
    }
    
    onParticipantsTabClick(): void {
        this.activeTab.set('participants');
    }
    
    // Chat Input
    private initializeChat(): void {
        // Chat is handled via template bindings
    }
    
    onChatInputKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.sendChatMessage();
        }
    }
    
    sendChatMessage(): void {
        const message = this.chatInput().trim();
        if (message) {
            console.log('Sending message:', message);
            this.chatInput.set('');
            // In a real app, this would send the message via WebSocket
        }
    }
    
    // Media Controls
    private initializeMediaControls(): void {
        // Media controls are handled via click handlers
    }
    
  
    
    // Leave Session
    leaveSession(): void {
        if (confirm('Are you sure you want to leave the session?')) {
            this.router.navigate([this.dashboardLink()]);
        }
    }
    
    // Grid Toggle
    private initializeGridToggle(): void {
        // Grid toggle is handled via click handler
    }
    
    onToggleGrid(): void {
        const currentSize = this.gridSize();
        const newSize = currentSize === 4 ? 1 : currentSize === 1 ? 2 : currentSize === 2 ? 3 : 4;
        this.gridSize.set(newSize);
        if (this.studentsGrid) {
            this.studentsGrid.nativeElement.className = `video-grid grid-${newSize}`;
        }
    }
    
    // Mobile Sidebar
    private initializeSidebar(): void {
        // Sidebar is handled via click handlers
    }
    
    onSidebarToggle(): void {
        this.sidebarOpen.set(true);
    }
    
    onMobileSidebarClose(): void {
        this.sidebarOpen.set(false);
    }
    
    onMobileChatToggle(): void {
        this.sidebarOpen.set(true);
        this.activeTab.set('chat');
    }
    
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.isMobile() && this.sidebarPanel && this.sidebarToggle && this.mobileChatToggle) {
            const target = event.target as HTMLElement;
            if (!this.sidebarPanel.nativeElement.contains(target) && 
                !this.sidebarToggle.nativeElement.contains(target) && 
                !this.mobileChatToggle.nativeElement.contains(target)) {
                if (this.sidebarOpen()) {
                    this.sidebarOpen.set(false);
                }
            }
        }
    }
    
    private setupClickOutsideListener(): void {
        // Handled by @HostListener
    }
    
    
    
   
     // Helper methods for template
     getSessionTime(): string {
        return this.sessionTime();
    }
    
    isChatTabActive(): boolean {
        return this.activeTab() === 'chat';
    }
    
    isParticipantsTabActive(): boolean {
        return this.activeTab() === 'participants';
    }
    
    isMicOn(): boolean {
        return this.micOn();
    }
    
    isVideoOn(): boolean {
        return this.videoOn();
    }
    isSidebarOpen(): boolean {
        return this.sidebarOpen();
    }
    
    getGridSize(): number {
        return this.gridSize();
    }
    onToggleWhiteboard(): void {
        this.whiteboardOpen.set(!this.whiteboardOpen());
    }
    
   
    
   
    
   
    
    
    
    
    onToggleMic(): void {
        if(this.videoElement) {
            this.videoElement.nativeElement.muted = !this.videoElement.nativeElement.muted;
        }
        if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                teacherControls: {
                    ...this.classRoomSocket().teacherControls,
                    micOn: !this.classRoomSocket().teacherControls?.micOn,

                },
            });
        }
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                studentControls: {
                    ...this.classRoomSocket().studentControls,
                    micOn: !this.classRoomSocket().studentControls?.micOn,
                },
            });
        }
    }
    onToggleVideo(): void {
        if(this.videoElement) {
            this.videoTrack.set({
                ...this.videoTrack(),
                enabled: !this.videoTrack()?.enabled,
            } as MediaStreamTrack);
        }
        if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                teacherControls: {
                    ...this.classRoomSocket().teacherControls,
                    videoOn: !this.classRoomSocket().teacherControls?.videoOn,

                },
            });
        }
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                studentControls: {
                    ...this.classRoomSocket().studentControls,
                    videoOn: !this.classRoomSocket().studentControls?.videoOn,
                },
            });
        }
        
    }
    currentUserDetails = computed<User | null | undefined>(() => {
        return this.authService.getCurrentUser();
    });
    otherParticipant = computed<Student | Teacher | null | undefined>(() => {
        if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            return this.booking()?.student
        }
        if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            return this.booking()?.teacher
        }
        return null;
    });

    //#region Video View
    EMITTERS = {
        STUDENT_JOINED_CLASS: 'student-joined-class',
        TEACHER_JOINED_CLASS: 'teacher-joined-class',
    }
    LISTENERS = {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        SESSION_STARTED: (bookingId: string | undefined) => `session-started_${bookingId}`,
        SESSION_ENDED: (bookingId: string | undefined) => `session-ended_${bookingId}`,
        SESSION_ERROR: (bookingId: string | undefined) => `session-error_${bookingId}`,
        SESSION_STATUS: (bookingId: string | undefined) => `session-status_${bookingId}`,
        STUDENT_JOINED_SESSION: (bookingId: string | undefined, studentId: string | undefined) => `student-joined-class_${bookingId}_${studentId}`,
        STUDENT_LEFT_SESSION: (bookingId: string | undefined, studentId: string | undefined) => `student-left-class_${bookingId}_${studentId}`,
        STUDENT_STREAM: (bookingId: string | undefined, studentId: string | undefined) => `student-stream_${bookingId}_${studentId}`,
        TEACHER_JOINED_SESSION: (bookingId: string | undefined, teacherId: string | undefined) => `teacher-joined-class_${bookingId}_${teacherId}`,
    }
    private initializeListeners(): void {
        const socketUrl = environment.socketUrl.endsWith('/') 
            ? environment.socketUrl.slice(0, -1) 
            : environment.socketUrl;
        this.socket = io(`${socketUrl}/class-room?bookingId=${this.bookingId()}`);
        this.socket.on(this.LISTENERS.CONNECT, () => {
            console.log('✅ Connected to class room server', this.socket.id);
            if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
                this.socket.emit(this.EMITTERS.STUDENT_JOINED_CLASS, { bookingId: this.bookingId(), studentId: this.authService.getCurrentUser()?.student?.id });
            }
            if(this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
                this.socket.emit(this.EMITTERS.TEACHER_JOINED_CLASS, { bookingId: this.bookingId(), teacherId: this.authService.getCurrentUser()?.teacher?.id });
            }
        });

        this.socket.on(this.LISTENERS.DISCONNECT, () => {
            console.log('❌ Disconnected from class room server');
        });
        this.socket.on(this.LISTENERS.SESSION_STARTED(this.bookingId()), (data: { stream: MediaStream }) => {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                isStarted: true,
                studentStream: data.stream,
            });
            console.log('Session started:', data);
        });
        this.socket.on(this.LISTENERS.SESSION_ENDED(this.bookingId()), () => {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                isStarted: false,
                studentStream: null,
                teacherStream: null,
            });
            console.log('Session ended');
        });
        this.socket.on(this.LISTENERS.SESSION_ERROR(this.bookingId()), (error: any) => {
            console.error('Session error:', error);
        });
        this.socket.on(this.LISTENERS.SESSION_STATUS(this.bookingId()), (data: { status: string }) => {
            console.log('Session status:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_JOINED_SESSION(this.bookingId(), this.booking()?.studentId), (data: { studentId: string }) => {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                hasStudentJoined: true
            });
            console.log('Student joined:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_LEFT_SESSION(this.bookingId(), this.booking()?.studentId ?? undefined), (data: { studentId: string }) => {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                hasStudentJoined: false
            });
            console.log('Student left:', data);
        });

        this.socket.on(this.LISTENERS.TEACHER_JOINED_SESSION(this.bookingId(), this.booking()?.teacherId ?? undefined), (data: { teacherId: string }) => {
            this.classRoomSocket.set({
                ...this.classRoomSocket(),
                hasTeacherJoined: true
            });
            console.log('Teacher joined:', data);
        });
     
        
    }
    //#endregion
}
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
import { Student } from "../../shared";
import { StreamDirective } from "../../components/stream.directive";
import { ProfilePhoto } from "../../components/misc/profile-photo/profile-photo";

@Component({
    selector: 'app-class-room',
    standalone: true,
    templateUrl: './class-room.html',
    styleUrls: ['./class-room.css'],
    imports: [CommonModule, RouterModule, FormsModule, StreamDirective, ProfilePhoto],
})
export default class ClassRoom implements AfterViewInit, OnDestroy, OnInit {
    socket!: Socket;
    bookingId = signal<string>('');
    dashboardLink = signal<string>('');

    // Session Timer
    sessionStartTime = Date.now();
    sessionTime = signal<string>('00:00:00');
    private timerInterval?: number;
    // Grid
    gridSize = signal<number>(4);
    isMobile = signal<boolean>(false);
    // Whiteboard
    whiteboardOpen = signal<boolean>(false);
    booking = signal<TeacherBooking | null>(null);
    UserRole = UserRole;

    constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router, private teacherService: TeacherService) {
        this.dashboardLink.set(ROUTES_MAP[this.authService.getCurrentUser()!.role]['SCHEDULE']);
        this.route.params.subscribe(params => {
            this.bookingId.set(params['bookingId']);

        });
    }

    ngOnInit(): void {
        this.getBookingDetails();
        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
            this.localStream = stream;
        });
    }
    currentUserControls = computed<{ micOn: boolean, videoOn: boolean }>(() => {
        return { micOn: false, videoOn: false };
    });
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
            this.socket.disconnect();
        }
    }
    leaveSession(): void {
        if (confirm('Are you sure you want to leave the session?')) {
            this.router.navigate([this.dashboardLink()]);
        }
    }
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {

    }
    onToggleMic(): void {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
                if (track.enabled) {
                    this.socket.emit(this.LISTENERS.UNMUTE, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id });
                } else {
                    this.socket.emit(this.LISTENERS.MUTE, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id });
                }
            });
        }

    }
    async onToggleVideo(): Promise<void> {
        if (!this.localStream) return;

        let videoTrack = this.localStream.getVideoTracks()[0];

        if (!videoTrack) {
            // Teacher starts with video off -> create new track
            const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = newStream.getVideoTracks()[0];
            this.localStream.addTrack(videoTrack);

            // Add the track to all existing peer connections
            Object.values(this.peers).forEach(pc => {
                pc.addTrack(videoTrack!, this.localStream);
            });

            this.socket.emit(this.LISTENERS.UNMUTE_VIDEO, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id });
            return;
        }

        // Toggle existing video track
        videoTrack.enabled = !videoTrack.enabled;
        if (videoTrack.enabled) {
            this.socket.emit(this.LISTENERS.UNMUTE_VIDEO, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id });
        } else {
            this.socket.emit(this.LISTENERS.MUTE_VIDEO, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id });
        }
    }

    currentUserDetails = computed<User | null | undefined>(() => {
        return this.authService.getCurrentUser();
    });
    otherParticipant = computed<Student | Teacher | null | undefined>(() => {
        if (this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
            return this.booking()?.student
        }
        if (this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
            return this.booking()?.teacher
        }
        return null;
    });

    //#region Video View
    EMITTERS = {
        STUDENT_JOINED_CLASS: 'student-joined-class',
        TEACHER_JOINED_CLASS: 'teacher-joined-class',
        JOIN_CLASS: 'join-class',
        SIGNAL: 'signal',
        MUTE: 'mute',
        UNMUTE: 'unmute',
        MUTE_VIDEO: 'mute-video',
        UNMUTE_VIDEO: 'unmute-video',
    }
    LISTENERS = {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        JOIN_CLASS: (bookingId: string | undefined) => `join-class_${bookingId}`,
        SIGNAL: 'signal',
        MUTE: 'mute',
        UNMUTE: 'unmute',
        MUTE_VIDEO: 'mute-video',
        UNMUTE_VIDEO: 'unmute-video',

    }

    peers: { [userId: string]: RTCPeerConnection } = {};
    peer: RTCPeerConnection | null = null;
    localStream!: MediaStream;
    remoteStreams: { stream: MediaStream, userId: string }[] = [];
    private initializeListeners(): void {
        const socketUrl = environment.socketUrl.endsWith('/')
            ? environment.socketUrl.slice(0, -1)
            : environment.socketUrl;
        this.socket = io(`${socketUrl}/class-room?bookingId=${this.bookingId()}`);
        this.socket.on(this.LISTENERS.CONNECT, (data) => {
            console.log('✅ Data Received', data);
            console.log('✅ Connected to class room server', this.socket.id);
            this.socket.emit(this.EMITTERS.JOIN_CLASS, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id, role: this.authService.getCurrentUser()?.role });
            console.log('✅ Emitting join class event');
            if (this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
                //this.socket.emit(this.EMITTERS.STUDENT_JOINED_CLASS, { bookingId: this.bookingId(), studentId: this.authService.getCurrentUser()?.student?.id });
            }
            if (this.authService.getCurrentUser()?.role === UserRole.TEACHER) {

                //this.socket.emit(this.EMITTERS.TEACHER_JOINED_CLASS, { bookingId: this.bookingId(), teacherId: this.authService.getCurrentUser()?.teacher?.id });
            }
        });

        this.socket.on(this.LISTENERS.DISCONNECT, () => {
            console.log('❌ Disconnected from class room server');
        });
        this.socket.on(this.LISTENERS.JOIN_CLASS(this.bookingId()), async ({ userId, role, stream }) => {
            console.log('✅ User joined class', userId);
            if (userId === this.authService.getCurrentUser()?.id) return;
            console.log('✅ Creating peer for', userId, "from ", this.authService.getCurrentUser()?.role);
            const pc = this.createPeer(userId);
            this.peers[userId] = pc;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit(this.LISTENERS.SIGNAL, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id, signal: offer });
        });

        this.socket.on(this.LISTENERS.SIGNAL, async ({ signal, userId }) => {
            console.log('✅ Signal received', signal, userId);
            if (userId === this.authService.getCurrentUser()?.id) return;
            let pc = this.peers[userId];
            if (!pc) {
                pc = this.createPeer(userId);
                console.log('✅ Peer created for', userId);
                this.peers[userId] = pc;
            }
            if (signal.type === 'offer') {
                console.log('✅ Setting remote description for', userId);
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                console.log('✅ Creating answer for', userId);
                const answer = await pc.createAnswer();
                console.log('✅ Setting local description for', userId);
                await pc.setLocalDescription(answer);
                console.log('✅ Emitting answer for', userId);
                this.socket.emit(this.LISTENERS.SIGNAL, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id, signal: answer });
            } else if (signal.type === 'answer') {
                console.log('✅ Setting remote description for', userId);
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                console.log('✅ Adding ICE candidate for', userId);
                try {
                    await pc.addIceCandidate(signal);
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        });
        this.socket.on(this.LISTENERS.MUTE, (data) => {
            console.log('✅ Data Received', data);
            console.log('✅ Muted for', data.userId);
            this.peers[data.userId].getSenders().forEach((sender) => {
                if (sender.track?.kind === 'audio') {
                    sender.track.enabled = false;
                }
            });
            this.remoteStreams.find((stream) => stream.userId === data.userId)?.stream.getAudioTracks().forEach((track) => {
                track.enabled = false;
            });
        });
        this.socket.on(this.LISTENERS.UNMUTE, (data) => {
            console.log('✅ Data Received', data);
            console.log('✅ Unmuted for', data.userId);
            this.peers[data.userId].getSenders().forEach((sender) => {
                if (sender.track?.kind === 'audio') {
                    sender.track.enabled = true;
                }
            });
            this.remoteStreams.find((stream) => stream.userId === data.userId)?.stream.getAudioTracks().forEach((track) => {
                track.enabled = true;
            });
        });
        this.socket.on(this.LISTENERS.MUTE_VIDEO, (data) => {
            console.log('✅ Data Received', data);
            console.log('✅ Video muted for', data.userId);
            this.peers[data.userId].getSenders().forEach((sender) => {
                if (sender.track?.kind === 'video') {
                    sender.track.enabled = false;
                }
            });
            this.remoteStreams.find((stream) => stream.userId === data.userId)?.stream.getVideoTracks().forEach((track) => {
                track.enabled = false;
            });
        });
        this.socket.on(this.LISTENERS.UNMUTE_VIDEO, (data) => {
            console.log('✅ Data Received', data);
            console.log('✅ Video unmuted for', data.userId);
            this.peers[data.userId].getSenders().forEach((sender) => {
                if (sender.track?.kind === 'video') {
                    sender.track.enabled = true;
                }
            });
            this.remoteStreams.find((stream) => stream.userId === data.userId)?.stream.getVideoTracks().forEach((track) => {
                track.enabled = true;
            });
        });



    }
    private createPeer(userId: string): RTCPeerConnection {
        console.log('✅ Creating peer for', userId);
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
        }
        console.log('✅ Adding onicecandidate event listener for', userId);
        pc.onicecandidate = (event) => {
            console.log('✅ onicecandidate event received for', userId);
            if (event.candidate) {
                console.log('✅ Emitting signal for', userId);
                this.socket.emit(this.LISTENERS.SIGNAL, { bookingId: this.bookingId(), userId: this.authService.getCurrentUser()?.id, signal: event.candidate });
            }
        };
        console.log('✅ Adding ontrack event listener for', userId);
        //if (userId != this.authService.getCurrentUser()?.id) {
        console.log('✅ Adding ontrack event listener for', userId);
        pc.ontrack = (event) => {
            console.log('✅ ontrack event received for', userId);
            // check if userId is teacher
            const remoteStream = event.streams[0];
            if (!this.remoteStreams.some(_remoteStream => _remoteStream.stream.id === remoteStream.id)) {
                this.remoteStreams = [...this.remoteStreams, { stream: remoteStream, userId: userId }];
            }
        };
        // }
        console.log('✅ Adding oniceconnectionstatechange event listener for', userId);
        pc.oniceconnectionstatechange = () => {
            console.log('✅ oniceconnectionstatechange event received for', userId);
            if (pc.iceConnectionState === 'connected') {
                console.log('✅ Peer connection established for', userId);
            }
        };
        return pc;
    }

    //check of audio and video enabled
    getStreamController(stream: MediaStream): MediaStreamConstraints {
        if (!stream) return { audio: false, video: false };
        const audioTrack = stream.getAudioTracks().some(track => track.enabled);
        const videoTrack = stream.getVideoTracks().some(track => track.enabled);
        return {
            audio: audioTrack,
            video: videoTrack
        };
    }

    //#endregion
}
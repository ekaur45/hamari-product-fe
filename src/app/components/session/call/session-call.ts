import { CommonModule } from "@angular/common";
import { Component, computed, input, OnInit, OnDestroy, signal, ViewChild, ElementRef } from "@angular/core";
import { Router } from "@angular/router";
import { DialogModule } from "primeng/dialog";
import SessionCallSettings from "../call-settings/call-settings";
import SessionChat from "../chat/session.chat";
import { UserRole, User } from "../../../shared/models/user.interface";
import { AuthService, TeacherBookingDto } from "../../../shared";
import { StreamDirective } from "../../stream.directive";
import { ProfilePhoto } from "../../misc/profile-photo/profile-photo";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../../environments/environment";
import { WhiteBoard } from "../../white-board/white-board";
import { RatingModule } from "primeng/rating";
import { UIRating } from "../../misc/rating/ui-rating";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";
import * as htmlToImage from 'html-to-image';

@Component({
    selector: 'taleemiyat-session-call',
    templateUrl: './session-call.html',
    standalone: true,
    imports: [CommonModule, DialogModule, SessionCallSettings, SessionChat, StreamDirective, ProfilePhoto, WhiteBoard, RatingModule, UIRating, MenuModule],
})
export default class SessionCall implements OnInit, OnDestroy {
    @ViewChild('localVideo') localVideoElement?: ElementRef<HTMLVideoElement>;
    @ViewChild('remoteVideo') remoteVideoElement?: ElementRef<HTMLVideoElement>;
    @ViewChild('recordContainer') recordContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('screenShareVideo') screenShareVideoElement?: ElementRef<HTMLVideoElement>;

    // Inputs
    bookingId = input<string>('');
    sessionId = input<string>('');
    booking = input<TeacherBookingDto | null>(null);
    testMode = input<boolean>(false); // For testing without media devices

    showChat = signal<boolean>(false);
    showCallSettings = signal<boolean>(false);
    showWhiteboard = signal<boolean>(false);
    showLeaveDialog = signal<boolean>(false);
    showRateAndReviewDialog = signal<boolean>(false);
    userType = signal<UserRole>(UserRole.STUDENT);
    rating = signal<'excellent' | 'good' | 'average' | 'poor' | 'very poor'>('excellent');
    // Socket and WebRTC
    socket!: Socket;
    peer: RTCPeerConnection | null = null;

    // Call state
    isConnected = signal<boolean>(false);
    isConnecting = signal<boolean>(false);
    callDuration = signal<string>('00:00:00');
    isScreenSharing = signal<boolean>(false);
    viewMode = signal<'split' | 'pip'>('pip');

    // Streams
    localStream!: MediaStream;
    remoteStream = signal<MediaStream | null>(null);

    // Participants
    currentUser = computed<User | null | undefined>(() => this.authService.getCurrentUser());
    remoteParticipant = signal<{ name: string; role: string; isVideoOn: boolean; isAudioOn: boolean; userId?: string, user?: User } | null>(null);

    // Connection quality
    connectionQuality = signal<'excellent' | 'good' | 'fair' | 'poor'>('good');
    tabs = signal<('whiteboard' | 'screen-sharing')[]>([]);
    activeTab = signal<'whiteboard' | 'screen-sharing'>('whiteboard');
    menuItems = signal<MenuItem[]>([
        {
            label: 'Whiteboard',
            icon: 'fas fa-whiteboard',
            command: () => {
                this.activeTab.set('whiteboard');
                this.showWhiteboard.set(true);
                if (!this.tabs().includes('whiteboard')) {
                    this.tabs.set([...this.tabs(), 'whiteboard']);
                }
            }
        },
        {
            label: 'Screen Sharing',
            icon: 'fas fa-share-screen',
            command: () => {
                this.activeTab.set('screen-sharing');
                this.toggleScreenShare();
                if (!this.tabs().includes('screen-sharing')) {
                    this.tabs.set([...this.tabs(), 'screen-sharing']);
                }
            }
        }
    ]);

    screenShareStream = signal<MediaStream | null>(null);

    // Recording
    isRecording = signal<boolean>(false);
    recordingDuration = signal<string>('00:00:00');
    private mediaRecorder?: MediaRecorder;
    private recordedChunks: Blob[] = [];
    private recordingTimerInterval?: number;
    private recordingStartTime?: number;
    private recordingMimeType: string = 'video/webm';
    private recordingCanvas?: HTMLCanvasElement;
    private recordingCanvasContext?: CanvasRenderingContext2D;
    private recordingCanvasStream?: MediaStream;
    private recordingMediaRecorder?: MediaRecorder;
    private recordingAnimationFrame?: number;
    private recordingInterval?: number;
    private uiCaptureImage?: HTMLImageElement;
    private lastUICaptureTime: number = 0;
    private readonly UI_CAPTURE_INTERVAL = 2000; // Capture UI every 2 seconds

    // Timer
    private timerInterval?: number;
    private remoteStreamSyncInterval?: number;
    private disconnectTimeout?: number;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_DELAY = 5000; // 5 seconds

    // Socket event names
    private readonly EMITTERS = {
        JOIN_CLASS: 'join-class',
        SIGNAL: 'signal',
        MUTE: 'mute',
        UNMUTE: 'unmute',
        MUTE_VIDEO: 'mute-video',
        UNMUTE_VIDEO: 'unmute-video',
        LEAVE_CALL: 'leave-call',
        END_CALL: 'end-call',
    };

    private readonly LISTENERS = {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        JOIN_CLASS: (bookingId: string) => `join-class_${bookingId}`,
        SIGNAL: 'signal',
        MUTE: 'mute',
        UNMUTE: 'unmute',
        MUTE_VIDEO: 'mute-video',
        UNMUTE_VIDEO: 'unmute-video',
        TEACHER_LEFT: 'teacher-left',
        CALL_ENDED: 'call-ended',
    };

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        this.userType.set((this.authService.getCurrentUser()?.role as UserRole) ?? UserRole.STUDENT);
    }

    async ngOnInit(): Promise<void> {
        this.userType.set((this.authService.getCurrentUser()?.role as UserRole) ?? UserRole.STUDENT);
        this.isConnecting.set(true);
        this.startCallTimer();
        if (this.booking()) {
            if (this.authService.getCurrentUser()?.role === UserRole.TEACHER) {
                this.remoteParticipant.set({
                    name: this.booking()?.student?.user.firstName + ' ' + this.booking()?.student?.user.lastName,
                    role: UserRole.STUDENT,
                    isVideoOn: true,
                    isAudioOn: true,
                    userId: this.booking()?.student?.id ?? '',
                    user: this.booking()?.student?.user
                });
            } else if (this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
                this.remoteParticipant.set({
                    name: this.booking()?.teacher?.user?.firstName + ' ' + this.booking()?.teacher?.user?.lastName,
                    role: UserRole.TEACHER,
                    isVideoOn: true,
                    isAudioOn: true,
                    userId: this.booking()?.teacher?.id ?? '',
                    user: this.booking()?.teacher?.user
                });
            }
        }

        // Initialize local media stream
        await this.initializeLocalStream();

        // Initialize socket connection
        this.initializeSocket();

    }

    private async initializeLocalStream(): Promise<void> {
        // If in test mode, create empty stream and skip device access
        if (this.testMode()) {
            console.log('🧪 Test mode: Creating empty stream without accessing devices');
            this.localStream = new MediaStream();
            if (this.localVideoElement?.nativeElement) {
                this.localVideoElement.nativeElement.srcObject = this.localStream;
            }
            return;
        }

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ getUserMedia not available, creating empty stream');
            this.localStream = new MediaStream();
            if (this.localVideoElement?.nativeElement) {
                this.localVideoElement.nativeElement.srcObject = this.localStream;
            }
            return;
        }

        try {
            // Try to get both video and audio
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user"
                },
                audio: {
                    noiseSuppression: true,
                    echoCancellation: true,
                    autoGainControl: true,

                }
            });

            // Update local video element if available
            if (this.localVideoElement?.nativeElement) {
                this.localVideoElement.nativeElement.srcObject = this.localStream;
            }
            this.updateStreamState();
            console.log('✅ Local stream initialized with video and audio');
        } catch (error: any) {
            console.warn('⚠️ Could not get video and audio, trying audio only:', error.message);
            try {
                // Fallback: try audio only
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment"
                    },
                    audio: {
                        noiseSuppression: true,
                        echoCancellation: true,
                        autoGainControl: true,
                    }
                });
                this.updateStreamState();
                console.log('✅ Local stream initialized with audio only');
            } catch (audioError: any) {
                console.warn('⚠️ Could not get audio, trying video only:', audioError.message);
                try {
                    // Fallback: try video only
                    this.localStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "environment"
                        },
                        audio: {
                            noiseSuppression: true,
                            echoCancellation: true,
                            autoGainControl: true,
                        }
                    });
                    this.updateStreamState();
                    console.log('✅ Local stream initialized with video only');
                } catch (videoError: any) {
                    console.warn('⚠️ Could not get any media devices:', videoError.message);
                    console.log('💡 Creating empty stream for testing. UI will work but no actual media.');
                    // Last resort: create an empty MediaStream
                    // This allows the component to work without actual devices (for testing)
                    this.localStream = new MediaStream();
                    this.updateStreamState();
                    console.log('✅ Empty stream created - component will work in test mode');
                }
            }

            // Update local video element if available
            if (this.localVideoElement?.nativeElement && this.localStream) {
                this.localVideoElement.nativeElement.srcObject = this.localStream;
            }

            // Update initial state signals
            this.updateStreamState();
        }
    }

    private updateStreamState(): void {
        if (!this.localStream) {
            this.isMuted.set(true);
            this.isVideoOff.set(true);
            return;
        }

        const audioTracks = this.localStream.getAudioTracks();
        const videoTracks = this.localStream.getVideoTracks();

        this.isMuted.set(audioTracks.length === 0 || !audioTracks.some(track => track.enabled));
        this.isVideoOff.set(videoTracks.length === 0 || !videoTracks.some(track => track.enabled));
    }

    ngOnDestroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.remoteStreamSyncInterval) {
            clearInterval(this.remoteStreamSyncInterval);
        }
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
        }
        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
        }
        // Stop recording if active
        if (this.isRecording()) {
            this.stopRecording();
        }
        // Cleanup recording resources
        this.cleanupRecording();
        if (this.socket) {
            this.socket.disconnect();
        }
        if (this.peer) {
            this.peer.close();
        }
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.remoteStream()) {
            this.remoteStream()!.getTracks().forEach(track => track.stop());
        }
    }

    private initializeSocket(): void {
        const sessionId = this.bookingId() || this.sessionId();
        if (!sessionId) {
            console.error('No bookingId or sessionId provided');
            return;
        }

        const socketUrl = environment.socketUrl.endsWith('/')
            ? environment.socketUrl.slice(0, -1)
            : environment.socketUrl;

        this.socket = io(`${socketUrl}/class-room?bookingId=${sessionId}`);

        this.socket.on(this.LISTENERS.CONNECT, () => {
            console.log('✅ Connected to call server', this.socket.id);
            // Clear any disconnect timeout since we're connected
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
                this.disconnectTimeout = undefined;
            }
            // Rejoin the class room - this will trigger reconnection if other user is already in call
            this.socket.emit(this.EMITTERS.JOIN_CLASS, {
                bookingId: sessionId,
                userId: this.authService.getCurrentUser()?.id,
                role: this.authService.getCurrentUser()?.role
            });
        });

        this.socket.on(this.LISTENERS.DISCONNECT, () => {
            console.log('❌ Disconnected from call server');

            // Check if remote participant (teacher) disconnected
            const remoteParticipant = this.remoteParticipant();
            if (remoteParticipant && remoteParticipant.role === UserRole.TEACHER && this.userType() === UserRole.STUDENT) {
                // Teacher disconnected - show rating dialog after a short delay
                setTimeout(() => {
                    if (!this.isConnected() && this.userType() === UserRole.STUDENT) {
                        this.showLeaveDialog.set(false);
                        this.showRateAndReviewDialog.set(true);
                    }
                }, 2000);
            }

            // Don't immediately set isConnected to false - wait to see if it's a reconnection
            // This prevents the UI from showing "Waiting for call to begin" when the other user refreshes
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
            }
            this.disconnectTimeout = window.setTimeout(() => {
                // Only set to disconnected if we haven't reconnected after delay
                if (!this.socket?.connected) {
                    console.log('⚠️ Still disconnected after delay, marking as disconnected');
                    this.isConnected.set(false);
                    this.isConnecting.set(true); // Show connecting state while waiting for reconnection
                }
            }, 3000); // Wait 3 seconds before marking as disconnected
        });

        this.socket.on(this.LISTENERS.JOIN_CLASS(sessionId), async ({ userId, role }: { userId: string, role: string }) => {
            console.log('✅ User joined call', userId);
            if (userId === this.authService.getCurrentUser()?.id) return;

            // Clear disconnect timeout since we're reconnecting
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
                this.disconnectTimeout = undefined;
            }

            // Check if we already have a peer connection - if so, close it and create a new one
            if (this.peer) {
                console.log('🔄 Re-establishing peer connection after rejoin');
                this.peer.close();
                this.peer = null;
            }

            // Update remote participant info if not already set
            if (!this.remoteParticipant() || this.remoteParticipant()?.userId !== userId) {
                // Keep existing participant info if available, otherwise use defaults
                const existingParticipant = this.remoteParticipant();
                this.remoteParticipant.set({
                    name: existingParticipant?.name || 'Remote Participant',
                    role: existingParticipant?.role || (role === UserRole.TEACHER ? 'Teacher' : 'Student'),
                    isVideoOn: existingParticipant?.isVideoOn ?? true,
                    isAudioOn: existingParticipant?.isAudioOn ?? true,
                    userId: userId,
                    user: existingParticipant?.user
                });
            }

            // Create peer connection
            this.peer = this.createPeer(userId);

            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(offer);
            this.socket.emit(this.LISTENERS.SIGNAL, {
                bookingId: sessionId,
                userId: this.authService.getCurrentUser()?.id,
                signal: offer
            });

            this.isConnecting.set(false);
            this.isConnected.set(true);
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        });

        this.socket.on(this.LISTENERS.SIGNAL, async ({ signal, userId }: { signal: any, userId: string }) => {
            console.log('✅ Signal received', signal, userId);
            if (userId === this.authService.getCurrentUser()?.id) return;

            // Clear disconnect timeout since we're receiving signals (connection is active)
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
                this.disconnectTimeout = undefined;
            }

            // If peer connection doesn't exist or is closed, recreate it
            if (!this.peer || this.peer.connectionState === 'closed' || this.peer.connectionState === 'failed') {
                console.log('🔄 Recreating peer connection for signal');
                if (this.peer) {
                    this.peer.close();
                }
                this.peer = this.createPeer(userId);
            }

            if (signal.type === 'offer') {
                // Second user receives offer - create answer
                console.log('📥 Received offer from', userId);
                try {
                    await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await this.peer.createAnswer();
                    await this.peer.setLocalDescription(answer);
                    this.socket.emit(this.LISTENERS.SIGNAL, {
                        bookingId: sessionId,
                        userId: this.authService.getCurrentUser()?.id,
                        signal: answer
                    });

                    // Update remote participant info if not set
                    if (!this.remoteParticipant() || this.remoteParticipant()?.userId !== userId) {
                        const existingParticipant = this.remoteParticipant();
                        this.remoteParticipant.set({
                            name: existingParticipant?.name || 'Remote Participant',
                            role: existingParticipant?.role || 'Participant',
                            isVideoOn: existingParticipant?.isVideoOn ?? true,
                            isAudioOn: existingParticipant?.isAudioOn ?? true,
                            userId: userId,
                            user: existingParticipant?.user
                        });
                    }

                    // Update connection state for second user
                    this.isConnecting.set(false);
                    this.isConnected.set(true);
                    this.reconnectAttempts = 0;
                } catch (error) {
                    console.error('❌ Error handling offer:', error);
                }
            } else if (signal.type === 'answer') {
                // First user receives answer
                console.log('📥 Received answer from', userId);
                try {
                    await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                    // Connection state should already be set, but ensure it's correct
                    this.isConnecting.set(false);
                    this.isConnected.set(true);
                    this.reconnectAttempts = 0;
                } catch (error) {
                    console.error('❌ Error handling answer:', error);
                }
            } else if (signal.candidate) {
                try {
                    await this.peer.addIceCandidate(signal);
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        });

        // Mute/Unmute listeners
        this.socket.on(this.LISTENERS.MUTE, (data: { userId: string }) => {
            console.log('🔇 Remote user muted:', data.userId, 'Current participant:', this.remoteParticipant()?.userId);
            // Update remote stream tracks (tracks we're receiving from remote)
            if (this.remoteStream()) {
                this.remoteStream()!.getAudioTracks().forEach((track) => {
                    track.enabled = false;
                });
                // Sync state from actual stream
                this.syncRemoteParticipantState(this.remoteStream()!, data.userId);
            } else {
                // Always update UI state - in one-to-one call, there's only one remote participant
                const currentParticipant = this.remoteParticipant();
                if (currentParticipant) {
                    this.remoteParticipant.set({
                        ...currentParticipant,
                        isAudioOn: false
                    });
                } else {
                    this.remoteParticipant.set({
                        name: 'Remote Participant',
                        role: 'Participant',
                        isVideoOn: true,
                        isAudioOn: false,
                        userId: data.userId
                    });
                }
            }
            console.log('✅ Updated remote participant audio state to muted');
        });

        this.socket.on(this.LISTENERS.UNMUTE, (data: { userId: string }) => {
            console.log('🔊 Remote user unmuted:', data.userId, 'Current participant:', this.remoteParticipant()?.userId);
            // Update remote stream tracks (tracks we're receiving from remote)
            if (this.remoteStream()) {
                this.remoteStream()!.getAudioTracks().forEach((track) => {
                    track.enabled = true;
                });
                // Sync state from actual stream
                this.syncRemoteParticipantState(this.remoteStream()!, data.userId);
            } else {
                // Always update UI state - in one-to-one call, there's only one remote participant
                const currentParticipant = this.remoteParticipant();
                if (currentParticipant) {
                    this.remoteParticipant.set({
                        ...currentParticipant,
                        isAudioOn: true
                    });
                } else {
                    this.remoteParticipant.set({
                        name: 'Remote Participant',
                        role: 'Participant',
                        isVideoOn: true,
                        isAudioOn: true,
                        userId: data.userId
                    });
                }
            }
            console.log('✅ Updated remote participant audio state to unmuted');
        });

        this.socket.on(this.LISTENERS.MUTE_VIDEO, (data: { userId: string }) => {
            console.log('📹 Remote user video muted:', data.userId, 'Current participant:', this.remoteParticipant()?.userId);
            // Update remote stream tracks (tracks we're receiving from remote)
            if (this.remoteStream()) {
                this.remoteStream()!.getVideoTracks().forEach((track) => {
                    track.enabled = false;
                });
                // Sync state from actual stream
                this.syncRemoteParticipantState(this.remoteStream()!, data.userId);
            } else {
                // Always update UI state - in one-to-one call, there's only one remote participant
                const currentParticipant = this.remoteParticipant();
                if (currentParticipant) {
                    this.remoteParticipant.set({
                        ...currentParticipant,
                        isVideoOn: false
                    });
                } else {
                    this.remoteParticipant.set({
                        name: 'Remote Participant',
                        role: 'Participant',
                        isVideoOn: false,
                        isAudioOn: true,
                        userId: data.userId
                    });
                }
            }
            console.log('✅ Updated remote participant video state to muted');
        });

        this.socket.on(this.LISTENERS.UNMUTE_VIDEO, (data: { userId: string }) => {
            console.log('📹 Remote user video unmuted:', data.userId, 'Current participant:', this.remoteParticipant()?.userId);
            // Update remote stream tracks (tracks we're receiving from remote)
            if (this.remoteStream()) {
                this.remoteStream()!.getVideoTracks().forEach((track) => {
                    track.enabled = true;
                });
            }
            // Always update UI state - in one-to-one call, there's only one remote participant
            const currentParticipant = this.remoteParticipant();
            if (currentParticipant) {
                this.remoteParticipant.set({
                    ...currentParticipant,
                    isVideoOn: true
                });
            } else {
                this.remoteParticipant.set({
                    name: 'Remote Participant',
                    role: 'Participant',
                    isVideoOn: true,
                    isAudioOn: true,
                    userId: data.userId
                });
            }
            console.log('✅ Updated remote participant video state to unmuted');
        });

        // Listen for when teacher leaves the call
        this.socket.on(this.LISTENERS.CALL_ENDED, (data: { userId: string, role: string }) => {
            console.log('👋 Teacher left the call:', data.userId);

            // Only show rating dialog if current user is a student
            if (this.userType() === UserRole.STUDENT) {
                // Close any open dialogs first
                this.showLeaveDialog.set(false);
                // Show rating dialog
                this.showRateAndReviewDialog.set(true);
            }
        });
    }

    private createPeer(userId: string): RTCPeerConnection {
        console.log('✅ Creating peer for', userId);
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const sessionId = this.bookingId() || this.sessionId();
                this.socket.emit(this.LISTENERS.SIGNAL, {
                    bookingId: sessionId,
                    userId: this.authService.getCurrentUser()?.id,
                    signal: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('✅ Remote track received for', userId);
            const remoteStream = event.streams[0];
            this.remoteStream.set(remoteStream);

            // Sync remote participant state with actual stream state
            this.syncRemoteParticipantState(remoteStream, userId);

            // Listen to track changes to keep UI in sync
            event.track.onended = () => {
                console.log('🔄 Remote track ended, syncing state');
                if (this.remoteStream()) {
                    this.syncRemoteParticipantState(this.remoteStream()!, userId);
                }
            };

            // Listen to mute/unmute events on tracks
            event.track.onmute = () => {
                console.log('🔇 Remote track muted');
                if (this.remoteStream()) {
                    this.syncRemoteParticipantState(this.remoteStream()!, userId);
                }
            };

            event.track.onunmute = () => {
                console.log('🔊 Remote track unmuted');
                if (this.remoteStream()) {
                    this.syncRemoteParticipantState(this.remoteStream()!, userId);
                }
            };

            // Update connection state when we receive tracks
            this.isConnecting.set(false);
            this.isConnected.set(true);
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                this.connectionQuality.set('excellent');
                // Ensure connection state is updated when ICE connection is established
                this.isConnecting.set(false);
                this.isConnected.set(true);
                this.reconnectAttempts = 0;
            } else if (pc.iceConnectionState === 'checking') {
                this.connectionQuality.set('good');
                // Don't change connection state while checking - might be reconnecting
            } else if (pc.iceConnectionState === 'disconnected') {
                // Disconnected is temporary - don't immediately mark as disconnected
                // Wait a bit to see if it reconnects
                this.connectionQuality.set('fair');
                console.log('⚠️ ICE connection disconnected, waiting for potential reconnect...');
                // Don't set isConnected to false immediately - give it time to reconnect
            } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                // Failed or closed is permanent - mark as disconnected
                this.connectionQuality.set('poor');
                console.log('❌ ICE connection failed or closed');
                this.isConnected.set(false);
                this.isConnecting.set(true); // Show connecting state while waiting for reconnection

                // Check if teacher disconnected and show rating dialog for students
                const remoteParticipant = this.remoteParticipant();
                if (remoteParticipant && remoteParticipant.role === UserRole.TEACHER && this.userType() === UserRole.STUDENT) {
                    // Wait a bit to see if it's just a temporary disconnection
                    setTimeout(() => {
                        if (!this.isConnected() && this.userType() === UserRole.STUDENT) {
                            this.showLeaveDialog.set(false);
                            this.showRateAndReviewDialog.set(true);
                        }
                    }, 2000);
                }
            }
        };

        return pc;
    }

    getStreamController(stream: MediaStream | null): { audio: boolean, video: boolean } {
        if (!stream) return { audio: false, video: false };
        const audioTrack = stream.getAudioTracks().some(track => track.enabled);
        const videoTrack = stream.getVideoTracks().some(track => track.enabled);
        return {
            audio: audioTrack,
            video: videoTrack
        };
    }

    private syncRemoteParticipantState(stream: MediaStream, userId: string): void {
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        const isAudioOn = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
        const isVideoOn = videoTracks.length > 0 && videoTracks.some(track => track.enabled);

        const currentParticipant = this.remoteParticipant();
        this.remoteParticipant.set({
            ...(currentParticipant || {
                name: 'Remote Participant',
                role: 'Participant',
                isVideoOn: true,
                isAudioOn: true,
                userId: userId
            }),
            isAudioOn: isAudioOn,
            isVideoOn: isVideoOn,
            userId: userId
        });
        console.log('🔄 Synced remote participant state:', { isAudioOn, isVideoOn, userId });
    }

    toggleMute(): void {
        if (!this.localStream) {
            console.warn('⚠️ No local stream available for muting');
            return;
        }

        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.warn('⚠️ No audio tracks available');
            // Try to get audio track
            this.requestAudioTrack();
            return;
        }

        // Toggle the enabled state
        const newState = !audioTracks[0].enabled;
        audioTracks.forEach((track) => {
            track.enabled = newState;
        });

        // Update state signal
        this.isMuted.set(!newState);

        console.log('🎤 Mute toggled:', !newState ? 'Muted' : 'Unmuted');

        const sessionId = this.bookingId() || this.sessionId();
        if (this.socket && sessionId) {
            if (newState) {
                this.socket.emit(this.EMITTERS.UNMUTE, {
                    bookingId: sessionId,
                    userId: this.authService.getCurrentUser()?.id
                });
            } else {
                this.socket.emit(this.EMITTERS.MUTE, {
                    bookingId: sessionId,
                    userId: this.authService.getCurrentUser()?.id
                });
            }
        }
    }

    private async requestAudioTrack(): Promise<void> {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = newStream.getAudioTracks()[0];
            if (this.localStream) {
                this.localStream.addTrack(audioTrack);
                // Add track to peer connection
                if (this.peer) {
                    this.peer.addTrack(audioTrack, this.localStream);
                }
            }
        } catch (error) {
            console.error('Error requesting audio track:', error);
        }
    }

    async toggleVideo(): Promise<void> {
        if (!this.localStream) {
            console.warn('⚠️ No local stream available for video toggle');
            return;
        }

        let videoTrack = this.localStream.getVideoTracks()[0];

        if (!videoTrack) {
            // Video track doesn't exist, create one
            console.log('📹 No video track, requesting new one...');
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                videoTrack = newStream.getVideoTracks()[0];
                this.localStream.addTrack(videoTrack);

                // Update video element
                if (this.localVideoElement?.nativeElement) {
                    this.localVideoElement.nativeElement.srcObject = this.localStream;
                }

                // Add track to peer connection
                if (this.peer) {
                    this.peer.addTrack(videoTrack, this.localStream);
                }

                const sessionId = this.bookingId() || this.sessionId();
                if (this.socket && sessionId) {
                    this.socket.emit(this.EMITTERS.UNMUTE_VIDEO, {
                        bookingId: sessionId,
                        userId: this.authService.getCurrentUser()?.id
                    });
                }
                // Update state signal
                this.isVideoOff.set(false);
                console.log('✅ Video track added and enabled');
            } catch (error) {
                console.error('❌ Error enabling video:', error);
            }
            return;
        }

        // Toggle existing video track
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;

        // Update state signal
        this.isVideoOff.set(!newState);

        console.log('📹 Video toggled:', newState ? 'On' : 'Off');

        const sessionId = this.bookingId() || this.sessionId();
        if (this.socket && sessionId) {
            if (newState) {
                this.socket.emit(this.EMITTERS.UNMUTE_VIDEO, {
                    bookingId: sessionId,
                    userId: this.authService.getCurrentUser()?.id
                });
            } else {
                this.socket.emit(this.EMITTERS.MUTE_VIDEO, {
                    bookingId: sessionId,
                    userId: this.authService.getCurrentUser()?.id
                });
            }
        }
    }

    async toggleScreenShare(): Promise<void> {
        // TODO: Implement screen sharing
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            this.screenShareStream.set(stream);
            this.activeTab.set('screen-sharing');
            if (!this.tabs().includes('screen-sharing')) {
                this.tabs.set([...this.tabs(), 'screen-sharing']);
            }
            stream.onremovetrack = (event) => {
                console.log('🔄 Screen share track removed');
                this.screenShareStream.set(null);
                this.isScreenSharing.set(false);
                this.tabs.set(this.tabs().filter(tab => tab !== 'screen-sharing'));
                // Switch to whiteboard if available, otherwise default view
                if (this.showWhiteboard() && this.tabs().includes('whiteboard')) {
                    this.activeTab.set('whiteboard');
                }
            };
        } catch (error) {
            console.error('Error toggling screen share:', error);
        }


        this.isScreenSharing.set(!this.isScreenSharing());
    }

    toggleViewMode(): void {
        this.viewMode.set(this.viewMode() === 'split' ? 'pip' : 'split');
    }

    leaveCall(): void {
        // Show confirmation dialog
        this.showLeaveDialog.set(true);
    }

    confirmLeaveCall(): void {
        const sessionId = this.bookingId() || this.sessionId();

        // If teacher is leaving, emit event to notify students
        if (this.userType() === UserRole.TEACHER && this.socket && sessionId) {
            this.socket.emit(this.EMITTERS.END_CALL, {
                bookingId: sessionId,
                userId: this.authService.getCurrentUser()?.id,
                role: UserRole.TEACHER
            });
        }

        // Actually leave the call
        this.isConnected.set(false);
        if (this.socket) {
            this.socket.disconnect();
        }
        if (this.peer) {
            this.peer.close();
        }
        this.showLeaveDialog.set(false);

        if (this.userType() === UserRole.TEACHER) {
            this.router.navigate(['/teacher/dashboard']);
        } else {
            this.router.navigate(['/student/dashboard']);
        }
    }

    cancelLeaveCall(): void {
        // Cancel leaving - just close the dialog
        this.showLeaveDialog.set(false);
    }

    isTeacher(): boolean {
        return this.userType() === UserRole.TEACHER;
    }

    private startCallTimer(): void {
        let seconds = 0;
        this.timerInterval = window.setInterval(() => {
            seconds++;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            this.callDuration.set(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            );

            // Periodically sync remote participant state with stream (every 2 seconds)
            if (seconds % 2 === 0 && this.remoteStream() && this.remoteParticipant()) {
                const remoteStream = this.remoteStream()!;
                const participant = this.remoteParticipant()!;
                const audioTracks = remoteStream.getAudioTracks();
                const videoTracks = remoteStream.getVideoTracks();
                const isAudioOn = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
                const isVideoOn = videoTracks.length > 0 && videoTracks.some(track => track.enabled);

                // Only update if state has changed
                if (participant.isAudioOn !== isAudioOn || participant.isVideoOn !== isVideoOn) {
                    this.remoteParticipant.set({
                        ...participant,
                        isAudioOn: isAudioOn,
                        isVideoOn: isVideoOn
                    });
                }
            }
        }, 1000);
    }

    // Signals for UI state (updated manually for better reactivity)
    isMuted = signal<boolean>(true);
    isVideoOff = signal<boolean>(true);

    // Computed properties for remote participant status (fallback to stream state)
    remoteAudioOn = computed(() => {
        const participant = this.remoteParticipant();
        if (participant) {
            return participant.isAudioOn;
        }
        // Fallback to actual stream state
        if (this.remoteStream()) {
            const audioTracks = this.remoteStream()!.getAudioTracks();
            return audioTracks.length > 0 && audioTracks.some(track => track.enabled);
        }
        return false;
    });

    remoteVideoOn = computed(() => {
        const participant = this.remoteParticipant();
        if (participant) {
            return participant.isVideoOn;
        }
        // Fallback to actual stream state
        if (this.remoteStream()) {
            const videoTracks = this.remoteStream()!.getVideoTracks();
            return videoTracks.length > 0 && videoTracks.some(track => track.enabled);
        }
        return false;
    });
    rateAndReview(): void {
        this.showLeaveDialog.set(false);
        this.showRateAndReviewDialog.set(true);
    }
    cancelRateAndReview(): void {
        this.showRateAndReviewDialog.set(false);
        this.showLeaveDialog.set(true);
    }

    openWhiteboard(): void {
        this.showWhiteboard.set(true);
        this.activeTab.set('whiteboard');
        if (!this.tabs().includes('whiteboard')) {
            this.tabs.set([...this.tabs(), 'whiteboard']);
        }
    }
    
    async captureScreenshot(): Promise<void> {
        try {
            if (!this.recordContainer?.nativeElement) {
                console.error('Record container not found');
                alert('Unable to capture screenshot: container not available');
                return;
            }
            
            const container = this.recordContainer.nativeElement;
            const rect = container.getBoundingClientRect();
            const width = Math.max(rect.width || 1920, 640);
            const height = Math.max(rect.height || 1080, 480);
            
            // Temporarily hide videos for better html-to-image capture
            const videoElements = container.querySelectorAll('video');
            const videoStyles: { element: HTMLVideoElement; display: string }[] = [];
            videoElements.forEach((video: HTMLVideoElement) => {
                videoStyles.push({
                    element: video,
                    display: video.style.display
                });
                video.style.display = 'none';
            });
            
            try {
                // Capture container with html-to-image
                const dataUrl = await htmlToImage.toPng(container, {
                    width: width,
                    height: height,
                    backgroundColor: '#111827',
                    pixelRatio: 2, // Higher quality for screenshot
                    cacheBust: false,
                    quality: 1.0
                });
                
                // Restore video visibility immediately
                videoStyles.forEach(({ element, display }) => {
                    element.style.display = display || '';
                });
                
                // Validate dataUrl
                if (!dataUrl || dataUrl.length === 0) {
                    throw new Error('Failed to generate screenshot data');
                }
                
                // Create a canvas to composite videos on top
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    throw new Error('Failed to get canvas context');
                }
                
                // Try to composite videos, but fallback to direct download if it fails
                try {
                    // Draw the captured UI with proper error handling
                    const img = new Image();
                    await new Promise<void>((resolve, reject) => {
                        // Add timeout to prevent hanging
                        const timeout = setTimeout(() => {
                            // Timeout fallback: download directly
                            const a = document.createElement('a');
                            a.href = dataUrl;
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                            a.download = `screenshot-${timestamp}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            console.log('✅ Screenshot saved (timeout fallback)');
                            resolve();
                        }, 5000); // 5 second timeout
                        
                        // Check if image is already loaded (data URLs can load instantly)
                        if (dataUrl.startsWith('data:')) {
                            // For data URLs, set handlers before src
                            img.onload = () => {
                                clearTimeout(timeout);
                                try {
                                    // Fill background first
                                    ctx.fillStyle = '#111827';
                                    ctx.fillRect(0, 0, width, height);
                                    
                                    // Draw the captured UI
                                    ctx.drawImage(img, 0, 0, width, height);
                                    
                                    // Draw videos on top
                                    videoElements.forEach((video: HTMLVideoElement) => {
                                        const isVisible = !video.classList.contains('hidden') && 
                                                         video.offsetWidth > 0 && 
                                                         video.offsetHeight > 0;
                                        
                                        if (isVisible && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                                            try {
                                                const videoRect = video.getBoundingClientRect();
                                                const containerRect = container.getBoundingClientRect();
                                                
                                                const x = Math.max(0, videoRect.left - containerRect.left);
                                                const y = Math.max(0, videoRect.top - containerRect.top);
                                                const drawWidth = Math.min(videoRect.width, width - x);
                                                const drawHeight = Math.min(videoRect.height, height - y);
                                                
                                                if (drawWidth > 0 && drawHeight > 0) {
                                                    ctx.drawImage(video, x, y, drawWidth, drawHeight);
                                                }
                                            } catch (error) {
                                                console.warn('Error drawing video in screenshot:', error);
                                            }
                                        }
                                    });
                                    
                                    // Draw whiteboard on top if visible
                                    const whiteboardComponent = container.querySelector('app-white-board');
                                    if (whiteboardComponent && !whiteboardComponent.classList.contains('hidden')) {
                                        try {
                                            const whiteboardCanvases = whiteboardComponent.querySelectorAll('canvas');
                                            whiteboardCanvases.forEach((canvas: HTMLCanvasElement) => {
                                                if (canvas.width > 0 && canvas.height > 0) {
                                                    try {
                                                        const canvasRect = canvas.getBoundingClientRect();
                                                        const containerRect = container.getBoundingClientRect();
                                                        
                                                        const x = Math.max(0, canvasRect.left - containerRect.left);
                                                        const y = Math.max(0, canvasRect.top - containerRect.top);
                                                        const drawWidth = Math.min(canvasRect.width, width - x);
                                                        const drawHeight = Math.min(canvasRect.height, height - y);
                                                        
                                                        if (drawWidth > 0 && drawHeight > 0) {
                                                            ctx.drawImage(canvas, x, y, drawWidth, drawHeight);
                                                        }
                                                    } catch (error) {
                                                        console.warn('Error drawing whiteboard in screenshot:', error);
                                                    }
                                                }
                                            });
                                        } catch (error) {
                                            console.warn('Error accessing whiteboard in screenshot:', error);
                                        }
                                    }
                                    
                                    // Convert canvas to blob and download
                                    canvas.toBlob((blob) => {
                                        if (blob) {
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                                            a.download = `screenshot-${timestamp}.png`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            setTimeout(() => URL.revokeObjectURL(url), 100);
                                            console.log('✅ Screenshot saved');
                                            resolve();
                                        } else {
                                            // Fallback to direct download
                                            const a = document.createElement('a');
                                            a.href = dataUrl;
                                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                                            a.download = `screenshot-${timestamp}.png`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            console.log('✅ Screenshot saved (blob fallback)');
                                            resolve();
                                        }
                                    }, 'image/png', 1.0);
                                } catch (error) {
                                    clearTimeout(timeout);
                                    // Fallback to direct download on error
                                    const a = document.createElement('a');
                                    a.href = dataUrl;
                                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                                    a.download = `screenshot-${timestamp}.png`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    console.log('✅ Screenshot saved (error fallback)');
                                    resolve();
                                }
                            };
                            
                            img.onerror = () => {
                                clearTimeout(timeout);
                                // Fallback: download directly from dataUrl
                                const a = document.createElement('a');
                                a.href = dataUrl;
                                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                                a.download = `screenshot-${timestamp}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                console.log('✅ Screenshot saved (error fallback)');
                                resolve();
                            };
                            
                            img.src = dataUrl;
                        } else {
                            // Not a data URL, use direct download
                            clearTimeout(timeout);
                            const a = document.createElement('a');
                            a.href = dataUrl;
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                            a.download = `screenshot-${timestamp}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            console.log('✅ Screenshot saved (direct)');
                            resolve();
                        }
                    });
                } catch (compositeError) {
                    // If compositing fails, just download the dataUrl directly
                    console.warn('Compositing failed, using direct download:', compositeError);
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    a.download = `screenshot-${timestamp}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    console.log('✅ Screenshot saved (composite error fallback)');
                }
            } catch (error) {
                // Restore video visibility even if capture failed
                videoStyles.forEach(({ element, display }) => {
                    element.style.display = display || '';
                });
                console.error('Error capturing screenshot:', error);
                alert('Failed to capture screenshot: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        } catch (error) {
            console.error('Error in captureScreenshot:', error);
            alert('Failed to capture screenshot: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    async toggleRecording(): Promise<void> {
        if (this.isRecording()) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording(): Promise<void> {
        try {
            // Check if MediaRecorder is supported
            if (!navigator.mediaDevices || !window.MediaRecorder) {
                console.error('MediaRecorder is not supported in this browser');
                alert('Recording is not supported in your browser');
                return;
            }

            // Check if recordContainer is available
            if (!this.recordContainer?.nativeElement) {
                console.error('Record container not found');
                alert('Recording container not available');
                return;
            }

            const container = this.recordContainer.nativeElement;
            const rect = container.getBoundingClientRect();
            
            // Create canvas for recording
            this.recordingCanvas = document.createElement('canvas');
            this.recordingCanvas.width = Math.max(rect.width || 1920, 640);
            this.recordingCanvas.height = Math.max(rect.height || 1080, 480);
            
            this.recordingCanvasContext = this.recordingCanvas.getContext('2d', {
                willReadFrequently: true
            }) || undefined;
            
            if (!this.recordingCanvasContext) {
                console.error('Failed to get canvas context');
                alert('Failed to initialize recording canvas');
                return;
            }
            
            // Set canvas background
            this.recordingCanvasContext.fillStyle = '#111827'; // bg-gray-900
            this.recordingCanvasContext.fillRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
            
            // Optimized capture: Periodic UI capture + real-time videos/whiteboard
            // Capture UI elements periodically (every 2 seconds) to avoid performance issues
            const captureUI = async () => {
                if (!this.isRecording() || !this.recordContainer?.nativeElement) {
                    return;
                }
                
                try {
                    const currentRect = container.getBoundingClientRect();
                    const width = Math.max(currentRect.width || 1920, 640);
                    const height = Math.max(currentRect.height || 1080, 480);
                    
                    // Temporarily hide videos for UI capture
                    const videoElements = container.querySelectorAll('video');
                    const videoStyles: { element: HTMLVideoElement; display: string }[] = [];
                    videoElements.forEach((video: HTMLVideoElement) => {
                        videoStyles.push({
                            element: video,
                            display: video.style.display
                        });
                        video.style.display = 'none';
                    });
                    
                    // Capture UI
                    const dataUrl = await htmlToImage.toPng(container, {
                        width: width,
                        height: height,
                        backgroundColor: '#111827',
                        pixelRatio: 1,
                        cacheBust: false,
                        quality: 0.9
                    });
                    
                    // Restore videos
                    videoStyles.forEach(({ element, display }) => {
                        element.style.display = display || '';
                    });
                    
                    // Store UI capture
                    const img = new Image();
                    await new Promise<void>((resolve) => {
                        img.onload = () => {
                            this.uiCaptureImage = img;
                            this.lastUICaptureTime = Date.now();
                            resolve();
                        };
                        img.onerror = () => resolve();
                        img.src = dataUrl;
                    });
                } catch (error) {
                    console.warn('UI capture failed:', error);
                }
            };
            
            // Initial UI capture
            captureUI();
            
            // Periodic UI capture
            const uiCaptureInterval = setInterval(() => {
                if (this.isRecording()) {
                    captureUI();
                } else {
                    clearInterval(uiCaptureInterval);
                }
            }, this.UI_CAPTURE_INTERVAL);
            
            // Store interval for cleanup
            this.recordingInterval = uiCaptureInterval as any;
            
            // Real-time frame capture: Draw UI (if available) + videos + whiteboard
            const captureFrame = () => {
                if (!this.isRecording() || !this.recordingCanvas || !this.recordingCanvasContext || !this.recordContainer?.nativeElement) {
                    return;
                }
                
                try {
                    // Update canvas size if container size changed
                    const currentRect = container.getBoundingClientRect();
                    const width = Math.max(currentRect.width || 1920, 640);
                    const height = Math.max(currentRect.height || 1080, 480);
                    
                    if (this.recordingCanvas.width !== width || this.recordingCanvas.height !== height) {
                        this.recordingCanvas.width = width;
                        this.recordingCanvas.height = height;
                    }
                    
                    // Clear canvas and set background
                    this.recordingCanvasContext.clearRect(0, 0, width, height);
                    this.recordingCanvasContext.fillStyle = '#111827';
                    this.recordingCanvasContext.fillRect(0, 0, width, height);
                    
                    // Draw UI capture if available (cached, fast)
                    if (this.uiCaptureImage && this.uiCaptureImage.complete) {
                        try {
                            this.recordingCanvasContext.drawImage(this.uiCaptureImage, 0, 0, width, height);
                        } catch (error) {
                            // If UI image fails, just continue with background
                        }
                    }
                    
                    // Draw video elements directly on top (synchronous, fast)
                    const videoElements = container.querySelectorAll('video');
                    videoElements.forEach((video: HTMLVideoElement) => {
                        const isVisible = !video.classList.contains('hidden') && 
                                         video.offsetWidth > 0 && 
                                         video.offsetHeight > 0;
                        
                        if (isVisible && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                            try {
                                const videoRect = video.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                
                                const x = Math.max(0, videoRect.left - containerRect.left);
                                const y = Math.max(0, videoRect.top - containerRect.top);
                                const drawWidth = Math.min(videoRect.width, width - x);
                                const drawHeight = Math.min(videoRect.height, height - y);
                                
                                if (drawWidth > 0 && drawHeight > 0) {
                                    this.recordingCanvasContext!.drawImage(video, x, y, drawWidth, drawHeight);
                                }
                            } catch (error) {
                                console.warn('Error drawing video:', error);
                            }
                        }
                    });
                    
                    // Draw whiteboard canvas on top if visible
                    const whiteboardComponent = container.querySelector('app-white-board');
                    if (whiteboardComponent && !whiteboardComponent.classList.contains('hidden')) {
                        try {
                            const whiteboardCanvases = whiteboardComponent.querySelectorAll('canvas');
                            whiteboardCanvases.forEach((canvas: HTMLCanvasElement) => {
                                if (canvas.width > 0 && canvas.height > 0) {
                                    try {
                                        const canvasRect = canvas.getBoundingClientRect();
                                        const containerRect = container.getBoundingClientRect();
                                        
                                        const x = Math.max(0, canvasRect.left - containerRect.left);
                                        const y = Math.max(0, canvasRect.top - containerRect.top);
                                        const drawWidth = Math.min(canvasRect.width, width - x);
                                        const drawHeight = Math.min(canvasRect.height, height - y);
                                        
                                        if (drawWidth > 0 && drawHeight > 0) {
                                            this.recordingCanvasContext!.drawImage(canvas, x, y, drawWidth, drawHeight);
                                        }
                                    } catch (error) {
                                        console.warn('Error drawing whiteboard canvas:', error);
                                    }
                                }
                            });
                        } catch (error) {
                            console.warn('Error accessing whiteboard:', error);
                        }
                    }
                    
                } catch (err) {
                    console.error('Failed to capture frame:', err);
                }
            };
            
            // Reduced frame rate to 15 FPS for better performance
            const fps = 15;
            const frameInterval = 1000 / fps;
            let lastFrameTime = Date.now();
            
            const captureLoop = () => {
                if (!this.isRecording()) {
                    return;
                }
                
                const now = Date.now();
                const elapsed = now - lastFrameTime;
                
                if (elapsed >= frameInterval) {
                    captureFrame(); // Synchronous capture - fast
                    lastFrameTime = now - (elapsed % frameInterval);
                }
                
                this.recordingAnimationFrame = requestAnimationFrame(captureLoop);
            };
            
            // Start capture loop
            this.recordingAnimationFrame = requestAnimationFrame(captureLoop);
            
            // Get canvas stream for video
            this.recordingCanvasStream = this.recordingCanvas.captureStream(fps);
            
            // Create combined stream with audio
            const combinedStream = new MediaStream();
            
            // Add video track from canvas
            if (this.recordingCanvasStream) {
                this.recordingCanvasStream.getVideoTracks().forEach(track => {
                    combinedStream.addTrack(track);
                });
            }
            
            // Add audio tracks from local stream
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    if (track.enabled) {
                        combinedStream.addTrack(track);
                    }
                });
            }
            
            // Add audio tracks from remote stream
            if (this.remoteStream()) {
                this.remoteStream()!.getAudioTracks().forEach(track => {
                    if (track.enabled) {
                        combinedStream.addTrack(track);
                    }
                });
            }
            
            // Check available MIME types
            const supportedTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
            ];
            
            let mimeType = '';
            for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }
            
            if (!mimeType) {
                mimeType = 'video/webm';
            }
            
            this.recordingMimeType = mimeType;
            
            // Create MediaRecorder
            this.recordingMediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps
                audioBitsPerSecond: 128000   // 128 kbps
            });
            
            this.recordingMediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.recordingMediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };
            
            this.recordingMediaRecorder.onerror = (event: any) => {
                console.error('MediaRecorder error:', event);
                this.isRecording.set(false);
                this.cleanupRecording();
                alert('An error occurred while recording');
            };
            
            // Start recording
            this.recordingMediaRecorder.start(1000); // Collect data every second
            this.isRecording.set(true);
            this.recordingStartTime = Date.now();
            this.startRecordingTimer();
            
            console.log('✅ Recording started with MIME type:', mimeType);

        } catch (error) {
            console.error('Error starting recording:', error);
            this.isRecording.set(false);
            this.cleanupRecording();
            alert('Failed to start recording: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    private startRecordingTimer(): void {
        let seconds = 0;
        this.recordingTimerInterval = window.setInterval(() => {
            seconds++;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            this.recordingDuration.set(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            );
        }, 1000);
    }

    stopRecording(): void {
        if (this.recordingMediaRecorder && this.recordingMediaRecorder.state !== 'inactive') {
            this.recordingMediaRecorder.stop();
        }

        // Stop capture loop
        this.cleanupRecording();

        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
            this.recordingTimerInterval = undefined;
        }

        this.isRecording.set(false);
        console.log('🛑 Recording stopped');
    }
    
    private cleanupRecording(): void {
        // Stop animation frame loop
        if (this.recordingAnimationFrame) {
            cancelAnimationFrame(this.recordingAnimationFrame);
            this.recordingAnimationFrame = undefined;
        }
        
        // Stop UI capture interval
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = undefined;
        }
        
        // Stop canvas stream
        if (this.recordingCanvasStream) {
            this.recordingCanvasStream.getTracks().forEach(track => track.stop());
            this.recordingCanvasStream = undefined;
        }
        
        // Clear canvas references
        this.recordingCanvas = undefined;
        this.recordingCanvasContext = undefined;
        this.uiCaptureImage = undefined;
        this.lastUICaptureTime = 0;
    }



    private handleRecordingStop(): void {
        if (this.recordedChunks.length === 0) {
            console.warn('No recording data available');
            return;
        }

        // Determine file extension based on MIME type
        let fileExtension = 'webm';
        if (this.recordingMimeType.includes('mp4')) {
            fileExtension = 'mp4';
        } else if (this.recordingMimeType.includes('webm')) {
            fileExtension = 'webm';
        }

        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `session-recording-${timestamp}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);

        this.recordedChunks = [];
        this.recordingDuration.set('00:00:00');
        this.recordingMimeType = 'video/webm';

        console.log('✅ Recording saved and downloaded');
    }
}
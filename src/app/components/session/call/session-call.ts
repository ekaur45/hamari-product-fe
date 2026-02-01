import { CommonModule } from "@angular/common";
import { Component, computed, input, OnInit, OnDestroy, signal, ViewChild, ElementRef } from "@angular/core";
import SessionCallSettings from "../call-settings/call-settings";
import SessionChat from "../chat/session.chat";
import { UserRole, User } from "../../../shared/models/user.interface";
import { AuthService, TeacherBookingDto } from "../../../shared";
import { StreamDirective } from "../../stream.directive";
import { ProfilePhoto } from "../../misc/profile-photo/profile-photo";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../../environments/environment";
import TeacherBooking from "../../../shared/models/teacher.interface";

@Component({
    selector: 'taleemiyat-session-call',
    templateUrl: './session-call.html',
    standalone: true,
    imports: [CommonModule, SessionCallSettings, SessionChat, StreamDirective, ProfilePhoto],
})
export default class SessionCall implements OnInit, OnDestroy {
    @ViewChild('localVideo') localVideoElement?: ElementRef<HTMLVideoElement>;
    @ViewChild('remoteVideo') remoteVideoElement?: ElementRef<HTMLVideoElement>;
    
    // Inputs
    bookingId = input<string>('');
    sessionId = input<string>('');
    booking = input<TeacherBookingDto | null>(null);
    testMode = input<boolean>(false); // For testing without media devices
    
    showChat = signal<boolean>(false);
    showCallSettings = signal<boolean>(false);
    userType = signal<UserRole>(UserRole.STUDENT);
    
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
    remoteParticipant = signal<{ name: string; role: string; isVideoOn: boolean; isAudioOn: boolean; userId?: string,user?: User } | null>(null);
    
    // Connection quality
    connectionQuality = signal<'excellent' | 'good' | 'fair' | 'poor'>('good');
    
    // Timer
    private timerInterval?: number;
    
    // Socket event names
    private readonly EMITTERS = {
        JOIN_CLASS: 'join-class',
        SIGNAL: 'signal',
        MUTE: 'mute',
        UNMUTE: 'unmute',
        MUTE_VIDEO: 'mute-video',
        UNMUTE_VIDEO: 'unmute-video',
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
    };
    
    constructor(
        private authService: AuthService
    ){
        this.userType.set((this.authService.getCurrentUser()?.role as UserRole) ?? UserRole.STUDENT);
    }
    
    async ngOnInit(): Promise<void> {
        this.userType.set((this.authService.getCurrentUser()?.role as UserRole) ?? UserRole.STUDENT);
        this.isConnecting.set(true);
        this.startCallTimer();
        if(this.booking()){
            if(this.authService.getCurrentUser()?.role === UserRole.TEACHER){
                this.remoteParticipant.set({
                    name: this.booking()?.student?.user.firstName + ' ' + this.booking()?.student?.user.lastName,
                    role: UserRole.STUDENT,
                    isVideoOn: true,
                    isAudioOn: true,
                    userId: this.booking()?.student?.id ?? '',
                    user: this.booking()?.student?.user
                });
            } else if(this.authService.getCurrentUser()?.role === UserRole.STUDENT){
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
                video: true, 
                audio: true 
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
                    video: false, 
                    audio: true 
                });
                this.updateStreamState();
                console.log('✅ Local stream initialized with audio only');
            } catch (audioError: any) {
                console.warn('⚠️ Could not get audio, trying video only:', audioError.message);
                try {
                    // Fallback: try video only
                    this.localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: false 
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
            this.socket.emit(this.EMITTERS.JOIN_CLASS, { 
                bookingId: sessionId, 
                userId: this.authService.getCurrentUser()?.id, 
                role: this.authService.getCurrentUser()?.role 
            });
        });
        
        this.socket.on(this.LISTENERS.DISCONNECT, () => {
            console.log('❌ Disconnected from call server');
            this.isConnected.set(false);
        });
        
        this.socket.on(this.LISTENERS.JOIN_CLASS(sessionId), async ({ userId, role }: { userId: string, role: string }) => {
            console.log('✅ User joined call', userId);
            if (userId === this.authService.getCurrentUser()?.id) return;
            
            // Update remote participant info
            // this.remoteParticipant.set({
            //     name: 'Remote Participant', // You can fetch actual name from API
            //     role: role === UserRole.TEACHER ? 'Teacher' : 'Student',
            //     isVideoOn: true,
            //     isAudioOn: true,
            //     userId: userId
            // });
            
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
        });
        
        this.socket.on(this.LISTENERS.SIGNAL, async ({ signal, userId }: { signal: any, userId: string }) => {
            console.log('✅ Signal received', signal, userId);
            if (userId === this.authService.getCurrentUser()?.id) return;
            
            if (!this.peer) {
                this.peer = this.createPeer(userId);
            }
            
            if (signal.type === 'offer') {
                // Second user receives offer - create answer
                console.log('📥 Received offer from', userId);
                await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await this.peer.createAnswer();
                await this.peer.setLocalDescription(answer);
                this.socket.emit(this.LISTENERS.SIGNAL, { 
                    bookingId: sessionId, 
                    userId: this.authService.getCurrentUser()?.id, 
                    signal: answer 
                });
                
                // Update remote participant info if not set
                if (!this.remoteParticipant()) {
                    // this.remoteParticipant.set({
                    //     name: 'Remote Participant',
                    //     role: 'Participant',
                    //     isVideoOn: true,
                    //     isAudioOn: true,
                    //     userId: userId
                    // });
                }
                
                // Update connection state for second user
                this.isConnecting.set(false);
                this.isConnected.set(true);
            } else if (signal.type === 'answer') {
                // First user receives answer
                console.log('📥 Received answer from', userId);
                await this.peer.setRemoteDescription(new RTCSessionDescription(signal));
                // Connection state should already be set, but ensure it's correct
                this.isConnecting.set(false);
                this.isConnected.set(true);
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
            if (this.remoteParticipant()?.userId === data.userId) {
                this.remoteParticipant.set({
                    ...this.remoteParticipant()!,
                    isAudioOn: false
                });
            }
        });
        
        this.socket.on(this.LISTENERS.UNMUTE, (data: { userId: string }) => {
            if (this.remoteParticipant()?.userId === data.userId) {
                this.remoteParticipant.set({
                    ...this.remoteParticipant()!,
                    isAudioOn: true
                });
            }
        });
        
        this.socket.on(this.LISTENERS.MUTE_VIDEO, (data: { userId: string }) => {
            if (this.remoteParticipant()?.userId === data.userId) {
                this.remoteParticipant.set({
                    ...this.remoteParticipant()!,
                    isVideoOn: false
                });
            }
        });
        
        this.socket.on(this.LISTENERS.UNMUTE_VIDEO, (data: { userId: string }) => {
            if (this.remoteParticipant()?.userId === data.userId) {
                this.remoteParticipant.set({
                    ...this.remoteParticipant()!,
                    isVideoOn: true
                });
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
            } else if (pc.iceConnectionState === 'checking') {
                this.connectionQuality.set('good');
            } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                this.connectionQuality.set('poor');
                this.isConnected.set(false);
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
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
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
    
    toggleScreenShare(): void {
        // TODO: Implement screen sharing
        this.isScreenSharing.set(!this.isScreenSharing());
    }
    
    toggleViewMode(): void {
        this.viewMode.set(this.viewMode() === 'split' ? 'pip' : 'split');
    }
    
    leaveCall(): void {
        this.isConnected.set(false);
        if (this.socket) {
            this.socket.disconnect();
        }
        if (this.peer) {
            this.peer.close();
        }
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
        }, 1000);
    }
    
    // Signals for UI state (updated manually for better reactivity)
    isMuted = signal<boolean>(true);
    isVideoOff = signal<boolean>(true);
}
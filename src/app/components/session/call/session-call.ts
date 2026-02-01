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
import { WhiteBoard } from "../../white-board/white-board";

@Component({
    selector: 'taleemiyat-session-call',
    templateUrl: './session-call.html',
    standalone: true,
    imports: [CommonModule, SessionCallSettings, SessionChat, StreamDirective, ProfilePhoto, WhiteBoard],
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
    showWhiteboard = signal<boolean>(false);
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
        if (this.remoteStreamSyncInterval) {
            clearInterval(this.remoteStreamSyncInterval);
        }
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
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
            } else if (pc.iceConnectionState === 'failed') {
                // Failed is permanent - mark as disconnected
                this.connectionQuality.set('poor');
                console.log('❌ ICE connection failed');
                this.isConnected.set(false);
                this.isConnecting.set(true); // Show connecting state while waiting for reconnection
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
}
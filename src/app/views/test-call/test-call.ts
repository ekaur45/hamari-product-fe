import { Component, signal, AfterViewInit, OnDestroy } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";

interface Participant {
    id: string;
    stream: MediaStream | null;
    peerConnection: RTCPeerConnection;
    videoElement: HTMLVideoElement | null;
}

@Component({
    selector: 'app-test-call',
    templateUrl: './test-call.html',
    imports: [FormsModule, CommonModule],
    standalone: true
})
export class TestCall implements AfterViewInit, OnDestroy {
    socket!: Socket;
    isConnected = signal<boolean>(false);
    myId = signal<string>('');
    roomId = signal<string>('');
    role = signal<'teacher' | 'student' | null>(null);
    sessionStarted = signal<boolean>(false);
    participants = signal<Map<string, Participant>>(new Map());
    localStream: MediaStream | null = null;
    isInCall = signal<boolean>(false);
    micEnabled = signal<boolean>(true);
    videoEnabled = signal<boolean>(true);

    constructor(
        private activatedRoute: ActivatedRoute
    ) {
       
        // Initialize socket first
        const socketUrl = environment.socketUrl.endsWith('/') 
            ? environment.socketUrl.slice(0, -1) 
            : environment.socketUrl;
        this.socket = io(`${socketUrl}/call`);
        
        this.socket.on('connect', () => {
            console.log('✅ Connected to server', this.socket.id);
            this.isConnected.set(true);
            if (this.socket.id) {
                this.myId.set(this.socket.id);
            }
            this.setupSocketListeners();
            
            // Request session status if room ID is already set
            if (this.roomId()) {
                this.checkSessionStatus();
            }
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.isConnected.set(false);
        });

        // Get route params
        this.activatedRoute.queryParamMap.subscribe((params) => {
            const room = params.get('room');
            const userRole = params.get('role');
            
            if (room) {
                this.roomId.set(room);
                // Check session status when room ID is set
                if (this.isConnected()) {
                    this.checkSessionStatus();
                }
            }
            
            if (userRole === 'teacher' || userRole === 'student') {
                this.role.set(userRole);
            }
        });
        
    }

    ngAfterViewInit(): void {
        // Initialize video grid
        this.updateVideoGrid();
    }

    ngOnDestroy(): void {
        this.leaveMeeting();
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    private createPeerConnection(participantId: string): RTCPeerConnection {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Handle remote stream
        peer.ontrack = (event: RTCTrackEvent) => {
            console.log('🎥 Received track from:', participantId);
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                const participant = this.participants().get(participantId);
                if (participant) {
                    participant.stream = stream;
                    this.updateParticipantVideo(participantId);
                }
            }
        };

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    from: this.myId(),
                    to: participantId,
                    roomId: this.roomId(),
                    candidate: event.candidate
                });
            }
        };

        // Log state changes
        peer.onconnectionstatechange = () => {
            console.log(`🔄 Peer connection state with ${participantId}:`, peer.connectionState);
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                this.removeParticipant(participantId);
            }
        };

        return peer;
    }

    setupSocketListeners = () => {
        // Listen for new participants joining
        this.socket.on('user-joined', async (data: { userId: string, roomId: string }) => {
            if (data.roomId === this.roomId() && data.userId !== this.myId()) {
                console.log('👤 User joined:', data.userId);
                await this.handleNewParticipant(data.userId);
            }
        });

        // Listen for participants leaving
        this.socket.on('user-left', (data: { userId: string, roomId: string }) => {
            if (data.roomId === this.roomId() && data.userId !== this.myId()) {
                console.log('👋 User left:', data.userId);
                this.removeParticipant(data.userId);
            }
        });

        // Listen for existing participants in room
        this.socket.on('existing-users', async (data: { users: string[], roomId: string }) => {
            if (data.roomId === this.roomId()) {
                console.log('👥 Existing users:', data.users);
                for (const userId of data.users) {
                    if (userId !== this.myId()) {
                        await this.handleNewParticipant(userId);
                    }
                }
            }
        });

        // Listen for offers
        this.socket.on('offer', async (data: { from: string, to: string, roomId: string, sdp: RTCSessionDescriptionInit }) => {
            if (data.to === this.myId() && data.roomId === this.roomId()) {
                console.log('📩 Received offer from:', data.from);
                await this.handleOffer(data.from, data.sdp);
            }
        });

        // Listen for answers
        this.socket.on('answer', async (data: { from: string, to: string, roomId: string, sdp: RTCSessionDescriptionInit }) => {
            if (data.to === this.myId() && data.roomId === this.roomId()) {
                console.log('📩 Received answer from:', data.from);
                await this.handleAnswer(data.from, data.sdp);
            }
        });

        // Listen for ICE candidates
        this.socket.on('ice-candidate', async (data: { from: string, to: string, roomId: string, candidate: RTCIceCandidateInit }) => {
            if (data.to === this.myId() && data.roomId === this.roomId()) {
                console.log('📩 Received ICE candidate from:', data.from);
                await this.handleIceCandidate(data.from, data.candidate);
            }
        });

        // Listen for session started
        this.socket.on('session-started', (data: { roomId: string }) => {
            if (data.roomId === this.roomId()) {
                console.log('✅ Session started by teacher');
                this.sessionStarted.set(true);
                // If student, automatically join when session starts
                if (this.role() === 'student' && !this.isInCall()) {
                    this.joinMeeting();
                }
            }
        });

        // Listen for session ended
        this.socket.on('session-ended', (data: { roomId: string }) => {
            if (data.roomId === this.roomId()) {
                console.log('❌ Session ended by teacher');
                this.sessionStarted.set(false);
                if (this.role() === 'student') {
                    this.leaveMeeting();
                }
            }
        });

        // Check session status when joining room
        this.socket.on('session-status', (data: { roomId: string, started: boolean }) => {
            if (data.roomId === this.roomId()) {
                this.sessionStarted.set(data.started);
            }
        });
    }

    async startSession() {
        // Only teacher can start session
        if (this.role() !== 'teacher') {
            return;
        }

        try {
            if (!this.roomId()) {
                alert('Please enter a room ID');
                return;
            }

            if (this.isInCall()) {
                return;
            }

            console.log('🎥 Getting user media...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: this.videoEnabled(), 
                audio: this.micEnabled() 
            });
            this.localStream = stream;
            this.isInCall.set(true);
            this.sessionStarted.set(true);

            // Start the session
            this.socket.emit('start-session', {
                roomId: this.roomId(),
                userId: this.myId()
            });

            // Join the room
            this.socket.emit('join-room', {
                roomId: this.roomId(),
                userId: this.myId(),
                role: 'teacher'
            });

            // Update local video
            this.updateVideoGrid();
        } catch (error: any) {
            console.error('❌ Error starting session:', error);
            alert(`Failed to start session: ${error.message || 'Unknown error'}`);
        }
    }

    async joinMeeting() {
        try {
            if (!this.roomId()) {
                alert('Please enter a room ID');
                return;
            }

            if (this.isInCall()) {
                return;
            }

            // Students can only join if session is started
            if (this.role() === 'student' && !this.sessionStarted()) {
                alert('Waiting for teacher to start the session...');
                return;
            }

            console.log('🎥 Getting user media...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: this.videoEnabled(), 
                audio: this.micEnabled() 
            });
            this.localStream = stream;
            this.isInCall.set(true);

            // Join the room
            this.socket.emit('join-room', {
                roomId: this.roomId(),
                userId: this.myId(),
                role: this.role()
            });

            // Update local video
            this.updateVideoGrid();
        } catch (error: any) {
            console.error('❌ Error joining meeting:', error);
            alert(`Failed to join meeting: ${error.message || 'Unknown error'}`);
        }
    }

    async endSession() {
        // Only teacher can end session
        if (this.role() !== 'teacher') {
            return;
        }

        // End the session
        this.socket.emit('end-session', {
            roomId: this.roomId(),
            userId: this.myId()
        });

        this.leaveMeeting();
        this.sessionStarted.set(false);
    }

    async leaveMeeting() {
        this.isInCall.set(false);
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close all peer connections
        this.participants().forEach((participant, id) => {
            if (participant.peerConnection) {
                participant.peerConnection.close();
            }
        });
        this.participants.set(new Map());

        // Leave room
        if (this.roomId()) {
            this.socket.emit('leave-room', {
                roomId: this.roomId(),
                userId: this.myId()
            });
        }

        this.updateVideoGrid();
    }

    private async handleNewParticipant(participantId: string) {
        if (this.participants().has(participantId)) {
            return; // Already handling this participant
        }

        const peer = this.createPeerConnection(participantId);
        const participant: Participant = {
            id: participantId,
            stream: null,
            peerConnection: peer,
            videoElement: null
        };

        // Add local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localStream!);
            });
        }

        // Create and send offer
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                from: this.myId(),
                to: participantId,
                roomId: this.roomId(),
                sdp: offer
            });
        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }

        const participants = new Map(this.participants());
        participants.set(participantId, participant);
        this.participants.set(participants);
        this.updateVideoGrid();
    }

    private async handleOffer(from: string, sdp: RTCSessionDescriptionInit) {
        let participant = this.participants().get(from);
        
        if (!participant) {
            const peer = this.createPeerConnection(from);
            participant = {
                id: from,
                stream: null,
                peerConnection: peer,
                videoElement: null
            };

            // Add local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peer.addTrack(track, this.localStream!);
                });
            }

            const participants = new Map(this.participants());
            participants.set(from, participant);
            this.participants.set(participants);
        }

        try {
            await participant.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await participant.peerConnection.createAnswer();
            await participant.peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                from: this.myId(),
                to: from,
                roomId: this.roomId(),
                sdp: answer
            });
        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    }

    private async handleAnswer(from: string, sdp: RTCSessionDescriptionInit) {
        const participant = this.participants().get(from);
        if (participant) {
            try {
                await participant.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (error) {
                console.error('❌ Error handling answer:', error);
            }
        }
    }

    private async handleIceCandidate(from: string, candidate: RTCIceCandidateInit) {
        const participant = this.participants().get(from);
        if (participant && participant.peerConnection.remoteDescription) {
            try {
                await participant.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('❌ Error adding ICE candidate:', error);
            }
        }
    }

    private removeParticipant(participantId: string) {
        const participant = this.participants().get(participantId);
        if (participant) {
            if (participant.peerConnection) {
                participant.peerConnection.close();
            }
            if (participant.videoElement) {
                participant.videoElement.srcObject = null;
            }
        }

        const participants = new Map(this.participants());
        participants.delete(participantId);
        this.participants.set(participants);
        this.updateVideoGrid();
    }

    private updateVideoGrid() {
        setTimeout(() => {
            const gridContainer = document.getElementById('videoGrid');
            if (!gridContainer) return;

            // Clear existing videos
            gridContainer.innerHTML = '';

            // Add local video
            if (this.localStream) {
                const localVideo = document.createElement('video');
                localVideo.id = 'localVideo';
                localVideo.srcObject = this.localStream;
                localVideo.autoplay = true;
                localVideo.playsInline = true;
                localVideo.muted = true;
                localVideo.className = 'video-item';
                const localContainer = this.createVideoContainer('You', localVideo, true);
                gridContainer.appendChild(localContainer);
            }

            // Add participant videos
            this.participants().forEach((participant, id) => {
                if (participant.stream) {
                    const video = document.createElement('video');
                    video.id = `video-${id}`;
                    video.srcObject = participant.stream;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.className = 'video-item';
                    participant.videoElement = video;
                    const container = this.createVideoContainer(`User ${id.substring(0, 8)}`, video, false);
                    gridContainer.appendChild(container);
                }
            });
        }, 100);
    }

    private createVideoContainer(label: string, video: HTMLVideoElement, isLocal: boolean): HTMLElement {
        const container = document.createElement('div');
        container.className = 'video-container';
        container.style.cssText = 'position: relative; overflow: hidden; border: 2px solid #ccc; border-radius: 8px; background: #000; aspect-ratio: 16/9;';
        
        video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        container.appendChild(video);

        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;';
        labelDiv.textContent = isLocal ? (this.role() === 'teacher' ? '👨‍🏫 Teacher (You)' : '👨‍🎓 Student (You)') : label;
        container.appendChild(labelDiv);

        return container;
    }

    private updateParticipantVideo(participantId: string) {
        const participant = this.participants().get(participantId);
        if (participant && participant.stream && participant.videoElement) {
            participant.videoElement.srcObject = participant.stream;
        } else {
            this.updateVideoGrid();
        }
    }

    toggleMic() {
        this.micEnabled.set(!this.micEnabled());
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = this.micEnabled();
            });
        }
    }

    toggleVideo() {
        this.videoEnabled.set(!this.videoEnabled());
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = this.videoEnabled();
            });
        }
    }

    private checkSessionStatus() {
        if (this.roomId()) {
            this.socket.emit('check-session-status', {
                roomId: this.roomId()
            });
        }
    }
}
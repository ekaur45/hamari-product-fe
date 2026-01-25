import { Component, signal, AfterViewInit, OnDestroy, ElementRef, ViewChild } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { SocketService } from "./sockert.service";

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
export class TestCall implements AfterViewInit {
    @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
    localStream!: MediaStream;
    remoteStreams!: MediaStream[];

    private socket!: Socket;
    private peers: { [userId: string]: RTCPeerConnection } = {};
    private roomId = 'myRoom';
    private userId = Math.floor(Math.random() * 10000).toString();

    async ngAfterViewInit() {
        // 1️⃣ Get local media
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localVideo.nativeElement.srcObject = this.localStream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
        }

        // 2️⃣ Connect to signaling server
        const socketUrl = environment.socketUrl.endsWith('/')
            ? environment.socketUrl.slice(0, -1)
            : environment.socketUrl;
        this.socket = io(`${socketUrl}`);
        this.socket.emit('join', { roomId: this.roomId, userId: this.userId });

        // 3️⃣ Listen for new users
        this.socket.on('userJoined', async ({ userId }: { userId: string }) => {
            if (userId === this.userId) return;
            const pc = this.createPeer(userId);
            this.peers[userId] = pc;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('signal', { roomId: this.roomId, userId: this.userId, signal: offer });
        });

        // 4️⃣ Listen for signals
        this.socket.on('signal', async ({ signal, userId }: { signal: any; userId: string }) => {
            if (userId === this.userId) return;

            let pc = this.peers[userId];
            if (!pc) {
                pc = this.createPeer(userId);
                this.peers[userId] = pc;
            }

            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.socket.emit('signal', { roomId: this.roomId, userId: this.userId, signal: answer });
            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                try {
                    await pc.addIceCandidate(signal);
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        });
    }

    private createPeer(userId: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('signal', { roomId: this.roomId, userId: this.userId, signal: event.candidate });
            }
        };

        if (userId !== this.userId) {
            pc.ontrack = (event) => {
                document.getElementById('remoteVideos')!.innerHTML = '';
                event.streams.forEach((stream) => {
                    const remoteVideo = document.createElement('video');
                    remoteVideo.srcObject = stream;
                    remoteVideo.autoplay = true;
                    remoteVideo.playsInline = true;
                    remoteVideo.className = 'w-64 h-48 rounded-lg border border-gray-300 shadow-lg';
                    document.getElementById('remoteVideos')!.appendChild(remoteVideo);
                })
            };
        }
        return pc;
    }
}

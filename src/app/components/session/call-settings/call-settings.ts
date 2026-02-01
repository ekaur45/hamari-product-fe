import { CommonModule } from "@angular/common";
import { Component, signal, OnInit, input, effect, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DialogModule } from "primeng/dialog";

@Component({
    selector: 'taleemiyat-session-call-settings',
    templateUrl: './call-settings.html',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule],
})
export default class SessionCallSettings implements OnInit {
    visible = input<boolean>(false);
    closeCallSettings = output<void>();
    showSettings = signal<boolean>(false);
    
    constructor() {
        effect(() => {
            this.showSettings.set(this.visible());
        });
    }
    
    // Audio Settings
    selectedMicrophone: string = '';
    microphoneVolume: number = 100;
    availableMicrophones = signal<MediaDeviceInfo[]>([]);
    
    // Video Settings
    selectedCamera: string = '';
    videoQuality: string = 'auto';
    availableCameras = signal<MediaDeviceInfo[]>([]);
    
    // General Settings
    enableNotifications: boolean = true;
    enableSoundEffects: boolean = true;
    autoJoinWithVideo: boolean = true;
    autoJoinWithAudio: boolean = true;
    
    // Connection Info
    connectionQuality = signal<string>('good');
    bandwidth = signal<string>('--');
    
    ngOnInit(): void {
        this.loadDevices();
    }
    
    async loadDevices(): Promise<void> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const microphones = devices.filter(device => device.kind === 'audioinput');
            const cameras = devices.filter(device => device.kind === 'videoinput');
            
            this.availableMicrophones.set(microphones);
            this.availableCameras.set(cameras);
            
            if (microphones.length > 0) {
                this.selectedMicrophone = microphones[0].deviceId;
            }
            if (cameras.length > 0) {
                this.selectedCamera = cameras[0].deviceId;
            }
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    }
    
    onMicrophoneChange(deviceId: string): void {
        this.selectedMicrophone = deviceId;
        // Emit event or call service to change microphone
    }
    
    onCameraChange(deviceId: string): void {
        this.selectedCamera = deviceId;
        // Emit event or call service to change camera
    }
    
    onVideoQualityChange(quality: string): void {
        this.videoQuality = quality;
        // Emit event or call service to change video quality
    }
    
    openSettings(): void {
        this.showSettings.set(true);
    }
    
    closeSettings(): void {
        this.showSettings.set(false);
        this.closeCallSettings.emit();
    }
}
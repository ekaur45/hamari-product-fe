import { Component, signal, ViewChild } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { DialogModule } from "primeng/dialog";
import { ImageCroppedEvent, ImageCropperComponent } from "ngx-image-cropper";

@Component({
    selector: 'app-introduction-step',
    templateUrl: './introduction-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, DialogModule, ImageCropperComponent],
    providers: [MessageService]
})
export class IntroductionStep {
    @ViewChild(ImageCropperComponent) imageCropper?: ImageCropperComponent;

    thumbnailFile = signal<File | null>(null);
    thumbnailPreview = signal<string | null>(null);
    videoFile = signal<File | null>(null);
    videoPreview = signal<string | null>(null);
    isThumbnailUploading = signal<boolean>(false);
    isVideoUploading = signal<boolean>(false);
    
    // Cropper dialog state
    showCropDialog = signal<boolean>(false);
    imageChangedEvent: any = null;
    croppedImage = signal<string | null>(null);
    
    // Cropper configuration for video thumbnail (16:9 aspect ratio)
    cropperConfig = {
        aspectRatio: 16 / 9,
        maintainAspectRatio: true,
        resizeToWidth: 1280,
        resizeToHeight: 720,
        format: 'png' as 'png' | 'jpeg' | 'webp' | 'bmp',
        imageQuality: 0.92,
        autoCrop: true,
        cropperMinWidth: 100,
        cropperMinHeight: 56
    };

    constructor(private messageService: MessageService) {
    }

    onThumbnailSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File',
                detail: 'Please select an image file'
            });
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.messageService.add({
                severity: 'error',
                summary: 'File Too Large',
                detail: 'Image size must be less than 10MB'
            });
            return;
        }

        // Open crop dialog
        this.imageChangedEvent = event;
        this.showCropDialog.set(true);
        this.croppedImage.set(null);
    }

    imageCropped(event: ImageCroppedEvent): void {
        this.croppedImage.set(event.base64 || null);
    }

    imageLoaded(): void {
        // Image loaded successfully
    }

    cropperReady(): void {
        // Cropper is ready
    }

    loadImageFailed(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load image. Please try another image.'
        });
        this.showCropDialog.set(false);
        this.imageChangedEvent = null;
    }

    cancelCrop(): void {
        this.showCropDialog.set(false);
        this.imageChangedEvent = null;
        this.croppedImage.set(null);
        // Reset file input
        const input = document.getElementById('thumbnailUpload') as HTMLInputElement;
        if (input) input.value = '';
    }

    async applyCrop(): Promise<void> {
        if (!this.croppedImage()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Please crop the image first'
            });
            return;
        }

        try {
            // Convert base64 to File
            const file = await this.base64ToFile(this.croppedImage()!, 'thumbnail.png');
            this.thumbnailFile.set(file);
            this.thumbnailPreview.set(this.croppedImage()!);
            this.showCropDialog.set(false);
            this.imageChangedEvent = null;
            this.croppedImage.set(null);
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to process image. Please try again.'
            });
        }
    }

    private base64ToFile(base64: string, filename: string): Promise<File> {
        return new Promise((resolve, reject) => {
            // Remove data URL prefix if present
            const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
            
            // Convert base64 to blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            
            // Convert blob to File
            const file = new File([blob], filename, { type: 'image/png' });
            resolve(file);
        });
    }

    removeThumbnail(): void {
        this.thumbnailPreview.set(null);
        this.thumbnailFile.set(null);
        // Reset file input
        const input = document.getElementById('thumbnailUpload') as HTMLInputElement;
        if (input) input.value = '';
    }

    onVideoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File',
                detail: 'Please select a video file'
            });
            return;
        }

        // Validate file size (100MB)
        if (file.size > 100 * 1024 * 1024) {
            this.messageService.add({
                severity: 'error',
                summary: 'File Too Large',
                detail: `Video size must be less than 100MB. Your file size is ${(file.size / 1024 / 1024).toFixed(2)}MB`
            });
            return;
        }

        this.videoFile.set(file);
        this.isVideoUploading.set(true);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.videoPreview.set(e.target?.result as string);
            this.isVideoUploading.set(false);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load video'
            });
            this.isVideoUploading.set(false);
        };
        reader.readAsDataURL(file);
    }

    removeVideo(): void {
        this.videoPreview.set(null);
        this.videoFile.set(null);
        // Reset file input
        const input = document.getElementById('videoFileUpload') as HTMLInputElement;
        if (input) input.value = '';
    }
}
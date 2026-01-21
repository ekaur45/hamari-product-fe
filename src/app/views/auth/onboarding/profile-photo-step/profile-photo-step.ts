import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, ViewChild } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { ImageCroppedEvent, ImageCropperComponent } from "ngx-image-cropper";
import { ProfileService } from "../../../../shared/services/profile.service";
import { finalize } from "rxjs";
import { DomSanitizer } from "@angular/platform-browser";
import { SafePipe } from "../../../../shared/pipes/safe.pipe";
import { User } from "../../../../shared/models/user.interface";
import { AuthService } from "../../../../shared/services/auth.service";
import { environment } from "../../../../../environments/environment";

@Component({
    selector: 'app-profile-photo-step',
    templateUrl: './profile-photo-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ImageCropperComponent, SafePipe],
    providers: [ProfileService]
})
export class ProfilePhotoStep implements OnInit {
    @ViewChild(ImageCropperComponent) imageCropper?: ImageCropperComponent;
assetsUrl = environment.assetsUrl;
    imageChangedEvent: any = null;
    croppedImage = signal<string | undefined>(undefined);
    isUploading = signal<boolean>(false);
    showCropper = signal<boolean>(false);
    errorMessage = signal<string | null>(null);
    currentUser = signal<User | null>(null);
    // Cropper configuration for square aspect ratio
    cropperConfig = {
        aspectRatio: 1,
        maintainAspectRatio: true,
        resizeToWidth: 512,
        resizeToHeight: 512,
        format: 'png' as 'png' | 'jpeg' | 'webp' | 'bmp',
        onlyScaleDown: false,
        imageQuality: 0.92,
        autoCrop: true,
        cropperMinWidth: 100,
        cropperMinHeight: 100
    };

    constructor(
        private profileService: ProfileService,
        private router: Router,
        private sanitizer: DomSanitizer,
        private authService: AuthService
    ) {
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.errorMessage.set('Please select a valid image file');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.errorMessage.set('Image size must be less than 10MB');
            return;
        }

        this.errorMessage.set(null);
        this.imageChangedEvent = event;
        this.showCropper.set(true);
        this.croppedImage.set(undefined);
    }

    imageCropped(event: ImageCroppedEvent): void {
        this.croppedImage.set(event.objectUrl ?? '');
        
    }

    imageLoaded(): void {
        // Image loaded successfully
    }

    cropperReady(): void {
        // Cropper is ready
    }

    loadImageFailed(): void {
        this.errorMessage.set('Failed to load image. Please try another image.');
        this.showCropper.set(false);
        this.imageChangedEvent = null;
    }

    cancelCrop(): void {
        this.showCropper.set(false);
        this.imageChangedEvent = null;
        this.croppedImage.set(undefined);
        this.errorMessage.set(null);
        // Reset file input
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    async uploadPhoto(): Promise<void> {
        if (!this.croppedImage()) {
            this.errorMessage.set('Please crop the image first');
            return;
        }

        this.isUploading.set(true);
        this.errorMessage.set(null);

        try {
            // Convert base64 to File
            const file = await this.base64ToFile(this.croppedImage()!, 'profile-photo.png');
            
            this.profileService.updateProfilePhoto(file)
                .pipe(
                    finalize(() => {
                        this.isUploading.set(false);
                    })
                )
                .subscribe({
                    next: () => {
                        this.router.navigate(['/auth/onboarding/personal-info-step']);
                    },
                    error: (error) => {
                        this.errorMessage.set(error?.error?.message || 'Failed to upload profile photo. Please try again.');
                    }
                });
        } catch (error) {
            this.isUploading.set(false);
            this.errorMessage.set('Failed to process image. Please try again.');
        }
    }

    private async base64ToFile(base64: string, filename: string): Promise<File> {
        const blob = await fetch(base64).then(response => response.blob());
        return new File([blob], filename, { type: blob.type });
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
    onContinue(): void {
        this.router.navigate(['/auth/onboarding/personal-info-step']);
    }

}
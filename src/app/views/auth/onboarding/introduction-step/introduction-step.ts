import { Component, effect, OnInit, signal, ViewChild } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { DialogModule } from "primeng/dialog";
import { ImageCroppedEvent, ImageCropperComponent } from "ngx-image-cropper";
import { ProfileService } from "../../../../shared/services/profile.service";
import { AuthService } from "../../../../shared/services/auth.service";
import { Teacher, User } from "../../../../shared";
import { environment } from "../../../../../environments/environment";

@Component({
    selector: 'app-introduction-step',
    templateUrl: './introduction-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, DialogModule, ImageCropperComponent, ReactiveFormsModule],
    providers: [MessageService, ProfileService]
})
export class IntroductionStep implements OnInit {
    @ViewChild(ImageCropperComponent) imageCropper?: ImageCropperComponent;

    assetsUrl = environment.assetsUrl;
    currentUser = signal<User | null>(null);
    isSaving = signal<boolean>(false);
    
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

    introductionForm = new FormGroup({
        bio: new FormControl('', [Validators.required]),
        introduction: new FormControl('', [Validators.required]),
        preferredSubject: new FormControl('', []),
        yearsOfExperience: new FormControl(0, []),
        introductionVideoTitle: new FormControl('', []),
        introductionVideoDescription: new FormControl('', []),
        introductionVideoThumbnailUrl: new FormControl('', []),
        introductionVideo: new FormControl('', []),
    });

    constructor(
        private messageService: MessageService,
        private profileService: ProfileService,
        private authService: AuthService,
        private router: Router
    ) {
        effect(() => {
            const user = this.currentUser();
            if (user) {
                this.introductionForm.patchValue({
                    bio: user.teacher?.tagline || '',
                    introduction: user.teacher?.introduction || '',
                    preferredSubject: user.teacher?.preferredSubject || '',
                    yearsOfExperience: user.teacher?.yearsOfExperience || 0,
                    introductionVideoTitle: user.teacher?.introductionVideoTitle || '',
                    introductionVideoDescription: user.teacher?.introductionVideoDescription || '',
                    introductionVideoThumbnailUrl: user.teacher?.introductionVideoThumbnailUrl || '',
                    introductionVideo: user.teacher?.introductionVideoUrl || '',
                });

                // Set existing previews if available (just the URL, assetsUrl will be added in template)
                if (user.teacher?.introductionVideoThumbnailUrl) {
                    this.thumbnailPreview.set(user.teacher.introductionVideoThumbnailUrl);
                }
                if (user.teacher?.introductionVideoUrl && !user.teacher.introductionVideoUrl.includes('youtube.com')) {
                    this.videoPreview.set(user.teacher.introductionVideoUrl);
                }
            }
        });
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    get hasChanges() {
        return this.introductionForm.dirty && this.introductionForm.valid;
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
        this.croppedImage.set(event.objectUrl || null);
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
            
            // Upload thumbnail immediately after cropping
            this.uploadThumbnail();
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to process image. Please try again.'
            });
        }
    }

    uploadThumbnail(): void {
        const file = this.thumbnailFile();
        if (!file) return;
        
        this.isThumbnailUploading.set(true);
        this.profileService.uploadThumbnail(this.currentUser()?.id as string, file).subscribe({
            next: (response) => {
                this.isThumbnailUploading.set(false);
                this.thumbnailPreview.set(response.url);
                this.introductionForm.patchValue({ introductionVideoThumbnailUrl: response.url });
                this.introductionForm.markAsDirty();
                this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Thumbnail uploaded successfully' 
                });
            },
            error: (error) => {
                this.isThumbnailUploading.set(false);
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: error?.error?.message || error?.message || 'Failed to upload thumbnail' 
                });
            }
        });
    }

    uploadVideo(): void {
        const file = this.videoFile();
        if (!file) return;
        
        this.isVideoUploading.set(true);
        this.profileService.uploadVideo(this.currentUser()?.id as string, file).subscribe({
            next: (response) => {
                this.isVideoUploading.set(false);
                this.videoPreview.set(response.url);
                this.introductionForm.patchValue({ introductionVideo: response.url });
                this.introductionForm.markAsDirty();
                this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Video uploaded successfully' 
                });
            },
            error: (error) => {
                this.isVideoUploading.set(false);
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: error?.error?.message || error?.message || 'Failed to upload video' 
                });
            }
        });
    }

    private async base64ToFile(base64: string, filename: string): Promise<File> {
        const blob = await fetch(base64).then(response => response.blob())
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
            // Upload video after preview
            this.uploadVideo();
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
        this.introductionForm.patchValue({ introductionVideo: '' });
        this.introductionForm.markAsDirty();
        // Reset file input
        const input = document.getElementById('videoFileUpload') as HTMLInputElement;
        if (input) input.value = '';
    }

    removeThumbnail(): void {
        this.thumbnailPreview.set(null);
        this.thumbnailFile.set(null);
        this.introductionForm.patchValue({ introductionVideoThumbnailUrl: '' });
        this.introductionForm.markAsDirty();
        // Reset file input
        const input = document.getElementById('thumbnailUpload') as HTMLInputElement;
        if (input) input.value = '';
    }

    onSaveChanges(): void {
        if (!this.introductionForm.valid) {
            this.messageService.add({
                severity: 'error',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        this.isSaving.set(true);

        // Prepare the professional info data
        const professionalInfo: any = {
            preferredSubject: this.introductionForm.get('preferredSubject')?.value || '',
            yearsOfExperience: this.introductionForm.get('yearsOfExperience')?.value || 0,
            tagline: this.introductionForm.get('bio')?.value || '',
            introduction: this.introductionForm.get('introduction')?.value || '',
            introductionVideoUrl: this.introductionForm.get('introductionVideo')?.value || null,
            introductionVideoTitle: this.introductionForm.get('introductionVideoTitle')?.value || null,
            introductionVideoDescription: this.introductionForm.get('introductionVideoDescription')?.value || null,
            introductionVideoThumbnailUrl: this.introductionForm.get('introductionVideoThumbnailUrl')?.value || null
        };

        this.profileService.updateProfessionalInfo(this.currentUser()?.id as string, professionalInfo as Teacher).subscribe({
            next: (teacher) => {
                this.isSaving.set(false);
                this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Introduction updated successfully' 
                });
                this.introductionForm.markAsPristine();
                
                // Reload user profile
                this.profileService.getProfile().subscribe(profile => {
                    this.authService.setCurrentUser(profile);
                    // Navigate to next step
                    this.router.navigate(['/auth/onboarding/education-step']);
                });
            },
            error: (error) => {
                this.isSaving.set(false);
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: error?.error?.message || error?.message || 'Failed to update introduction' 
                });
            }
        });
    }
}
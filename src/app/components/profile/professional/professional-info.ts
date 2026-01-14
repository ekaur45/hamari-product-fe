import { CommonModule } from "@angular/common";
import { Component, effect, input, OnInit, output, signal } from "@angular/core";
import { Teacher, User } from "../../../shared";
import { ProfileService } from "../../../shared/services/profile.service";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { environment } from "../../../../environments/environment";
import { ApiHelper } from "../../../utils";

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ToastModule],
    selector: 'app-professional-info',
    templateUrl: './professional-info.html',
    providers: [MessageService]
})
export class ProfessionalInfo implements OnInit {
    assetsUrl = environment.assetsUrl;
    profile = input<User | null>(null);
    nextStep = output<void>();
    isLoading = signal(false);
    isThumbnailUploading = signal(false);
    isVideoUploading = signal(false);
    professionalForm = new FormGroup({
        preferredSubject: new FormControl('', [Validators.required]),
        yearsOfExperience: new FormControl(0, [Validators.required, Validators.min(0)]),
        bio: new FormControl('', [Validators.required]),
        introduction: new FormControl('', [Validators.required]),
        youtubeLink: new FormControl('', []),        
        introductionVideoTitle: new FormControl('', []),
        introductionVideoDescription: new FormControl('', []),
        introductionVideoThumbnailUrl: new FormControl('', []),
        introductionVideo: new FormControl('', []),
    },{validators:(control)=>{
        const youtubeLink = control.get('youtubeLink')?.value;
        const introductionVideo = control.get('introductionVideo')?.value;
        if (youtubeLink && introductionVideo) {
            return { youtubeLinkAndIntroductionVideo: true };
        }
        return null;
    }});
    isSaving = signal(false);
    
    // Preview signals
    thumbnailPreview = signal<string | null>(null);
    thumbnailFile = signal<File | null>(null);
    videoPreview = signal<string | null>(null);
    videoFile = signal<File | null>(null);
    youtubeVideoId = signal<string | null>(null);
    
    constructor(
        private profileService: ProfileService, 
        private messageService: MessageService,
        private sanitizer: DomSanitizer
    ) {
        effect(() => {
            const p = this.profile();
            if (p) {
                this.professionalForm.patchValue({
                    preferredSubject: p.teacher?.preferredSubject,
                    yearsOfExperience: p.teacher?.yearsOfExperience || 0,
                    bio: p.teacher?.tagline || '',
                    introduction: p.teacher?.introduction || '',
                    youtubeLink: ApiHelper.isYouTubeUrl(p.teacher?.introductionVideoUrl || '') ? p.teacher?.introductionVideoUrl : '',
                    introductionVideoTitle: p.teacher?.introductionVideoTitle || '',
                    introductionVideoDescription: p.teacher?.introductionVideoDescription || '',
                    introductionVideoThumbnailUrl: p.teacher?.introductionVideoThumbnailUrl || '',
                    introductionVideo: !ApiHelper.isYouTubeUrl(p.teacher?.introductionVideoUrl || '') ? p.teacher?.introductionVideoUrl : '',
                });
                
                // Set existing previews if available
                const teacher = p.teacher as any;
                if (teacher?.introductionVideoThumbnailUrl) {
                    this.thumbnailPreview.set(teacher.introductionVideoThumbnailUrl);
                }
                if (teacher?.introductionVideoUrl) {
                    this.extractYouTubeId(teacher.introductionVideoUrl);
                }
            }
        });
        
        // Watch for YouTube link changes
        this.professionalForm.get('youtubeLink')?.valueChanges.subscribe(url => {
            if (url) {
                this.extractYouTubeId(url);
            } else {
                this.youtubeVideoId.set(null);
            }
        });
    }
    
    ngOnInit(): void {
        
    }
    
    get hasChanges() {
        return this.professionalForm.dirty && this.professionalForm.valid;
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
        
        this.thumbnailFile.set(file);
        this.isThumbnailUploading.set(true);
        this.uploadThumbnail();
    }
    
    removeThumbnail(): void {
        this.thumbnailPreview.set(null);
        this.thumbnailFile.set(null);
        this.professionalForm.patchValue({ introductionVideoThumbnailUrl: '' });
        this.professionalForm.markAsDirty();
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
        
        // Validate file size (10MB)
        if (file.size > 100 * 1024 * 1024) {
            this.messageService.add({ 
                severity: 'error', 
                summary: 'File Too Large', 
                detail: 'Video size must be less than 100MB, Your file size is ' + (file.size / 1024 / 1024).toFixed(2) + 'MB' 
            });
            return;
        }
        
        this.videoFile.set(file);
        this.isVideoUploading.set(true);
        this.uploadVideo();
    }
    
    removeVideo(): void {
        this.videoPreview.set(null);
        this.videoFile.set(null);
        this.professionalForm.patchValue({ introductionVideo: '' });
        this.professionalForm.markAsDirty();
        // Reset file input
        const input = document.getElementById('videoFileUpload') as HTMLInputElement;
        if (input) input.value = '';
    }
    
    extractYouTubeId(url: string): void {
        if (!url) {
            this.youtubeVideoId.set(null);
            return;
        }
        
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        this.youtubeVideoId.set(videoId);
    }
    
    getYouTubeEmbedUrl(): SafeResourceUrl {
        const videoId = this.youtubeVideoId();
        const url = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    
    getYouTubeThumbnailUrl(): string {
        const videoId = this.youtubeVideoId();
        return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
    }
    
    removeYouTubeLink(): void {
        this.professionalForm.patchValue({ youtubeLink: '' });
        this.youtubeVideoId.set(null);
        this.professionalForm.markAsDirty();
    }
    
    onSaveChanges() {
        this.isSaving.set(true);
        
        // Prepare the professional info data
        const professionalInfo: any = {
            preferredSubject: this.professionalForm.get('preferredSubject')?.value,
            yearsOfExperience: this.professionalForm.get('yearsOfExperience')?.value,
            tagline: this.professionalForm.get('bio')?.value,
            introduction: this.professionalForm.get('introduction')?.value,
            introductionVideoUrl: this.professionalForm.get('youtubeLink')?.value || this.professionalForm.get('introductionVideo')?.value || null,
            introductionVideoTitle: this.professionalForm.get('introductionVideoTitle')?.value || null,
            introductionVideoDescription: this.professionalForm.get('introductionVideoDescription')?.value || null,
            introductionVideoThumbnailUrl: this.professionalForm.get('introductionVideoThumbnailUrl')?.value || null
        };
        
        this.profileService.updateProfessionalInfo(this.profile()?.id as string, professionalInfo as Teacher).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Professional info updated successfully' });
                this.professionalForm.markAsPristine();
                
                // TODO: Handle file uploads separately if needed
                // For now, files are previewed but not uploaded
                // You may need to add separate endpoints for file uploads
            },
            error: (error) => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            },
            complete: () => {
                this.isSaving.set(false);
            }
        });
    }


    uploadThumbnail() {
        const file = this.thumbnailFile();
        if (!file) return;
        this.profileService.uploadThumbnail(this.profile()?.id as string, file).subscribe({
            next: (response) => {
                this.isThumbnailUploading.set(false);
                this.thumbnailPreview.set(response.url);
                this.professionalForm.patchValue({ introductionVideoThumbnailUrl: response.url });
                this.professionalForm.markAsDirty();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Thumbnail uploaded successfully' });
            },
            error: (error) => {
                this.isThumbnailUploading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            }
        });
    }
    
    uploadVideo() {
        const file = this.videoFile();
        if (!file) return;
        this.profileService.uploadVideo(this.profile()?.id as string, file).subscribe({
            next: (response) => {
                this.isVideoUploading.set(false);
                this.videoPreview.set(response.url);
                this.professionalForm.patchValue({ introductionVideo: response.url });
                this.professionalForm.markAsDirty();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Video uploaded successfully' });
            },
            error: (error) => {
                this.isVideoUploading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            }
        });
    }
}
import { CommonModule } from "@angular/common";
import { Component, effect, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ProfileService } from "../../../shared/services/profile.service";
import { User, UserRole } from "../../../shared";
import { environment } from "../../../../environments/environment";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";
import { MessageService } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { ToastModule } from "primeng/toast";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ApiHelper } from "../../../utils";
@Component({
    imports: [CommonModule, RouterLink, CurrencyPipe, DialogModule, ToastModule, ReactiveFormsModule],
    standalone: true,
    selector: 'app-profile-view',
    templateUrl: './profile-view.html',
    providers: [ProfileService, CurrencyPipe, MessageService]
})
export class ProfileView implements OnInit {
    assetsUrl = environment.assetsUrl;
    profile = signal<User | null>(null);
    readonly UserRole = UserRole;

    isPlayingVideo = signal(false);

    isLoading = signal(false);
    showUploadVideoDialog = signal(false);

    // Dialog state (copied behavior from professional-info)
    isThumbnailUploading = signal(false);
    isVideoUploading = signal(false);
    youtubeVideoId = signal<string | null>(null);

    introductionVideoForm = new FormGroup({
        youtubeLink: new FormControl('', []),
        introductionVideoTitle: new FormControl('', []),
        introductionVideoDescription: new FormControl('', []),
        introductionVideoThumbnailUrl: new FormControl('', []),
        introductionVideo: new FormControl('', []),
    }, {
        validators: (control) => {
            const youtubeLink = control.get('youtubeLink')?.value;
            const introductionVideo = control.get('introductionVideo')?.value;
            if (youtubeLink && introductionVideo) {
                return { youtubeLinkAndIntroductionVideo: true };
            }
            return null;
        }
    });

    constructor(
        private profileService: ProfileService,
        private messageService: MessageService,
        private sanitizer: DomSanitizer
    ) {
        this.messageService = messageService;

        effect(() => {
            const p = this.profile();
            const teacher = p?.teacher as any;
            if (!teacher) return;

            this.introductionVideoForm.patchValue({
                youtubeLink: ApiHelper.isYouTubeUrl(teacher?.introductionVideoUrl || '') ? teacher?.introductionVideoUrl : '',
                introductionVideoTitle: teacher?.introductionVideoTitle || '',
                introductionVideoDescription: teacher?.introductionVideoDescription || '',
                introductionVideoThumbnailUrl: teacher?.introductionVideoThumbnailUrl || '',
                introductionVideo: !ApiHelper.isYouTubeUrl(teacher?.introductionVideoUrl || '') ? (teacher?.introductionVideoUrl || '') : '',
            }, { emitEvent: false });

            if (teacher?.introductionVideoUrl) {
                this.extractYouTubeId(teacher.introductionVideoUrl);
            }
        });

        this.introductionVideoForm.get('youtubeLink')?.valueChanges.subscribe(url => {
            if (url) {
                this.extractYouTubeId(url);
            } else {
                this.youtubeVideoId.set(null);
            }
        });
    }
    ngOnInit(): void {
        this.getProfile();
    }

    getProfile() {
        this.isLoading.set(true);
        this.profileService.getProfile().subscribe((profile) => {
            this.profile.set(profile);
            this.isLoading.set(false);
        });
    }

    onProfilePhotoChange(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            this.profileService.updateProfilePhoto(file).subscribe((profile) => {
                this.profile.set(profile);
            });
        }
    }

    formatTime(time: string): string {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    calculateDuration(startTime: string, endTime: string): string {
        if (!startTime || !endTime) return '';
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const durationMinutes = endTotalMinutes - startTotalMinutes;

        if (durationMinutes < 0) return 'Invalid';

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (hours === 0) {
            return `${minutes} min${minutes !== 1 ? 's' : ''}`;
        } else if (minutes === 0) {
            return `${hours} hr${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
        }
    }

    getGroupedAvailabilitySlots(): { day: string; slots: any[] }[] {
        const teacher = this.profile()?.teacher;
        if (!teacher?.availabilities || teacher.availabilities.length === 0) {
            return [];
        }

        const slots = teacher.availabilities;
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        const grouped = slots.reduce((acc, slot) => {
            const day = slot.dayOfWeek.toLowerCase();
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slot);
            return acc;
        }, {} as Record<string, any[]>);

        // Sort slots within each day by start time
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                const aTime = a.startTime.split(':').map(Number);
                const bTime = b.startTime.split(':').map(Number);
                const aMinutes = aTime[0] * 60 + aTime[1];
                const bMinutes = bTime[0] * 60 + bTime[1];
                return aMinutes - bMinutes;
            });
        });

        // Return grouped slots in day order
        return dayOrder
            .filter(day => grouped[day])
            .map(day => ({
                day: day.charAt(0).toUpperCase() + day.slice(1),
                slots: grouped[day]
            }));
    }

    onUploadVideo(): void {       
        //this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Upload video feature is not available yet' });
        this.showUploadVideoDialog.set(true);
    }

    onThumbnailSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select an image file' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: 'Image size must be less than 10MB' });
            return;
        }

        this.isThumbnailUploading.set(true);
        this.profileService.uploadThumbnail(this.profile()?.id as string, file).subscribe({
            next: (response) => {
                this.isThumbnailUploading.set(false);
                this.introductionVideoForm.patchValue({ introductionVideoThumbnailUrl: response.url });
                this.introductionVideoForm.markAsDirty();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Thumbnail uploaded successfully' });
            },
            error: (error) => {
                this.isThumbnailUploading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to upload thumbnail' });
            }
        });
    }

    removeThumbnail(): void {
        this.introductionVideoForm.patchValue({ introductionVideoThumbnailUrl: '' });
        this.introductionVideoForm.markAsDirty();
        const input = document.getElementById('profileIntroThumbnailUpload') as HTMLInputElement;
        if (input) input.value = '';
    }

    onVideoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select a video file' });
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            this.messageService.add({
                severity: 'error',
                summary: 'File Too Large',
                detail: 'Video size must be less than 100MB, Your file size is ' + (file.size / 1024 / 1024).toFixed(2) + 'MB'
            });
            return;
        }

        this.isVideoUploading.set(true);
        this.profileService.uploadVideo(this.profile()?.id as string, file).subscribe({
            next: (response) => {
                this.isVideoUploading.set(false);
                this.introductionVideoForm.patchValue({ introductionVideo: response.url });
                this.introductionVideoForm.markAsDirty();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Video uploaded successfully' });
            },
            error: (error) => {
                this.isVideoUploading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to upload video' });
            }
        });
    }

    removeVideo(): void {
        this.introductionVideoForm.patchValue({ introductionVideo: '' });
        this.introductionVideoForm.markAsDirty();
        const input = document.getElementById('profileIntroVideoFileUpload') as HTMLInputElement;
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

    removeYouTubeLink(): void {
        this.introductionVideoForm.patchValue({ youtubeLink: '' });
        this.youtubeVideoId.set(null);
        this.introductionVideoForm.markAsDirty();
    }

    saveIntroductionVideo(): void {
        const userId = this.profile()?.id as string;
        const payload = {
            introductionVideoUrl: this.introductionVideoForm.get('youtubeLink')?.value
                || this.introductionVideoForm.get('introductionVideo')?.value
                || null,
            introductionVideoThumbnailUrl: this.introductionVideoForm.get('introductionVideoThumbnailUrl')?.value || null,
            introductionVideoTitle: this.introductionVideoForm.get('introductionVideoTitle')?.value || null,
            introductionVideoDescription: this.introductionVideoForm.get('introductionVideoDescription')?.value || null,
        };

        this.profileService.updateIntroductionVideo(userId, payload).subscribe({
            next: (profile) => {
                this.getProfile();
                //this.profile.set(profile);
                this.introductionVideoForm.markAsPristine();
                this.showUploadVideoDialog.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Introduction video updated successfully' });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error?.message || 'Failed to update introduction video' });
            }
        });
    }

}
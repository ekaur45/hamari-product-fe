import { CommonModule } from "@angular/common";
import { Component, ElementRef, input, model, OnInit, output, signal, ViewChild } from "@angular/core";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { SelectModule } from "primeng/select";
import { ProfilePhoto } from "../../misc/profile-photo/profile-photo";
import { ApiResponse, AssignmentType, CreateAssignmentDto, TeacherBookingDto } from "../../../shared";
import { DatePickerModule } from "primeng/datepicker";
import { ToggleSwitch } from "primeng/toggleswitch";
import { FileService } from "@/app/shared/services/file.service";
interface AssignmentFile {
    id: string;
    file: File;
    isUploaded: boolean;
    isUploading: boolean;
    filePath: string;
    fileSize: number;
    mimeType: string;
    fileName: string;
}

@Component({
    selector: 'taleemiyat-create-assignment',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastModule, SelectModule, ProfilePhoto, DatePickerModule, ToggleSwitch],
    templateUrl: './create-assignment.html',
    providers: [MessageService],
})
export class TaleemiyatCreateAssignment implements OnInit {
    @ViewChild('attachmentsInput') attachmentsInput!: ElementRef<HTMLInputElement>;
    isLoading = model<boolean>(false);
    selectedBooking = input<TeacherBookingDto>();
    onCancel = output<void>();
    onRemoveBooking = output<void>();
    readonly types = Object.values(AssignmentType);
    assignmentType = signal<'class' | 'booking'>('booking');
    selectedFiles = signal<AssignmentFile[]>([]);
    onCreated = output<CreateAssignmentDto>();
    // formData = signal<CreateAssignmentDto>({
    //     title: '',
    //     description: '',
    //     type: AssignmentType.HOMEWORK,
    //     maxScore: 100,
    //     weight: 0,
    //     allowLateSubmission: false,
    //     latePenalty: 0,
    // });
    formData = new FormGroup({
        title: new FormControl('', [Validators.required]),
        description: new FormControl(''),
        type: new FormControl(AssignmentType.HOMEWORK, [Validators.required]),
        maxScore: new FormControl(100, [Validators.required]),
        weight: new FormControl(0, [Validators.required]),
        dueDate: new FormControl(new Date(), [Validators.required]),
        submissionDate: new FormControl(new Date(), [Validators.required]),
        allowLateSubmission: new FormControl(false, [Validators.required]),
        latePenalty: new FormControl(0, [Validators.required]),
        instructions: new FormControl('', [Validators.required]),
    });
    constructor(
        private messageService: MessageService,
        private fileService: FileService,
    ) {

    }

    ngOnInit(): void {
    }


    onSubmit(): void {
        const teacherId = this.selectedBooking()?.teacherId;
        const data = this.formData.value;
        this.isLoading.set(true);
        const createAssignmentDto: CreateAssignmentDto = {
            title: data.title || '',
            type: data.type || AssignmentType.HOMEWORK,
            maxScore: data.maxScore || 100,
            weight: data.weight || 0,
            dueDate: data.dueDate?.toISOString() || new Date().toISOString(),
            submissionDate: data.submissionDate?.toISOString() || new Date().toISOString(),
            allowLateSubmission: data.allowLateSubmission || false,
            latePenalty: data.latePenalty || 0,
            instructions: data.instructions || '',
            teacherBookingId: this.selectedBooking()?.id || '',
            studentUserId: this.selectedBooking()?.student?.userId || '',
            attachments: this.selectedFiles().map(file => ({
                id: file.id,
                name: file.fileName,
                url: file.filePath,
                size: file.fileSize,
                type: file.mimeType,
            })),
        };
        this.onCreated.emit(createAssignmentDto);
        // this.assignmentService.createAssignment(teacherId, data).subscribe({
        //     next: () => {
        //         this.messageService.add({
        //             severity: 'success',
        //             summary: 'Success',
        //             detail: 'Assignment created successfully',
        //         });
        //         setTimeout(() => {
        //             this.router.navigate(['/teacher/assignments']);
        //         }, 1000);
        //     },
        //     error: (err) => {
        //         console.error(err);
        //         this.messageService.add({
        //             severity: 'error',
        //             summary: 'Error',
        //             detail: err.error?.message || 'Failed to create assignment',
        //         });
        //         this.isLoading.set(false);
        //     },
        // });
    }


    updateFormField(field: keyof CreateAssignmentDto, value: any): void {
        const data = this.formData.value;
        this.formData.patchValue({ ...data, [field]: value });
    }

    onCancelClick(): void {
        this.onCancel.emit();
    }

    onAttachmentsChange(event: any): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const files = Array.from(input.files);
            for(const file of files) {
                const chatFile: AssignmentFile = {id: Date.now().toString(), file: file, isUploaded: false, isUploading: true, filePath: '', fileSize: file.size, mimeType: file.type, fileName: file.name};
                this.selectedFiles.set( [...this.selectedFiles(), chatFile]);
                this.uploadFile(chatFile);
            }
        }
        // Reset input
        if (this.attachmentsInput) {
            this.attachmentsInput.nativeElement.value = '';
        }
        
        // 2️⃣ Upload file

    }

    uploadFile(file: AssignmentFile): void {
        this.fileService.uploadFile(file.file).subscribe({
            next: (res) => {
                //file.isUploaded = true;
                //file.isUploading = false;                
                file.filePath = res.data.url;
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    getFileIcon(fileType: string): string {
        if (fileType.startsWith('image/')) {
            return 'fa-image';
        } else if (fileType.includes('pdf')) {
            return 'fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('document')) {
            return 'fa-file-word';
        } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
            return 'fa-file-excel';
        } else if (fileType.includes('video')) {
            return 'fa-file-video';
        } else if (fileType.includes('audio')) {
            return 'fa-file-audio';
        } else {
            return 'fa-file';
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    removeFile(index: number): void {
        const files = this.selectedFiles();
        files.splice(index, 1);
        this.selectedFiles.set([...files]);
    }
}
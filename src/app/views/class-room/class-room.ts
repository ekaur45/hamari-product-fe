import { CommonModule } from "@angular/common";
import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../shared/services/auth.service";
import { ROUTES_MAP } from "../../shared/constants/routes-map";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { UserRole } from "../../shared/models/user.interface";

@Component({
    selector: 'app-class-room',
    standalone: true,
    templateUrl: './class-room.html',
    styleUrls: ['./class-room.css'],
    imports: [CommonModule, RouterModule, FormsModule],
})
export default class ClassRoom implements AfterViewInit, OnDestroy, OnInit {
    socket!: Socket;
    bookingId = signal<string>('');
    dashboardLink = signal<string>('');
    
    // Session Timer
    sessionStartTime = Date.now();
    sessionTime = signal<string>('00:00:00');
    private timerInterval?: number;
    
    // Tab State
    activeTab = signal<'chat' | 'participants'>('chat');
    
    // Chat
    chatInput = signal<string>('');
    
    // Media Controls
    micOn = signal<boolean>(true);
    videoOn = signal<boolean>(true);
    
    // Grid
    gridSize = signal<number>(4);
    
    // Sidebar (Mobile)
    sidebarOpen = signal<boolean>(false);
    isMobile = signal<boolean>(false);
    
    // Whiteboard
    whiteboardOpen = signal<boolean>(false);
    currentTool = signal<string>('pen');
    currentColor = signal<string>('#000000');
    currentLineWidth = signal<number>(3);
    fillShapes = signal<boolean>(false);
    lineStyle = signal<string>('solid');
    zoomLevel = signal<number>(1);
    gridVisible = signal<boolean>(false);
    
    // Whiteboard Drawing State
    private isDrawing = false;
    private startX = 0;
    private startY = 0;
    private history: string[] = [];
    private historyStep = -1;
    
    // ViewChild References
    @ViewChild('sessionTimeEl') sessionTimeEl?: ElementRef<HTMLSpanElement>;
    @ViewChild('chatTab') chatTab?: ElementRef<HTMLButtonElement>;
    @ViewChild('participantsTab') participantsTab?: ElementRef<HTMLButtonElement>;
    @ViewChild('chatPanel') chatPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('participantsPanel') participantsPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('chatInput') chatInputEl?: ElementRef<HTMLInputElement>;
    @ViewChild('sendMessage') sendMessageBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleMic') toggleMicBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleVideo') toggleVideoBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('leaveSessionBtn') leaveSessionBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('toggleGrid') toggleGridBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('studentsGrid') studentsGrid?: ElementRef<HTMLDivElement>;
    @ViewChild('sidebarPanel') sidebarPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('sidebarToggle') sidebarToggle?: ElementRef<HTMLButtonElement>;
    @ViewChild('mobileSidebarClose') mobileSidebarClose?: ElementRef<HTMLButtonElement>;
    @ViewChild('mobileChatToggle') mobileChatToggle?: ElementRef<HTMLButtonElement>;
    @ViewChild('whiteboardView') whiteboardView?: ElementRef<HTMLDivElement>;
    @ViewChild('videoView') videoView?: ElementRef<HTMLDivElement>;
    @ViewChild('toggleWhiteboard') toggleWhiteboardBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('whiteboardActive') whiteboardActive?: ElementRef<HTMLSpanElement>;
    @ViewChild('whiteboardCanvas') whiteboardCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas') gridCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasWrapper') canvasWrapper?: ElementRef<HTMLDivElement>;
    @ViewChild('canvasContainer') canvasContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('exitWhiteboardFullscreen') exitWhiteboardFullscreen?: ElementRef<HTMLButtonElement>;
    @ViewChild('exitWhiteboardFullscreenMobile') exitWhiteboardFullscreenMobile?: ElementRef<HTMLButtonElement>;
    @ViewChild('imageUpload') imageUpload?: ElementRef<HTMLInputElement>;
    @ViewChild('imageUploadMobile') imageUploadMobile?: ElementRef<HTMLInputElement>;
    
    private canvasContext?: CanvasRenderingContext2D;
    private gridContext?: CanvasRenderingContext2D;
    private mainContentArea?: HTMLElement;
    private header?: HTMLElement;
    private bottomControls?: HTMLElement;
    
    constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router) {
        this.dashboardLink.set(ROUTES_MAP[this.authService.getCurrentUser()!.role]['SCHEDULE']);
        this.route.params.subscribe(params => {
            this.bookingId.set(params['bookingId']);
        });
    }

    ngOnInit(): void {
        this.initializeListeners();
    }

    ngAfterViewInit(): void {
        this.checkScreenSize();
        this.initializeSessionTimer();
        this.initializeTabs();
        this.initializeChat();
        this.initializeMediaControls();
        this.initializeGridToggle();
        this.initializeSidebar();
        this.initializeWhiteboard();
        this.setupClickOutsideListener();
    }
    
    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }
    
    private checkScreenSize(): void {
        this.isMobile.set(window.innerWidth < 768);
    }
    
    ngOnDestroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
    
    // Session Timer
    private initializeSessionTimer(): void {
        this.updateTimer();
        this.timerInterval = window.setInterval(() => this.updateTimer(), 1000);
    }
    
    private updateTimer(): void {
        const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        this.sessionTime.set(`${hours}:${minutes}:${seconds}`);
        if (this.sessionTimeEl) {
            this.sessionTimeEl.nativeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    
    // Tab Switching
    private initializeTabs(): void {
        // Tabs are handled via click handlers in template
    }
    
    onChatTabClick(): void {
        this.activeTab.set('chat');
    }
    
    onParticipantsTabClick(): void {
        this.activeTab.set('participants');
    }
    
    // Chat Input
    private initializeChat(): void {
        // Chat is handled via template bindings
    }
    
    onChatInputKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.sendChatMessage();
        }
    }
    
    sendChatMessage(): void {
        const message = this.chatInput().trim();
        if (message) {
            console.log('Sending message:', message);
            this.chatInput.set('');
            // In a real app, this would send the message via WebSocket
        }
    }
    
    // Media Controls
    private initializeMediaControls(): void {
        // Media controls are handled via click handlers
    }
    
    onToggleMic(): void {
        this.micOn.set(!this.micOn());
    }
    
    onToggleVideo(): void {
        this.videoOn.set(!this.videoOn());
    }
    
    // Leave Session
    leaveSession(): void {
        if (confirm('Are you sure you want to leave the session?')) {
            this.router.navigate([this.dashboardLink()]);
        }
    }
    
    // Grid Toggle
    private initializeGridToggle(): void {
        // Grid toggle is handled via click handler
    }
    
    onToggleGrid(): void {
        const currentSize = this.gridSize();
        const newSize = currentSize === 4 ? 1 : currentSize === 1 ? 2 : currentSize === 2 ? 3 : 4;
        this.gridSize.set(newSize);
        if (this.studentsGrid) {
            this.studentsGrid.nativeElement.className = `video-grid grid-${newSize}`;
        }
    }
    
    // Mobile Sidebar
    private initializeSidebar(): void {
        // Sidebar is handled via click handlers
    }
    
    onSidebarToggle(): void {
        this.sidebarOpen.set(true);
    }
    
    onMobileSidebarClose(): void {
        this.sidebarOpen.set(false);
    }
    
    onMobileChatToggle(): void {
        this.sidebarOpen.set(true);
        this.activeTab.set('chat');
    }
    
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.isMobile() && this.sidebarPanel && this.sidebarToggle && this.mobileChatToggle) {
            const target = event.target as HTMLElement;
            if (!this.sidebarPanel.nativeElement.contains(target) && 
                !this.sidebarToggle.nativeElement.contains(target) && 
                !this.mobileChatToggle.nativeElement.contains(target)) {
                if (this.sidebarOpen()) {
                    this.sidebarOpen.set(false);
                }
            }
        }
    }
    
    private setupClickOutsideListener(): void {
        // Handled by @HostListener
    }
    
    // Whiteboard Functionality
    private initializeWhiteboard(): void {
        if (this.whiteboardCanvas && this.gridCanvas) {
            const canvas = this.whiteboardCanvas.nativeElement;
            const gridCanvas = this.gridCanvas.nativeElement;
            
            this.canvasContext = canvas.getContext('2d') || undefined;
            this.gridContext = gridCanvas.getContext('2d') || undefined;
            
            if (this.canvasContext) {
                canvas.style.backgroundColor = '#ffffff';
            }
            
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        // Find main content elements
        this.mainContentArea = document.querySelector('.flex.flex-col.md\\:flex-row.h-\\[calc\\(100vh-64px\\)\\]') as HTMLElement;
        this.header = document.querySelector('header') as HTMLElement;
        this.bottomControls = document.querySelector('.fixed.bottom-0') as HTMLElement;
    }
    
    private resizeCanvas(): void {
        if (!this.canvasContext || !this.gridContext || !this.whiteboardCanvas || !this.gridCanvas || !this.canvasWrapper || !this.canvasContainer) {
            return;
        }
        
        const container = this.canvasContainer.nativeElement;
        const baseWidth = container.clientWidth;
        const baseHeight = container.clientHeight;
        const zoom = this.zoomLevel();
        
        const canvas = this.whiteboardCanvas.nativeElement;
        const gridCanvas = this.gridCanvas.nativeElement;
        
        canvas.width = baseWidth * zoom;
        canvas.height = baseHeight * zoom;
        gridCanvas.width = baseWidth * zoom;
        gridCanvas.height = baseHeight * zoom;
        
        const wrapper = this.canvasWrapper.nativeElement;
        wrapper.style.transform = `scale(${1/zoom})`;
        wrapper.style.width = `${baseWidth * zoom}px`;
        wrapper.style.height = `${baseHeight * zoom}px`;
        
        this.drawGrid();
        this.redrawCanvas();
    }
    
    private drawGrid(): void {
        if (!this.gridContext || !this.gridCanvas) return;
        
        const gridCanvas = this.gridCanvas.nativeElement;
        this.gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        
        if (!this.gridVisible()) return;
        
        this.gridContext.strokeStyle = '#e5e7eb';
        this.gridContext.lineWidth = 1;
        const spacing = 20 * this.zoomLevel();
        
        for (let x = 0; x < gridCanvas.width; x += spacing) {
            this.gridContext.beginPath();
            this.gridContext.moveTo(x, 0);
            this.gridContext.lineTo(x, gridCanvas.height);
            this.gridContext.stroke();
        }
        
        for (let y = 0; y < gridCanvas.height; y += spacing) {
            this.gridContext.beginPath();
            this.gridContext.moveTo(0, y);
            this.gridContext.lineTo(gridCanvas.width, y);
            this.gridContext.stroke();
        }
    }
    
    // Whiteboard Toggle
    onToggleWhiteboard(): void {
        this.whiteboardOpen.set(!this.whiteboardOpen());
        
        if (this.whiteboardOpen()) {
            setTimeout(() => this.resizeCanvas(), 100);
        }
    }
    
    onExitWhiteboard(): void {
        this.whiteboardOpen.set(false);
    }
    
    // Tool Selection
    selectTool(toolId: string): void {
        const toolMap: { [key: string]: string } = {
            'penTool': 'pen',
            'penToolMobile': 'pen',
            'highlighterTool': 'highlighter',
            'highlighterToolMobile': 'highlighter',
            'eraserTool': 'eraser',
            'eraserToolMobile': 'eraser',
            'shapeTool': 'rectangle',
            'shapeToolMobile': 'rectangle',
            'circleTool': 'circle',
            'circleToolMobile': 'circle',
            'arrowTool': 'arrow',
            'arrowToolMobile': 'arrow',
            'lineTool': 'line',
            'lineToolMobile': 'line',
            'textTool': 'text',
            'textToolMobile': 'text',
            'imageTool': 'image',
            'imageToolMobile': 'image'
        };
        
        const tool = toolMap[toolId];
        if (!tool) return;
        
        if (tool === 'image') {
            const uploadInput = toolId.includes('Mobile') ? this.imageUploadMobile : this.imageUpload;
            if (uploadInput) {
                uploadInput.nativeElement.click();
            }
            return;
        }
        
        this.currentTool.set(tool);
    }
    
    // Image Upload
    onImageUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.canvasContext || !this.whiteboardCanvas) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = this.whiteboardCanvas!.nativeElement;
                if (this.canvasContext) {
                    this.canvasContext.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height / 2);
                    this.saveState();
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
    
    // Fill Toggle
    onToggleFill(): void {
        this.fillShapes.set(!this.fillShapes());
    }
    
    // Line Style
    onLineStyleChange(style: string): void {
        this.lineStyle.set(style);
    }
    
    // Background Color
    onBackgroundColorChange(color: string): void {
        if (this.whiteboardCanvas) {
            this.whiteboardCanvas.nativeElement.style.backgroundColor = color;
            this.redrawCanvas();
        }
    }
    
    // Grid Toggle
    onToggleGridVisible(): void {
        this.gridVisible.set(!this.gridVisible());
        this.drawGrid();
    }
    
    // Zoom Controls
    onZoomIn(): void {
        this.zoomLevel.set(Math.min(this.zoomLevel() + 0.25, 3));
        this.resizeCanvas();
    }
    
    onZoomOut(): void {
        this.zoomLevel.set(Math.max(this.zoomLevel() - 0.25, 0.5));
        this.resizeCanvas();
    }
    
    onZoomReset(): void {
        this.zoomLevel.set(1);
        this.resizeCanvas();
    }
    
    // Color Picker
    onColorChange(color: string): void {
        this.currentColor.set(color);
    }
    
    // Line Width
    onLineWidthChange(value: number): void {
        this.currentLineWidth.set(value);
    }
    
    // Drawing Functions
    private getMousePos(e: MouseEvent | TouchEvent): { x: number; y: number } {
        if (!this.whiteboardCanvas) return { x: 0, y: 0 };
        
        const canvas = this.whiteboardCanvas.nativeElement;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left) * this.zoomLevel(),
            y: (clientY - rect.top) * this.zoomLevel()
        };
    }
    
    private saveState(): void {
        if (!this.whiteboardCanvas) return;
        
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history = this.history.slice(0, this.historyStep);
        }
        this.history.push(this.whiteboardCanvas.nativeElement.toDataURL());
    }
    
    private redrawCanvas(): void {
        if (!this.canvasContext || !this.whiteboardCanvas) return;
        
        if (this.history.length > 0 && this.historyStep >= 0) {
            const img = new Image();
            img.onload = () => {
                const canvas = this.whiteboardCanvas!.nativeElement;
                this.canvasContext!.clearRect(0, 0, canvas.width, canvas.height);
                this.canvasContext!.drawImage(img, 0, 0);
            };
            img.src = this.history[this.historyStep];
        } else {
            const canvas = this.whiteboardCanvas.nativeElement;
            this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Canvas Events
    onCanvasMouseDown(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        if (!this.canvasContext) return;
        
        this.isDrawing = true;
        const pos = this.getMousePos(event);
        this.startX = pos.x;
        this.startY = pos.y;
        
        const tool = this.currentTool();
        if (tool === 'pen' || tool === 'eraser' || tool === 'highlighter') {
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(this.startX, this.startY);
            this.saveState();
        } else if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow' || tool === 'line') {
            this.saveState();
        }
    }
    
    onCanvasMouseMove(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        if (!this.isDrawing || !this.canvasContext) return;
        
        const pos = this.getMousePos(event);
        const tool = this.currentTool();
        
        if (tool === 'pen' || tool === 'eraser' || tool === 'highlighter') {
            this.canvasContext.lineTo(pos.x, pos.y);
            
            if (tool === 'eraser') {
                this.canvasContext.strokeStyle = this.whiteboardCanvas?.nativeElement.style.backgroundColor || '#ffffff';
                this.canvasContext.lineWidth = this.currentLineWidth() * 3;
                this.canvasContext.globalCompositeOperation = 'destination-out';
            } else if (tool === 'highlighter') {
                this.canvasContext.strokeStyle = this.currentColor();
                this.canvasContext.globalAlpha = 0.3;
                this.canvasContext.lineWidth = this.currentLineWidth() * 3;
            } else {
                this.canvasContext.strokeStyle = this.currentColor();
                this.canvasContext.globalAlpha = 1;
                this.canvasContext.lineWidth = this.currentLineWidth();
            }
            
            this.canvasContext.lineCap = 'round';
            this.canvasContext.lineJoin = 'round';
            this.canvasContext.stroke();
            this.canvasContext.globalCompositeOperation = 'source-over';
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(pos.x, pos.y);
        } else if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow' || tool === 'line') {
            this.redrawCanvas();
            
            this.canvasContext.strokeStyle = this.currentColor();
            this.canvasContext.fillStyle = this.currentColor();
            this.canvasContext.lineWidth = this.currentLineWidth();
            this.canvasContext.globalAlpha = tool === 'line' || tool === 'arrow' ? 1 : 0.5;
            this.setLineStyle(this.canvasContext);
            
            if (tool === 'rectangle') {
                if (this.fillShapes()) {
                    this.canvasContext.fillRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
                } else {
                    this.canvasContext.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
                }
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
                this.canvasContext.beginPath();
                this.canvasContext.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                if (this.fillShapes()) {
                    this.canvasContext.fill();
                } else {
                    this.canvasContext.stroke();
                }
            } else if (tool === 'line') {
                this.canvasContext.beginPath();
                this.canvasContext.moveTo(this.startX, this.startY);
                this.canvasContext.lineTo(pos.x, pos.y);
                this.canvasContext.stroke();
            } else if (tool === 'arrow') {
                const angle = Math.atan2(pos.y - this.startY, pos.x - this.startX);
                const arrowLength = 30;
                
                this.canvasContext.beginPath();
                this.canvasContext.moveTo(this.startX, this.startY);
                this.canvasContext.lineTo(pos.x, pos.y);
                this.canvasContext.stroke();
                
                this.canvasContext.beginPath();
                this.canvasContext.moveTo(pos.x, pos.y);
                this.canvasContext.lineTo(
                    pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
                    pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                this.canvasContext.moveTo(pos.x, pos.y);
                this.canvasContext.lineTo(
                    pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
                    pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                this.canvasContext.stroke();
            }
            
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.setLineDash([]);
        }
    }
    
    onCanvasMouseUp(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        if (!this.isDrawing || !this.canvasContext) return;
        
        this.isDrawing = false;
        const pos = this.getMousePos(event);
        const tool = this.currentTool();
        
        this.canvasContext.strokeStyle = this.currentColor();
        this.canvasContext.fillStyle = this.currentColor();
        this.canvasContext.lineWidth = this.currentLineWidth();
        this.setLineStyle(this.canvasContext);
        
        if (tool === 'rectangle') {
            if (this.fillShapes()) {
                this.canvasContext.fillRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
            } else {
                this.canvasContext.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
            }
            this.saveState();
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            this.canvasContext.beginPath();
            this.canvasContext.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
            if (this.fillShapes()) {
                this.canvasContext.fill();
            } else {
                this.canvasContext.stroke();
            }
            this.saveState();
        } else if (tool === 'arrow') {
            const angle = Math.atan2(pos.y - this.startY, pos.x - this.startX);
            const arrowLength = 30;
            
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(this.startX, this.startY);
            this.canvasContext.lineTo(pos.x, pos.y);
            this.canvasContext.stroke();
            
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(pos.x, pos.y);
            this.canvasContext.lineTo(
                pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
                pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            this.canvasContext.moveTo(pos.x, pos.y);
            this.canvasContext.lineTo(
                pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
                pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            this.canvasContext.stroke();
            
            if (this.fillShapes()) {
                this.canvasContext.beginPath();
                this.canvasContext.moveTo(pos.x, pos.y);
                this.canvasContext.lineTo(
                    pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
                    pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                this.canvasContext.lineTo(
                    pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
                    pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                this.canvasContext.closePath();
                this.canvasContext.fill();
            }
            this.saveState();
        } else if (tool === 'line') {
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(this.startX, this.startY);
            this.canvasContext.lineTo(pos.x, pos.y);
            this.canvasContext.stroke();
            this.saveState();
        } else if (tool === 'text') {
            const text = prompt('Enter text:');
            if (text && this.canvasContext) {
                this.canvasContext.fillStyle = this.currentColor();
                this.canvasContext.font = `bold ${this.currentLineWidth() * 5}px Arial`;
                this.canvasContext.fillText(text, this.startX, this.startY);
                this.saveState();
            }
        }
        
        this.canvasContext.setLineDash([]);
        this.canvasContext.beginPath();
    }
    
    onCanvasMouseLeave(): void {
        this.isDrawing = false;
    }
    
    // Undo/Redo/Clear
    onUndo(): void {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.redrawCanvas();
        }
    }
    
    onRedo(): void {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.redrawCanvas();
        }
    }
    
    onClear(): void {
        if (confirm('Clear the whiteboard?')) {
            if (this.canvasContext && this.whiteboardCanvas) {
                const canvas = this.whiteboardCanvas.nativeElement;
                this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                this.saveState();
            }
        }
    }
    
    // Set Line Style
    private setLineStyle(context: CanvasRenderingContext2D): void {
        context.setLineDash([]);
        const style = this.lineStyle();
        if (style === 'dashed') {
            context.setLineDash([10, 5]);
        } else if (style === 'dotted') {
            context.setLineDash([2, 2]);
        }
    }
    
    // Save Whiteboard
    onSaveWhiteboard(): void {
        if (!this.whiteboardCanvas) return;
        
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = this.whiteboardCanvas.nativeElement.toDataURL();
        link.click();
    }
    
    // Export PDF
    onExportPDF(): void {
        if (!this.whiteboardCanvas) return;
        
        const dataURL = this.whiteboardCanvas.nativeElement.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(
                '<!DOCTYPE html><head><title>Whiteboard PDF Export</title>' +
                '<style>body { margin: 0; text-align: center; } img { max-width: 100%; height: auto; }</style>' +
                '</head><body><img src="' + dataURL + '" /></body></html>'
            );
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }
    
    // Mobile Collapsible Sections
    toggleCollapsible(panelId: string, chevronId: string): void {
        const panel = document.getElementById(panelId);
        const chevron = document.getElementById(chevronId);
        
        if (panel && chevron) {
            const isHidden = panel.classList.contains('hidden');
            if (isHidden) {
                panel.classList.remove('hidden');
                chevron.classList.remove('rotate-0');
                chevron.classList.add('rotate-180');
            } else {
                panel.classList.add('hidden');
                chevron.classList.remove('rotate-180');
                chevron.classList.add('rotate-0');
            }
        }
    }
    
    // Helper methods for template
    getSessionTime(): string {
        return this.sessionTime();
    }
    
    isChatTabActive(): boolean {
        return this.activeTab() === 'chat';
    }
    
    isParticipantsTabActive(): boolean {
        return this.activeTab() === 'participants';
    }
    
    isMicOn(): boolean {
        return this.micOn();
    }
    
    isVideoOn(): boolean {
        return this.videoOn();
    }
    
    isWhiteboardOpen(): boolean {
        return this.whiteboardOpen();
    }
    
    isSidebarOpen(): boolean {
        return this.sidebarOpen();
    }
    
    getGridSize(): number {
        return this.gridSize();
    }
    
    getZoomLevel(): string {
        return Math.round(this.zoomLevel() * 100) + '%';
    }
    
    getFillStatus(): string {
        return this.fillShapes() ? 'On' : 'Off';
    }
    
    getGridStatus(): string {
        return this.gridVisible() ? 'On' : 'Off';
    }
    
    getCurrentTool(): string {
        return this.currentTool();
    }
    
    getCurrentColor(): string {
        return this.currentColor();
    }
    
    getCurrentLineWidth(): number {
        return this.currentLineWidth();
    }

    //#region Video View
    LISTENERS = {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        SESSION_STARTED: 'session-started',
        SESSION_ENDED: 'session-ended',
        SESSION_ERROR: 'session-error',
        SESSION_STATUS: 'session-status',
        STUDENT_JOINED: 'student-joined-class',
        STUDENT_LEFT: 'student-left',
        STUDENT_STREAM: 'student-stream',
        STUDENT_STREAM_ENDED: 'student-stream-ended',
        STUDENT_STREAM_ERROR: 'student-stream-error',
        STUDENT_STREAM_STARTED: 'student-stream-started',
        STUDENT_STREAM_STOPPED: 'student-stream-stopped',
        STUDENT_STREAM_PAUSED: 'student-stream-paused',
        STUDENT_STREAM_RESUMED: 'student-stream-resumed',
        STUDENT_STREAM_SEEKED: 'student-stream-seeked',
        STUDENT_STREAM_VOLUME: 'student-stream-volume',
        STUDENT_STREAM_MUTED: 'student-stream-muted',
        STUDENT_STREAM_UNMUTED: 'student-stream-unmuted'
    }
    private initializeListeners(): void {
        const socketUrl = environment.socketUrl.endsWith('/') 
            ? environment.socketUrl.slice(0, -1) 
            : environment.socketUrl;
        this.socket = io(`${socketUrl}/class-room?bookingId=${this.bookingId()}`);
        this.socket.on(this.LISTENERS.CONNECT, () => {
            console.log('✅ Connected to class room server', this.socket.id);
            if(this.authService.getCurrentUser()?.role === UserRole.STUDENT) {
                this.socket.emit(this.LISTENERS.STUDENT_JOINED, { bookingId: this.bookingId(), studentId: this.authService.getCurrentUser()?.student?.id });
            }
        });
        this.socket.on(this.LISTENERS.DISCONNECT, () => {
            console.log('❌ Disconnected from class room server');
        });
        this.socket.on(this.LISTENERS.SESSION_STARTED, (data: { stream: MediaStream }) => {
            console.log('Session started:', data);
        });
        this.socket.on(this.LISTENERS.SESSION_ENDED, () => {
            console.log('Session ended');
        });
        this.socket.on(this.LISTENERS.SESSION_ERROR, (error: any) => {
            console.error('Session error:', error);
        });
        this.socket.on(this.LISTENERS.SESSION_STATUS, (data: { status: string }) => {
            console.log('Session status:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_JOINED, (data: { studentId: string }) => {
            console.log('Student joined:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_LEFT, (data: { studentId: string }) => {
            console.log('Student left:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM, (data: { studentId: string, stream: MediaStream }) => {
            console.log('Student stream:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_ENDED, (data: { studentId: string }) => {
            console.log('Student stream ended:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_ERROR, (error: any) => {
            console.error('Student stream error:', error);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_STARTED, (data: { studentId: string }) => {
            console.log('Student stream started:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_STOPPED, (data: { studentId: string }) => {
            console.log('Student stream stopped:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_PAUSED, (data: { studentId: string }) => {
            console.log('Student stream paused:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_RESUMED, (data: { studentId: string }) => {
            console.log('Student stream resumed:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_SEEKED, (data: { studentId: string }) => {
            console.log('Student stream seeked:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_VOLUME, (data: { studentId: string, volume: number }) => {
            console.log('Student stream volume:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_MUTED, (data: { studentId: string }) => {
            console.log('Student stream muted:', data);
        });
        this.socket.on(this.LISTENERS.STUDENT_STREAM_UNMUTED, (data: { studentId: string }) => {
            console.log('Student stream unmuted:', data);
        });
     
     
    }
    //#endregion
}
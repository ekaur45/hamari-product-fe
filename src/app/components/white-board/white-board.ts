import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WhiteboardPermissions } from "./permissions/whiteboard-permissions";
import { WhiteboardPage } from "./pages/whiteboard-pages";
import { WhiteboardSelectTool } from "./tools/whiteboard-select-tool";
import { WhiteboardStickyNotes } from "./tools/whiteboard-sticky-notes";
import { WhiteboardTemplates, WhiteboardTemplate } from "./tools/whiteboard-templates";
import { WhiteboardStamps } from "./tools/whiteboard-stamps";
import { WhiteboardMathTools } from "./tools/whiteboard-math-tools";
import { WhiteboardPresence, WhiteboardUser } from "./collaboration/whiteboard-presence";
import { WhiteboardTopBar } from "./toolbar/whiteboard-top-bar";
import { WhiteboardDrawingTools } from "./toolbar/whiteboard-drawing-tools";
import { WhiteboardStyleOptions } from "./toolbar/whiteboard-style-options";
import { WhiteboardColorSizePicker } from "./toolbar/whiteboard-color-size-picker";
import { WhiteboardCanvasOptions } from "./toolbar/whiteboard-canvas-options";
import { WhiteboardZoomControls } from "./toolbar/whiteboard-zoom-controls";
import { WhiteboardActionButtons } from "./toolbar/whiteboard-action-buttons";
import { WhiteboardUndoRedo } from "./toolbar/whiteboard-undo-redo";
import { UserRole, AuthService } from "../../shared";
import { Socket } from "socket.io-client";
import { getToolFromId, isImageTool, clampZoom } from "./utils/whiteboard-helpers";

@Component({
    selector: 'app-white-board',
    templateUrl: './white-board.html',
    styleUrls: ['./white-board.css'],
    imports: [
        CommonModule,
        WhiteboardPermissions,
        WhiteboardSelectTool,
        WhiteboardStickyNotes,
        WhiteboardTemplates,
        WhiteboardStamps,
        WhiteboardMathTools,
        WhiteboardPresence,
        WhiteboardTopBar,
        WhiteboardDrawingTools,
        WhiteboardStyleOptions,
        WhiteboardColorSizePicker,
        WhiteboardCanvasOptions,
        WhiteboardZoomControls,
        WhiteboardActionButtons,
        WhiteboardUndoRedo
    ],
    standalone: true,
})
export class WhiteBoard implements AfterViewInit, OnDestroy {
    @Output() onExitWhiteboard = new EventEmitter<void>();

    tabs = signal<('pen' | 'screen-sharing')[]>(['pen']);
    // Inputs
    currentUserRole = input<UserRole>(UserRole.STUDENT);
    sessionId = input<string>('');
    socket = input<Socket | undefined>(undefined); // Optional socket for real-time collaboration
    
    // Whiteboard
    whiteboardOpen = signal<boolean>(true);
    currentTool = signal<string>('pen');
    currentColor = signal<string>('#000000');
    currentLineWidth = signal<number>(3);
    fillShapes = signal<boolean>(false);
    lineStyle = signal<string>('solid');
    zoomLevel = signal<number>(1);
    gridVisible = signal<boolean>(false);
    showMoreColors = signal<boolean>(false);
    showMoreColorsMobile = signal<boolean>(false);
    
    // New Features
    isEditable = signal<boolean>(true);
    isLocked = signal<boolean>(false);
    pages = signal<WhiteboardPage[]>([{ id: '1', name: 'Page 1' }]);
    currentPageIndex = signal<number>(0);
    hasSelection = signal<boolean>(false);
    hasClipboard = signal<boolean>(false);
    activeUsers = signal<WhiteboardUser[]>([]);
    templates = signal<WhiteboardTemplate[]>([]);
    
     // Whiteboard Drawing State
     private isDrawing = false;
     private startX = 0;
     private startY = 0;
     private history: string[] = [];
     private historyStep = -1;
     private resizeObserver?: ResizeObserver;
     private resizeHandler?: () => void;
     @ViewChild('whiteboardActive') whiteboardActive?: ElementRef<HTMLSpanElement>;
     @ViewChild('whiteboardCanvas') whiteboardCanvas?: ElementRef<HTMLCanvasElement>;
     @ViewChild('gridCanvas') gridCanvas?: ElementRef<HTMLCanvasElement>;
     @ViewChild('canvasWrapper') canvasWrapper?: ElementRef<HTMLDivElement>;
     @ViewChild('canvasContainer') canvasContainer?: ElementRef<HTMLDivElement>;
     @ViewChild('exitWhiteboardFullscreen') exitWhiteboardFullscreen?: ElementRef<HTMLButtonElement>;
     @ViewChild('exitWhiteboardFullscreenMobile') exitWhiteboardFullscreenMobile?: ElementRef<HTMLButtonElement>;
     @ViewChild('imageUploadMobile') imageUploadMobile?: ElementRef<HTMLInputElement>;
     @ViewChild('imageUpload') imageUpload?: ElementRef<HTMLInputElement>;
     
     // Collapsible panels for mobile
     @ViewChild('colorSizePanelMobile') colorSizePanelMobile?: ElementRef<HTMLDivElement>;
     @ViewChild('styleOptionsPanelMobile') styleOptionsPanelMobile?: ElementRef<HTMLDivElement>;
     @ViewChild('zoomPanelMobile') zoomPanelMobile?: ElementRef<HTMLDivElement>;
     @ViewChild('actionsPanelMobile') actionsPanelMobile?: ElementRef<HTMLDivElement>;
     @ViewChild('saveExportPanelMobile') saveExportPanelMobile?: ElementRef<HTMLDivElement>;
     
     // Chevrons for mobile
     @ViewChild('colorSizeChevron') colorSizeChevron?: ElementRef<HTMLElement>;
     @ViewChild('styleOptionsChevron') styleOptionsChevron?: ElementRef<HTMLElement>;
     @ViewChild('zoomChevron') zoomChevron?: ElementRef<HTMLElement>;
     @ViewChild('actionsChevron') actionsChevron?: ElementRef<HTMLElement>;
     @ViewChild('saveExportChevron') saveExportChevron?: ElementRef<HTMLElement>;

     private canvasContext?: CanvasRenderingContext2D;
     private gridContext?: CanvasRenderingContext2D;
     
     // Socket events for whiteboard
     private readonly WHITEBOARD_EMITTERS = {
         DRAWING: 'whiteboard-drawing',
         CLEAR: 'whiteboard-clear',
         PAGE_CHANGE: 'whiteboard-page-change',
         LOCK_TOGGLE: 'whiteboard-lock-toggle',
         PRESENCE: 'whiteboard-presence',
         SYNC_REQUEST: 'whiteboard-sync-request'
     };
     
     private readonly WHITEBOARD_LISTENERS = {
         DRAWING: 'whiteboard-drawing',
         CLEAR: 'whiteboard-clear',
         PAGE_CHANGE: 'whiteboard-page-change',
         LOCK_TOGGLE: 'whiteboard-lock-toggle',
         PRESENCE: 'whiteboard-presence',
         SYNC: 'whiteboard-sync'
     };
     
     private pageStorage: Map<string, string> = new Map(); // Store page canvas data
     private isReceivingRemoteUpdate = false; // Prevent feedback loops
     private authService = inject(AuthService);

    ngAfterViewInit(): void {
        // Initialize after view is ready
        setTimeout(() => {
            this.initializeWhiteboard();
            this.initializeTemplates();
            this.initializeSocket();
        }, 0);
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.cleanupSocket();
    }
    
    // Socket Integration
    private initializeSocket(): void {
        const socket = this.socket();
        if (!socket || !socket.connected) {
            console.warn('⚠️ Socket not available for whiteboard collaboration');
            return;
        }
        
        const sessionId = this.sessionId();
        if (!sessionId) {
            console.warn('⚠️ Session ID not available for whiteboard collaboration');
            return;
        }
        
        console.log('✅ Initializing whiteboard socket integration');
        
        // Listen for remote drawing events
        socket.on(this.WHITEBOARD_LISTENERS.DRAWING, (data: { 
            userId: string, 
            pageId: string, 
            canvasData: string,
            tool: string,
            color: string,
            lineWidth: number
        }) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.handleRemoteDrawing(data);
        });
        
        // Listen for remote clear events
        socket.on(this.WHITEBOARD_LISTENERS.CLEAR, (data: { userId: string, pageId: string }) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            if (data.pageId === this.pages()[this.currentPageIndex()]?.id) {
                this.isReceivingRemoteUpdate = true;
                this.onClear();
                this.isReceivingRemoteUpdate = false;
            }
        });
        
        // Listen for page changes
        socket.on(this.WHITEBOARD_LISTENERS.PAGE_CHANGE, (data: { userId: string, pageId: string }) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.onPageChange(data.pageId);
        });
        
        // Listen for lock toggle
        socket.on(this.WHITEBOARD_LISTENERS.LOCK_TOGGLE, (data: { userId: string, isLocked: boolean }) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.isLocked.set(data.isLocked);
            this.isEditable.set(!data.isLocked);
        });
        
        // Listen for presence updates
        socket.on(this.WHITEBOARD_LISTENERS.PRESENCE, (data: { users: WhiteboardUser[] }) => {
            this.activeUsers.set(data.users);
        });
        
        // Request initial sync
        socket.emit(this.WHITEBOARD_EMITTERS.SYNC_REQUEST, { 
            sessionId,
            pageId: this.pages()[this.currentPageIndex()]?.id 
        });
    }
    
    private handleRemoteDrawing(data: { pageId: string, canvasData: string }): void {
        if (data.pageId !== this.pages()[this.currentPageIndex()]?.id) return;
        
        this.isReceivingRemoteUpdate = true;
        const img = new Image();
        img.onload = () => {
            if (this.canvasContext && this.whiteboardCanvas) {
                this.canvasContext.drawImage(img, 0, 0);
            }
            this.isReceivingRemoteUpdate = false;
        };
        img.src = data.canvasData;
    }
    
    private cleanupSocket(): void {
        const socket = this.socket();
        if (!socket) return;
        
        socket.off(this.WHITEBOARD_LISTENERS.DRAWING);
        socket.off(this.WHITEBOARD_LISTENERS.CLEAR);
        socket.off(this.WHITEBOARD_LISTENERS.PAGE_CHANGE);
        socket.off(this.WHITEBOARD_LISTENERS.LOCK_TOGGLE);
        socket.off(this.WHITEBOARD_LISTENERS.PRESENCE);
    }
    
    private emitDrawing(): void {
        const socket = this.socket();
        if (!socket || !socket.connected || this.isReceivingRemoteUpdate) return;
        
        const currentPage = this.pages()[this.currentPageIndex()];
        if (!currentPage || !this.whiteboardCanvas) return;
        
        const canvasData = this.whiteboardCanvas.nativeElement.toDataURL();
        socket.emit(this.WHITEBOARD_EMITTERS.DRAWING, {
            sessionId: this.sessionId(),
            userId: this.authService.getCurrentUser()?.id,
            pageId: currentPage.id,
            canvasData,
            tool: this.currentTool(),
            color: this.currentColor(),
            lineWidth: this.currentLineWidth()
        });
    }

     // Tool Selection
     selectTool(toolId: string): void {
        const tool = getToolFromId(toolId);
        if (!tool) return;
        
        if (isImageTool(toolId)) {
            const uploadInput = toolId.includes('Mobile') ? this.imageUploadMobile : this.imageUpload;
            if (uploadInput) {
                uploadInput.nativeElement.click();
            }
            return;
        }
        
        this.currentTool.set(tool);
    }
    
    onToolSelect(toolId: string): void {
        this.selectTool(toolId);
    }

    // Whiteboard Functionality
    private initializeWhiteboard(): void {
        if (!this.whiteboardCanvas || !this.gridCanvas || !this.canvasContainer) {
            return;
        }
        
        const canvas = this.whiteboardCanvas.nativeElement;
        const gridCanvas = this.gridCanvas.nativeElement;
        
        this.canvasContext = canvas.getContext('2d', { willReadFrequently: true }) || undefined;
        this.gridContext = gridCanvas.getContext('2d') || undefined;
        
        if (this.canvasContext) {
            canvas.style.backgroundColor = '#ffffff';
            // Set initial canvas properties
            this.canvasContext.lineCap = 'round';
            this.canvasContext.lineJoin = 'round';
        }
        
        // Initial resize
        this.resizeCanvas();
        
        // Save initial empty state
        this.saveState();
        
        // Setup resize observer for better performance
        if (this.canvasContainer) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resizeCanvas();
            });
            this.resizeObserver.observe(this.canvasContainer.nativeElement);
        }
        
        // Fallback resize handler
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);
    }
    
    private resizeCanvas(): void {
        if (!this.canvasContext || !this.gridContext || !this.whiteboardCanvas || !this.gridCanvas || !this.canvasWrapper || !this.canvasContainer) {
            return;
        }
        
        const container = this.canvasContainer.nativeElement;
        const baseWidth = Math.max(1, container.clientWidth);
        const baseHeight = Math.max(1, container.clientHeight);
        const zoom = this.zoomLevel();
        
        const canvas = this.whiteboardCanvas.nativeElement;
        const gridCanvas = this.gridCanvas.nativeElement;
        
        // Store current state as image before resize
        let currentImage: HTMLImageElement | null = null;
        if (canvas.width > 0 && canvas.height > 0) {
            const dataUrl = canvas.toDataURL();
            if (dataUrl && dataUrl !== 'data:,') {
                currentImage = new Image();
                currentImage.src = dataUrl;
            }
        }
        
        // Set new dimensions
        const newWidth = baseWidth * zoom;
        const newHeight = baseHeight * zoom;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        gridCanvas.width = newWidth;
        gridCanvas.height = newHeight;
        
        // Restore canvas properties
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';
        
        // Restore background color
        const bgColor = canvas.style.backgroundColor || '#ffffff';
        canvas.style.backgroundColor = bgColor;
        
        const wrapper = this.canvasWrapper.nativeElement;
        wrapper.style.transform = `scale(${1/zoom})`;
        wrapper.style.width = `${newWidth}px`;
        wrapper.style.height = `${newHeight}px`;
        
        // Restore content
        if (currentImage) {
            currentImage.onload = () => {
                if (this.canvasContext) {
                    this.canvasContext.drawImage(currentImage!, 0, 0, newWidth, newHeight);
                }
            };
        } else if (this.history.length > 0 && this.historyStep >= 0) {
            // Redraw from history if available
            this.redrawCanvas();
        }
        
        this.drawGrid();
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
    
    _onExitWhiteboard(): void {
        //this.whiteboardOpen.set(false);
        this.onExitWhiteboard.emit();
    }
    // Image Upload
    onImageUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.canvasContext || !this.whiteboardCanvas) return;
        
        // Reset input so same file can be selected again
        input.value = '';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = this.whiteboardCanvas!.nativeElement;
                if (this.canvasContext && canvas.width > 0 && canvas.height > 0) {
                    // Calculate scaling to fit image within canvas while maintaining aspect ratio
                    const canvasAspect = canvas.width / canvas.height;
                    const imgAspect = img.width / img.height;
                    
                    let drawWidth = img.width;
                    let drawHeight = img.height;
                    let drawX = 0;
                    let drawY = 0;
                    
                    if (imgAspect > canvasAspect) {
                        // Image is wider - fit to width
                        drawWidth = Math.min(img.width, canvas.width * 0.8);
                        drawHeight = drawWidth / imgAspect;
                    } else {
                        // Image is taller - fit to height
                        drawHeight = Math.min(img.height, canvas.height * 0.8);
                        drawWidth = drawHeight * imgAspect;
                    }
                    
                    // Center the image
                    drawX = (canvas.width - drawWidth) / 2;
                    drawY = (canvas.height - drawHeight) / 2;
                    
                    this.canvasContext.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    this.saveState();
                }
            };
            img.onerror = () => {
                console.error('Failed to load image');
                alert('Failed to load image. Please try a different file.');
            };
            img.src = e.target?.result as string;
        };
        reader.onerror = () => {
            console.error('Failed to read file');
            alert('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(file);
    }

    // Fill Toggle
    onToggleFill(): void {
        this.fillShapes.set(!this.fillShapes());
    }

   
    
    isWhiteboardOpen(): boolean {
        return this.whiteboardOpen();
    }
    
   
    
    // Removed - now handled by components
    
    getCurrentTool(): string {
        return this.currentTool();
    }
    
    getCurrentColor(): string {
        return this.currentColor();
    }
    
    getCurrentLineWidth(): number {
        return this.currentLineWidth();
    }
    onLineStyleChange(style: string): void {
        this.lineStyle.set(style);
    }
    
    // Background Color
    onBackgroundColorChange(color: string): void {
        if (this.whiteboardCanvas) {
            const canvas = this.whiteboardCanvas.nativeElement;
            // Just change the CSS background - the canvas is transparent
            // so the background shows through
            canvas.style.backgroundColor = color;
            // No need to redraw - CSS background handles it
        }
    }
    
    // Grid Toggle
    onToggleGridVisible(): void {
        this.gridVisible.set(!this.gridVisible());
        this.drawGrid();
    }
    
    // Zoom Controls
    onZoomIn(): void {
        this.zoomLevel.set(clampZoom(this.zoomLevel() + 0.25));
        this.resizeCanvas();
    }
    
    onZoomOut(): void {
        this.zoomLevel.set(clampZoom(this.zoomLevel() - 0.25));
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
    
    // Toggle More Colors
    onToggleMoreColors(isMobile: boolean = false): void {
        if (isMobile) {
            this.showMoreColorsMobile.set(!this.showMoreColorsMobile());
        } else {
            this.showMoreColors.set(!this.showMoreColors());
        }
    }
    
    // Line Width
    onLineWidthChange(value: number): void {
        this.currentLineWidth.set(value);
    }
    
    // Drawing Functions
    private getMousePos(e: MouseEvent | TouchEvent): { x: number; y: number } {
        if (!this.whiteboardCanvas || !this.canvasWrapper) return { x: 0, y: 0 };
        
        const canvas = this.whiteboardCanvas.nativeElement;
        const wrapper = this.canvasWrapper.nativeElement;
        const rect = wrapper.getBoundingClientRect();
        
        let clientX: number;
        let clientY: number;
        
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        
        const scale = 1 / this.zoomLevel();
        return {
            x: (clientX - rect.left) / scale,
            y: (clientY - rect.top) / scale
        };
    }

     // Undo/Redo/Clear
     onUndo(): void {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.redrawCanvas();
        } else if (this.historyStep === 0 && this.history.length > 0) {
            // Clear canvas if we're at the first state
            this.historyStep = -1;
            if (this.canvasContext && this.whiteboardCanvas) {
                const canvas = this.whiteboardCanvas.nativeElement;
                this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
    
    onRedo(): void {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.redrawCanvas();
        }
    }
    
    onClear(): void {
        if (!this.isReceivingRemoteUpdate && !confirm('Clear the whiteboard? This action cannot be undone.')) {
            return;
        }
        
        if (this.canvasContext && this.whiteboardCanvas) {
            const canvas = this.whiteboardCanvas.nativeElement;
            this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            // Reset history
            this.history = [];
            this.historyStep = -1;
            this.saveState();
            
            // Emit clear event via socket
            const socket = this.socket();
            if (socket && socket.connected && !this.isReceivingRemoteUpdate) {
                const currentPage = this.pages()[this.currentPageIndex()];
                socket.emit(this.WHITEBOARD_EMITTERS.CLEAR, {
                    sessionId: this.sessionId(),
                    userId: this.authService.getCurrentUser()?.id,
                    pageId: currentPage?.id
                });
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
        let panel: ElementRef<HTMLDivElement> | undefined;
        let chevron: ElementRef<HTMLElement> | undefined;
        
        // Get panel reference
        switch (panelId) {
            case 'colorSizePanelMobile':
                panel = this.colorSizePanelMobile;
                break;
            case 'styleOptionsPanelMobile':
                panel = this.styleOptionsPanelMobile;
                break;
            case 'zoomPanelMobile':
                panel = this.zoomPanelMobile;
                break;
            case 'actionsPanelMobile':
                panel = this.actionsPanelMobile;
                break;
            case 'saveExportPanelMobile':
                panel = this.saveExportPanelMobile;
                break;
        }
        
        // Get chevron reference
        switch (chevronId) {
            case 'colorSizeChevron':
                chevron = this.colorSizeChevron;
                break;
            case 'styleOptionsChevron':
                chevron = this.styleOptionsChevron;
                break;
            case 'zoomChevron':
                chevron = this.zoomChevron;
                break;
            case 'actionsChevron':
                chevron = this.actionsChevron;
                break;
            case 'saveExportChevron':
                chevron = this.saveExportChevron;
                break;
        }
        
        if (panel?.nativeElement && chevron?.nativeElement) {
            const panelEl = panel.nativeElement;
            const chevronEl = chevron.nativeElement;
            const isHidden = panelEl.classList.contains('hidden');
            
            if (isHidden) {
                panelEl.classList.remove('hidden');
                chevronEl.classList.remove('rotate-0');
                chevronEl.classList.add('rotate-180');
            } else {
                panelEl.classList.add('hidden');
                chevronEl.classList.remove('rotate-180');
                chevronEl.classList.add('rotate-0');
            }
        }
    }
     // Canvas Events
     onCanvasMouseDown(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        event.stopPropagation();
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
        } else if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow' || tool === 'line' || tool === 'text') {
            this.saveState();
        }
    }
    
    onCanvasMouseMove(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        event.stopPropagation();
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
            // Redraw canvas to show preview without affecting the base
            this.redrawCanvas();
            
            // Set drawing properties
            this.canvasContext.strokeStyle = this.currentColor();
            this.canvasContext.fillStyle = this.currentColor();
            this.canvasContext.lineWidth = this.currentLineWidth();
            this.canvasContext.globalAlpha = 1; // Always use full opacity for preview
            this.setLineStyle(this.canvasContext);
            
            if (tool === 'rectangle') {
                // Calculate proper rectangle dimensions (handle negative values)
                const width = pos.x - this.startX;
                const height = pos.y - this.startY;
                const x = width < 0 ? pos.x : this.startX;
                const y = height < 0 ? pos.y : this.startY;
                const absWidth = Math.abs(width);
                const absHeight = Math.abs(height);
                
                this.canvasContext.beginPath();
                if (this.fillShapes()) {
                    this.canvasContext.fillRect(x, y, absWidth, absHeight);
                } else {
                    this.canvasContext.strokeRect(x, y, absWidth, absHeight);
                }
            } else if (tool === 'circle') {
                // Calculate center and radius for circle (from corner to corner like rectangle)
                const width = pos.x - this.startX;
                const height = pos.y - this.startY;
                const centerX = this.startX + width / 2;
                const centerY = this.startY + height / 2;
                const radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
                
                this.canvasContext.beginPath();
                this.canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI);
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
        event.stopPropagation();
        if (!this.isDrawing || !this.canvasContext) return;
        
        this.isDrawing = false;
        const pos = this.getMousePos(event);
        const tool = this.currentTool();
        
        this.canvasContext.strokeStyle = this.currentColor();
        this.canvasContext.fillStyle = this.currentColor();
        this.canvasContext.lineWidth = this.currentLineWidth();
        this.setLineStyle(this.canvasContext);
        
        if (tool === 'rectangle') {
            // Calculate proper rectangle dimensions (handle negative values)
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            const x = width < 0 ? pos.x : this.startX;
            const y = height < 0 ? pos.y : this.startY;
            const absWidth = Math.abs(width);
            const absHeight = Math.abs(height);
            
            this.canvasContext.beginPath();
            if (this.fillShapes()) {
                this.canvasContext.fillRect(x, y, absWidth, absHeight);
            } else {
                this.canvasContext.strokeRect(x, y, absWidth, absHeight);
            }
            this.saveState();
        } else if (tool === 'circle') {
            // Calculate center and radius for circle (from corner to corner like rectangle)
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            const centerX = this.startX + width / 2;
            const centerY = this.startY + height / 2;
            const radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
            
            this.canvasContext.beginPath();
            this.canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI);
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
            // For text, we'll use a simple prompt for now
            // In a production app, you might want a custom modal
            const text = prompt('Enter text:');
            if (text && this.canvasContext) {
                this.canvasContext.fillStyle = this.currentColor();
                this.canvasContext.font = `bold ${Math.max(12, this.currentLineWidth() * 5)}px Arial`;
                this.canvasContext.textBaseline = 'top';
                this.canvasContext.fillText(text, this.startX, this.startY);
                this.saveState();
            }
        }
        
        this.canvasContext.setLineDash([]);
        this.canvasContext.beginPath();
    }
    
    onCanvasMouseLeave(): void {
        if (this.isDrawing) {
            // Save state when leaving canvas during drawing
            const tool = this.currentTool();
            if (tool === 'pen' || tool === 'eraser' || tool === 'highlighter') {
                this.saveState();
            }
        }
        this.isDrawing = false;
    }
    private saveState(): void {
        if (!this.whiteboardCanvas || !this.canvasContext) return;
        
        // Limit history size to prevent memory issues (keep last 50 states)
        const maxHistorySize = 50;
        
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history = this.history.slice(0, this.historyStep);
        }
        this.history.push(this.whiteboardCanvas.nativeElement.toDataURL());
        
        // Trim history if it gets too large
        if (this.history.length > maxHistorySize) {
            this.history.shift();
            this.historyStep--;
        }
        
        // Save current page state
        const currentPage = this.pages()[this.currentPageIndex()];
        if (currentPage) {
            this.pageStorage.set(currentPage.id, this.whiteboardCanvas.nativeElement.toDataURL());
        }
        
        // Emit drawing update via socket
        this.emitDrawing();
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
    
    // New Feature Methods
    
    // Permissions
    onToggleLock(isLocked: boolean): void {
        this.isLocked.set(isLocked);
        this.isEditable.set(!isLocked);
        
        // Emit socket event for real-time sync
        const socket = this.socket();
        if (socket && socket.connected) {
            socket.emit(this.WHITEBOARD_EMITTERS.LOCK_TOGGLE, {
                sessionId: this.sessionId(),
                userId: this.authService.getCurrentUser()?.id,
                isLocked
            });
        }
    }
    
    onClearStudentDrawings(): void {
        // For now, clear entire canvas (full implementation would require user tracking per drawing)
        if (confirm('Clear all student drawings? This will clear the entire whiteboard.')) {
            this.onClear();
        }
    }
    
    // Pages
    onPageChange(pageId: string): void {
        const index = this.pages().findIndex(p => p.id === pageId);
        if (index >= 0) {
            // Save current page before switching
            const currentPage = this.pages()[this.currentPageIndex()];
            if (currentPage && this.whiteboardCanvas) {
                this.pageStorage.set(currentPage.id, this.whiteboardCanvas.nativeElement.toDataURL());
            }
            
            this.currentPageIndex.set(index);
            
            // Load page content from storage
            const savedData = this.pageStorage.get(pageId);
            if (savedData && this.canvasContext && this.whiteboardCanvas) {
                const img = new Image();
                img.onload = () => {
                    this.canvasContext!.clearRect(0, 0, this.whiteboardCanvas!.nativeElement.width, this.whiteboardCanvas!.nativeElement.height);
                    this.canvasContext!.drawImage(img, 0, 0);
                };
                img.src = savedData;
            } else {
                // Clear canvas if no saved data
                if (this.canvasContext && this.whiteboardCanvas) {
                    const canvas = this.whiteboardCanvas.nativeElement;
                    this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            
            // Emit page change via socket
            const socket = this.socket();
            if (socket && socket.connected) {
                socket.emit(this.WHITEBOARD_EMITTERS.PAGE_CHANGE, {
                    sessionId: this.sessionId(),
                    userId: this.authService.getCurrentUser()?.id,
                    pageId
                });
            }
        }
    }
    
    onAddPage(): void {
        const newPage: WhiteboardPage = {
            id: Date.now().toString(),
            name: `Page ${this.pages().length + 1}`
        };
        this.pages.set([...this.pages(), newPage]);
        this.currentPageIndex.set(this.pages().length - 1);
        // TODO: Initialize new page canvas
    }
    
    onDeletePage(pageId: string): void {
        const filtered = this.pages().filter(p => p.id !== pageId);
        if (filtered.length > 0) {
            this.pages.set(filtered);
            if (this.currentPageIndex() >= filtered.length) {
                this.currentPageIndex.set(filtered.length - 1);
            }
        }
    }
    
    onDuplicatePage(pageId: string): void {
        const page = this.pages().find(p => p.id === pageId);
        if (page) {
            const newPage: WhiteboardPage = {
                id: Date.now().toString(),
                name: `${page.name} (Copy)`,
                template: page.template
            };
            const index = this.pages().findIndex(p => p.id === pageId);
            const newPages = [...this.pages()];
            newPages.splice(index + 1, 0, newPage);
            this.pages.set(newPages);
            this.currentPageIndex.set(index + 1);
            // TODO: Copy page content
        }
    }
    
    // Select Tool
    onCopySelection(): void {
        // TODO: Copy selected objects to clipboard
        this.hasClipboard.set(true);
    }
    
    onCutSelection(): void {
        // TODO: Cut selected objects to clipboard
        this.hasClipboard.set(true);
        this.hasSelection.set(false);
    }
    
    onPasteSelection(): void {
        // TODO: Paste from clipboard
    }
    
    onAlignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'bottom'): void {
        // TODO: Align selected objects
    }
    
    onLayerChange(direction: 'front' | 'back'): void {
        // TODO: Change layer order
    }
    
    onDeleteSelection(): void {
        // TODO: Delete selected objects
        this.hasSelection.set(false);
    }
    
    // Templates
    onTemplateSelect(templateId: string): void {
        // TODO: Apply template to current page
        const template = this.templates().find(t => t.id === templateId);
        if (template) {
            // Apply template background/pattern
        }
    }
    
    // Stamps
    onStampSelect(stampId: string): void {
        this.currentTool.set('stamp');
        // TODO: Store selected stamp ID for drawing
    }
    
    // Sticky Notes
    onAddStickyNote(data: { x: number; y: number; color: string }): void {
        // TODO: Add sticky note at position
    }
    
    // Math Tools
    onMathToolActivate(tool: 'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'): void {
        this.currentTool.set(tool);
        // TODO: Activate specific math tool
    }
    
    // Initialize templates
    private initializeTemplates(): void {
        // Load default templates
        const defaultTemplates: WhiteboardTemplate[] = [
            { id: 'blank', name: 'Blank', icon: 'fas fa-square', preview: '', type: 'blank' },
            { id: 'lined', name: 'Lined Paper', icon: 'fas fa-grip-lines', preview: '', type: 'lined' },
            { id: 'graph', name: 'Graph Paper', icon: 'fas fa-th', preview: '', type: 'graph' },
            { id: 'coordinate', name: 'Coordinate Plane', icon: 'fas fa-chart-line', preview: '', type: 'coordinate' },
        ];
        this.templates.set(defaultTemplates);
    }

    onAddTab(tabName: string): void {
        this.tabs.set([...this.tabs(), tabName as 'pen' | 'screen-sharing']);
    }
    
    onCloseWhiteboard(): void {
        this._onExitWhiteboard();
    }
}
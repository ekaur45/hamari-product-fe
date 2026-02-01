import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WhiteboardPermissions } from "./permissions/whiteboard-permissions";
import { WhiteboardPages, WhiteboardPage } from "./pages/whiteboard-pages";
import { WhiteboardSelectTool } from "./tools/whiteboard-select-tool";
import { WhiteboardStickyNotes } from "./tools/whiteboard-sticky-notes";
import { WhiteboardTemplates, WhiteboardTemplate } from "./tools/whiteboard-templates";
import { WhiteboardStamps } from "./tools/whiteboard-stamps";
import { WhiteboardMathTools } from "./tools/whiteboard-math-tools";
import { WhiteboardPresence, WhiteboardUser } from "./collaboration/whiteboard-presence";
import { UserRole } from "../../shared";

@Component({
    selector: 'app-white-board',
    templateUrl: './white-board.html',
    styleUrls: ['./white-board.css'],
    imports: [
        CommonModule,
        WhiteboardPermissions,
        WhiteboardPages,
        WhiteboardSelectTool,
        WhiteboardStickyNotes,
        WhiteboardTemplates,
        WhiteboardStamps,
        WhiteboardMathTools,
        WhiteboardPresence
    ],
    standalone: true,
})
export class WhiteBoard implements AfterViewInit, OnDestroy {
    @Output() onExitWhiteboard = new EventEmitter<void>();
    
    // Inputs
    currentUserRole = input<UserRole>(UserRole.STUDENT);
    sessionId = input<string>('');
    
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

    constructor() {
    }

    ngAfterViewInit(): void {
        // Initialize after view is ready
        setTimeout(() => {
            this.initializeWhiteboard();
            this.initializeTemplates();
        }, 0);
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
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
        if (confirm('Clear the whiteboard? This action cannot be undone.')) {
            if (this.canvasContext && this.whiteboardCanvas) {
                const canvas = this.whiteboardCanvas.nativeElement;
                this.canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                // Reset history
                this.history = [];
                this.historyStep = -1;
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
        // TODO: Emit socket event for real-time sync
    }
    
    onClearStudentDrawings(): void {
        // TODO: Clear only student drawings, keep teacher's
        // Implementation depends on tracking user IDs for each drawing
    }
    
    // Pages
    onPageChange(pageId: string): void {
        const index = this.pages().findIndex(p => p.id === pageId);
        if (index >= 0) {
            this.currentPageIndex.set(index);
            // TODO: Load page content from storage
            this.redrawCanvas();
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
}
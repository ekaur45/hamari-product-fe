import { Component, effect, ElementRef, EventEmitter, OnInit, Output, signal, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-white-board',
    templateUrl: './white-board.html',
    styleUrls: ['./white-board.css'],
    imports: [CommonModule],
})
export class WhiteBoard implements OnInit {
    @Output() onExitWhiteboard = new EventEmitter<void>();
    // Whiteboard
    whiteboardOpen = signal<boolean>(true);
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
     @ViewChild('whiteboardActive') whiteboardActive?: ElementRef<HTMLSpanElement>;
     @ViewChild('whiteboardCanvas') whiteboardCanvas?: ElementRef<HTMLCanvasElement>;
     @ViewChild('gridCanvas') gridCanvas?: ElementRef<HTMLCanvasElement>;
     @ViewChild('canvasWrapper') canvasWrapper?: ElementRef<HTMLDivElement>;
     @ViewChild('canvasContainer') canvasContainer?: ElementRef<HTMLDivElement>;
     @ViewChild('exitWhiteboardFullscreen') exitWhiteboardFullscreen?: ElementRef<HTMLButtonElement>;
     @ViewChild('exitWhiteboardFullscreenMobile') exitWhiteboardFullscreenMobile?: ElementRef<HTMLButtonElement>;
     @ViewChild('imageUploadMobile') imageUploadMobile?: ElementRef<HTMLInputElement>;
     @ViewChild('imageUpload') imageUpload?: ElementRef<HTMLInputElement>;

     private canvasContext?: CanvasRenderingContext2D;
     private gridContext?: CanvasRenderingContext2D;
     private mainContentArea?: HTMLElement;
     private header?: HTMLElement;
     private bottomControls?: HTMLElement;

    constructor() {
        effect(()=>{
            this.initializeWhiteboard();
        });
    }

    ngOnInit(): void {
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
    
    _onExitWhiteboard(): void {
        //this.whiteboardOpen.set(false);
        this.onExitWhiteboard.emit();
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
}
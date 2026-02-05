import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Canvas, Rect, Circle, Line, Text, Image, Path, ActiveSelection, FabricObject } from 'fabric';
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
import { WhiteboardMobileToolbar } from "./toolbar/whiteboard-mobile-toolbar";
import { WhiteboardMobileCollapsible } from "./toolbar/whiteboard-mobile-collapsible";
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
        WhiteboardUndoRedo,
        WhiteboardMobileToolbar,
        WhiteboardMobileCollapsible
    ],
    standalone: true,
})
export class WhiteBoard implements AfterViewInit, OnDestroy {
    @Output() onExitWhiteboard = new EventEmitter<void>();

    tabs = signal<('pen' | 'screen-sharing')[]>(['pen']);
    // Inputs
    currentUserRole = input<UserRole>(UserRole.STUDENT);
    sessionId = input<string>('');
    socket = input<Socket | undefined>(undefined);
    
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
    
    // Features
    isEditable = signal<boolean>(true);
    isLocked = signal<boolean>(false);
    pages = signal<WhiteboardPage[]>([{ id: '1', name: 'Page 1' }]);
    currentPageIndex = signal<number>(0);
    hasSelection = signal<boolean>(false);
    hasClipboard = signal<boolean>(false);
    activeUsers = signal<WhiteboardUser[]>([]);
    templates = signal<WhiteboardTemplate[]>([]);
    
    @ViewChild('whiteboardCanvas') whiteboardCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas') gridCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasContainer') canvasContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('canvasWrapper') canvasWrapper?: ElementRef<HTMLDivElement>;
    
    private fabricCanvas?: Canvas;
    private gridContext?: CanvasRenderingContext2D;
    private resizeObserver?: ResizeObserver;
    private resizeHandler?: () => void;
    private isDrawing = false;
    private currentPath?: Path;
    private history: string[] = [];
    private historyStep = -1;
    private clipboardObjects: FabricObject[] = [];
    private pageStorage: Map<string, string> = new Map();
    private isReceivingRemoteUpdate = false;
    private authService = inject(AuthService);
    
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

    ngAfterViewInit(): void {
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
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
        }
        this.cleanupSocket();
    }
    
    private initializeWhiteboard(): void {
        if (!this.whiteboardCanvas || !this.gridCanvas || !this.canvasContainer) {
            console.warn('Whiteboard canvas elements not found');
            return;
        }
        
        const canvasEl = this.whiteboardCanvas.nativeElement;
        const gridCanvasEl = this.gridCanvas.nativeElement;
        const container = this.canvasContainer.nativeElement;
        
        // Initialize Fabric.js canvas
        try {
            this.fabricCanvas = new Canvas(canvasEl, {
                backgroundColor: '#ffffff',
                selection: true,
                preserveObjectStacking: true
            });
            
            console.log('Fabric.js canvas initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Fabric.js canvas:', error);
            return;
        }
        
        // Initialize grid canvas context
        this.gridContext = gridCanvasEl.getContext('2d') || undefined;
        
        // Setup Fabric.js event handlers
        this.setupFabricEvents();
        
        // Initial resize
        this.resizeCanvas();
        
        // Save initial empty state
        this.saveState();
        
        // Setup resize observer
        if (this.canvasContainer) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resizeCanvas();
            });
            this.resizeObserver.observe(container);
        }
        
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);
    }
    
    private setupFabricEvents(): void {
        if (!this.fabricCanvas) return;
        
        // Handle selection changes
        this.fabricCanvas.on('selection:created', () => {
            this.hasSelection.set(true);
        });
        
        this.fabricCanvas.on('selection:updated', () => {
            this.hasSelection.set(true);
        });
        
        this.fabricCanvas.on('selection:cleared', () => {
            this.hasSelection.set(false);
        });
        
        // Handle object modifications
        this.fabricCanvas.on('object:modified', () => {
            this.saveState();
        });
        
        // Handle path creation for free drawing
        this.fabricCanvas.on('path:created', () => {
            this.saveState();
        });
        
        // Handle mouse events for shape tools
        this.fabricCanvas.on('mouse:down', (options) => {
            this.handleMouseDown(options);
        });
        
        this.fabricCanvas.on('mouse:move', (options) => {
            this.handleMouseMove(options);
        });
        
        this.fabricCanvas.on('mouse:up', (options) => {
            this.handleMouseUp(options);
        });
    }
    
    private handleMouseDown(options: any): void {
        if (!this.fabricCanvas) return;
        
        const tool = this.currentTool();
        // Only handle shape tools here - free drawing is handled by Fabric.js
        if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow' || tool === 'line' || tool === 'text') {
            // Prevent default selection behavior
            if (options.e) {
                options.e.preventDefault?.();
                options.e.stopPropagation?.();
            }
            const pointer = this.fabricCanvas.getScenePoint(options.e);
            this.startDrawingShape({ x: pointer.x, y: pointer.y }, tool);
        }
    }
    
    private handleMouseMove(options: any): void {
        if (!this.fabricCanvas || !this.isDrawingShape || !this.currentShape || !this.shapeStartPoint) return;
        
        const pointer = this.fabricCanvas.getScenePoint(options.e);
        this.updateShape({ x: pointer.x, y: pointer.y });
    }
    
    private handleMouseUp(options: any): void {
        if (!this.fabricCanvas || !this.isDrawingShape) return;
        
        this.finishDrawingShape();
    }
    
    private resizeCanvas(): void {
        if (!this.fabricCanvas || !this.gridCanvas || !this.canvasContainer || !this.canvasWrapper) {
            return;
        }
        
        const container = this.canvasContainer.nativeElement;
        const baseWidth = Math.max(1, container.clientWidth);
        const baseHeight = Math.max(1, container.clientHeight);
        const zoom = this.zoomLevel();
        
        const newWidth = baseWidth * zoom;
        const newHeight = baseHeight * zoom;
        
        // Resize Fabric.js canvas
        this.fabricCanvas.setDimensions({
            width: newWidth,
            height: newHeight
        });
        
        // Resize grid canvas
        const gridCanvasEl = this.gridCanvas.nativeElement;
        gridCanvasEl.width = newWidth;
        gridCanvasEl.height = newHeight;
        
        // Update wrapper transform
        const wrapper = this.canvasWrapper.nativeElement;
        wrapper.style.transform = `scale(${1/zoom})`;
        wrapper.style.width = `${newWidth}px`;
        wrapper.style.height = `${newHeight}px`;
        
        this.drawGrid();
        this.fabricCanvas.renderAll();
    }
    
    private drawGrid(): void {
        if (!this.gridContext || !this.gridCanvas) return;
        
        const gridCanvas = this.gridCanvas.nativeElement;
        if (gridCanvas.width === 0 || gridCanvas.height === 0) {
            return;
        }
        
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
    
    // Tool Selection
    selectTool(toolId: string): void {
        const tool = getToolFromId(toolId);
        if (!tool || !this.fabricCanvas) return;
        
        if (isImageTool(toolId)) {
            const uploadInput = toolId.includes('Mobile') ? 
                document.getElementById('imageUploadMobile') as HTMLInputElement :
                document.getElementById('imageUpload') as HTMLInputElement;
            if (uploadInput) {
                uploadInput.click();
            }
            return;
        }
        
        // Clear selection when switching tools (except select tool)
        if (tool !== 'select' && this.fabricCanvas.getActiveObjects().length > 0) {
            this.fabricCanvas.discardActiveObject();
            this.fabricCanvas.renderAll();
        }
        
        this.currentTool.set(tool);
        
        // Configure canvas based on tool
        if (tool === 'select') {
            this.fabricCanvas.isDrawingMode = false;
            this.fabricCanvas.selection = true;
        } else if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            this.fabricCanvas.isDrawingMode = true;
            this.fabricCanvas.selection = false;
            this.configureDrawingMode();
        } else {
            this.fabricCanvas.isDrawingMode = false;
            this.fabricCanvas.selection = false;
        }
    }
    
    private configureDrawingMode(): void {
        if (!this.fabricCanvas) return;
        
        const tool = this.currentTool();
        const brush = this.fabricCanvas.freeDrawingBrush;
        
        if (!brush) return;
        
        if (tool === 'pen') {
            brush.color = this.currentColor();
            brush.width = this.currentLineWidth();
        } else if (tool === 'highlighter') {
            brush.color = this.currentColor();
            brush.width = this.currentLineWidth() * 3;
            // Note: opacity might not be available on brush, use globalAlpha instead
        } else if (tool === 'eraser') {
            brush.color = '#ffffff';
            brush.width = this.currentLineWidth() * 3;
        }
    }
    
    private getPointerFromEvent(event: MouseEvent | TouchEvent): { x: number; y: number } {
        if (!this.fabricCanvas) return { x: 0, y: 0 };
        
        const canvasEl = this.fabricCanvas.getElement();
        const rect = canvasEl.getBoundingClientRect();
        
        let clientX: number;
        let clientY: number;
        
        if ('touches' in event && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if ('changedTouches' in event && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = (event as MouseEvent).clientX;
            clientY = (event as MouseEvent).clientY;
        }
        
        const zoom = this.zoomLevel();
        return {
            x: (clientX - rect.left) / (1 / zoom),
            y: (clientY - rect.top) / (1 / zoom)
        };
    }
    
    onToolSelect(toolId: string): void {
        this.selectTool(toolId);
    }
    
    private currentShape: FabricObject | null = null;
    private isDrawingShape = false;
    private shapeStartPoint: { x: number; y: number } | null = null;
    
    // Canvas Events - removed, now handled by Fabric.js events
    
    private startDrawingShape(pointer: { x: number; y: number }, tool: string): void {
        if (!this.fabricCanvas) return;
        
        this.shapeStartPoint = pointer;
        this.isDrawingShape = true;
        const color = this.currentColor();
        const lineWidth = this.currentLineWidth();
        
        if (tool === 'rectangle') {
            this.currentShape = new Rect({
                left: pointer.x,
                top: pointer.y,
                width: 0,
                height: 0,
                fill: this.fillShapes() ? color : 'transparent',
                stroke: color,
                strokeWidth: lineWidth,
                strokeDashArray: this.getStrokeDashArray(),
                selectable: false
            });
        } else if (tool === 'circle') {
            this.currentShape = new Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 0,
                fill: this.fillShapes() ? color : 'transparent',
                stroke: color,
                strokeWidth: lineWidth,
                strokeDashArray: this.getStrokeDashArray(),
                selectable: false
            });
        } else if (tool === 'line') {
            this.currentShape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: color,
                strokeWidth: lineWidth,
                strokeDashArray: this.getStrokeDashArray(),
                selectable: false
            });
        } else if (tool === 'arrow') {
            // Create simple arrow (line with arrowhead)
            this.currentShape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: color,
                strokeWidth: lineWidth,
                selectable: false
            });
        } else if (tool === 'text') {
            const text = prompt('Enter text:');
            if (text) {
                this.currentShape = new Text(text, {
                    left: pointer.x,
                    top: pointer.y,
                    fontSize: Math.max(12, lineWidth * 5),
                    fill: color,
                    fontFamily: 'Arial'
                });
                this.fabricCanvas.add(this.currentShape);
                this.fabricCanvas.setActiveObject(this.currentShape);
                this.finishDrawingShape();
                return;
            } else {
                this.isDrawingShape = false;
                return;
            }
        }
        
        if (this.currentShape) {
            this.fabricCanvas.add(this.currentShape);
            this.fabricCanvas.renderAll();
        }
    }
    
    private updateShape(pointer: { x: number; y: number }): void {
        if (!this.fabricCanvas || !this.currentShape || !this.shapeStartPoint) return;
        
        const tool = this.currentTool();
        const start = this.shapeStartPoint;
        
        if (tool === 'rectangle') {
            const rect = this.currentShape as Rect;
            rect.set({
                width: Math.abs(pointer.x - start.x),
                height: Math.abs(pointer.y - start.y),
                left: Math.min(start.x, pointer.x),
                top: Math.min(start.y, pointer.y)
            });
        } else if (tool === 'circle') {
            const circle = this.currentShape as Circle;
            const radius = Math.sqrt(
                Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2)
            ) / 2;
            circle.set({
                radius: radius,
                left: start.x - radius,
                top: start.y - radius
            });
        } else if (tool === 'line' || tool === 'arrow') {
            const line = this.currentShape as Line;
            line.set({
                x1: start.x,
                y1: start.y,
                x2: pointer.x,
                y2: pointer.y
            });
        }
        
        this.fabricCanvas.renderAll();
    }
    
    private finishDrawingShape(): void {
        if (!this.fabricCanvas || !this.currentShape) return;
        
        // Make shape selectable and save state
        this.currentShape.set({ selectable: true });
        this.fabricCanvas.setActiveObject(this.currentShape);
        this.fabricCanvas.renderAll();
        this.saveState();
        
        this.currentShape = null;
        this.isDrawingShape = false;
        this.shapeStartPoint = null;
    }
    
    private getStrokeDashArray(): number[] | undefined {
        const style = this.lineStyle();
        if (style === 'dashed') {
            return [10, 5];
        } else if (style === 'dotted') {
            return [2, 2];
        }
        return undefined;
    }
    
    // Image Upload
    onImageUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.fabricCanvas) return;
        
        input.value = '';
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl && this.fabricCanvas) {
                try {
                    const fabricImg = await Image.fromURL(dataUrl);
                    fabricImg.set({
                        scaleX: 0.8,
                        scaleY: 0.8,
                        left: (this.fabricCanvas.getWidth() - (fabricImg.width || 0) * 0.8) / 2,
                        top: (this.fabricCanvas.getHeight() - (fabricImg.height || 0) * 0.8) / 2
                    });
                    this.fabricCanvas.add(fabricImg);
                    this.fabricCanvas.renderAll();
                    this.saveState();
                } catch (error) {
                    console.error('Failed to load image:', error);
                    alert('Failed to load image. Please try a different file.');
                }
            }
        };
        reader.readAsDataURL(file);
    }
    
    // Style Options
    onToggleFill(): void {
        this.fillShapes.set(!this.fillShapes());
        // Update selected objects
        if (this.fabricCanvas) {
            const activeObjects = this.fabricCanvas.getActiveObjects();
            activeObjects.forEach((obj: FabricObject) => {
                if (obj instanceof Rect || obj instanceof Circle) {
                    obj.set({
                        fill: this.fillShapes() ? this.currentColor() : 'transparent'
                    });
                }
            });
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
    
    onLineStyleChange(style: string): void {
        this.lineStyle.set(style);
        if (this.fabricCanvas) {
            const activeObjects = this.fabricCanvas.getActiveObjects();
            activeObjects.forEach((obj: FabricObject) => {
                obj.set({
                    strokeDashArray: this.getStrokeDashArray()
                });
            });
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
    
    // Background Color
    onBackgroundColorChange(color: string): void {
        if (this.fabricCanvas) {
            this.fabricCanvas.backgroundColor = color;
            this.fabricCanvas.renderAll();
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
        this.configureDrawingMode();
        // Update selected objects
        if (this.fabricCanvas) {
            const activeObjects = this.fabricCanvas.getActiveObjects();
            activeObjects.forEach((obj: FabricObject) => {
                if (obj instanceof Path || obj instanceof Line) {
                    obj.set({ stroke: color });
                } else if (obj instanceof Text) {
                    obj.set({ fill: color });
                } else if (obj instanceof Rect || obj instanceof Circle) {
                    obj.set({
                        stroke: color,
                        fill: this.fillShapes() ? color : (obj.fill === 'transparent' ? 'transparent' : color)
                    });
                }
            });
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
    
    // Line Width
    onLineWidthChange(value: number): void {
        this.currentLineWidth.set(value);
        this.configureDrawingMode();
        // Update selected objects
        if (this.fabricCanvas) {
            const activeObjects = this.fabricCanvas.getActiveObjects();
            activeObjects.forEach((obj: FabricObject) => {
                if (obj instanceof Path || obj instanceof Line) {
                    obj.set({ strokeWidth: value });
                } else if (obj instanceof Text) {
                    obj.set({ fontSize: Math.max(12, value * 5) });
                } else if (obj instanceof Rect || obj instanceof Circle) {
                    obj.set({ strokeWidth: value });
                }
            });
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
    
    // Undo/Redo
    onUndo(): void {
        if (this.historyStep > 0 && this.fabricCanvas) {
            this.historyStep--;
            this.loadState();
        }
    }
    
    onRedo(): void {
        if (this.historyStep < this.history.length - 1 && this.fabricCanvas) {
            this.historyStep++;
            this.loadState();
        }
    }
    
    // Clear
    onClear(): void {
        if (!this.isReceivingRemoteUpdate && !confirm('Clear the whiteboard? This action cannot be undone.')) {
            return;
        }
        
        if (this.fabricCanvas) {
            this.fabricCanvas.clear();
            this.fabricCanvas.backgroundColor = '#ffffff';
            this.fabricCanvas.renderAll();
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
    
    // Save/Export
    onSaveWhiteboard(): void {
        if (!this.fabricCanvas) return;
        
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = this.fabricCanvas.toDataURL({ multiplier: 1, format: 'png' });
        link.click();
    }
    
    onExportPDF(): void {
        if (!this.fabricCanvas) return;
        
        const dataURL = this.fabricCanvas.toDataURL({ multiplier: 1, format: 'png' });
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
    
    // Select Tool Actions
    async onCopySelection(): Promise<void> {
        if (!this.fabricCanvas) return;
        
        const activeObjects = this.fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
            this.clipboardObjects = await Promise.all(
                activeObjects.map((obj: FabricObject) => obj.clone())
            );
            this.hasClipboard.set(true);
        }
    }
    
    async onCutSelection(): Promise<void> {
        if (!this.fabricCanvas) return;
        
        const activeObjects = this.fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
            this.clipboardObjects = await Promise.all(
                activeObjects.map((obj: FabricObject) => obj.clone())
            );
            this.hasClipboard.set(true);
            activeObjects.forEach((obj: FabricObject) => this.fabricCanvas!.remove(obj));
            this.fabricCanvas.discardActiveObject();
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
    
    async onPasteSelection(): Promise<void> {
        if (!this.fabricCanvas || this.clipboardObjects.length === 0) return;
        
        const canvasCenter = {
            x: this.fabricCanvas.getWidth() / 2,
            y: this.fabricCanvas.getHeight() / 2
        };
        
        const pastedObjects = await Promise.all(
            this.clipboardObjects.map(async (obj: FabricObject) => {
                const cloned = await obj.clone();
                cloned.set({
                    left: canvasCenter.x + (cloned.left || 0) - (obj.left || 0),
                    top: canvasCenter.y + (cloned.top || 0) - (obj.top || 0)
                });
                return cloned;
            })
        );
        
        pastedObjects.forEach((obj: FabricObject) => this.fabricCanvas!.add(obj));
        if (pastedObjects.length > 1) {
            this.fabricCanvas.setActiveObject(new ActiveSelection(pastedObjects, {
                canvas: this.fabricCanvas
            }));
        } else {
            this.fabricCanvas.setActiveObject(pastedObjects[0]);
        }
        this.fabricCanvas.renderAll();
        this.saveState();
    }
    
    onAlignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'bottom'): void {
        if (!this.fabricCanvas) return;
        
        const activeObjects = this.fabricCanvas.getActiveObjects();
        if (activeObjects.length === 0) return;
        
        const canvasWidth = this.fabricCanvas.getWidth();
        const canvasHeight = this.fabricCanvas.getHeight();
        
        activeObjects.forEach((obj: FabricObject) => {
            const bounds = obj.getBoundingRect();
            switch (alignment) {
                case 'left':
                    obj.set({ left: 0 });
                    break;
                case 'center':
                    obj.set({ left: (canvasWidth - bounds.width) / 2 });
                    break;
                case 'right':
                    obj.set({ left: canvasWidth - bounds.width });
                    break;
                case 'top':
                    obj.set({ top: 0 });
                    break;
                case 'bottom':
                    obj.set({ top: canvasHeight - bounds.height });
                    break;
            }
        });
        
        this.fabricCanvas.renderAll();
        this.saveState();
    }
    
    onLayerChange(direction: 'front' | 'back'): void {
        if (!this.fabricCanvas) return;
        
        const activeObjects = this.fabricCanvas.getActiveObjects();
        activeObjects.forEach((obj: FabricObject) => {
            if (direction === 'front') {
                this.fabricCanvas!.bringObjectToFront(obj);
            } else {
                this.fabricCanvas!.sendObjectToBack(obj);
            }
        });
        this.fabricCanvas.renderAll();
        this.saveState();
    }
    
    onDeleteSelection(): void {
        if (!this.fabricCanvas) return;
        
        const activeObjects = this.fabricCanvas.getActiveObjects();
        activeObjects.forEach((obj: FabricObject) => this.fabricCanvas!.remove(obj));
        this.fabricCanvas.discardActiveObject();
        this.fabricCanvas.renderAll();
        this.saveState();
    }
    
    // History Management
    private saveState(): void {
        if (!this.fabricCanvas) return;
        
        const maxHistorySize = 50;
        this.historyStep++;
        
        if (this.historyStep < this.history.length) {
            this.history = this.history.slice(0, this.historyStep);
        }
        
        this.history.push(JSON.stringify(this.fabricCanvas.toJSON()));
        
        if (this.history.length > maxHistorySize) {
            this.history.shift();
            this.historyStep--;
        }
        
        // Save current page state
        const currentPage = this.pages()[this.currentPageIndex()];
        if (currentPage) {
            this.pageStorage.set(currentPage.id, JSON.stringify(this.fabricCanvas.toJSON()));
        }
        
        this.emitDrawing();
    }
    
    private loadState(): void {
        if (!this.fabricCanvas || this.history.length === 0) return;
        
        const state = this.history[this.historyStep];
        if (state) {
            this.fabricCanvas.loadFromJSON(state, () => {
                this.fabricCanvas?.renderAll();
            });
        }
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
        
        socket.on(this.WHITEBOARD_LISTENERS.DRAWING, (data: any) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.handleRemoteDrawing(data);
        });
        
        socket.on(this.WHITEBOARD_LISTENERS.CLEAR, (data: any) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            if (data.pageId === this.pages()[this.currentPageIndex()]?.id) {
                this.isReceivingRemoteUpdate = true;
                this.onClear();
                this.isReceivingRemoteUpdate = false;
            }
        });
        
        socket.on(this.WHITEBOARD_LISTENERS.PAGE_CHANGE, (data: any) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.onPageChange(data.pageId);
        });
        
        socket.on(this.WHITEBOARD_LISTENERS.LOCK_TOGGLE, (data: any) => {
            if (data.userId === this.authService.getCurrentUser()?.id) return;
            this.isLocked.set(data.isLocked);
            this.isEditable.set(!data.isLocked);
        });
        
        socket.on(this.WHITEBOARD_LISTENERS.PRESENCE, (data: any) => {
            this.activeUsers.set(data.users);
        });
        
        socket.emit(this.WHITEBOARD_EMITTERS.SYNC_REQUEST, {
            sessionId,
            pageId: this.pages()[this.currentPageIndex()]?.id
        });
    }
    
    private handleRemoteDrawing(data: any): void {
        if (!this.fabricCanvas) return;
        // Load canvas state from remote
        if (data.canvasData) {
            this.fabricCanvas.loadFromJSON(data.canvasData, () => {
                this.fabricCanvas?.renderAll();
            });
        }
    }
    
    private emitDrawing(): void {
        const socket = this.socket();
        if (!socket || !socket.connected || this.isReceivingRemoteUpdate) return;
        
        const currentPage = this.pages()[this.currentPageIndex()];
        if (this.fabricCanvas) {
            socket.emit(this.WHITEBOARD_EMITTERS.DRAWING, {
                sessionId: this.sessionId(),
                userId: this.authService.getCurrentUser()?.id,
                pageId: currentPage?.id,
                canvasData: JSON.stringify(this.fabricCanvas.toJSON())
            });
        }
    }
    
    private cleanupSocket(): void {
        const socket = this.socket();
        if (!socket) return;
        
        Object.values(this.WHITEBOARD_LISTENERS).forEach(listener => {
            socket.off(listener);
        });
    }
    
    // Other methods
    onToggleWhiteboard(): void {
        this.whiteboardOpen.set(!this.whiteboardOpen());
        if (this.whiteboardOpen()) {
            setTimeout(() => this.resizeCanvas(), 100);
        }
    }
    
    _onExitWhiteboard(): void {
        this.onExitWhiteboard.emit();
    }
    
    onToggleLock(isLocked: boolean): void {
        this.isLocked.set(isLocked);
        this.isEditable.set(!isLocked);
        
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
        if (confirm('Clear all student drawings? This will clear the entire whiteboard.')) {
            this.onClear();
        }
    }
    
    onPageChange(pageId: string): void {
        const index = this.pages().findIndex(p => p.id === pageId);
        if (index >= 0) {
            const currentPage = this.pages()[this.currentPageIndex()];
            if (currentPage && this.fabricCanvas) {
                this.pageStorage.set(currentPage.id, JSON.stringify(this.fabricCanvas.toJSON()));
            }
            
            this.currentPageIndex.set(index);
            
            const savedData = this.pageStorage.get(pageId);
            if (savedData && this.fabricCanvas) {
                this.fabricCanvas.loadFromJSON(savedData, () => {
                    this.fabricCanvas?.renderAll();
                });
            } else if (this.fabricCanvas) {
                this.fabricCanvas.clear();
                this.fabricCanvas.backgroundColor = '#ffffff';
                this.fabricCanvas.renderAll();
            }
            
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
        }
    }
    
    onTemplateSelect(templateId: string): void {
        // TODO: Apply template
    }
    
    onStampSelect(stampId: string): void {
        this.currentTool.set('stamp');
    }
    
    onAddStickyNote(data: { x: number; y: number; color: string }): void {
        // TODO: Add sticky note
    }
    
    onMathToolActivate(tool: 'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'): void {
        this.currentTool.set(tool);
    }
    
    private initializeTemplates(): void {
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
    
    // Getters for compatibility
    getCurrentTool(): string {
        return this.currentTool();
    }
    
    getCurrentColor(): string {
        return this.currentColor();
    }
    
    getCurrentLineWidth(): number {
        return this.currentLineWidth();
    }
    
    isWhiteboardOpen(): boolean {
        return this.whiteboardOpen();
    }
}


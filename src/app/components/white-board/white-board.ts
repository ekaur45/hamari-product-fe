import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input, inject, NgZone, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Canvas, PencilBrush, Rect, Circle, Ellipse, Line, Triangle, Path } from 'fabric';
import { WhiteboardPage } from "./pages/whiteboard-pages";
import { WhiteboardSelectTool } from "./tools/whiteboard-select-tool";
import { WhiteboardStickyNotes } from "./tools/whiteboard-sticky-notes";
import { WhiteboardTemplates, WhiteboardTemplate } from "./tools/whiteboard-templates";
import { WhiteboardStamps } from "./tools/whiteboard-stamps";
import { WhiteboardMathTools } from "./tools/whiteboard-math-tools";
import { WhiteboardUser } from "./collaboration/whiteboard-presence";
import { WhiteboardTopBar } from "./toolbar/whiteboard-top-bar";
import { WhiteboardDrawingTools } from "./toolbar/whiteboard-drawing-tools";
import { WhiteboardStyleOptions } from "./toolbar/whiteboard-style-options";
import { WhiteboardColorSizePicker } from "./toolbar/whiteboard-color-size-picker";
import { WhiteboardCanvasOptions } from "./toolbar/whiteboard-canvas-options";
import { WhiteboardActionButtons } from "./toolbar/whiteboard-action-buttons";
import { UserRole, AuthService } from "../../shared";
import { Socket } from "socket.io-client";
import { getToolFromId, isImageTool, clampZoom } from "./utils/whiteboard-helpers";
declare const MathJax: any;
@Component({
    selector: 'app-white-board',
    templateUrl: './white-board.html',
    styleUrls: ['./white-board.css'],
    imports: [
        CommonModule,
        WhiteboardSelectTool,
        WhiteboardStickyNotes,
        WhiteboardTemplates,
        WhiteboardStamps,
        WhiteboardMathTools,
        WhiteboardTopBar,
        WhiteboardDrawingTools,
        WhiteboardStyleOptions,
        WhiteboardColorSizePicker,
        WhiteboardCanvasOptions,
        WhiteboardActionButtons
    ],
    standalone: true,
})
export class WhiteBoard implements AfterViewInit, OnDestroy {
    @ViewChild('whiteboardCanvas', { static: false }) whiteboardCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas', { static: false }) gridCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('canvasWrapper', { static: false }) canvasWrapper!: ElementRef<HTMLDivElement>;

    // Inputs
    currentUserRole = input<UserRole>(UserRole.STUDENT);
    sessionId = input<string>('');
    socket = input<Socket | undefined>(undefined); // Optional socket for real-time collaboration

    @Output() onExitWhiteboard = new EventEmitter<void>();    
    tabs = signal<('pen' | 'screen-sharing')[]>(['pen']);
    templates = signal<WhiteboardTemplate[]>([]);
    currentTool = signal<string>('pen');
    currentColor = signal<string>('#000000');
    currentLineWidth = signal<number>(3);
    fillShapes = signal<boolean>(false);
    lineStyle = signal<string>('solid');
    zoomLevel = signal<number>(1);
    gridVisible = signal<boolean>(false);
    showMoreColors = signal<boolean>(false);
    showMoreColorsMobile = signal<boolean>(false);
    isEditable = signal<boolean>(true);
    isLocked = signal<boolean>(false);
    pages = signal<WhiteboardPage[]>([{ id: '1', name: 'Page 1' }]);
    currentPageIndex = signal<number>(0);
    hasSelection = signal<boolean>(false);
    hasClipboard = signal<boolean>(false);
    activeUsers = signal<WhiteboardUser[]>([]);
    whiteboardOpen = signal<boolean>(true);

    // Fabric.js and MathJax instances
    private fabricCanvas: any = null;
    private gridContext: CanvasRenderingContext2D | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private mathJaxReadyPromise: Promise<void> | null = null;

    // Shape drawing state
    private isDrawingShape = false;
    private drawingObject: any = null;
    private startPoint: { x: number; y: number } = { x: 0, y: 0 };

    constructor(private ngZone: NgZone) {}

    ngAfterViewInit(): void {
        this.initializeFabric();
        this.initializeMathJax();
    }

    ngOnDestroy(): void {
        // Cleanup ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Cleanup Fabric.js canvas
        if (this.fabricCanvas) {
            if (typeof this.fabricCanvas.dispose === 'function') {
                this.fabricCanvas.dispose();
            }
            this.fabricCanvas = null;
        }
    }

    /**
     * Initialize Fabric.js canvas
     */
    private initializeFabric(): void {
        if (!this.whiteboardCanvas?.nativeElement) {
            console.error('Canvas element not found');
            return;
        }

        // Initialize grid canvas context
        if (this.gridCanvas?.nativeElement) {
            this.gridContext = this.gridCanvas.nativeElement.getContext('2d');
        }

        // Run Fabric.js initialization outside Angular zone for better performance
        this.ngZone.runOutsideAngular(() => {
            try {
                this.fabricCanvas = new Canvas(this.whiteboardCanvas.nativeElement, {
                    preserveObjectStacking: true,
                    selection: true,
                    backgroundColor: '#ffffff',
                });

                // Initial canvas resize
                this.resizeCanvas();

                // Setup ResizeObserver for responsive canvas
                if (this.canvasContainer?.nativeElement) {
                    this.resizeObserver = new ResizeObserver(() => {
                        requestAnimationFrame(() => this.resizeCanvas());
                    });
                    this.resizeObserver.observe(this.canvasContainer.nativeElement);
                }
            } catch (error) {
                console.error('Error initializing Fabric.js:', error);
            }
        });

        // These are safe to run normally (outside the runOutsideAngular block)
        this.setupCanvasEvents();
        this.selectTool('selectTool'); // Set initial tool to select
    }

    /**
     * Initialize MathJax
     */
    private initializeMathJax(): void {
        if (!MathJax) {
            console.error('MathJax failed to load. Check the script tag in src/index.html.');
            return;
        }

        // MathJax should already be initialized from the script tag
        // Just ensure it's ready
        this.ensureMathJaxReady().then(() => {
            console.log('MathJax initialized successfully');
        }).catch((error) => {
            console.error('Error initializing MathJax:', error);
        });
    }

    /**
     * Ensure MathJax is ready before using it
     */
    private ensureMathJaxReady(): Promise<void> {
        if (this.mathJaxReadyPromise) {
            return this.mathJaxReadyPromise;
        }

        this.mathJaxReadyPromise = new Promise((resolve, reject) => {
            const mj = MathJax;
            if (!mj) {
                reject(new Error('MathJax is not available'));
                return;
            }

            // MathJax 3.x uses startup.promise
            if (mj.startup && mj.startup.promise) {
                mj.startup.promise.then(() => resolve()).catch(reject);
            } else {
                // Fallback for older versions or if already loaded
                setTimeout(() => resolve(), 100);
            }
        });

        return this.mathJaxReadyPromise;
    }

    /**
     * Resize canvas to fit container
     */
    private resizeCanvas(): void {
        if (!this.fabricCanvas || !this.canvasContainer?.nativeElement) {
            return;
        }

        const container = this.canvasContainer.nativeElement;
        const width = Math.max(200, container.clientWidth);
        const height = Math.max(200, container.clientHeight);

        // Prevent infinite resize loop
        if (this.fabricCanvas.getWidth() === width && this.fabricCanvas.getHeight() === height) {
            return;
        }

        // Use cssOnly: false to set actual canvas dimensions
        // Fabric.js preserves objects during resize by default
        this.fabricCanvas.setDimensions(
            { width, height },
            { cssOnly: false }
        );

        this.fabricCanvas.calcOffset();
        this.fabricCanvas.requestRenderAll();

        // Resize grid canvas if it exists
        if (this.gridCanvas?.nativeElement) {
            const gridCanvas = this.gridCanvas.nativeElement;
            gridCanvas.width = width;
            gridCanvas.height = height;
            if (this.gridVisible()) {
                this.drawGrid();
            }
        }
    }

    /**
     * Draw grid on grid canvas
     */
    private drawGrid(): void {
        if (!this.gridCanvas?.nativeElement || !this.gridContext) {
            return;
        }

        const canvas = this.gridCanvas.nativeElement;
        const ctx = this.gridContext;
        const spacing = 20;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x < canvas.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y < canvas.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    /**
     * Setup Fabric.js canvas event handlers
     */
    private setupCanvasEvents(): void {
        if (!this.fabricCanvas) {
            return;
        }

        // Selection events
        this.fabricCanvas.on('selection:created', () => {
            this.ngZone.run(() => {
                this.hasSelection.set(true);
            });
        });

        this.fabricCanvas.on('selection:updated', () => {
            this.ngZone.run(() => {
                this.hasSelection.set(true);
            });
        });

        this.fabricCanvas.on('selection:cleared', () => {
            this.ngZone.run(() => {
                this.hasSelection.set(false);
            });
        });

        // Object modification events
        this.fabricCanvas.on('object:modified', () => {
            this.ngZone.run(() => {
                // Handle object modification
            });
        });

        // Path created event (when drawing is complete)
        // Match the working test component - minimal handling
        this.fabricCanvas.on('path:created', (e: any) => {
            if (!e.path) return;
            const tool = this.currentTool();
            
            // Only apply tool-specific properties that can't be set on the brush
            if (tool === 'highlighter') {
                e.path.opacity = 0.3;
            } else if (tool === 'eraser') {
                e.path.globalCompositeOperation = 'destination-out';
            }
            
            // Make paths non-selectable and non-evented (like working version)
            if (tool !== 'select') {
                e.path.selectable = false;
                e.path.evented = false;
            }
            
            e.path.setCoords();
            this.fabricCanvas.requestRenderAll();
        });

        // Mouse events for shape drawing
        this.fabricCanvas.on('mouse:down', (opt: any) => {
            const tool = this.currentTool();
            if (!this.isShapeTool(tool)) return;

            const pointer = this.fabricCanvas.getPointer(opt.e);
            this.isDrawingShape = true;
            this.startPoint = { x: pointer.x, y: pointer.y };

            this.drawingObject = this.createShape(tool, pointer.x, pointer.y);
            if (this.drawingObject) {
                this.fabricCanvas.add(this.drawingObject);
            }
        });

        this.fabricCanvas.on('mouse:move', (opt: any) => {
            if (!this.isDrawingShape || !this.drawingObject) return;

            const pointer = this.fabricCanvas.getPointer(opt.e);
            const tool = this.currentTool();
            this.updateShape(this.drawingObject, tool, this.startPoint, pointer);
            this.drawingObject.setCoords();
            this.fabricCanvas.requestRenderAll();
        });

        this.fabricCanvas.on('mouse:up', () => {
            if (this.drawingObject) {
                // Make shape selectable after drawing
                this.drawingObject.selectable = true;
                this.drawingObject.evented = true;
                this.drawingObject = null;
            }
            this.isDrawingShape = false;
        });
    }


    onCloseWhiteboard(): void {
    }
    onAddTab(tab: 'pen' | 'screen-sharing'): void {
    }

    onTemplateSelect(templateId: string): void {
    }
    onStampSelect(stampId: string): void {
    }
    onStickyNoteSelect(stickyNoteId: string): void {
    }
    onMathToolActivate(tool: 'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'): void {
    }
    onClear(): void {
    }
    onSaveWhiteboard(): void {
    }
    onExportPDF(): void {
    }
    onToolSelect(toolId: string): void {
        this.selectTool(toolId);
    }

    onImageUpload(event: Event): void {
        // TODO: Implement image upload
    }

    onToggleFill(): void {
        this.fillShapes.set(!this.fillShapes());
    }

    onLineStyleChange(style: string): void {
        this.lineStyle.set(style);
    }

    onColorChange(color: string): void {
        this.currentColor.set(color);
        this.updateBrushSettings();
    }

    onLineWidthChange(value: number): void {
        this.currentLineWidth.set(value);
        this.updateBrushSettings();
    }

    onBackgroundColorChange(color: string): void {
        if (this.fabricCanvas) {
            this.fabricCanvas.setBackgroundColor(color, () => {
                this.fabricCanvas.requestRenderAll();
            });
        }
    }

    onToggleGridVisible(): void {
        this.gridVisible.set(!this.gridVisible());
        if (this.gridVisible()) {
            this.drawGrid();
        } else if (this.gridContext && this.gridCanvas?.nativeElement) {
            this.gridContext.clearRect(0, 0, this.gridCanvas.nativeElement.width, this.gridCanvas.nativeElement.height);
        }
    }

    onZoomIn(): void {
        const newZoom = Math.min(3, this.zoomLevel() + 0.1);
        this.zoomLevel.set(newZoom);
        this.applyZoom();
    }

    onZoomOut(): void {
        const newZoom = Math.max(0.1, this.zoomLevel() - 0.1);
        this.zoomLevel.set(newZoom);
        this.applyZoom();
    }

    onZoomReset(): void {
        this.zoomLevel.set(1);
        this.applyZoom();
    }

    onCopySelection(): void {
        // TODO: Implement copy
    }

    onCutSelection(): void {
        // TODO: Implement cut
    }

    onPasteSelection(): void {
        // TODO: Implement paste
    }

    onAlignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'bottom'): void {
        // TODO: Implement alignment
    }

    onLayerChange(direction: 'front' | 'back'): void {
        if (!this.fabricCanvas) return;
        const activeObject = this.fabricCanvas.getActiveObject();
        if (!activeObject) return;

        if (direction === 'front') {
            activeObject.bringToFront();
        } else {
            activeObject.sendToBack();
        }
        this.fabricCanvas.requestRenderAll();
    }

    onDeleteSelection(): void {
        if (!this.fabricCanvas) return;
        const activeObject = this.fabricCanvas.getActiveObject();
        if (!activeObject) return;

        // Handle multiple selected objects (activeSelection)
        if (activeObject.type === 'activeSelection') {
            const objects = (activeObject as any).getObjects();
            this.fabricCanvas.discardActiveObject();
            objects.forEach((obj: any) => this.fabricCanvas.remove(obj));
        } else {
            // Handle single object
            this.fabricCanvas.remove(activeObject);
        }

        this.fabricCanvas.requestRenderAll();
        this.hasSelection.set(false);
    }

    /**
     * Handle keyboard events for delete, undo, redo, etc.
     */
    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        // Don't handle if user is typing in an input field
        const target = event.target as HTMLElement | null;
        const isTextInput = target instanceof HTMLElement &&
            (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (isTextInput) return;

        // Handle Delete/Backspace
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (!this.fabricCanvas) return;
            const activeObject = this.fabricCanvas.getActiveObject();
            
            // Don't delete if user is editing text
            if (activeObject && activeObject.type === 'i-text' && (activeObject as any).isEditing) {
                return;
            }

            event.preventDefault();
            this.onDeleteSelection();
            return;
        }

        // Handle Escape to deselect
        if (event.key === 'Escape') {
            if (this.fabricCanvas) {
                this.fabricCanvas.discardActiveObject();
                this.fabricCanvas.requestRenderAll();
                this.hasSelection.set(false);
            }
            return;
        }
    }

    onAddStickyNote(data: { x: number; y: number; color: string }): void {
        // TODO: Implement sticky note
    }
    
    /**
     * Select and configure tool
     */
    selectTool(toolId: string): void {
        const tool = getToolFromId(toolId);
        if (!tool || !this.fabricCanvas) return;

        this.currentTool.set(tool);
        this.applyToolToCanvas();
    }

    /**
     * Apply tool configuration to canvas
     * Matches the working test component implementation
     */
    private applyToolToCanvas(): void {
        if (!this.fabricCanvas) return;

        const tool = this.currentTool();

        // Always reset drawing mode first (like working version)
        this.fabricCanvas.isDrawingMode = false;
        this.fabricCanvas.selection = tool === 'select';
        this.fabricCanvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';

        // Modify ALL objects (like working version does)
        this.fabricCanvas.forEachObject((obj: any) => {
            obj.selectable = tool === 'select';
            obj.evented = tool === 'select';
        });

        // Configure drawing tools
        if (tool === 'pen') {
            this.fabricCanvas.isDrawingMode = true;
            const brush = new PencilBrush(this.fabricCanvas);
            brush.color = this.currentColor();
            brush.width = this.currentLineWidth();
            brush.decimate = 2;
            this.fabricCanvas.freeDrawingBrush = brush;
        } else if (tool === 'highlighter') {
            this.fabricCanvas.isDrawingMode = true;
            const brush = new PencilBrush(this.fabricCanvas);
            brush.color = this.currentColor();
            brush.width = this.currentLineWidth() * 3;
            this.fabricCanvas.freeDrawingBrush = brush;
        } else if (tool === 'eraser') {
            this.fabricCanvas.isDrawingMode = true;
            const eraser = new PencilBrush(this.fabricCanvas);
            eraser.width = this.currentLineWidth() * 2;
            eraser.color = '#ffffff';
            // globalCompositeOperation will be set on path creation if needed
            this.fabricCanvas.freeDrawingBrush = eraser;
        }
    }

    /**
     * Update brush settings when color or width changes
     */
    private updateBrushSettings(): void {
        if (!this.fabricCanvas) return;
        
        const brush = this.fabricCanvas.freeDrawingBrush;
        if (!brush) return;

        const tool = this.currentTool();
        
        if (tool === 'pen' || tool === 'highlighter') {
            if ('color' in brush) {
                brush.color = this.currentColor();
            }
            if ('width' in brush) {
                brush.width = tool === 'highlighter' 
                    ? this.currentLineWidth() * 3 
                    : this.currentLineWidth();
            }
        } else if (tool === 'eraser') {
            if ('width' in brush) {
                brush.width = this.currentLineWidth() * 2;
            }
        }
    }

    /**
     * Apply zoom level to canvas wrapper
     */
    private applyZoom(): void {
        if (!this.canvasWrapper?.nativeElement) return;
        this.canvasWrapper.nativeElement.style.transform = `scale(${this.zoomLevel()})`;
    }
    _onExitWhiteboard(): void {
    }
    onUndo(): void {
    }
    onRedo(): void {
    }
}


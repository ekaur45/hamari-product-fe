import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input, inject, NgZone, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Canvas, PencilBrush, Rect, Circle, Ellipse, Line, Triangle, Path, IText, Group } from 'fabric';
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
    activeMathTool = signal<'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator' | null>(null);

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
            
            // Preserve original path properties before modifying
            const originalStroke = e.path.stroke;
            const originalStrokeWidth = e.path.strokeWidth;
            
            // Only apply tool-specific properties that can't be set on the brush
            if (tool === 'highlighter') {
                // Highlighter: set opacity but preserve original color
                e.path.set({
                    opacity: 0.3,
                    stroke: originalStroke || this.currentColor(),
                    strokeWidth: originalStrokeWidth
                });
            } else if (tool === 'eraser') {
                // Eraser: use destination-out to erase (make transparent)
                // IMPORTANT: Set stroke to white FIRST, then apply composite operation
                // This ensures the path doesn't show gray before the composite is applied
                e.path.stroke = '#ffffff';
                e.path.fill = '';
                e.path.strokeWidth = originalStrokeWidth || this.currentLineWidth() * 2;
                e.path.opacity = 1;
                // Then apply the composite operation
                e.path.globalCompositeOperation = 'destination-out';
            } else if (tool === 'pen') {
                // Pen: preserve original stroke color
                if (originalStroke) {
                    e.path.set({ stroke: originalStroke });
                }
            }
            
            // Make paths non-selectable and non-evented (like working version)
            if (tool !== 'select') {
                e.path.selectable = false;
                e.path.evented = false;
            }
            
            e.path.setCoords();
            this.fabricCanvas.requestRenderAll();
        });

        // Mouse events for shape drawing and text
        this.fabricCanvas.on('mouse:down', (opt: any) => {
            const tool = this.currentTool();
            const mathTool = this.activeMathTool();
            
            // Handle text tool
            if (tool === 'text') {
                const pointer = this.getPointer(opt);
                this.addTextAt(pointer.x, pointer.y);
                return;
            }

            // Handle ruler tool
            if (mathTool === 'ruler') {
                const pointer = this.getPointer(opt);
                this.isDrawingShape = true;
                this.startPoint = { x: pointer.x, y: pointer.y };
                this.drawingObject = this.createRuler(pointer.x, pointer.y);
                if (this.drawingObject) {
                    this.fabricCanvas.add(this.drawingObject);
                    this.fabricCanvas.requestRenderAll();
                }
                return;
            }

            // Handle shape tools
            if (!this.isShapeTool(tool)) return;

            const pointer = this.getPointer(opt);
            // Store the start point - this will NOT change during mouse move
            this.isDrawingShape = true;
            this.startPoint = { x: pointer.x, y: pointer.y };

            // Create shape at the start point
            this.drawingObject = this.createShape(tool, pointer.x, pointer.y);
            if (this.drawingObject) {
                this.fabricCanvas.add(this.drawingObject);
                this.fabricCanvas.requestRenderAll();
            }
        });

        this.fabricCanvas.on('mouse:move', (opt: any) => {
            if (!this.isDrawingShape || !this.drawingObject) return;

            // Get current mouse position - startPoint stays fixed!
            const pointer = this.getPointer(opt);
            const tool = this.currentTool();
            const mathTool = this.activeMathTool();
            
            // Handle ruler update
            if (mathTool === 'ruler') {
                this.updateRuler(this.drawingObject, this.startPoint, pointer);
                this.drawingObject.setCoords();
                this.fabricCanvas.requestRenderAll();
                return;
            }
            
            // Update shape from fixed startPoint to current pointer position
            this.updateShape(this.drawingObject, tool, this.startPoint, pointer);
            this.drawingObject.setCoords();
            this.fabricCanvas.requestRenderAll();
        });

        this.fabricCanvas.on('mouse:up', (opt: any) => {
            if (!this.isDrawingShape) return;
            
            if (this.drawingObject) {
                const mathTool = this.activeMathTool();
                
                // Make shape/ruler selectable after drawing
                if (mathTool === 'ruler') {
                    // For ruler, make it selectable and evented
                    this.drawingObject.selectable = true;
                    this.drawingObject.evented = true;
                } else {
                    // For regular shapes
                    this.drawingObject.selectable = true;
                    this.drawingObject.evented = true;
                }
                this.drawingObject = null;
            }
            this.isDrawingShape = false;
        });
    }


    onCloseWhiteboard(): void {
    }
    onAddTab(tab: 'pen' | 'screen-sharing'): void {
    }

    /**
     * Get pointer coordinates from Fabric.js event
     * Uses absolutePointer for canvas coordinates (what shapes need)
     */
    private getPointer(opt: any): { x: number; y: number } {
        if (!this.fabricCanvas || !opt.e) {
            return { x: 0, y: 0 };
        }

        // Fabric.js v6: absolutePointer gives canvas coordinates (what we need for shapes)
        // This accounts for zoom, pan, and canvas transforms
        if (opt.absolutePointer) {
            return { x: opt.absolutePointer.x, y: opt.absolutePointer.y };
        }

        // Try to use canvas's getPointer method (works with npm package)
        try {
            const canvas = this.fabricCanvas as any;
            if (canvas.getPointer) {
                const pointer = canvas.getPointer(opt.e);
                if (pointer) {
                    return pointer;
                }
            }
        } catch (e) {
            // Continue to fallback
        }

        // Fallback: Use event object's pointer (viewport coordinates)
        if (opt.pointer) {
            return { x: opt.pointer.x, y: opt.pointer.y };
        }

        // Last resort: Calculate from mouse event and canvas bounds
        if (this.whiteboardCanvas?.nativeElement) {
            const canvasEl = this.whiteboardCanvas.nativeElement;
            const rect = canvasEl.getBoundingClientRect();
            const zoom = this.fabricCanvas.getZoom() || 1;
            const vpt = this.fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            
            // Calculate pointer accounting for zoom and pan
            const x = (opt.e.clientX - rect.left - vpt[4]) / zoom;
            const y = (opt.e.clientY - rect.top - vpt[5]) / zoom;
            
            return { x, y };
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Check if tool is a shape tool
     */
    private isShapeTool(tool: string): boolean {
        return ['rectangle', 'circle', 'oval', 'triangle', 'line', 'arrow'].includes(tool);
    }

    /**
     * Create ruler object
     */
    private createRuler(x: number, y: number): any {
        // Create a group that will contain the ruler line and measurement marks
        const rulerGroup = new Group([], {
            left: x,
            top: y,
            selectable: false,
            evented: false,
        });
        
        // Store initial position for updates
        (rulerGroup as any).rulerStartX = x;
        (rulerGroup as any).rulerStartY = y;
        
        return rulerGroup;
    }

    /**
     * Update ruler during mouse move
     */
    private updateRuler(rulerGroup: any, start: { x: number; y: number }, end: { x: number; y: number }): void {
        const x0 = start.x;
        const y0 = start.y;
        const x1 = end.x;
        const y1 = end.y;
        
        // Calculate distance and angle
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        if (length < 10) {
            // Too short, don't draw
            return;
        }
        
        // Remove old group from canvas
        this.fabricCanvas.remove(rulerGroup);
        
        // Create main ruler line
        const mainLine = new Line([0, 0, length, 0], {
            stroke: this.currentColor(),
            strokeWidth: 2,
            selectable: false,
            evented: false,
        });
        
        const objects: any[] = [mainLine];
        
        // Add measurement marks (every 20 pixels = 1 unit)
        const unitSize = 20; // pixels per unit
        const numUnits = Math.floor(length / unitSize);
        const markHeight = 8;
        
        // Add marks along the ruler
        for (let i = 0; i <= numUnits; i++) {
            const x = i * unitSize;
            const isMajorMark = i % 5 === 0; // Major mark every 5 units
            const markH = isMajorMark ? markHeight : markHeight / 2;
            
            // Top mark
            const topMark = new Line([x, -markH, x, 0], {
                stroke: this.currentColor(),
                strokeWidth: isMajorMark ? 2 : 1,
                selectable: false,
                evented: false,
            });
            objects.push(topMark);
            
            // Bottom mark
            const bottomMark = new Line([x, 0, x, markH], {
                stroke: this.currentColor(),
                strokeWidth: isMajorMark ? 2 : 1,
                selectable: false,
                evented: false,
            });
            objects.push(bottomMark);
            
            // Add number labels for major marks
            if (isMajorMark && i > 0) {
                const label = new IText(i.toString(), {
                    left: x,
                    top: -markH - 15,
                    fontSize: 12,
                    fill: this.currentColor(),
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    originX: 'center',
                    originY: 'bottom',
                    selectable: false,
                    evented: false,
                });
                objects.push(label);
            }
        }
        
        // Add length label at the end
        const lengthText = `${Math.round(length)}px`;
        const lengthLabel = new IText(lengthText, {
            left: length / 2,
            top: markHeight + 10,
            fontSize: 11,
            fill: this.currentColor(),
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'top',
            selectable: false,
            evented: false,
        });
        objects.push(lengthLabel);
        
        // Create new group with all objects
        const newRulerGroup = new Group(objects, {
            left: x0,
            top: y0,
            angle: angle,
            selectable: false,
            evented: false,
        });
        
        // Add new group to canvas
        this.fabricCanvas.add(newRulerGroup);
        
        // Update the drawing object reference
        this.drawingObject = newRulerGroup;
    }

    /**
     * Add text at specified position
     * Based on the working test component implementation
     */
    private addTextAt(x: number, y: number): void {
        if (!this.fabricCanvas) return;

        const text = new IText('Text', {
            left: x,
            top: y,
            fill: this.currentColor(),
            fontSize: 28,
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            editable: true,
        });

        this.fabricCanvas.add(text);
        this.fabricCanvas.setActiveObject(text);
        this.fabricCanvas.requestRenderAll();
        
        // Switch back to select tool after adding text
        this.selectTool('selectTool');
        
        // Start editing immediately
        setTimeout(() => {
            text.enterEditing();
        }, 0);
    }

    /**
     * Create initial shape object
     */
    private createShape(tool: string, x: number, y: number): any {
        switch (tool) {
            case 'rectangle':
                return this.makeRectangle(x, y);
            case 'circle':
                return this.makeCircle(x, y);
            case 'oval':
                return this.makeOval(x, y);
            case 'triangle':
                return this.makeTriangle(x, y);
            case 'line':
                return this.makeLine(x, y, x, y);
            case 'arrow':
                return this.makeArrow(x, y, x, y);
            default:
                return null;
        }
    }

    /**
     * Update shape during mouse move
     */
    private updateShape(obj: any, tool: string, start: { x: number; y: number }, end: { x: number; y: number }): void {
        const x0 = start.x;
        const y0 = start.y;
        const x1 = end.x;
        const y1 = end.y;

        switch (tool) {
            case 'rectangle':
                // x0, y0 is the fixed start point (mouse down position)
                // x1, y1 is the current mouse position
                // Calculate rectangle from top-left to bottom-right
                const left = Math.min(x0, x1);
                const top = Math.min(y0, y1);
                const width = Math.abs(x1 - x0);
                const height = Math.abs(y1 - y0);
                // Ensure minimum size
                obj.set({ 
                    left, 
                    top, 
                    width: Math.max(1, width), 
                    height: Math.max(1, height),
                    originX: 'left',
                    originY: 'top'
                });
                break;
            case 'circle':
                // Circle: center is midpoint between start and current, radius is half the distance
                const distance = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
                const radius = Math.max(1, distance / 2);
                const centerX = (x0 + x1) / 2;
                const centerY = (y0 + y1) / 2;
                obj.set({ 
                    left: centerX, 
                    top: centerY, 
                    originX: 'center', 
                    originY: 'center', 
                    radius: Math.max(1, radius)
                });
                break;
            case 'oval':
                // Oval: center is midpoint, radius grows from center
                const rx = Math.max(1, Math.abs(x1 - x0) / 2);
                const ry = Math.max(1, Math.abs(y1 - y0) / 2);
                const cx = (x0 + x1) / 2;
                const cy = (y0 + y1) / 2;
                obj.set({ 
                    left: cx, 
                    top: cy, 
                    originX: 'center', 
                    originY: 'center', 
                    rx: Math.max(1, rx), 
                    ry: Math.max(1, ry)
                });
                break;
            case 'triangle':
                // Triangle: from top-left corner, grows to bottom-right
                const triLeft = Math.min(x0, x1);
                const triTop = Math.min(y0, y1);
                const triWidth = Math.abs(x1 - x0);
                const triHeight = Math.abs(y1 - y0);
                obj.set({ 
                    left: triLeft, 
                    top: triTop, 
                    width: Math.max(1, triWidth), 
                    height: Math.max(1, triHeight),
                    originX: 'left',
                    originY: 'top'
                });
                break;
            case 'line':
                // Line: start point (x0, y0) stays fixed, end point (x2, y2) moves to current position (x1, y1)
                // Line is created with [x1, y1, x2, y2] where x1,y1 is start and x2,y2 is end
                obj.set({ x2: x1, y2: y1 });
                break;
            case 'arrow':
                // Arrow: start point (x0, y0) stays fixed, end point moves to current position (x1, y1)
                // Recreate arrow path with new endpoint - remove old and add new
                const dx = x1 - x0;
                const dy = y1 - y0;
                const angle = Math.atan2(dy, dx);
                const arrowLength = 20;
                const arrowX1 = x1 - arrowLength * Math.cos(angle - Math.PI / 6);
                const arrowY1 = y1 - arrowLength * Math.sin(angle - Math.PI / 6);
                const arrowX2 = x1 - arrowLength * Math.cos(angle + Math.PI / 6);
                const arrowY2 = y1 - arrowLength * Math.sin(angle + Math.PI / 6);
                const pathData = `M ${x0} ${y0} L ${x1} ${y1} M ${arrowX1} ${arrowY1} L ${x1} ${y1} L ${arrowX2} ${arrowY2}`;
                // Recreate the path object
                this.fabricCanvas.remove(obj);
                const newArrow = new Path(pathData, {
                    stroke: this.currentColor(),
                    strokeWidth: this.currentLineWidth(),
                    strokeDashArray: this.getStrokeDashArray(),
                    fill: '',
                    selectable: false,
                    evented: false,
                    strokeUniform: true,
                });
                this.fabricCanvas.add(newArrow);
                this.drawingObject = newArrow;
                break;
        }
    }

    /**
     * Create rectangle shape
     * Initial rectangle starts at the mouse down point with minimal size
     */
    private makeRectangle(x: number, y: number): any {
        return new Rect({
            left: x,
            top: y,
            width: 1,
            height: 1,
            originX: 'left',
            originY: 'top',
            fill: this.fillShapes() ? this.currentColor() : 'transparent',
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    /**
     * Create circle shape
     * Circle starts at mouse down point (center), radius grows from center
     */
    private makeCircle(x: number, y: number): any {
        return new Circle({
            left: x,
            top: y,
            radius: 1,
            originX: 'center',
            originY: 'center',
            fill: this.fillShapes() ? this.currentColor() : 'transparent',
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    /**
     * Create oval/ellipse shape
     * Oval starts at mouse down point, center will be calculated during update
     */
    private makeOval(x: number, y: number): any {
        return new Ellipse({
            left: x,
            top: y,
            rx: 1,
            ry: 1,
            originX: 'center',
            originY: 'center',
            fill: this.fillShapes() ? this.currentColor() : 'transparent',
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    /**
     * Create triangle shape
     * Triangle starts at mouse down point, grows from top-left corner
     */
    private makeTriangle(x: number, y: number): any {
        return new Triangle({
            left: x,
            top: y,
            width: 1,
            height: 1,
            originX: 'left',
            originY: 'top',
            fill: this.fillShapes() ? this.currentColor() : 'transparent',
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    /**
     * Create line shape
     */
    private makeLine(x1: number, y1: number, x2: number, y2: number): any {
        return new Line([x1, y1, x2, y2], {
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    /**
     * Create arrow shape (line with arrowhead)
     */
    private makeArrow(x1: number, y1: number, x2: number, y2: number): any {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 20;
        const arrowWidth = 10;

        // Calculate arrowhead points
        const arrowX1 = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = y2 - arrowLength * Math.sin(angle + Math.PI / 6);

        // Create path for arrow (line + arrowhead)
        const pathData = `M ${x1} ${y1} L ${x2} ${y2} M ${arrowX1} ${arrowY1} L ${x2} ${y2} L ${arrowX2} ${arrowY2}`;
        
        return new Path(pathData, {
            stroke: this.currentColor(),
            strokeWidth: this.currentLineWidth(),
            strokeDashArray: this.getStrokeDashArray(),
            fill: '',
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    onTemplateSelect(templateId: string): void {
    }
    onStampSelect(stampId: string): void {
    }
    onStickyNoteSelect(stickyNoteId: string): void {
    }
    onMathToolActivate(tool: 'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator'): void {
        if (tool === 'ruler') {
            this.activeMathTool.set('ruler');
            // Switch to a special tool mode for ruler
            this.currentTool.set('ruler');
            this.applyToolToCanvas();
        } else {
            // For other tools, just store the active tool
            this.activeMathTool.set(tool);
            // TODO: Implement other math tools
        }
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
        this.updateSelectedObjectsStyle();
    }

    onLineStyleChange(style: string): void {
        this.lineStyle.set(style);
        this.updateSelectedObjectsStyle();
    }

    /**
     * Update style of selected objects when style options change
     */
    private updateSelectedObjectsStyle(): void {
        if (!this.fabricCanvas) return;
        const activeObject = this.fabricCanvas.getActiveObject();
        if (!activeObject) return;

        const style = this.getStrokeDashArray();
        const fill = this.fillShapes() ? this.currentColor() : 'transparent';

        // Handle multiple selected objects (activeSelection)
        if (activeObject.type === 'activeSelection') {
            const objects = (activeObject as any).getObjects();
            objects.forEach((obj: any) => {
                if (this.isShapeObject(obj)) {
                    obj.set({
                        strokeDashArray: style,
                        fill: obj.type === 'line' || obj.type === 'path' ? '' : fill
                    });
                }
            });
        } else {
            // Handle single object
            if (this.isShapeObject(activeObject)) {
                (activeObject as any).set({
                    strokeDashArray: style,
                    fill: activeObject.type === 'line' || activeObject.type === 'path' ? '' : fill
                });
            }
        }

        this.fabricCanvas.requestRenderAll();
    }

    /**
     * Check if object is a shape that supports styling
     */
    private isShapeObject(obj: any): boolean {
        const shapeTypes = ['rect', 'circle', 'ellipse', 'triangle', 'line', 'path', 'polygon', 'polyline'];
        return shapeTypes.includes(obj.type);
    }

    /**
     * Get stroke dash array based on line style
     */
    private getStrokeDashArray(): number[] | undefined {
        const style = this.lineStyle();
        if (style === 'dashed') {
            return [10, 5];
        } else if (style === 'dotted') {
            return [2, 2];
        }
        return undefined; // solid line
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
        if (!this.fabricCanvas) return;
        
        // In Fabric.js v6, set backgroundColor directly as a property
        (this.fabricCanvas as any).backgroundColor = color;
        
        // Force a render to update the background immediately
        this.fabricCanvas.requestRenderAll();
        
        // Update the container background to match
        // The container has Tailwind gradient classes that we need to override
        if (this.canvasContainer?.nativeElement) {
            const container = this.canvasContainer.nativeElement;
            // Remove Tailwind gradient classes
            container.classList.remove('bg-gradient-to-br', 'from-gray-100', 'to-gray-200');
            // Set inline style (inline styles have higher specificity than classes)
            container.style.background = color;
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

        // For shape tools and ruler, disable selection to prevent interference
        if (this.isShapeTool(tool) || tool === 'ruler') {
            this.fabricCanvas.selection = false;
        }

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
            eraser.color = '#ffffff'; // White color for eraser
            // Note: globalCompositeOperation will be set on path creation
            this.fabricCanvas.freeDrawingBrush = eraser;
        }
        // Shape tools (rectangle, circle, oval, triangle, line, arrow) are handled via mouse events
        // No special configuration needed - they use isDrawingMode = false
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


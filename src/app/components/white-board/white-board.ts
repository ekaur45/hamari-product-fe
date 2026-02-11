import { Component, AfterViewInit, ElementRef, EventEmitter, OnDestroy, Output, signal, ViewChild, input, inject, NgZone, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { Canvas, PencilBrush, Rect, Circle, Ellipse, Line, Triangle, Path, IText, Group, util, Image } from 'fabric';
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
import { WhiteboardZoomControls } from "./toolbar/whiteboard-zoom-controls";
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
        FormsModule,
        DialogModule,
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
        WhiteboardActionButtons,
        WhiteboardZoomControls
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
    private zoomUpdateTimeout: any = null;
    whiteboardOpen = signal<boolean>(true);
    activeMathTool = signal<'ruler' | 'protractor' | 'equation' | 'graph' | 'calculator' | null>(null);
    
    // Equation editor state
    showEquationDialog = signal<boolean>(false);
    equationLatex = signal<string>('\\frac{a}{b}');
    equationSize = signal<number>(36);
    equationError = signal<string>('');
    equationPosition = signal<{ x: number; y: number } | null>(null);
    editingEquation = signal<any>(null); // The equation object being edited
    
    // Graph function plotting state
    showGraphFunctionDialog = signal<boolean>(false);
    graphFunction = signal<string>('x');
    graphFunctionError = signal<string>('');
    selectedGraph = signal<any>(null); // The graph object to plot on
    
    // Calculator state
    showCalculatorDialog = signal<boolean>(false);
    calculatorDisplay = signal<string>('0');
    calculatorMode = signal<'basic' | 'scientific' | 'conversion'>('basic');
    calculatorMemory = signal<number>(0);
    calculatorHistory = signal<string[]>([]);
    conversionFrom = signal<string>('meter');
    conversionTo = signal<string>('kilometer');
    conversionValue = signal<string>('1');
    conversionResult = signal<string>('');

    // Fabric.js and MathJax instances
    private fabricCanvas: any = null;
    private gridContext: CanvasRenderingContext2D | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private mathJaxReadyPromise: Promise<void> | null = null;

    // Shape drawing state
    private isDrawingShape = false;
    private drawingObject: any = null;
    private startPoint: { x: number; y: number } = { x: 0, y: 0 };
    private graphClickStartPoint: { x: number; y: number } | null = null;
    private graphClickTarget: any = null;
    private graphInitialState: { left: number; top: number; scaleX: number; scaleY: number; angle: number } | null = null;

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
        
        // Initialize zoom level
        if (this.zoomLevel() !== 1) {
            this.setCanvasZoom(this.zoomLevel());
        } else {
            // Set initial zoom to 1 via viewport transform
            this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            this.updateCanvasScrollability(1);
        }
        
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
        this.fabricCanvas.on('selection:created', (e: any) => {
            // Prevent function paths from being selected
            const activeObject = this.fabricCanvas.getActiveObject();
            if (activeObject && (activeObject as any).isGraphFunction) {
                this.fabricCanvas.discardActiveObject();
                this.fabricCanvas.requestRenderAll();
                return;
            }
            
            this.ngZone.run(() => {
                this.hasSelection.set(true);
            });
        });
        
        // Prevent function paths from being moved
        this.fabricCanvas.on('object:modified', (e: any) => {
            const obj = e.target;
            if (obj && (obj as any).isGraphFunction) {
                // If a function path was somehow moved, reset it to its graph position
                const parentGraph = (obj as any).parentGraph;
                if (parentGraph) {
                    obj.set({
                        left: parentGraph.left,
                        top: parentGraph.top,
                        angle: parentGraph.angle || 0,
                        scaleX: parentGraph.scaleX || 1,
                        scaleY: parentGraph.scaleY || 1,
                        selectable: false,
                        evented: false,
                    });
                    obj.setCoords();
                    this.fabricCanvas.requestRenderAll();
                }
            }
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

        // Object modification events (function path protection handled above at line 309)
        this.fabricCanvas.on('object:modified', (e: any) => {
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

            // Handle sticky note tool
            if (tool === 'stickyNote') {
                const target = opt.target;
                // If clicking on existing sticky note, allow selection/editing
                if (target && target !== this.fabricCanvas) {
                    // Check if it's a sticky note group
                    if ((target as any).isStickyNote) {
                        // Allow normal selection/editing - text will be editable on click
                        const text = (target as any).text;
                        if (text) {
                            setTimeout(() => {
                                if (!text.isEditing) {
                                    text.enterEditing();
                                }
                            }, 200);
                        }
                        return;
                    }
                    // Check if it's inside a sticky note group (text or rect)
                    const parent = (target as any).group;
                    if (parent && parent.isStickyNote) {
                        // If clicking on text, allow editing immediately
                        if (target === parent.text) {
                            setTimeout(() => {
                                if (!target.isEditing) {
                                    target.enterEditing();
                                }
                            }, 100);
                        } else if (target === parent.rect) {
                            // Clicking on rect background - edit text
                            setTimeout(() => {
                                const text = parent.text;
                                if (text && !text.isEditing) {
                                    text.enterEditing();
                                }
                            }, 150);
                        }
                        return;
                    }
                }
                
                // Create new sticky note at click position
                const pointer = this.getPointer(opt);
                this.createStickyNote(pointer.x, pointer.y);
                return;
            }

            // Handle ruler tool - only if not clicking on an existing object
            if (mathTool === 'ruler') {
                // Check if user clicked on an existing object (don't create new ruler if moving existing one)
                const target = opt.target;
                if (target && target !== this.fabricCanvas) {
                    // User clicked on an existing object, let it be handled normally
                    return;
                }
                
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

            // Handle protractor tool - only if not clicking on an existing object
            if (mathTool === 'protractor') {
                // Check if user clicked on an existing object (don't create new protractor if moving existing one)
                const target = opt.target;
                if (target && target !== this.fabricCanvas) {
                    // User clicked on an existing object, let it be handled normally
                    return;
                }
                
                const pointer = this.getPointer(opt);
                this.isDrawingShape = true;
                this.startPoint = { x: pointer.x, y: pointer.y };
                this.drawingObject = this.createProtractor(pointer.x, pointer.y);
                if (this.drawingObject) {
                    this.fabricCanvas.add(this.drawingObject);
                    this.fabricCanvas.requestRenderAll();
                }
                return;
            }

            // Handle equation tool - show dialog to enter equation
            if (mathTool === 'equation') {
                const target = opt.target;
                // If clicking on existing equation, edit it
                if (target && target !== this.fabricCanvas && (target as any).isEquation) {
                    this.editEquation(target);
                    return;
                }
                
                // Otherwise, create new equation at click position
                const pointer = this.getPointer(opt);
                this.openEquationDialog(pointer.x, pointer.y);
                return;
            }

            // Handle graph tool - create coordinate plane or plot function
            if (mathTool === 'graph') {
                const target = opt.target;
                
                // If clicking on existing graph, track the click to detect if it's a simple click or drag
                if (target && target !== this.fabricCanvas && (target as any).isGraph) {
                    const pointer = this.getPointer(opt);
                    this.graphClickStartPoint = { x: pointer.x, y: pointer.y };
                    this.graphClickTarget = target;
                    // Store initial state to detect if graph was moved/resized
                    this.graphInitialState = {
                        left: target.left,
                        top: target.top,
                        scaleX: target.scaleX || 1,
                        scaleY: target.scaleY || 1,
                        angle: target.angle || 0
                    };
                    // Don't open dialog yet - wait to see if user drags
                    // Let Fabric.js handle the selection/movement normally
                    return;
                }
                
                // Otherwise, create new coordinate plane
                if (target && target !== this.fabricCanvas) {
                    // User clicked on other object, let it be handled normally
                    return;
                }
                
                const pointer = this.getPointer(opt);
                this.isDrawingShape = true;
                this.startPoint = { x: pointer.x, y: pointer.y };
                this.drawingObject = this.createGraph(pointer.x, pointer.y);
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

            // Handle protractor update
            if (mathTool === 'protractor') {
                this.updateProtractor(this.drawingObject, this.startPoint, pointer);
                this.drawingObject.setCoords();
                this.fabricCanvas.requestRenderAll();
                return;
            }

            // Handle graph update
            if (mathTool === 'graph') {
                this.updateGraph(this.drawingObject, this.startPoint, pointer);
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
            // Handle graph click for function dialog (check before isDrawingShape)
            if (this.graphClickStartPoint && this.graphClickTarget && this.graphInitialState) {
                const mathTool = this.activeMathTool();
                if (mathTool === 'graph') {
                    const pointer = this.getPointer(opt);
                    const distance = Math.sqrt(
                        Math.pow(pointer.x - this.graphClickStartPoint.x, 2) + 
                        Math.pow(pointer.y - this.graphClickStartPoint.y, 2)
                    );
                    // Only open dialog if it was a simple click (moved less than 5 pixels)
                    // and the graph wasn't modified (moved/resized)
                    const target = opt.target;
                    if (distance < 5 && target && (target as any).isGraph && target === this.graphClickTarget) {
                        // Check if graph was actually moved/resized
                        const wasModified = 
                            Math.abs(target.left - this.graphInitialState.left) > 1 ||
                            Math.abs(target.top - this.graphInitialState.top) > 1 ||
                            Math.abs((target.scaleX || 1) - this.graphInitialState.scaleX) > 0.01 ||
                            Math.abs((target.scaleY || 1) - this.graphInitialState.scaleY) > 0.01 ||
                            Math.abs((target.angle || 0) - this.graphInitialState.angle) > 0.01;
                        
                        // Only open dialog if graph wasn't moved/resized
                        if (!wasModified) {
                            this.selectedGraph.set(target);
                            this.openGraphFunctionDialog();
                        }
                    }
                }
                this.graphClickStartPoint = null;
                this.graphClickTarget = null;
                this.graphInitialState = null;
            }
            
            if (!this.isDrawingShape) return;
            
            if (this.drawingObject) {
                const mathTool = this.activeMathTool();
                
                // Make shape/ruler/protractor/graph selectable after drawing
                if (mathTool === 'ruler' || mathTool === 'protractor' || mathTool === 'graph') {
                    // For math tools, make it selectable and evented
                    this.drawingObject.selectable = true;
                    this.drawingObject.evented = true;
                    // For graph, also enable moving
                    if (mathTool === 'graph') {
                        this.drawingObject.moveCursor = 'move';
                    }
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
        this.onExitWhiteboard.emit();
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
            const vpt = this.fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = vpt[0] || 1;
            
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
        
        // Create main ruler line - line goes from (0,0) to (length, 0) in group coordinates
        // The group will be positioned at (x0, y0) and rotated by angle
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
        // Set origin to top-left so rotation happens around the start point
        const newRulerGroup = new Group(objects, {
            left: x0,
            top: y0,
            angle: angle,
            originX: 'left',
            originY: 'top',
            selectable: false,
            evented: false,
        });
        
        // Add new group to canvas
        this.fabricCanvas.add(newRulerGroup);
        
        // Update the drawing object reference
        this.drawingObject = newRulerGroup;
    }

    /**
     * Create protractor object
     */
    private createProtractor(x: number, y: number): any {
        // Create a group that will contain the protractor semicircle and angle markings
        const protractorGroup = new Group([], {
            left: x,
            top: y,
            selectable: false,
            evented: false,
        });
        
        // Store initial position for updates
        (protractorGroup as any).protractorStartX = x;
        (protractorGroup as any).protractorStartY = y;
        
        return protractorGroup;
    }

    /**
     * Update protractor during mouse move
     */
    private updateProtractor(protractorGroup: any, start: { x: number; y: number }, end: { x: number; y: number }): void {
        const x0 = start.x;
        const y0 = start.y;
        const x1 = end.x;
        const y1 = end.y;
        
        // Calculate distance (radius) and angle
        const dx = x1 - x0;
        const dy = y1 - y0;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        if (radius < 30) {
            // Too small, don't draw
            return;
        }
        
        // Remove old group from canvas
        this.fabricCanvas.remove(protractorGroup);
        
        const objects: any[] = [];
        
        // Create semicircle arc (180 degrees)
        // Protractor is a semicircle from 0° to 180°
        // We'll draw it as a path
        const semicirclePath = this.createSemicirclePath(radius);
        const semicircle = new Path(semicirclePath, {
            stroke: this.currentColor(),
            strokeWidth: 2,
            fill: 'transparent',
            selectable: false,
            evented: false,
        });
        objects.push(semicircle);
        
        // Add angle markings every 10 degrees
        const markLength = 8;
        const majorMarkLength = 12;
        const labelRadius = radius + 20;
        
        for (let angle = 0; angle <= 180; angle += 10) {
            const isMajorMark = angle % 30 === 0 || angle === 45 || angle === 135;
            const markLen = isMajorMark ? majorMarkLength : markLength;
            const rad = (angle * Math.PI) / 180;
            
            // Calculate mark endpoints
            const x1 = radius * Math.cos(rad);
            const y1 = -radius * Math.sin(rad); // Negative because canvas Y increases downward
            const x2 = (radius - markLen) * Math.cos(rad);
            const y2 = -(radius - markLen) * Math.sin(rad);
            
            const mark = new Line([x1, y1, x2, y2], {
                stroke: this.currentColor(),
                strokeWidth: isMajorMark ? 2 : 1,
                selectable: false,
                evented: false,
            });
            objects.push(mark);
            
            // Add angle labels for major marks
            if (isMajorMark) {
                const labelX = labelRadius * Math.cos(rad);
                const labelY = -labelRadius * Math.sin(rad);
                const label = new IText(`${angle}°`, {
                    left: labelX,
                    top: labelY,
                    fontSize: 11,
                    fill: this.currentColor(),
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                });
                objects.push(label);
            }
        }
        
        // Add center point indicator
        const centerCircle = new Circle({
            left: 0,
            top: 0,
            radius: 3,
            fill: this.currentColor(),
            stroke: this.currentColor(),
            strokeWidth: 1,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
        });
        objects.push(centerCircle);
        
        // Create new group with all objects
        const newProtractorGroup = new Group(objects, {
            left: x0,
            top: y0,
            angle: baseAngle,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
        });
        
        // Add new group to canvas
        this.fabricCanvas.add(newProtractorGroup);
        
        // Update the drawing object reference
        this.drawingObject = newProtractorGroup;
    }

    /**
     * Create SVG path for semicircle (180 degrees)
     */
    private createSemicirclePath(radius: number): string {
        // Create semicircle from 0° to 180° (left to right, top arc)
        // Using SVG arc path: M (move to start), A (arc to end)
        // Start at left point (-radius, 0), arc to right point (radius, 0)
        // Arc parameters: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
        // For semicircle: large-arc-flag=0 (180° is exactly half), sweep-flag=1 (clockwise from top)
        const startX = -radius;
        const startY = 0;
        const endX = radius;
        const endY = 0;
        
        return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
    }

    /**
     * Create graph/coordinate plane object
     */
    private createGraph(x: number, y: number): any {
        // Create a group that will contain the graph axes and grid
        const graphGroup = new Group([], {
            left: x,
            top: y,
            selectable: false,
            evented: false,
        });
        
        // Store initial position for updates
        (graphGroup as any).graphStartX = x;
        (graphGroup as any).graphStartY = y;
        
        return graphGroup;
    }

    /**
     * Update graph during mouse move
     */
    private updateGraph(graphGroup: any, start: { x: number; y: number }, end: { x: number; y: number }): void {
        const x0 = start.x;
        const y0 = start.y;
        const x1 = end.x;
        const y1 = end.y;
        
        // Calculate width and height
        const width = Math.abs(x1 - x0);
        const height = Math.abs(y1 - y0);
        
        if (width < 100 || height < 100) {
            // Too small, don't draw
            return;
        }
        
        // Remove old group from canvas
        this.fabricCanvas.remove(graphGroup);
        
        const objects: any[] = [];
        
        // Calculate center and bounds
        const centerX = (x0 + x1) / 2;
        const centerY = (y0 + y1) / 2;
        const left = Math.min(x0, x1);
        const top = Math.min(y0, y1);
        const right = Math.max(x0, x1);
        const bottom = Math.max(y0, y1);
        
        // Grid spacing (every 20 pixels)
        const gridSpacing = 20;
        
        // Draw grid lines (light gray)
        const gridColor = '#e5e7eb';
        
        // Vertical grid lines
        for (let x = left; x <= right; x += gridSpacing) {
            const gridLine = new Line([x - centerX, top - centerY, x - centerX, bottom - centerY], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false,
            });
            objects.push(gridLine);
        }
        
        // Horizontal grid lines
        for (let y = top; y <= bottom; y += gridSpacing) {
            const gridLine = new Line([left - centerX, y - centerY, right - centerX, y - centerY], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false,
            });
            objects.push(gridLine);
        }
        
        // Draw X-axis (horizontal line through center)
        const xAxis = new Line([left - centerX, 0, right - centerX, 0], {
            stroke: this.currentColor(),
            strokeWidth: 2,
            selectable: false,
            evented: false,
        });
        objects.push(xAxis);
        
        // Draw Y-axis (vertical line through center)
        const yAxis = new Line([0, top - centerY, 0, bottom - centerY], {
            stroke: this.currentColor(),
            strokeWidth: 2,
            selectable: false,
            evented: false,
        });
        objects.push(yAxis);
        
        // Draw arrow on X-axis (right side)
        const arrowSize = 8;
        const xArrow = new Path(`M ${right - centerX - arrowSize} ${-arrowSize} L ${right - centerX} 0 L ${right - centerX - arrowSize} ${arrowSize}`, {
            stroke: this.currentColor(),
            strokeWidth: 2,
            fill: this.currentColor(),
            selectable: false,
            evented: false,
        });
        objects.push(xArrow);
        
        // Draw arrow on Y-axis (top side)
        const yArrow = new Path(`M ${-arrowSize} ${top - centerY + arrowSize} L 0 ${top - centerY} L ${arrowSize} ${top - centerY + arrowSize}`, {
            stroke: this.currentColor(),
            strokeWidth: 2,
            fill: this.currentColor(),
            selectable: false,
            evented: false,
        });
        objects.push(yArrow);
        
        // Add axis labels
        // X-axis labels (numbers along X-axis)
        const xLabelSpacing = gridSpacing * 2; // Label every 2 grid units
        for (let i = Math.floor((left - centerX) / xLabelSpacing) * xLabelSpacing; i <= right - centerX; i += xLabelSpacing) {
            if (Math.abs(i) < 5) continue; // Skip origin
            const label = new IText((i / gridSpacing).toString(), {
                left: i,
                top: 5,
                fontSize: 10,
                fill: this.currentColor(),
                fontFamily: 'Arial, sans-serif',
                textAlign: 'center',
                originX: 'center',
                originY: 'top',
                selectable: false,
                evented: false,
            });
            objects.push(label);
        }
        
        // Y-axis labels (numbers along Y-axis)
        const yLabelSpacing = gridSpacing * 2;
        for (let i = Math.floor((top - centerY) / yLabelSpacing) * yLabelSpacing; i <= bottom - centerY; i += yLabelSpacing) {
            if (Math.abs(i) < 5) continue; // Skip origin
            const label = new IText((-i / gridSpacing).toString(), { // Negative because Y increases downward
                left: -5,
                top: i,
                fontSize: 10,
                fill: this.currentColor(),
                fontFamily: 'Arial, sans-serif',
                textAlign: 'right',
                originX: 'right',
                originY: 'center',
                selectable: false,
                evented: false,
            });
            objects.push(label);
        }
        
        // Add origin label (0,0)
        const originLabel = new IText('0', {
            left: -5,
            top: 5,
            fontSize: 10,
            fill: this.currentColor(),
            fontFamily: 'Arial, sans-serif',
            textAlign: 'right',
            originX: 'right',
            originY: 'top',
            selectable: false,
            evented: false,
        });
        objects.push(originLabel);
        
        // Add axis labels (X and Y)
        const xAxisLabel = new IText('X', {
            left: right - centerX - 15,
            top: -20,
            fontSize: 12,
            fill: this.currentColor(),
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            selectable: false,
            evented: false,
        });
        objects.push(xAxisLabel);
        
        const yAxisLabel = new IText('Y', {
            left: -20,
            top: top - centerY + 15,
            fontSize: 12,
            fill: this.currentColor(),
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            selectable: false,
            evented: false,
        });
        objects.push(yAxisLabel);
        
        // Create new group with all objects
        const newGraphGroup = new Group(objects, {
            left: centerX,
            top: centerY,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
        });
        
        // Mark as graph and store properties
        (newGraphGroup as any).isGraph = true;
        (newGraphGroup as any).graphCenterX = centerX;
        (newGraphGroup as any).graphCenterY = centerY;
        (newGraphGroup as any).graphWidth = width;
        (newGraphGroup as any).graphHeight = height;
        (newGraphGroup as any).gridSpacing = gridSpacing;
        (newGraphGroup as any).functionPaths = []; // Store function paths associated with this graph
        
        // Add new group to canvas
        this.fabricCanvas.add(newGraphGroup);
        
        // Listen for graph movement to update function paths
        const updateGraphFunctions = () => {
            // Update graph center position
            (newGraphGroup as any).graphCenterX = newGraphGroup.left;
            (newGraphGroup as any).graphCenterY = newGraphGroup.top;
            this.updateGraphFunctionPaths(newGraphGroup);
        };
        
        newGraphGroup.on('modified', updateGraphFunctions);
        newGraphGroup.on('moving', updateGraphFunctions);
        newGraphGroup.on('scaling', updateGraphFunctions);
        newGraphGroup.on('rotating', updateGraphFunctions);
        
        // Update the drawing object reference
        this.drawingObject = newGraphGroup;
    }

    /**
     * Update function paths when graph is moved
     */
    private updateGraphFunctionPaths(graph: any): void {
        if (!graph || !graph.isGraph || !graph.functionPaths) return;
        
        const centerX = graph.left;
        const centerY = graph.top;
        const angle = graph.angle || 0;
        const scaleX = graph.scaleX || 1;
        const scaleY = graph.scaleY || 1;
        
        // Update position, rotation, and scale of all function paths to match graph
        graph.functionPaths.forEach((funcPath: any) => {
            if (funcPath && this.fabricCanvas.getObjects().includes(funcPath)) {
                // Ensure function paths are not selectable
                funcPath.set({
                    left: centerX,
                    top: centerY,
                    angle: angle,
                    scaleX: scaleX,
                    scaleY: scaleY,
                    selectable: false,
                    evented: false,
                });
                funcPath.setCoords();
            }
        });
        
        this.fabricCanvas.requestRenderAll();
    }

    /**
     * Open graph function plotting dialog
     */
    private openGraphFunctionDialog(): void {
        this.graphFunction.set('x');
        this.graphFunctionError.set('');
        this.showGraphFunctionDialog.set(true);
    }

    /**
     * Convert LaTeX math expression to JavaScript function string
     */
    private latexToJavaScriptFunction(latex: string): string {
        let js = latex.trim();
        
        // Remove common LaTeX wrappers
        js = js.replace(/^\$|\$$/g, ''); // Remove $ delimiters
        js = js.replace(/^\\begin\{equation\}|\\end\{equation\}$/g, ''); // Remove equation environment
        
        // Replace common LaTeX functions with JavaScript equivalents
        js = js.replace(/\\sin\(/g, 'Math.sin(');
        js = js.replace(/\\cos\(/g, 'Math.cos(');
        js = js.replace(/\\tan\(/g, 'Math.tan(');
        js = js.replace(/\\ln\(/g, 'Math.log(');
        js = js.replace(/\\log\(/g, 'Math.log10(');
        js = js.replace(/\\sqrt\{([^}]+)\}/g, 'Math.sqrt($1)'); // \sqrt{x} -> Math.sqrt(x)
        js = js.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, 'Math.pow($2, 1/$1)'); // \sqrt[n]{x} -> Math.pow(x, 1/n)
        js = js.replace(/\\abs\{([^}]+)\}/g, 'Math.abs($1)'); // \abs{x} -> Math.abs(x)
        js = js.replace(/\\abs\(([^)]+)\)/g, 'Math.abs($1)'); // \abs(x) -> Math.abs(x)
        js = js.replace(/\|([^|]+)\|/g, 'Math.abs($1)'); // |x| -> Math.abs(x)
        
        // Handle exponents: x^2 -> Math.pow(x, 2) or x**2
        // More complex: handle x^{2}, x^2, etc.
        js = js.replace(/([a-zA-Z0-9_]+)\^\{([^}]+)\}/g, 'Math.pow($1, $2)'); // x^{2} -> Math.pow(x, 2)
        js = js.replace(/([a-zA-Z0-9_]+)\^([0-9.]+)/g, 'Math.pow($1, $2)'); // x^2 -> Math.pow(x, 2)
        js = js.replace(/e\^\{([^}]+)\}/g, 'Math.exp($1)'); // e^{x} -> Math.exp(x)
        js = js.replace(/e\^([a-zA-Z0-9_]+)/g, 'Math.exp($1)'); // e^x -> Math.exp(x)
        
        // Handle fractions: \frac{a}{b} -> (a)/(b)
        js = js.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
        
        // Handle multiplication: 2x -> 2*x, xy -> x*y (but be careful with functions)
        js = js.replace(/(\d+)([a-zA-Z])/g, '$1*$2'); // 2x -> 2*x
        js = js.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2'); // xy -> x*y (but this might break some cases)
        
        // Handle pi and e constants
        js = js.replace(/\\pi/g, 'Math.PI');
        js = js.replace(/\\e\b/g, 'Math.E');
        js = js.replace(/\bpi\b/g, 'Math.PI');
        js = js.replace(/\be\b(?!\w)/g, 'Math.E'); // e not followed by word char
        
        return js;
    }

    /**
     * Close graph function dialog
     */
    onCloseGraphFunctionDialog(): void {
        this.showGraphFunctionDialog.set(false);
        this.selectedGraph.set(null);
    }

    /**
     * Plot function on graph
     */
    onPlotFunction(): void {
        const latexStr = this.graphFunction().trim();
        if (!latexStr) {
            this.graphFunctionError.set('Please enter a function');
            return;
        }

        const graph = this.selectedGraph();
        if (!graph || !(graph as any).isGraph) {
            this.graphFunctionError.set('No graph selected');
            return;
        }

        try {
            this.graphFunctionError.set('');
            
            // Convert LaTeX to JavaScript function
            const functionStr = this.latexToJavaScriptFunction(latexStr);
            
            // Get graph properties
            const centerX = (graph as any).graphCenterX || graph.left;
            const centerY = (graph as any).graphCenterY || graph.top;
            const width = (graph as any).graphWidth || 400;
            const height = (graph as any).graphHeight || 400;
            const gridSpacing = (graph as any).gridSpacing || 20;
            
            // Calculate bounds in graph coordinates (relative to graph center)
            const leftBound = -width / 2;
            const rightBound = width / 2;
            const topBound = -height / 2;
            const bottomBound = height / 2;
            
            // Create function to evaluate the expression
            const evaluateFunction = (x: number): number => {
                try {
                    // Convert pixel x to graph coordinate
                    const graphX = x / gridSpacing;
                    // Replace x in the function string and evaluate
                    // Handle both x and X, and ensure proper replacement (not in function names)
                    let expr = functionStr;
                    // Replace x variable (but not in function names like Math.exp)
                    expr = expr.replace(/\bx\b/g, `(${graphX})`);
                    // Use Function constructor for safe evaluation
                    // Note: This is a simple implementation. For production, use a proper math parser
                    const func = new Function('Math', `return ${expr}`);
                    const result = func(Math);
                    return -result * gridSpacing; // Negative because Y increases downward in canvas
                } catch (e) {
                    throw new Error(`Error evaluating function: ${e}`);
                }
            };
            
            // Generate points for the function
            const points: { x: number; y: number }[] = [];
            const step = 2; // Step size in pixels
            let lastY: number | null = null;
            
            for (let x = leftBound; x <= rightBound; x += step) {
                try {
                    const y = evaluateFunction(x);
                    // Check if point is within bounds
                    if (y >= topBound && y <= bottomBound) {
                        // Skip if there's a large jump (discontinuity)
                        if (lastY !== null && Math.abs(y - lastY) > height) {
                            continue;
                        }
                        points.push({ x, y });
                        lastY = y;
                    } else {
                        lastY = null; // Reset on out of bounds
                    }
                } catch (e) {
                    // Skip points that cause errors
                    lastY = null;
                }
            }
            
            if (points.length < 2) {
                this.graphFunctionError.set('Function did not produce enough points. Try examples like: x, 2x, x^2, \\sin(x), \\cos(x), e^x');
                return;
            }
            
            // Create path from points (coordinates are relative to graph center)
            let pathData = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                pathData += ` L ${points[i].x} ${points[i].y}`;
            }
            
            const functionPath = new Path(pathData, {
                left: centerX,
                top: centerY,
                originX: 'center',
                originY: 'center',
                stroke: this.currentColor(),
                strokeWidth: this.currentLineWidth(),
                fill: '',
                selectable: false, // Function paths should not be independently movable
                evented: false, // Function paths should not be independently movable
                strokeUniform: true,
            });
            
            // Store function metadata
            (functionPath as any).isGraphFunction = true;
            (functionPath as any).functionExpression = functionStr;
            (functionPath as any).parentGraph = graph;
            
            // Add function path to graph's functionPaths array
            if (!graph.functionPaths) {
                graph.functionPaths = [];
            }
            graph.functionPaths.push(functionPath);
            
            // Listen for graph movement to update this function path
            const updateFunction = () => {
                if (functionPath && graph && this.fabricCanvas.getObjects().includes(functionPath)) {
                    functionPath.set({
                        left: graph.left,
                        top: graph.top,
                    });
                    functionPath.setCoords();
                    this.fabricCanvas.requestRenderAll();
                }
            };
            
            // Update function path when graph moves
            graph.on('modified', updateFunction);
            graph.on('moving', updateFunction);
            
            // Add function path to canvas (positioned relative to graph center)
            this.fabricCanvas.add(functionPath);
            this.fabricCanvas.requestRenderAll();
            this.onCloseGraphFunctionDialog();
        } catch (error) {
            this.graphFunctionError.set(error instanceof Error ? error.message : String(error));
        }
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
        } else if (tool === 'protractor') {
            this.activeMathTool.set('protractor');
            // Switch to a special tool mode for protractor
            this.currentTool.set('protractor');
            this.applyToolToCanvas();
        } else if (tool === 'equation') {
            this.activeMathTool.set('equation');
            // Switch to a special tool mode for equation
            this.currentTool.set('equation');
            this.applyToolToCanvas();
        } else if (tool === 'graph') {
            this.activeMathTool.set('graph');
            // Switch to a special tool mode for graph
            this.currentTool.set('graph');
            this.applyToolToCanvas();
        } else if (tool === 'calculator') {
            this.activeMathTool.set('calculator');
            // Open calculator dialog
            this.currentTool.set('select');
            this.showCalculatorDialog.set(true);
            this.calculatorDisplay.set('0');
            this.calculatorMode.set('basic');
            this.applyToolToCanvas();
        } else {
            // For other tools, just store the active tool
            this.activeMathTool.set(tool);
            // Clear regular tool when math tool is activated
            // Set to select tool as default when math tool is active but not drawing
            this.currentTool.set('select');
            this.applyToolToCanvas();
            // TODO: Implement other math tools
        }
    }
    onClear(): void {
        if (!this.fabricCanvas) return;
        
        // Remove all objects from the canvas
        const objects = this.fabricCanvas.getObjects();
        
        // Remove each object
        objects.forEach((obj: any) => {
            this.fabricCanvas.remove(obj);
        });
        
        // Clear the canvas
        this.fabricCanvas.clear();
        
        // Restore background color if it was set
        if (this.fabricCanvas.backgroundColor) {
            this.fabricCanvas.backgroundColor = this.fabricCanvas.backgroundColor;
        }
        
        // Render the cleared canvas
        this.fabricCanvas.requestRenderAll();
        
        // Reset selection
        this.hasSelection.set(false);
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
        if (!this.fabricCanvas) return;
        // Get current zoom from viewportTransform (first element is scaleX/zoom)
        const vpt = this.fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const currentZoom = Math.abs(vpt[0]) || 1; // Ensure positive zoom value
        // Increase zoom (make things bigger) - clamp to max 3x
        const newZoom = Math.min(3, currentZoom + 0.2);
        this.setCanvasZoom(newZoom);
    }

    onZoomOut(): void {
        if (!this.fabricCanvas) return;
        // Get current zoom from viewportTransform (first element is scaleX/zoom)
        const vpt = this.fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const currentZoom = Math.abs(vpt[0]) || 1; // Ensure positive zoom value
        // Decrease zoom (make things smaller) - clamp to min 0.1x
        const newZoom = Math.max(0.1, currentZoom - 0.2);
        this.setCanvasZoom(newZoom);
    }

    onZoomReset(): void {
        if (!this.fabricCanvas) return;
        
        const canvas = this.fabricCanvas;
        
        // Reset zoom to 1 and center the canvas
        // Simply reset the viewport transform to default (no zoom, no pan)
        const resetVpt = [1, 0, 0, 1, 0, 0];
        canvas.setViewportTransform(resetVpt);
        
        // Recalculate canvas offset
        canvas.calcOffset();
        
        // Update zoom level signal
        this.zoomLevel.set(1);
        
        // Reset wrapper size
        if (this.canvasWrapper?.nativeElement) {
            const wrapper = this.canvasWrapper.nativeElement;
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
            wrapper.style.minWidth = '100%';
            wrapper.style.minHeight = '100%';
        }
        
        // Ensure container scrolling is reset
        if (this.canvasContainer?.nativeElement) {
            this.canvasContainer.nativeElement.scrollLeft = 0;
            this.canvasContainer.nativeElement.scrollTop = 0;
        }
        
        // Render
        canvas.requestRenderAll();
    }

    centerCanvasContent(): void {
        if (!this.fabricCanvas || !this.canvasContainer?.nativeElement) return;
        
        const canvas = this.fabricCanvas;
        const container = this.canvasContainer.nativeElement;
        const objects = canvas.getObjects();
        
        if (objects.length === 0) {
            // No objects, just center the canvas
            const containerRect = container.getBoundingClientRect();
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();
            
            const centerX = (containerRect.width - canvasWidth) / 2;
            const centerY = (containerRect.height - canvasHeight) / 2;
            
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = vpt[0] || 1;
            
            const newVpt = [zoom, 0, 0, zoom, centerX, centerY];
            canvas.setViewportTransform(newVpt);
            canvas.calcOffset();
            canvas.requestRenderAll();
            return;
        }
        
        // Calculate bounding box of all objects
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        objects.forEach((obj: any) => {
            const bounds = obj.getBoundingRect();
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.left + bounds.width);
            maxY = Math.max(maxY, bounds.top + bounds.height);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;
        
        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const viewportCenterX = containerWidth / 2;
        const viewportCenterY = containerHeight / 2;
        
        // Get current zoom
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0] || 1;
        
        // Calculate translation to center the content
        const newTranslateX = viewportCenterX - contentCenterX * zoom;
        const newTranslateY = viewportCenterY - contentCenterY * zoom;
        
        // Apply new viewport transform
        const newVpt = [zoom, 0, 0, zoom, newTranslateX, newTranslateY];
        canvas.setViewportTransform(newVpt);
        canvas.calcOffset();
        canvas.requestRenderAll();
    }

    /**
     * Set zoom level on Fabric.js canvas with proper viewport transform
     */
    private setCanvasZoom(zoom: number): void {
        if (!this.fabricCanvas || !this.canvasContainer?.nativeElement) return;
        
        const canvas = this.fabricCanvas;
        const container = this.canvasContainer.nativeElement;
        
        // Get current viewport transform (if it exists)
        let vpt = canvas.viewportTransform;
        if (!vpt) {
            vpt = [1, 0, 0, 1, 0, 0];
            canvas.viewportTransform = vpt;
        }
        
        // Get current zoom from viewport transform (first element is scaleX/zoom)
        const currentZoom = vpt[0] || 1;
        
        // Skip if zoom hasn't changed significantly (avoid unnecessary updates)
        if (Math.abs(currentZoom - zoom) < 0.001) {
            return;
        }
        
        // Get container dimensions and scroll position
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const scrollLeft = container.scrollLeft || 0;
        const scrollTop = container.scrollTop || 0;
        
        // Get the center of the visible viewport (accounting for scroll)
        // This is the point in the container that we want to keep centered
        const viewportCenterX = scrollLeft + containerWidth / 2;
        const viewportCenterY = scrollTop + containerHeight / 2;
        
        // Get canvas element position relative to container
        const canvasEl = canvas.getElement();
        const canvasRect = canvasEl.getBoundingClientRect();
        const canvasOffsetX = canvasRect.left - containerRect.left;
        const canvasOffsetY = canvasRect.top - containerRect.top;
        
        // Calculate the point in canvas coordinates that corresponds to the viewport center
        // First, get the point relative to the canvas element
        const relativeX = viewportCenterX - canvasOffsetX;
        const relativeY = viewportCenterY - canvasOffsetY;
        
        // Convert to canvas coordinate space (accounting for current zoom and pan)
        const canvasPointX = (relativeX - vpt[4]) / currentZoom;
        const canvasPointY = (relativeY - vpt[5]) / currentZoom;
        
        // Calculate new translation to keep the same canvas point at the viewport center
        const newTranslateX = relativeX - canvasPointX * zoom;
        const newTranslateY = relativeY - canvasPointY * zoom;
        
        // Create new viewport transform
        const newVpt = [zoom, 0, 0, zoom, newTranslateX, newTranslateY];
        
        // Apply the new viewport transform (this triggers a render automatically)
        canvas.setViewportTransform(newVpt);
        
        // Recalculate canvas offset after zoom
        canvas.calcOffset();
        
        // Update zoom level signal
        this.zoomLevel.set(zoom);
        
        // Update wrapper size after a delay to debounce rapid zoom changes
        // Don't call requestRenderAll here - setViewportTransform already triggers rendering
        if (this.zoomUpdateTimeout) {
            clearTimeout(this.zoomUpdateTimeout);
        }
        this.zoomUpdateTimeout = setTimeout(() => {
            this.updateCanvasScrollability(zoom);
            // Ensure all objects are visible after zoom
            if (this.fabricCanvas) {
                this.fabricCanvas.requestRenderAll();
            }
        }, 100);
    }

    /**
     * Update canvas container scrollability based on zoom level
     */
    private updateCanvasScrollability(zoom: number): void {
        if (!this.canvasContainer?.nativeElement || !this.canvasWrapper?.nativeElement || !this.fabricCanvas) return;
        
        const container = this.canvasContainer.nativeElement;
        const wrapper = this.canvasWrapper.nativeElement;
        
        // Always enable scrolling
        container.style.overflow = 'auto';
        
        // Get canvas dimensions
        const canvasWidth = this.fabricCanvas.getWidth();
        const canvasHeight = this.fabricCanvas.getHeight();
        
        // Get container dimensions to calculate proper wrapper size
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        if (zoom > 1) {
            // When zoomed in, wrapper needs to be larger to enable scrolling
            const newWidth = canvasWidth * zoom;
            const newHeight = canvasHeight * zoom;
            
            // Check if size actually needs to change to avoid unnecessary reflows
            const currentWidth = parseFloat(wrapper.style.width) || 0;
            const currentHeight = parseFloat(wrapper.style.height) || 0;
            
            if (Math.abs(currentWidth - newWidth) > 1 || Math.abs(currentHeight - newHeight) > 1) {
                // Batch all style updates together to minimize reflows
                wrapper.style.width = `${newWidth}px`;
                wrapper.style.height = `${newHeight}px`;
                wrapper.style.minWidth = `${newWidth}px`;
                wrapper.style.minHeight = `${newHeight}px`;
            }
        } else {
            // When zoomed out or at 100%, use container size
            // Only update if not already at 100%
            if (wrapper.style.width !== '100%') {
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.minWidth = '100%';
                wrapper.style.minHeight = '100%';
            }
        }
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
        this.createStickyNote(data.x, data.y, data.color);
    }

    /**
     * Create a sticky note on the canvas
     */
    private createStickyNote(x: number, y: number, color?: string): void {
        if (!this.fabricCanvas) return;

        const noteColor = color || this.getStickyNoteColor();
        const noteWidth = 200;
        const noteHeight = 150;
        
        // Create background rectangle (relative to group origin)
        const rect = new Rect({
            left: 0,
            top: 0,
            width: noteWidth,
            height: noteHeight,
            fill: noteColor,
            stroke: '#d1d5db',
            strokeWidth: 1,
            rx: 4, // Rounded corners
            ry: 4,
            selectable: false,
            evented: false,
        });

        // Create text object (relative to group origin)
        // Position at top-left with padding
        const textPadding = 10;
        const textMaxHeight = noteHeight - (textPadding * 2);
        const text = new IText('', {
            left: textPadding,
            top: textPadding,
            width: noteWidth - (textPadding * 2),
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            fill: '#1f2937',
            textAlign: 'left',
            originX: 'left',
            originY: 'top',
            editable: true,
            selectable: true,
            evented: true,
            splitByGrapheme: true,
            lockUniScaling: true,
            // Set fixed height for clipping (scrolling effect when text overflows)
            height: textMaxHeight,
            // Temporarily remove clipPath to ensure editing works
            // clipPath can interfere with text editing in groups
            // clipPath: new Rect({
            //     left: 0,
            //     top: 0,
            //     width: noteWidth - (textPadding * 2),
            //     height: textMaxHeight,
            //     absolutePositioned: true,
            // }),
            charSpacing: 0,
            lineHeight: 1.2,
        });

        // Create group with both objects
        // Note: In Fabric.js, text editing in groups requires subTargetCheck
        const stickyNoteGroup = new Group([rect, text], {
            left: x,
            top: y,
            selectable: true,
            evented: true,
            subTargetCheck: true, // Allow interaction with objects inside group
        });

        // Mark as sticky note
        (stickyNoteGroup as any).isStickyNote = true;
        (stickyNoteGroup as any).stickyNoteId = `sticky-${Date.now()}`;
        (stickyNoteGroup as any).noteColor = noteColor;

        // Store references for later updates
        (stickyNoteGroup as any).rect = rect;
        (stickyNoteGroup as any).text = text;

        // Update rect size when text changes (but keep max height for scrolling)
        text.on('changed', () => {
            const textHeight = text.calcTextHeight();
            // Set max height - text will scroll if it exceeds this
            const maxHeight = 300; // Max visible height before scrolling
            const newHeight = Math.min(maxHeight, Math.max(150, textHeight + (textPadding * 2)));
            rect.set({
                height: newHeight,
            });
            // Update group dimensions
            stickyNoteGroup.set({
                height: newHeight,
            });
            // Update text height to match visible area
            const newTextMaxHeight = newHeight - (textPadding * 2);
            text.set({
                height: newTextMaxHeight,
            });
            // clipPath removed temporarily to ensure editing works
            // if (text.clipPath) {
            //     (text.clipPath as any).set({
            //         height: newTextMaxHeight,
            //     });
            // }
            stickyNoteGroup.setCoords();
            this.fabricCanvas.requestRenderAll();
        });

        // Handle click on sticky note to edit text
        // When clicking on the group or rect, activate text for editing
        stickyNoteGroup.on('mousedown', (e: any) => {
            // If clicking on the group or rect background
            if (e.target === stickyNoteGroup || e.target === rect) {
                // Don't stop propagation - let Fabric handle it, but activate text
                setTimeout(() => {
                    // Exit editing on other objects first
                    this.fabricCanvas.getObjects().forEach((obj: any) => {
                        if (obj !== text && obj.isEditing !== undefined && obj.isEditing) {
                            obj.exitEditing();
                        }
                    });
                    // Activate the text object and enter editing
                    this.fabricCanvas.setActiveObject(text);
                    this.fabricCanvas.requestRenderAll();
                    // Enter editing mode
                    setTimeout(() => {
                        if (text && !text.isEditing) {
                            text.enterEditing();
                        }
                    }, 50);
                }, 100);
            }
        });

        // Handle double-click to edit text
        stickyNoteGroup.on('mousedblclick', () => {
            this.fabricCanvas.setActiveObject(text);
            text.enterEditing();
        });

        // Handle click directly on text
        text.on('mousedown', () => {
            // Text click should allow editing
            setTimeout(() => {
                if (!text.isEditing) {
                    text.enterEditing();
                }
            }, 50);
        });

        // Add group to canvas
        this.fabricCanvas.add(stickyNoteGroup);
        this.fabricCanvas.setActiveObject(stickyNoteGroup);
        this.fabricCanvas.requestRenderAll();

        // Start editing text immediately after creation
        // Need to set text as active object first when it's in a group
        setTimeout(() => {
            // Set the text as the active object (Fabric.js will handle group interaction)
            this.fabricCanvas.setActiveObject(text);
            this.fabricCanvas.requestRenderAll();
            // Then enter editing mode
            setTimeout(() => {
                try {
                    if (text && typeof text.enterEditing === 'function') {
                        text.enterEditing();
                    }
                } catch (error) {
                    console.warn('Error entering edit mode:', error);
                }
            }, 100);
        }, 200);
    }

    /**
     * Get a color for sticky note (cycle through colors)
     */
    private getStickyNoteColor(): string {
        const colors = [
            '#fef08a', // Yellow
            '#fde047', // Bright yellow
            '#fbbf24', // Amber
            '#fb923c', // Orange
            '#f87171', // Red
            '#f472b6', // Pink
            '#c084fc', // Purple
            '#a78bfa', // Violet
            '#60a5fa', // Blue
            '#34d399', // Green
            '#4ade80', // Emerald
            '#a7f3d0', // Teal
        ];
        
        // Get count of existing sticky notes to cycle colors
        const existingNotes = this.fabricCanvas.getObjects().filter((obj: any) => obj.isStickyNote && obj.type === 'rect');
        const colorIndex = existingNotes.length % colors.length;
        return colors[colorIndex];
    }
    
    /**
     * Select and configure tool
     */
    selectTool(toolId: string): void {
        const tool = getToolFromId(toolId);
        if (!tool || !this.fabricCanvas) return;

        // Clear math tool when selecting a regular tool
        this.activeMathTool.set(null);
        
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

        // For shape tools, ruler, protractor, equation, and graph, disable selection to prevent interference
        if (this.isShapeTool(tool) || tool === 'ruler' || tool === 'protractor' || tool === 'equation' || tool === 'graph') {
            this.fabricCanvas.selection = false;
        } else if (tool === 'stickyNote') {
            // Enable selection for sticky note tool so existing notes can be selected
            this.fabricCanvas.selection = true;
        }

        // Modify ALL objects (like working version does)
        this.fabricCanvas.forEachObject((obj: any) => {
            // Keep sticky notes selectable when sticky note tool is active
            if (obj.isStickyNote) {
                obj.selectable = tool === 'select' || tool === 'stickyNote';
                obj.evented = tool === 'select' || tool === 'stickyNote';
            } else {
                obj.selectable = tool === 'select';
                obj.evented = tool === 'select';
            }
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

    /**
     * Open equation editor dialog
     */
    private openEquationDialog(x: number, y: number): void {
        this.equationPosition.set({ x, y });
        this.equationLatex.set('\\frac{a}{b}');
        this.equationSize.set(36);
        this.equationError.set('');
        this.editingEquation.set(null);
        this.showEquationDialog.set(true);
    }

    /**
     * Edit existing equation
     */
    private editEquation(equationObj: any): void {
        const latex = equationObj.equationLatex || '\\frac{a}{b}';
        const size = equationObj.equationSize || 36;
        const pos = equationObj.getCenterPoint();
        
        this.equationPosition.set({ x: pos.x, y: pos.y });
        this.equationLatex.set(latex);
        this.equationSize.set(size);
        this.equationError.set('');
        this.editingEquation.set(equationObj);
        this.showEquationDialog.set(true);
    }

    /**
     * Close equation dialog
     */
    onCloseEquationDialog(): void {
        this.showEquationDialog.set(false);
        this.equationPosition.set(null);
        this.editingEquation.set(null);
    }

    /**
     * Save equation to canvas
     */
    async onSaveEquation(): Promise<void> {
        const latex = this.equationLatex().trim();
        if (!latex) {
            this.equationError.set('Please enter a LaTeX equation');
            return;
        }

        const position = this.equationPosition();
        if (!position) {
            this.equationError.set('Invalid position');
            return;
        }

        try {
            this.equationError.set('');
            
            // Ensure MathJax is ready
            await this.ensureMathJaxReady();
            
            // Convert LaTeX to SVG string
            const svgString = await this.latexToSvgString(latex, this.currentColor());
            
            // Load SVG as Fabric.js object
            const equationObj = await this.loadSvgAsFabricObject(svgString);
            
            // Set properties
            equationObj.set({
                left: position.x,
                top: position.y,
                originX: 'center',
                originY: 'center',
                selectable: true,
                evented: true,
            });
            
            // Store equation metadata
            (equationObj as any).isEquation = true;
            (equationObj as any).equationLatex = latex;
            (equationObj as any).equationSize = this.equationSize();
            (equationObj as any).equationColor = this.currentColor();
            
            // If editing, remove old equation
            const editing = this.editingEquation();
            if (editing) {
                this.fabricCanvas.remove(editing);
            }
            
            // Add to canvas
            this.fabricCanvas.add(equationObj);
            this.fabricCanvas.setActiveObject(equationObj);
            this.fabricCanvas.requestRenderAll();
            
            // Close dialog
            this.onCloseEquationDialog();
        } catch (error) {
            this.equationError.set(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Convert LaTeX to SVG string
     */
    private async latexToSvgString(latex: string, color: string): Promise<string> {
        await this.ensureMathJaxReady();
        
        const mj = MathJax;
        const tex2svgPromise = mj.tex2svgPromise || ((t: string, opts: any) => 
            Promise.resolve(mj.tex2svg(t, opts)));
        
        const node = await tex2svgPromise(latex, { display: true });
        
        // Set color
        node.style.color = color;
        
        // Set size
        const svg = node.querySelector('svg');
        if (svg) {
            svg.style.height = `${this.equationSize()}px`;
            svg.style.width = 'auto';
            // Ensure SVG has xmlns attribute
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
        }
        
        // Return the SVG element's outerHTML, or the full node if no SVG found
        return svg ? svg.outerHTML : node.outerHTML;
    }

    /**
     * Load SVG string as Fabric.js object
     */
    private loadSvgAsFabricObject(svgString: string): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                // Convert SVG string to data URL (more reliable than blob URL)
                // Encode the SVG string to base64
                const encodedSvg = encodeURIComponent(svgString);
                const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
                
                // Use Image.fromURL to load the SVG
                // In Fabric.js v7, fromURL returns a Promise
                Image.fromURL(dataUrl, {
                    crossOrigin: 'anonymous'
                }).then((img: any) => {
                    if (!img) {
                        reject(new Error('Failed to load SVG as image'));
                        return;
                    }
                    
                    resolve(img);
                }).catch((err: any) => {
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // ==================== Calculator Methods ====================

    /**
     * Close calculator dialog
     */
    onCloseCalculator(): void {
        this.showCalculatorDialog.set(false);
    }

    /**
     * Switch calculator mode
     */
    onCalculatorModeChange(mode: 'basic' | 'scientific' | 'conversion'): void {
        this.calculatorMode.set(mode);
        if (mode === 'conversion') {
            this.conversionValue.set('1');
            // Ensure "To" is in the same category as "From"
            this.syncConversionCategories();
            this.onConversionCalculate();
        }
    }

    /**
     * Get category of a unit
     */
    getUnitCategory(unit: string): 'length' | 'weight' | 'temperature' | 'volume' {
        const lengthUnits = ['meter', 'kilometer', 'centimeter', 'millimeter', 'inch', 'foot', 'yard', 'mile'];
        const weightUnits = ['gram', 'kilogram', 'milligram', 'pound', 'ounce', 'ton'];
        const temperatureUnits = ['celsius', 'fahrenheit', 'kelvin'];
        const volumeUnits = ['liter', 'milliliter', 'gallon', 'quart', 'pint', 'cup', 'fluid-ounce'];
        
        if (lengthUnits.includes(unit)) return 'length';
        if (weightUnits.includes(unit)) return 'weight';
        if (temperatureUnits.includes(unit)) return 'temperature';
        if (volumeUnits.includes(unit)) return 'volume';
        return 'length'; // Default
    }

    /**
     * Get available units for a category
     */
    getAvailableUnitsForCategory(category: 'length' | 'weight' | 'temperature' | 'volume'): Array<{value: string, label: string}> {
        const units: { [key: string]: Array<{value: string, label: string}> } = {
            length: [
                { value: 'meter', label: 'Meter' },
                { value: 'kilometer', label: 'Kilometer' },
                { value: 'centimeter', label: 'Centimeter' },
                { value: 'millimeter', label: 'Millimeter' },
                { value: 'inch', label: 'Inch' },
                { value: 'foot', label: 'Foot' },
                { value: 'yard', label: 'Yard' },
                { value: 'mile', label: 'Mile' }
            ],
            weight: [
                { value: 'gram', label: 'Gram' },
                { value: 'kilogram', label: 'Kilogram' },
                { value: 'milligram', label: 'Milligram' },
                { value: 'pound', label: 'Pound' },
                { value: 'ounce', label: 'Ounce' },
                { value: 'ton', label: 'Ton' }
            ],
            temperature: [
                { value: 'celsius', label: 'Celsius' },
                { value: 'fahrenheit', label: 'Fahrenheit' },
                { value: 'kelvin', label: 'Kelvin' }
            ],
            volume: [
                { value: 'liter', label: 'Liter' },
                { value: 'milliliter', label: 'Milliliter' },
                { value: 'gallon', label: 'Gallon' },
                { value: 'quart', label: 'Quart' },
                { value: 'pint', label: 'Pint' },
                { value: 'cup', label: 'Cup' },
                { value: 'fluid-ounce', label: 'Fluid Ounce' }
            ]
        };
        return units[category] || units['length'];
    }

    /**
     * Sync conversion categories - ensure "To" is in same category as "From"
     */
    syncConversionCategories(): void {
        const fromCategory = this.getUnitCategory(this.conversionFrom());
        const toCategory = this.getUnitCategory(this.conversionTo());
        
        if (fromCategory !== toCategory) {
            // Reset "To" to first unit of "From" category
            const availableUnits = this.getAvailableUnitsForCategory(fromCategory);
            if (availableUnits.length > 0) {
                this.conversionTo.set(availableUnits[0].value);
            }
        }
    }

    /**
     * Handle calculator button press
     */
    onCalculatorButton(value: string): void {
        const current = this.calculatorDisplay();
        
        if (value === 'C') {
            this.calculatorDisplay.set('0');
        } else if (value === 'CE') {
            this.calculatorDisplay.set('0');
        } else if (value === '=') {
            this.calculateResult();
        } else if (value === '±') {
            if (current !== '0' && current !== 'Error') {
                this.calculatorDisplay.set(current.startsWith('-') ? current.substring(1) : '-' + current);
            }
        } else if (value === '%') {
            try {
                const num = parseFloat(current);
                this.calculatorDisplay.set((num / 100).toString());
            } catch {
                this.calculatorDisplay.set('Error');
            }
        } else if (['+', '-', '*', '/'].includes(value)) {
            if (current !== 'Error') {
                this.calculatorDisplay.set(current + ' ' + value + ' ');
            }
        } else if (value === '.') {
            if (!current.includes('.')) {
                this.calculatorDisplay.set(current + '.');
            }
        } else {
            // Number or operator
            if (current === '0' || current === 'Error') {
                this.calculatorDisplay.set(value);
            } else {
                this.calculatorDisplay.set(current + value);
            }
        }
    }

    /**
     * Calculate result
     */
    private calculateResult(): void {
        try {
            const expression = this.calculatorDisplay().replace(/\s+/g, '');
            // Replace × and ÷ with * and /
            const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/');
            
            // Use Function constructor for safe evaluation
            const result = new Function('return ' + normalized)();
            
            if (isNaN(result) || !isFinite(result)) {
                this.calculatorDisplay.set('Error');
            } else {
                const resultStr = result.toString();
                this.calculatorDisplay.set(resultStr);
                // Add to history
                const history = this.calculatorHistory();
                history.push(`${expression} = ${resultStr}`);
                if (history.length > 10) history.shift();
                this.calculatorHistory.set([...history]);
            }
        } catch (error) {
            this.calculatorDisplay.set('Error');
        }
    }

    /**
     * Scientific calculator functions
     */
    onScientificFunction(func: string): void {
        const current = parseFloat(this.calculatorDisplay());
        if (isNaN(current)) {
            this.calculatorDisplay.set('Error');
            return;
        }

        let result: number;
        try {
            switch (func) {
                case 'sin':
                    result = Math.sin(current * Math.PI / 180); // Convert to radians
                    break;
                case 'cos':
                    result = Math.cos(current * Math.PI / 180);
                    break;
                case 'tan':
                    result = Math.tan(current * Math.PI / 180);
                    break;
                case 'asin':
                    result = Math.asin(current) * 180 / Math.PI; // Convert to degrees
                    break;
                case 'acos':
                    result = Math.acos(current) * 180 / Math.PI;
                    break;
                case 'atan':
                    result = Math.atan(current) * 180 / Math.PI;
                    break;
                case 'log':
                    result = Math.log10(current);
                    break;
                case 'ln':
                    result = Math.log(current);
                    break;
                case 'sqrt':
                    result = Math.sqrt(current);
                    break;
                case 'cbrt':
                    result = Math.cbrt(current);
                    break;
                case 'pow2':
                    result = Math.pow(current, 2);
                    break;
                case 'pow3':
                    result = Math.pow(current, 3);
                    break;
                case 'exp':
                    result = Math.exp(current);
                    break;
                case 'fact':
                    result = this.factorial(Math.floor(current));
                    break;
                default:
                    return;
            }
            
            if (isNaN(result) || !isFinite(result)) {
                this.calculatorDisplay.set('Error');
            } else {
                this.calculatorDisplay.set(result.toString());
            }
        } catch {
            this.calculatorDisplay.set('Error');
        }
    }

    /**
     * Factorial function
     */
    private factorial(n: number): number {
        if (n < 0 || n > 170) return NaN; // Limit to prevent overflow
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    /**
     * Memory functions
     */
    onMemoryFunction(func: 'MC' | 'MR' | 'M+' | 'M-'): void {
        const current = parseFloat(this.calculatorDisplay());
        let memory = this.calculatorMemory();
        
        switch (func) {
            case 'MC':
                this.calculatorMemory.set(0);
                break;
            case 'MR':
                this.calculatorDisplay.set(memory.toString());
                break;
            case 'M+':
                this.calculatorMemory.set(memory + (isNaN(current) ? 0 : current));
                break;
            case 'M-':
                this.calculatorMemory.set(memory - (isNaN(current) ? 0 : current));
                break;
        }
    }

    /**
     * Calculate conversion
     */
    onConversionCalculate(): void {
        const value = parseFloat(this.conversionValue());
        if (isNaN(value)) {
            this.conversionResult.set('Invalid input');
            return;
        }

        const from = this.conversionFrom();
        const to = this.conversionTo();
        
        // Conversion factors (to base unit: meter for length, gram for weight, etc.)
        const conversions: { [key: string]: { [key: string]: number } } = {
            length: {
                'meter': 1,
                'kilometer': 1000,
                'centimeter': 0.01,
                'millimeter': 0.001,
                'inch': 0.0254,
                'foot': 0.3048,
                'yard': 0.9144,
                'mile': 1609.34
            },
            weight: {
                'gram': 1,
                'kilogram': 1000,
                'milligram': 0.001,
                'pound': 453.592,
                'ounce': 28.3495,
                'ton': 1000000
            },
            temperature: {
                'celsius': 1,
                'fahrenheit': 1,
                'kelvin': 1
            },
            volume: {
                'liter': 1,
                'milliliter': 0.001,
                'gallon': 3.78541,
                'quart': 0.946353,
                'pint': 0.473176,
                'cup': 0.236588,
                'fluid-ounce': 0.0295735
            }
        };

        // Determine category
        let category = 'length';
        if (['gram', 'kilogram', 'milligram', 'pound', 'ounce', 'ton'].includes(from)) {
            category = 'weight';
        } else if (['celsius', 'fahrenheit', 'kelvin'].includes(from)) {
            category = 'temperature';
        } else if (['liter', 'milliliter', 'gallon', 'quart', 'pint', 'cup', 'fluid-ounce'].includes(from)) {
            category = 'volume';
        }

        // Special handling for temperature
        if (category === 'temperature') {
            let result: number;
            if (from === 'celsius' && to === 'fahrenheit') {
                result = (value * 9/5) + 32;
            } else if (from === 'fahrenheit' && to === 'celsius') {
                result = (value - 32) * 5/9;
            } else if (from === 'celsius' && to === 'kelvin') {
                result = value + 273.15;
            } else if (from === 'kelvin' && to === 'celsius') {
                result = value - 273.15;
            } else if (from === 'fahrenheit' && to === 'kelvin') {
                result = ((value - 32) * 5/9) + 273.15;
            } else if (from === 'kelvin' && to === 'fahrenheit') {
                result = ((value - 273.15) * 9/5) + 32;
            } else {
                result = value;
            }
            this.conversionResult.set(result.toFixed(2));
        } else {
            // Convert to base unit, then to target unit
            const fromFactor = conversions[category][from] || 1;
            const toFactor = conversions[category][to] || 1;
            const result = (value * fromFactor) / toFactor;
            this.conversionResult.set(result.toFixed(6));
        }
    }
}


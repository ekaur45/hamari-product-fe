import { CommonModule } from "@angular/common";
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, signal, HostListener, ViewEncapsulation, NgZone } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { WhiteBoard } from "@/app/components/white-board/white-board";
type Tool = "select" | "pencil" | "brush" | "eraser" | "line" | "rect" | "ellipse" | "text" | "equation";
type Point = { x: number; y: number };
type DrawingTool = 'pencil' | 'brush' | 'highlighter' | 'eraser';
type ShapeTool = 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle';
type ToolType = DrawingTool | ShapeTool | 'text' | 'fill' | 'select';

declare var MathJax: any;
declare var fabric: any;

@Component({
    selector: 'app-wb-tools',
    templateUrl: './wb-toosl.html',
    standalone: true,
    imports: [CommonModule, DialogModule, WhiteBoard],
    styleUrls: ['./t.css'],
    encapsulation: ViewEncapsulation.None
})
export class WbToolsComponent implements AfterViewInit, OnDestroy {
    @ViewChild("canvasWrap", { static: true }) private readonly canvasWrapRef!: ElementRef<HTMLDivElement>;
    @ViewChild("canvasEl", { static: true }) private readonly canvasElRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild("fileInput", { static: true }) private readonly fileInputRef!: ElementRef<HTMLInputElement>;

    @ViewChild("eqInput") private eqInputRef?: ElementRef<HTMLTextAreaElement>;
    @ViewChild("eqPreview") private eqPreviewRef?: ElementRef<HTMLDivElement>;

    tool: Tool = "select";
    strokeColor = "#111827";
    fillColor = "#000000";
    fillShapes = false;
    strokeWidth = 4;
    statusText = "Ready";
    coordsText = "x: 0, y: 0";

    readonly paletteColors = [
        "#111827",
        "#6b7280",
        "#ef4444",
        "#f97316",
        "#f59e0b",
        "#84cc16",
        "#22c55e",
        "#14b8a6",
        "#06b6d4",
        "#3b82f6",
        "#6366f1",
        "#a855f7",
        "#ec4899",
        "#ffffff",
        "#000000",
        "#d1d5db",
    ];

    eqOpen = signal(false);
    eqBusy = signal(false);
    eqLatex = "\\frac{a}{b}";
    eqSize = 36;
    eqError = "";
    eqEditingTarget: any | null = null;
    private eqPoint: Point | null = null;
    private eqLastLatex = "\\frac{a}{b}";
    private eqLastSize = 36;

    private canvas: any | null = null;
    private drawingObject: any | null = null;
    private isPointerDown = false;
    private startPoint: Point = { x: 0, y: 0 };

    private readonly history = {
        undo: [] as string[],
        redo: [] as string[],
        isApplying: false,
        suppress: false,
    };

    private readonly jsonExtraProps = [
        "erasable",
        "globalCompositeOperation",
        "strokeUniform",
        "lockScalingFlip",
        "isEquation",
        "equationLatex",
        "equationSize",
        "equationColor",
    ];

    private resizeObserver: ResizeObserver | null = null;
    private coordsRaf = 0;
    private lastPointer: Point | null = null;

    private mathJaxReadyPromise: Promise<void> | null = null;
    private eqPreviewTimer: number | null = null;
    private eqPreviewSeq = 0;

    get canUndo(): boolean {
        return this.history.undo.length > 1;
    }

    get canRedo(): boolean {
        return this.history.redo.length > 0;
    }
    constructor(private ngZone: NgZone) { }

    ngAfterViewInit(): void {
        if (!fabric) {
          const msg = 'Fabric.js failed to load. Check the script tag in src/index.html.';
          alert(msg);
          throw new Error(msg);
        }
      
        this.ngZone.runOutsideAngular(() => {
          this.canvas = new fabric.Canvas(this.canvasElRef.nativeElement, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: '#ffffff',
          });
      
          // Initial resize
          this.resizeCanvas();
      
          // ResizeObserver OUTSIDE Angular + deferred resize
          this.resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => this.resizeCanvas());
          });
      
          this.resizeObserver.observe(this.canvasWrapRef.nativeElement);
        });
      
        // These are safe to run normally
        this.hookCanvasEvents();
        this.setTool('select');
        this.saveHistoryState();
      }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        if (this.canvas && typeof this.canvas.dispose === "function") this.canvas.dispose();
        this.canvas = null;
    }

    setTool(nextTool: Tool): void {
        this.tool = nextTool;
        this.applyToolToCanvas();
        this.eqOpen.set(!this.eqOpen());
    }

    setStrokeColor(color: string): void {
        this.strokeColor = color || "#111827";
        this.updateBrushSettings();
        if (this.eqOpen()) this.scheduleEquationPreview();
        this.applyStylesToSelectionIfAny();
    }

    setFillColor(color: string): void {
        this.fillColor = color || "#000000";
        this.applyStylesToSelectionIfAny();
    }

    setFillShapes(checked: boolean): void {
        this.fillShapes = Boolean(checked);
    }

    setStrokeWidth(value: string | number): void {
        const n = typeof value === "number" ? value : Number(value);
        this.strokeWidth = Number.isFinite(n) ? Math.max(1, n) : 4;
        this.updateBrushSettings();
        if (this.eqOpen()) this.scheduleEquationPreview();
        this.applyStylesToSelectionIfAny();
    }

    selectPalette(color: string): void {
        this.setStrokeColor(color);
    }

    undo(): void {
        if (!this.canvas) return;
        if (this.history.undo.length <= 1) return;
        const current = this.history.undo.pop();
        if (!current) return;
        this.history.redo.push(current);
        const prev = this.history.undo[this.history.undo.length - 1];
        this.restoreFromSnapshot(prev);
    }

    redo(): void {
        if (!this.canvas) return;
        if (this.history.redo.length === 0) return;
        const snapshot = this.history.redo.pop();
        if (!snapshot) return;
        this.history.undo.push(snapshot);
        this.restoreFromSnapshot(snapshot);
    }

    deleteSelection(): void {
        if (!this.canvas) return;
        const active = this.canvas.getActiveObject();
        if (!active) return;

        this.withHistorySuppressed(() => {
            if (active.type === "activeSelection") {
                const objects = active.getObjects();
                this.canvas.discardActiveObject();
                for (const obj of objects) this.canvas.remove(obj);
            } else {
                this.canvas.remove(active);
            }
            this.canvas.requestRenderAll();
        });

        this.saveHistoryState();
    }

    clearCanvas(): void {
        if (!this.canvas) return;
        if (!confirm("Clear the canvas? This cannot be undone beyond your history limit.")) return;

        this.withHistorySuppressed(() => {
            this.canvas.getObjects().forEach((o: any) => this.canvas.remove(o));
            this.canvas.discardActiveObject();
            this.canvas.setBackgroundColor("#ffffff", this.canvas.requestRenderAll.bind(this.canvas));
        });

        this.saveHistoryState();
        this.setStatus("Cleared");
    }

    openImagePicker(): void {
        this.fileInputRef.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement | null;
        const file = input && input.files && input.files[0];
        if (file) this.openImageFromFile(file);
        if (input) input.value = "";
    }

    downloadPng(): void {
        if (!this.canvas) return;
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();

        const url = this.canvas.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 1,
            enableRetinaScaling: true,
        });

        const a = document.createElement("a");
        a.href = url;
        a.download = `fabric-paint-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        this.setStatus("Saved PNG");
    }

    setEqLatex(latex: string): void {
        this.eqLatex = String(latex ?? "");
        this.scheduleEquationPreview();
    }

    setEqSize(value: string | number): void {
        const n = typeof value === "number" ? value : Number(value);
        this.eqSize = Number.isFinite(n) ? Math.max(12, n) : 36;
        this.scheduleEquationPreview();
    }

    closeEquationEditor(): void {
        this.eqOpen.set(false);
        if (this.eqBusy()) return;
        this.eqError = "";
        this.eqEditingTarget = null;
        this.eqPoint = null;
        this.eqPreviewSeq++;
    }

    async upsertEquationFromEditor(): Promise<void> {
        if (!this.canvas) return;
        const latex = String(this.eqLatex || "").trim();
        if (!latex) {
            this.eqError = "Enter a LaTeX equation.";
            return;
        }

        this.eqBusy.set(true);
        this.eqError = "";

        const editingTarget = this.eqEditingTarget;
        const point = this.eqPoint;

        try {
            const obj = await this.createEquationObject({ latex, sizePx: this.eqSize, color: this.strokeColor });

            this.withHistorySuppressed(() => {
                this.canvas.discardActiveObject();
                if (editingTarget) this.canvas.remove(editingTarget);
                this.canvas.add(obj);
            });

            if (editingTarget) {
                obj.set({
                    left: editingTarget.left,
                    top: editingTarget.top,
                    angle: editingTarget.angle,
                    flipX: editingTarget.flipX,
                    flipY: editingTarget.flipY,
                    skewX: editingTarget.skewX,
                    skewY: editingTarget.skewY,
                    originX: editingTarget.originX,
                    originY: editingTarget.originY,
                });
            } else {
                const x = point ? point.x : this.canvas.getWidth() / 2;
                const y = point ? point.y : this.canvas.getHeight() / 2;
                obj.set({ left: x, top: y, originX: "center", originY: "center" });
            }
            obj.setCoords();

            this.eqLastLatex = latex;
            this.eqLastSize = this.eqSize;

            this.setTool("select");
            this.canvas.setActiveObject(obj);
            this.canvas.requestRenderAll();
            this.saveHistoryState();
            this.closeEquationEditor();
            this.setStatus(editingTarget ? "Equation updated" : "Equation inserted");
        } catch (err) {
            this.eqError = err instanceof Error ? err.message : String(err);
        } finally {
            this.eqBusy.set(false);
        }
    }

    @HostListener("window:keydown", ["$event"])
    onKeydown(e: KeyboardEvent): void {
        if (this.eqOpen()) {
            if (e.key === "Escape") {
                e.preventDefault();
                this.closeEquationEditor();
            }
            return;
        }

        const target = e.target as HTMLElement | null;
        const isTextInput =
            target instanceof HTMLElement &&
            (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (isTextInput) return;

        const metaOrCtrl = e.metaKey || e.ctrlKey;
        if (metaOrCtrl && e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) void this.redo();
            else void this.undo();
            return;
        }
        if (metaOrCtrl && e.key.toLowerCase() === "y") {
            e.preventDefault();
            void this.redo();
            return;
        }
        if (metaOrCtrl && e.key.toLowerCase() === "s") {
            e.preventDefault();
            this.downloadPng();
            return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            const active = this.canvas && this.canvas.getActiveObject();
            if (active && active.type === "i-text" && active.isEditing) return;
            this.deleteSelection();
            return;
        }
        if (e.key === "Escape") {
            this.setTool("select");
        }
    }

    normalizeCssColor(input: string): string {
        return String(input || "")
            .trim()
            .toLowerCase()
            .replaceAll(/\s+/g, "");
    }

    private applyToolToCanvas(): void {
        if (!this.canvas) return;
        if (!fabric) return;

        this.canvas.isDrawingMode = false;
        this.canvas.selection = this.tool === "select";
        this.canvas.defaultCursor = this.tool === "select" ? "default" : "crosshair";

        this.canvas.forEachObject((o: any) => {
            o.selectable = this.tool === "select";
            o.evented = this.tool === "select";
        });

        if (this.tool === "pencil") {
            this.canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(this.canvas);
            brush.color = this.strokeColor;
            brush.width = this.strokeWidth;
            brush.decimate = 2;
            this.canvas.freeDrawingBrush = brush;
            this.setStatus("Pencil");
            return;
        }

        if (this.tool === "brush") {
            this.canvas.isDrawingMode = true;
            const brush = new fabric.CircleBrush(this.canvas);
            brush.color = this.strokeColor;
            brush.width = this.strokeWidth;
            this.canvas.freeDrawingBrush = brush;
            this.setStatus("Brush");
            return;
        }

        if (this.tool === "eraser") {
            this.canvas.isDrawingMode = true;
            //   if (fabric.EraserBrush) {
            //     const eraser = new fabric.EraserBrush(this.canvas);
            //     eraser.width = this.strokeWidth;
            //     this.canvas.freeDrawingBrush = eraser;
            //   } else {
            //     const eraser = new fabric.PencilBrush(this.canvas);
            //     eraser.width = this.strokeWidth;
            //     eraser.color = "#000000";
            //     eraser.globalCompositeOperation = "destination-out";
            //     this.canvas.freeDrawingBrush = eraser;
            //   }
            //   this.setStatus("Eraser");
            //   return;
        }

        if (this.tool === "line") this.setStatus("Line");
        else if (this.tool === "rect") this.setStatus("Rectangle");
        else if (this.tool === "ellipse") this.setStatus("Ellipse");
        else if (this.tool === "text") this.setStatus("Text");
        else if (this.tool === "equation") this.setStatus("Equation");
        else this.setStatus("Ready");
    }

    private updateBrushSettings(): void {
        if (!this.canvas) return;
        const brush = this.canvas.freeDrawingBrush;
        if (brush && "width" in brush) brush.width = this.strokeWidth;
        if (brush && "color" in brush) brush.color = this.strokeColor;
    }

    private resizeCanvas(): void {
        if (!this.canvas || !this.canvasWrapRef) return;
      
        const container = this.canvasWrapRef.nativeElement;
      
        // Use clientWidth/Height (cheaper, no forced reflow)
        const width = Math.max(200, container.clientWidth);
        const height = Math.max(200, container.clientHeight);
      
        // 🔥 Guard: prevent infinite resize loop
        if (
          this.canvas.getWidth() === width &&
          this.canvas.getHeight() === height
        ) {
          return;
        }
      
        this.canvas.setDimensions(
          { width, height },
          { cssOnly: false }
        );
      
        this.canvas.calcOffset();
        this.canvas.requestRenderAll();
      }
    private setStatus(text: string): void {
        this.statusText = text;
    }

    private scheduleCoordsUpdate(pointer: Point): void {
        this.lastPointer = pointer;
        if (this.coordsRaf) return;
        this.coordsRaf = requestAnimationFrame(() => {
            const p = this.lastPointer;
            this.coordsRaf = 0;
            if (!p) return;
            const x = Math.round(p.x);
            const y = Math.round(p.y);
            this.coordsText = `x: ${x}, y: ${y}`;
        });
    }

    private hookCanvasEvents(): void {
        if (!this.canvas) return;

        this.canvas.on("mouse:down", (opt: any) => {
            if (this.eqOpen()) return;
            const pointer = this.canvas.getPointer(opt.e);
            this.isPointerDown = true;
            this.startPoint = { x: pointer.x, y: pointer.y };

            if (this.tool === "text") {
                this.isPointerDown = false;
                this.addTextAt(pointer.x, pointer.y);
                return;
            }

            if (this.tool === "equation") {
                this.isPointerDown = false;
                this.openEquationEditor({ point: { x: pointer.x, y: pointer.y }, target: null });
                return;
            }

            if (this.tool === "line") {
                this.drawingObject = this.makeLine(pointer.x, pointer.y, pointer.x, pointer.y);
                this.canvas.add(this.drawingObject);
                this.history.suppress = true;
            } else if (this.tool === "rect") {
                this.drawingObject = this.makeRect(pointer.x, pointer.y);
                this.canvas.add(this.drawingObject);
                this.history.suppress = true;
            } else if (this.tool === "ellipse") {
                this.drawingObject = this.makeEllipse(pointer.x, pointer.y);
                this.canvas.add(this.drawingObject);
                this.history.suppress = true;
            }
        });

        this.canvas.on("mouse:move", (opt: any) => {
            const pointer = this.canvas.getPointer(opt.e);
            this.scheduleCoordsUpdate(pointer);

            if (!this.isPointerDown || !this.drawingObject) return;

            const { x: x0, y: y0 } = this.startPoint;
            const x1 = pointer.x;
            const y1 = pointer.y;

            if (this.tool === "line" && this.drawingObject.type === "line") {
                this.drawingObject.set({ x2: x1, y2: y1 });
            } else if (this.tool === "rect" && this.drawingObject.type === "rect") {
                const left = Math.min(x0, x1);
                const top = Math.min(y0, y1);
                const width = Math.abs(x1 - x0);
                const height = Math.abs(y1 - y0);
                this.drawingObject.set({ left, top, width, height });
            } else if (this.tool === "ellipse" && this.drawingObject.type === "ellipse") {
                const rx = Math.max(1, Math.abs(x1 - x0) / 2);
                const ry = Math.max(1, Math.abs(y1 - y0) / 2);
                const cx = (x0 + x1) / 2;
                const cy = (y0 + y1) / 2;
                this.drawingObject.set({ left: cx, top: cy, originX: "center", originY: "center", rx, ry });
            }

            this.drawingObject.setCoords();
            this.canvas.requestRenderAll();
        });

        this.canvas.on("mouse:up", () => {
            if (this.drawingObject) {
                this.drawingObject.selectable = false;
                this.drawingObject.evented = false;
                this.drawingObject = null;
                this.history.suppress = false;
                this.saveHistoryState();
            }
            this.isPointerDown = false;
        });

        this.canvas.on("mouse:dblclick", (opt: any) => {
            const target = opt && opt.target;
            if (target && target.isEquation) this.openEquationEditor({ target });
        });

        this.canvas.on("path:created", () => this.saveHistoryState());

        this.canvas.on("object:modified", (opt: any) => {
            const t = opt && opt.target;
            if (t && t.isEquation && typeof t.getScaledHeight === "function") {
                const scaled = t.getScaledHeight();
                if (Number.isFinite(scaled) && scaled > 0) t.equationSize = Math.round(scaled);
            }
            this.saveHistoryState();
        });

        this.canvas.on("object:removed", () => this.saveHistoryState());

        this.canvas.on("selection:created", () => this.syncUiFromSelection());
        this.canvas.on("selection:updated", () => this.syncUiFromSelection());
    }

    private syncUiFromSelection(): void {
        if (!this.canvas) return;
        const active = this.canvas.getActiveObject();
        if (!active || active.type === "activeSelection") return;

        if (active.isEquation) {
            if (active.equationColor) this.strokeColor = String(active.equationColor);
            this.setStatus("Selected: equation");
            return;
        }

        if (active.stroke) this.strokeColor = String(active.stroke);
        if (active.fill && active.type !== "line") this.fillColor = String(active.fill);
        if (typeof active.strokeWidth === "number") this.strokeWidth = Math.max(1, active.strokeWidth);
        this.setStatus(`Selected: ${active.type}`);
    }

    private forEachActiveObject(fn: (obj: any) => void): void {
        if (!this.canvas) return;
        const active = this.canvas.getActiveObject();
        if (!active) return;
        const objects = active.type === "activeSelection" ? active.getObjects() : [active];
        for (const obj of objects) fn(obj);
    }

    private applyStylesToSelectionIfAny(): void {
        if (!this.canvas) return;
        const active = this.canvas.getActiveObject();
        if (!active) return;

        const stroke = this.strokeColor;
        const fill = this.fillColor;
        const width = this.strokeWidth;

        this.forEachActiveObject((obj) => {
            if (obj.type === "image") return;
            if (obj.isEquation) {
                this.tintEquationObject(obj, stroke);
                obj.equationColor = stroke;
                obj.setCoords();
                return;
            }

            if (obj.type === "line") obj.set({ stroke, strokeWidth: width });
            else obj.set({ stroke, strokeWidth: width, fill });
            obj.setCoords();
        });

        this.canvas.requestRenderAll();
        this.saveHistoryState();
    }

    private makeLine(x1: number, y1: number, x2: number, y2: number): any {
        if (!fabric) return null;
        return new fabric.Line([x1, y1, x2, y2], {
            stroke: this.strokeColor,
            strokeWidth: this.strokeWidth,
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    private makeRect(x: number, y: number): any {
        if (!fabric) return null;
        return new fabric.Rect({
            left: x,
            top: y,
            width: 1,
            height: 1,
            fill: this.fillShapes ? this.fillColor : "rgba(0,0,0,0)",
            stroke: this.strokeColor,
            strokeWidth: this.strokeWidth,
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    private makeEllipse(x: number, y: number): any {
        if (!fabric) return null;
        return new fabric.Ellipse({
            left: x,
            top: y,
            originX: "left",
            originY: "top",
            rx: 1,
            ry: 1,
            fill: this.fillShapes ? this.fillColor : "rgba(0,0,0,0)",
            stroke: this.strokeColor,
            strokeWidth: this.strokeWidth,
            selectable: false,
            evented: false,
            strokeUniform: true,
        });
    }

    private addTextAt(x: number, y: number): void {
        if (!this.canvas) return;
        if (!fabric) return;

        const t = new fabric.IText("Text", {
            left: x,
            top: y,
            fill: this.strokeColor,
            fontSize: 28,
            fontFamily: "Segoe UI, system-ui, sans-serif",
            editable: true,
        });

        this.canvas.add(t);
        this.canvas.setActiveObject(t);
        this.canvas.requestRenderAll();
        this.saveHistoryState();
        this.setTool("select");
        setTimeout(() => t.enterEditing(), 0);
    }

    private withHistorySuppressed(fn: () => void): void {
        const prev = this.history.suppress;
        this.history.suppress = true;
        try {
            fn();
        } finally {
            this.history.suppress = prev;
        }
    }

    private saveHistoryState(): void {
        if (!this.canvas) return;
        if (this.history.isApplying || this.history.suppress) return;

        const json = this.canvas.toDatalessJSON(this.jsonExtraProps);
        const snapshot = JSON.stringify(json);
        const undo = this.history.undo;

        if (undo.length > 0 && undo[undo.length - 1] === snapshot) return;
        undo.push(snapshot);
        if (undo.length > 80) undo.shift();
        this.history.redo = [];
    }

    private restoreFromSnapshot(snapshot: string): void {
        if (!this.canvas) return;
        this.history.isApplying = true;
        this.canvas.discardActiveObject();
        this.canvas.loadFromJSON(snapshot, () => {
            this.canvas.requestRenderAll();
            this.history.isApplying = false;
            this.applyToolToCanvas();
        });
    }

    private openImageFromFile(file: File): void {
        if (!this.canvas) return;
        if (!fabric) return;

        const reader = new FileReader();
        // reader.onload = () => {
        //   fabric.Image.fromURL(
        //     String(reader.result),
        //     (img: any) => {
        //       const cw = this.canvas.getWidth();
        //       const ch = this.canvas.getHeight();
        //       const scale = Math.min((cw * 0.9) / img.width, (ch * 0.9) / img.height, 1);
        //       img.set({
        //         left: cw / 2,
        //         top: ch / 2,
        //         originX: "center",
        //         originY: "center",
        //         scaleX: scale,
        //         scaleY: scale,
        //       });
        //       this.canvas.add(img);
        //       this.canvas.setActiveObject(img);
        //       this.canvas.requestRenderAll();
        //       this.saveHistoryState();
        //       this.setStatus("Image added");
        //     },
        //     { crossOrigin: "anonymous" },
        //   );
        // };
        reader.readAsDataURL(file);
    }

    private ensureMathJaxReady(): Promise<void> {
        if (this.mathJaxReadyPromise) return this.mathJaxReadyPromise;
        this.mathJaxReadyPromise = new Promise((resolve, reject) => {
            const mj = MathJax;
            if (!mj || !mj.startup || !mj.startup.promise) {
                reject(new Error("MathJax failed to load. Check the script tag in src/index.html."));
                return;
            }
            mj.startup.promise.then(() => resolve()).catch(reject);
        });
        return this.mathJaxReadyPromise;
    }

    private scheduleEquationPreview(): void {
        if (!this.eqOpen) return;
        if (this.eqPreviewTimer) window.clearTimeout(this.eqPreviewTimer);
        this.eqPreviewTimer = window.setTimeout(() => void this.renderEquationPreview(this.eqLatex), 160);
    }

    private async renderEquationPreview(latexRaw: string): Promise<void> {
        const previewHost = this.eqPreviewRef?.nativeElement;
        if (!previewHost) return;
        const latex = String(latexRaw || "").trim();
        const seq = ++this.eqPreviewSeq;

        this.eqError = "";
        previewHost.replaceChildren();
        if (!latex) return;

        try {
            await this.ensureMathJaxReady();
            if (seq !== this.eqPreviewSeq) return;

            const mj = MathJax;
            const tex2svgPromise = mj.tex2svgPromise || ((t: string, opts: any) => Promise.resolve(mj.tex2svg(t, opts)));
            const node = await tex2svgPromise(latex, { display: true });
            if (seq !== this.eqPreviewSeq) return;

            node.style.color = this.strokeColor;
            const svg = node.querySelector("svg");
            if (svg) {
                svg.style.height = `${this.eqSize}px`;
                svg.style.width = "auto";
                svg.style.maxWidth = "100%";
            }
            previewHost.appendChild(node);
        } catch (err) {
            this.eqError = err instanceof Error ? err.message : String(err);
        }
    }

    private async latexToSvgString(latex: string, color: string): Promise<string> {
        await this.ensureMathJaxReady();
        const mj = MathJax;
        const tex2svgPromise = mj.tex2svgPromise || ((t: string, opts: any) => Promise.resolve(mj.tex2svg(t, opts)));
        const node = await tex2svgPromise(latex, { display: true });
        const svg = node.querySelector("svg");
        if (!svg) throw new Error("Equation render failed (no SVG output).");
        if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        if (color) svg.style.color = color;
        return svg.outerHTML;
    }

    private loadSvgAsFabricObject(svgString: string): Promise<any> {
        if (!fabric) return Promise.reject(new Error("Fabric.js not loaded."));
        return new Promise((resolve, reject) => {
            try {
                fabric.loadSVGFromString(svgString, (objects: any[], options: any) => {
                    try {
                        const grouped = fabric.util.groupSVGElements(objects, options);
                        resolve(grouped);
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    private isDefaultSvgColor(color: string): boolean {
        const c = this.normalizeCssColor(color);
        return (
            c === "currentcolor" ||
            c === "#000" ||
            c === "#000000" ||
            c === "rgb(0,0,0)" ||
            c === "rgba(0,0,0,1)" ||
            c === "black"
        );
    }

    private tintEquationObject(obj: any, color: string): void {
        const fillOrStroke = color || "#111827";
        const targets = obj?.type === "group" && typeof obj.getObjects === "function" ? obj.getObjects() : [obj];
        for (const t of targets) {
            if (t?.fill && this.isDefaultSvgColor(t.fill)) t.set({ fill: fillOrStroke });
            if (t?.stroke && this.isDefaultSvgColor(t.stroke)) t.set({ stroke: fillOrStroke });
        }
    }

    private async createEquationObject({
        latex,
        sizePx,
        color,
    }: {
        latex: string;
        sizePx: number;
        color: string;
    }): Promise<any> {
        const svgString = await this.latexToSvgString(latex, color);
        const obj = await this.loadSvgAsFabricObject(svgString);

        obj.set({ selectable: false, evented: false, strokeUniform: true });
        obj.isEquation = true;
        obj.equationLatex = latex;
        obj.equationSize = sizePx;
        obj.equationColor = color;

        this.tintEquationObject(obj, color);
        if (Number.isFinite(sizePx) && sizePx > 0 && typeof obj.scaleToHeight === "function") obj.scaleToHeight(sizePx);
        obj.setCoords();
        return obj;
    }

    private openEquationEditor({ point, target }: { point?: Point; target?: any } = {}): void {
        this.eqOpen.set(true);
        this.eqError = "";

        this.eqPoint = point || null;
        this.eqEditingTarget = target || null;

        const latex = target && target.equationLatex ? String(target.equationLatex) : this.eqLastLatex;

        let size = this.eqLastSize;
        if (target) {
            const scaled = typeof target.getScaledHeight === "function" ? target.getScaledHeight() : NaN;
            if (Number.isFinite(scaled) && scaled > 0) size = Math.round(scaled);
            else if (target.equationSize && Number.isFinite(Number(target.equationSize))) size = Number(target.equationSize);
        }

        this.eqLatex = latex;
        this.eqSize = Number.isFinite(size) ? size : 36;

        setTimeout(() => {
            this.eqInputRef?.nativeElement.focus();
            this.scheduleEquationPreview();
        }, 0);
    }
}


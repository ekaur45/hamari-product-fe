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






    ngOnDestroy(): void {
    }
    ngAfterViewInit(): void {
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
    }
    onImageUpload(event: Event): void {
    }
    onToggleFill(): void {
    }
    onLineStyleChange(style: string): void {
    }
    onColorChange(color: string): void {
    }
    onLineWidthChange(value: number): void {
    }
    onBackgroundColorChange(color: string): void {
    }
    onToggleGridVisible(): void {
    }
    onZoomIn(): void {
    }
    onZoomOut(): void {
    }
    onZoomReset(): void {
    }
    onCopySelection(): void {
    }
    onCutSelection(): void {
    }
    onPasteSelection(): void {
    }
    onAlignSelection(alignment: 'left' | 'center' | 'right' | 'top' | 'bottom'): void {
    }
    onLayerChange(direction: 'front' | 'back'): void {
    }
    onDeleteSelection(): void {
    }
    onAddStickyNote(data: { x: number; y: number; color: string }): void {
    }
    
    selectTool(toolId: string): void {
    }
    _onExitWhiteboard(): void {
    }
    onUndo(): void {
    }
    onRedo(): void {
    }
}


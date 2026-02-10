/**
 * Helper functions for whiteboard operations
 */

export interface ToolMapping {
    [key: string]: string;
}

export const TOOL_MAP: ToolMapping = {
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
    'ovalTool': 'oval',
    'ovalToolMobile': 'oval',
    'triangleTool': 'triangle',
    'triangleToolMobile': 'triangle',
    'arrowTool': 'arrow',
    'arrowToolMobile': 'arrow',
    'lineTool': 'line',
    'lineToolMobile': 'line',
    'textTool': 'text',
    'textToolMobile': 'text',
    'imageTool': 'image',
    'imageToolMobile': 'image',
    'selectTool': 'select',
    'stickyNoteTool': 'stickyNote'
};

/**
 * Maps tool ID to tool name
 */
export function getToolFromId(toolId: string): string | undefined {
    return TOOL_MAP[toolId];
}

/**
 * Checks if a tool ID is an image tool
 */
export function isImageTool(toolId: string): boolean {
    return toolId.includes('image');
}

/**
 * Checks if a tool ID is a mobile tool
 */
export function isMobileTool(toolId: string): boolean {
    return toolId.includes('Mobile');
}

/**
 * Formats zoom level as percentage
 */
export function formatZoomLevel(zoom: number): string {
    return Math.round(zoom * 100) + '%';
}

/**
 * Formats fill status
 */
export function formatFillStatus(fill: boolean): string {
    return fill ? 'On' : 'Off';
}

/**
 * Formats grid status
 */
export function formatGridStatus(visible: boolean): string {
    return visible ? 'On' : 'Off';
}

/**
 * Clamps zoom level between min and max
 */
export function clampZoom(zoom: number, min: number = 0.5, max: number = 3): number {
    return Math.max(min, Math.min(max, zoom));
}

/**
 * Calculates mouse/touch position relative to canvas
 */
export function getMousePos(
    e: MouseEvent | TouchEvent,
    canvasWrapper: HTMLElement,
    zoomLevel: number
): { x: number; y: number } {
    const rect = canvasWrapper.getBoundingClientRect();
    
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
    
    const scale = 1 / zoomLevel;
    return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale
    };
}

/**
 * Sets line style on canvas context
 */
export function setLineStyle(context: CanvasRenderingContext2D, style: string): void {
    context.setLineDash([]);
    if (style === 'dashed') {
        context.setLineDash([10, 5]);
    } else if (style === 'dotted') {
        context.setLineDash([2, 2]);
    }
}

/**
 * Default color palette
 */
export const DEFAULT_COLORS = {
    BLACK: '#000000',
    RED: '#ef4444',
    BLUE: '#3b82f6',
    GREEN: '#10b981',
    YELLOW: '#eab308',
    PURPLE: '#a855f7',
    PINK: '#ec4899'
};

/**
 * Background color options
 */
export const BACKGROUND_COLORS = [
    { value: '#ffffff', label: 'White' },
    { value: '#f9fafb', label: 'Gray' },
    { value: '#fef3c7', label: 'Yellow' },
    { value: '#dbeafe', label: 'Blue' },
    { value: '#fce7f3', label: 'Pink' },
    { value: '#e0e7ff', label: 'Purple' },
    { value: '#d1fae5', label: 'Green' }
];


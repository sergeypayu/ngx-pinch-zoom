export interface Params {
    element?: HTMLElement;
    doubleTap?: boolean;
    doubleTapScale?: number;
    zoomControlScale?: number;
    transitionDuration?: number;
    autoZoomOut?: boolean;
    limitZoom?: number | string | 'original image size';
    disablePan?: boolean;
    limitPan?: boolean;
    minPanScale?: number;
    minScale?: number;
    listeners?: 'auto' | 'mouse and touch';
    wheel?: boolean;
    fullImage?: {
        path: string;
        minScale?: number;
    };
    autoHeight?: boolean;
    wheelZoomFactor?: number;
    draggableImage?: boolean;
}

export const defaultParams: Params = {
    transitionDuration: 200,
    doubleTap: true,
    doubleTapScale: 2,
    limitZoom: 'original image size',
    autoZoomOut: false,
    zoomControlScale: 1,
    minPanScale: 1.0001,
    minScale: 0,
    listeners: 'mouse and touch',
    wheel: true,
    wheelZoomFactor: 0.2,
    draggableImage: false,
};

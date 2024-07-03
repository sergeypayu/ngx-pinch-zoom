interface Params {
    element: HTMLElement;
    listeners?: 'auto' | 'mouse and touch';
    touchListeners?: TouchListener[];
    mouseListeners?: MouseListener[];
    otherListeners?: OtherListener[];
    resize?: boolean;
}

type TouchListener = 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
type MouseListener = 'mousedown' | 'mousemove' | 'mouseup' | 'wheel';
type OtherListener = 'resize';

type ListenerType = TouchListener | MouseListener | OtherListener;
export type EventType = ListenerType | 'pan' | 'pinch' | 'horizontal-swipe' | 'vertical-swipe' | 'tap' | 'longtap' | 'double-tap';

const windowListeners = ['resize'];
const documentListeners = ['mouseup', 'mousemove'];

export class Touches {
    private listeners = new Map<ListenerType, (event: Event) => void>();
    private element: HTMLElement;
    private elementPosition: DOMRect;
    private eventType: EventType = undefined;
    private handlers = new Map<EventType, (event: Event) => void>();
    private startX = 0;
    private startY = 0;
    private lastTap = 0;
    private doubleTapTimeout: number;
    private doubleTapMinTimeout = 300;
    private tapMinTimeout = 200;
    private touchstartTime = 0;
    private detectSwipeCounter: number = 0;
    private isMousedown = false;

    constructor(params: Params) {
        this.element = params.element;
        this.elementPosition = this.getElementPosition();

        const touchEvents = params.touchListeners ?? ['touchstart', 'touchend', 'touchmove'];
        // touchcancel should be handled always
        touchEvents.push('touchcancel');
        const mouseEvents = params.mouseListeners ?? ['mousedown', 'mousemove', 'mouseup', 'wheel'];
        const otherEvents = ['resize'] as OtherListener[];

        let listeners: (TouchListener | MouseListener | OtherListener)[];

        if (params.listeners === 'mouse and touch') {
            listeners = [...touchEvents, ...mouseEvents];
        } else if (this.detectTouchScreen()) {
            listeners = touchEvents;
        } else {
            listeners = mouseEvents;
        }

        if (params.resize) {
            listeners.push(...otherEvents);
        }

        // filter-out non-unique listeners
        this.addEventListeners([...new Set(listeners)]);
    }

    public destroy(): void {
        this.removeEventListeners(Array.from(this.listeners.keys()));
    }

    public addEventListeners(listeners: ListenerType[]): void {
        const handlers = {
            touchstart: this.handleTouchstart,
            touchend: this.handleTouchend,
            touchmove: this.handleTouchmove,
            touchcancel: this.handleTouchcancel,
            mousedown: this.handleMousedown,
            mousemove: this.handleMousemove,
            mouseup: this.handleMouseup,
            wheel: this.handleWheel,
            resize: this.handleResize,
        };

        for (const listener of listeners) {
            if (this.listeners.has(listener)) {
                continue;
            }

            this.listeners.set(listener, handlers[listener]);

            if (windowListeners.includes(listener)) {
                window.addEventListener(listener, this.listeners.get(listener));
            } else if (documentListeners.includes(listener)) {
                document.addEventListener(listener, this.listeners.get(listener));
            } else {
                this.element.addEventListener(listener, this.listeners.get(listener));
            }
        }
    }

    public removeEventListeners(listeners: ListenerType[]): void {
        for (const listener of listeners) {
            if (!this.listeners.has(listener)) {
                continue;
            }

            if (windowListeners.includes(listener)) {
                window.removeEventListener(listener, this.listeners.get(listener));
            } else if (documentListeners.includes(listener)) {
                document.removeEventListener(listener, this.listeners.get(listener));
            } else {
                this.element.removeEventListener(listener, this.listeners.get(listener));
            }

            this.listeners.delete(listener);
        }
    }

    /*
     * Listeners
     */

    /* Touchstart */

    private handleTouchstart = (event: TouchEvent): void => {
        this.elementPosition = this.getElementPosition();
        this.touchstartTime = new Date().getTime();

        if (this.eventType === undefined) {
            this.getTouchstartPosition(event);
        }

        this.runHandler('touchstart', event);
    };

    /* Touchmove */

    private handleTouchmove = (event: TouchEvent): void => {
        const touches = event.touches;

        // Pan
        if (this.detectPan(touches)) {
            this.runHandler('pan', event);
        }

        // Pinch
        if (this.detectPinch(event)) {
            this.runHandler('pinch', event);
        }
    };

    /* Touchend */

    private handleTouchend = (event: TouchEvent): void => {
        const touches = event.touches;

        // Double Tap
        if (this.detectDoubleTap()) {
            this.runHandler('double-tap', event);
        }

        // Tap
        this.detectTap();

        this.runHandler('touchend', event);
        this.eventType = 'touchend';

        if (touches && touches.length === 0) {
            this.eventType = undefined;
            this.detectSwipeCounter = 0;
        }
    };

    /* Touchcancel */

    private handleTouchcancel = (event: TouchEvent): void => {
        this.runHandler('touchcancel', event);

        this.eventType = undefined;
        this.detectSwipeCounter = 0;
    };

    /* Mousedown */

    private handleMousedown = (event: MouseEvent): void => {
        // ignore non-left button clicks
        if (event.button !== 0) {
            return;
        }

        this.isMousedown = true;
        this.elementPosition = this.getElementPosition();
        this.touchstartTime = new Date().getTime();

        if (this.eventType === undefined) {
            this.getMousedownPosition(event);
        }

        this.runHandler('mousedown', event);
    };

    /* Mousemove */

    private handleMousemove = (event: MouseEvent): void => {
        //event.preventDefault();

        if (!this.isMousedown) {
            return;
        }

        // Pan
        this.runHandler('pan', event);

        // Linear swipe
        if (this.detectLinearSwipe(event)) {
            this.detectSwipeCounter++;

            if (this.detectSwipeCounter > 3) {
                this.eventType = this.getLinearSwipeType(event);
            }

            if (this.eventType === 'horizontal-swipe') {
                this.runHandler('horizontal-swipe', event);
            }

            if (this.eventType === 'vertical-swipe') {
                this.runHandler('vertical-swipe', event);
            }
        }
    };

    /* Mouseup */

    private handleMouseup = (event: MouseEvent): void => {
        // Tap
        this.detectTap();

        this.isMousedown = false;
        this.runHandler('mouseup', event);
        this.eventType = undefined;
        this.detectSwipeCounter = 0;
    };

    /* Wheel */

    private handleWheel = (event: WheelEvent): void => {
        this.runHandler('wheel', event);
    };

    /* Resize */

    private handleResize = (event: Event): void => {
        this.runHandler('resize', event);
    };

    private runHandler(eventName: EventType, event: Event): void {
        if (this.handlers.has(eventName)) {
            this.handlers.get(eventName)(event);
        }
    }

    /*
     * Detection
     */

    private detectPan(touches: TouchList): boolean {
        return (touches.length === 1 && !this.eventType) || this.eventType === 'pan';
    }

    private detectDoubleTap(): boolean {
        if (this.eventType != undefined) {
            return;
        }

        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.lastTap;

        window.clearTimeout(this.doubleTapTimeout);

        if (tapLength < this.doubleTapMinTimeout && tapLength > 0) {
            return true;
        } else {
            this.doubleTapTimeout = window.setTimeout(() => {
                window.clearTimeout(this.doubleTapTimeout);
            }, this.doubleTapMinTimeout);
        }
        this.lastTap = currentTime;

        return undefined;
    }

    private detectTap(): void {
        if (this.eventType != undefined) {
            return;
        }

        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.touchstartTime;

        if (tapLength > 0) {
            if (tapLength < this.tapMinTimeout) {
                this.runHandler('tap', {} as Event);
            } else {
                this.runHandler('longtap', {} as Event);
            }
        }
    }

    private detectPinch(event: TouchEvent): boolean {
        const touches = event.touches;
        return (touches.length === 2 && this.eventType === undefined) || this.eventType === 'pinch';
    }

    private detectLinearSwipe(event: MouseEvent | TouchEvent): 'vertical-swipe' | 'horizontal-swipe' {
        const touches = (event as TouchEvent).touches;

        if (touches) {
            if ((touches.length === 1 && !this.eventType) || this.eventType === 'horizontal-swipe' || this.eventType === 'vertical-swipe') {
                return this.getLinearSwipeType(event);
            }
        } else {
            if (!this.eventType || this.eventType === 'horizontal-swipe' || this.eventType === 'vertical-swipe') {
                return this.getLinearSwipeType(event);
            }
        }

        return undefined;
    }

    private getLinearSwipeType(event: TouchEvent | MouseEvent): 'vertical-swipe' | 'horizontal-swipe' {
        if (this.eventType !== 'horizontal-swipe' && this.eventType !== 'vertical-swipe') {
            const movementX = Math.abs(this.moveLeft(0, event) - this.startX);
            const movementY = Math.abs(this.moveTop(0, event) - this.startY);

            if (movementY * 3 > movementX) {
                return 'vertical-swipe';
            } else {
                return 'horizontal-swipe';
            }
        } else {
            return this.eventType;
        }
    }

    private getElementPosition(): DOMRect {
        return this.element.getBoundingClientRect();
    }

    private getTouchstartPosition(event: TouchEvent): void {
        this.startX = event.touches[0].clientX - this.elementPosition.left;
        this.startY = event.touches[0].clientY - this.elementPosition.top;
    }

    private getMousedownPosition(event: MouseEvent): void {
        this.startX = event.clientX - this.elementPosition.left;
        this.startY = event.clientY - this.elementPosition.top;
    }

    private moveLeft(index: number, event: TouchEvent | MouseEvent): number {
        const touches = (event as TouchEvent).touches;

        if (touches) {
            return touches[index].clientX - this.elementPosition.left;
        } else {
            return (event as MouseEvent).clientX - this.elementPosition.left;
        }
    }

    private moveTop(index: number, event: TouchEvent | MouseEvent): number {
        const touches = (event as TouchEvent).touches;

        if (touches) {
            return touches[index].clientY - this.elementPosition.top;
        } else {
            return (event as MouseEvent).clientY - this.elementPosition.top;
        }
    }

    public detectTouchScreen(): boolean {
        const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
        const mq = (query: string): boolean => {
            return window.matchMedia(query).matches;
        };

        if ('ontouchstart' in window) {
            return true;
        }

        // include the 'heartz' as a way to have a non-matching MQ to help terminate the join
        // https://git.io/vznFH
        const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    }

    /* Public properties and methods */
    public on(eventType: EventType, handler: (event: Event) => void): void {
        if (eventType) {
            this.handlers.set(eventType, handler);
        }
    }
}

import { Component, ElementRef, HostBinding, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

import { Properties } from './interfaces';
import { defaultProperties, backwardCompatibilityProperties } from './properties';
import { IvyPinch } from './ivypinch';

interface ComponentProperties extends Properties {
    disabled?: boolean;
    overflow?: 'hidden' | 'visible';
    disableZoomControl?: 'disable' | 'never' | 'auto';
    backgroundColor?: string;
}

export const _defaultComponentProperties: ComponentProperties = {
    overflow: 'hidden',
    disableZoomControl: 'auto',
    backgroundColor: 'rgba(0,0,0,0.85)',
};

@Component({
    selector: 'pinch-zoom, [pinch-zoom]',
    exportAs: 'pinchZoom',
    templateUrl: './pinch-zoom.component.html',
    styleUrls: ['./pinch-zoom.component.sass'],
})
export class PinchZoomComponent implements OnInit, OnDestroy, OnChanges {
    private pinchZoom: IvyPinch;
    private _properties!: ComponentProperties;
    private readonly defaultComponentProperties!: ComponentProperties;
    private _transitionDuration!: number;
    private _doubleTap!: boolean;
    private _doubleTapScale!: number;
    private _autoZoomOut!: boolean;
    private _limitZoom!: number | 'original image size';

    @Input('properties') set properties(value: ComponentProperties) {
        if (value) {
            this._properties = value;
        }
    }

    get properties(): ComponentProperties {
        return this._properties;
    }

    // transitionDuration
    @Input('transition-duration') set transitionDurationBackwardCompatibility(value: number) {
        if (value) {
            this._transitionDuration = value;
        }
    }

    @Input('transitionDuration') set transitionDuration(value: number) {
        if (value) {
            this._transitionDuration = value;
        }
    }

    get transitionDuration(): number {
        return this._transitionDuration;
    }

    // doubleTap
    @Input('double-tap') set doubleTapBackwardCompatibility(value: boolean) {
        if (value) {
            this._doubleTap = value;
        }
    }

    @Input('doubleTap') set doubleTap(value: boolean) {
        if (value) {
            this._doubleTap = value;
        }
    }

    get doubleTap(): boolean {
        return this._doubleTap;
    }

    // doubleTapScale
    @Input('double-tap-scale') set doubleTapScaleBackwardCompatibility(value: number) {
        if (value) {
            this._doubleTapScale = value;
        }
    }

    @Input('doubleTapScale') set doubleTapScale(value: number) {
        if (value) {
            this._doubleTapScale = value;
        }
    }

    get doubleTapScale(): number {
        return this._doubleTapScale;
    }

    // autoZoomOut
    @Input('auto-zoom-out') set autoZoomOutBackwardCompatibility(value: boolean) {
        if (value) {
            this._autoZoomOut = value;
        }
    }

    @Input('autoZoomOut') set autoZoomOut(value: boolean) {
        if (value) {
            this._autoZoomOut = value;
        }
    }

    get autoZoomOut(): boolean {
        return this._autoZoomOut;
    }

    // limitZoom
    @Input('limit-zoom') set limitZoomBackwardCompatibility(value: number | 'original image size') {
        if (value) {
            this._limitZoom = value;
        }
    }

    @Input('limitZoom') set limitZoom(value: number | 'original image size') {
        if (value) {
            this._limitZoom = value;
        }
    }

    get limitZoom(): number | 'original image size' {
        return this._limitZoom;
    }

    @Input() disabled!: boolean;
    @Input() disablePan!: boolean;
    @Input() overflow!: 'hidden' | 'visible';
    @Input() zoomControlScale!: number;
    @Input() disableZoomControl!: 'disable' | 'never' | 'auto';
    @Input() backgroundColor!: string;
    @Input() limitPan!: boolean;
    @Input() minPanScale!: number;
    @Input() minScale!: number;
    @Input() listeners!: 'auto' | 'mouse and touch';
    @Input() wheel!: boolean;
    @Input() autoHeight!: boolean;
    @Input() wheelZoomFactor!: number;
    @Input() draggableImage!: boolean;

    @HostBinding('style.zIndex')
    get hostZIndex(): number | undefined {
        // need to set z-index for the pinch-zoom component, so it will overlap other <pinch-zoom> if any
        return this._properties.overflow === 'visible' ? 1 : undefined;
    }

    @HostBinding('style.overflow')
    get hostOverflow(): 'hidden' | 'visible' {
        return this._properties.overflow;
    }

    @HostBinding('style.background-color')
    get hostBackgroundColor(): string {
        return this._properties.backgroundColor;
    }

    get isTouchScreen(): boolean {
        return this.pinchZoom?.isTouchScreen();
    }

    get isDragging(): boolean {
        return this.pinchZoom?.isDragging();
    }

    get isDisabled(): boolean {
        return this._properties.disabled;
    }

    get scale(): number {
        return this.pinchZoom.scale;
    }

    get isZoomedIn(): boolean {
        return this.scale > 1;
    }

    get scaleLevel(): number {
        return Math.round(this.scale / this._zoomControlScale);
    }

    get maxScale(): number {
        return this.pinchZoom.maxScale;
    }

    get isZoomLimitReached(): boolean {
        return this.scale >= this.maxScale;
    }

    get _zoomControlScale(): number {
        return this.getPropertiesValue('zoomControlScale');
    }

    constructor(private elementRef: ElementRef<HTMLElement>) {
        this.defaultComponentProperties = this.getDefaultComponentProperties();
        this.applyPropertiesDefault(this.defaultComponentProperties, {});
    }

    ngOnInit(): void {
        this.initPinchZoom();

        /* Calls the method until the image size is available */
        this.detectLimitZoom();
    }

    ngOnChanges(changes: SimpleChanges): void {
        let changedProperties = this.getProperties(changes);
        changedProperties = this.renameProperties(changedProperties);

        this.applyPropertiesDefault(this.defaultComponentProperties, changedProperties);
    }

    ngOnDestroy(): void {
        this.destroy();
    }

    private initPinchZoom(): void {
        if (this._properties.disabled) {
            return;
        }

        this._properties.limitZoom = this.limitZoom;
        this._properties.element = this.elementRef.nativeElement.querySelector('.pinch-zoom-content');
        this.pinchZoom = new IvyPinch(this._properties);
    }

    private getProperties(changes: SimpleChanges): ComponentProperties | Record<keyof typeof backwardCompatibilityProperties, unknown> {
        let properties: ComponentProperties = {};

        for (const prop in changes) {
            if (prop !== 'properties') {
                properties[prop] = changes[prop].currentValue;
            }
            if (prop === 'properties') {
                properties = changes[prop].currentValue;
            }
        }
        return properties;
    }

    private renameProperties(
        properties: ComponentProperties | Record<keyof typeof backwardCompatibilityProperties, unknown>
    ): ComponentProperties {
        for (const prop in properties) {
            if (backwardCompatibilityProperties[prop]) {
                properties[backwardCompatibilityProperties[prop]] = properties[prop];
                delete properties[prop];
            }
        }

        return properties as ComponentProperties;
    }

    private applyPropertiesDefault(defaultProperties: ComponentProperties, properties: ComponentProperties): void {
        this.properties = Object.assign({}, defaultProperties, properties);
    }

    toggleZoom(): void {
        this.pinchZoom?.toggleZoom();
    }

    isControl(): boolean {
        if (this.isDisabled) {
            return false;
        }

        if (this._properties.disableZoomControl === 'disable') {
            return false;
        }

        if (this.isTouchScreen && this._properties.disableZoomControl === 'auto') {
            return false;
        }

        return true;
    }

    detectLimitZoom(): void {
        this.pinchZoom?.detectLimitZoom();
    }

    destroy(): void {
        this.pinchZoom?.destroy();
    }

    private getPropertiesValue<K extends keyof ComponentProperties>(propertyName: K): ComponentProperties[K] {
        if (this._properties && this._properties[propertyName]) {
            return this._properties[propertyName];
        } else {
            return this.defaultComponentProperties[propertyName];
        }
    }

    private getDefaultComponentProperties(): ComponentProperties {
        return { ...defaultProperties, ..._defaultComponentProperties };
    }
}

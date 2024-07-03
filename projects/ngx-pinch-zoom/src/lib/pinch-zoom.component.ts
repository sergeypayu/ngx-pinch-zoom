import { Component, ElementRef, HostBinding, input, OnDestroy, OnInit } from '@angular/core';

import { IvyPinch } from './ivypinch';
import { Params } from './params';

@Component({
    selector: 'pinch-zoom, [pinch-zoom]',
    exportAs: 'pinchZoom',
    templateUrl: './pinch-zoom.component.html',
    styleUrls: ['./pinch-zoom.component.sass'],
})
export class PinchZoomComponent implements OnInit, OnDestroy {
    private pinchZoom: IvyPinch;

    public readonly disabled = input<boolean>(false);
    public readonly overflow = input<'hidden' | 'visible'>('hidden');
    public readonly disableZoomControl = input<'disable' | 'never' | 'auto'>('auto');
    public readonly backgroundColor = input<string>('rgba(0,0,0,0.85)');

    public readonly params = input<Params>({});

    @HostBinding('style.zIndex')
    get hostZIndex(): number | undefined {
        // need to set z-index for the pinch-zoom component, so it will overlap other <pinch-zoom> if any
        return this.overflow() === 'visible' ? 1 : undefined;
    }

    @HostBinding('style.overflow')
    get hostOverflow(): 'hidden' | 'visible' {
        return this.overflow();
    }

    @HostBinding('style.background-color')
    get hostBackgroundColor(): string {
        return this.backgroundColor();
    }

    private get isTouchScreen(): boolean {
        return this.pinchZoom?.isTouchScreen();
    }

    protected get isDragging(): boolean {
        return this.pinchZoom?.isDragging();
    }

    private get scale(): number {
        return this.pinchZoom.scale;
    }

    protected get isZoomedIn(): boolean {
        return this.scale > 1;
    }

    private get scaleLevel(): number {
        return Math.round(this.scale / this.params().zoomControlScale);
    }

    private get maxScale(): number {
        return this.pinchZoom.maxScale;
    }

    private get isZoomLimitReached(): boolean {
        return this.scale >= this.maxScale;
    }

    constructor(private elementRef: ElementRef<HTMLElement>) {}

    ngOnInit(): void {
        this.initPinchZoom();

        /* Calls the method until the image size is available */
        this.detectLimitZoom();
    }

    ngOnDestroy(): void {
        this.destroy();
    }

    private initPinchZoom(): void {
        if (this.disabled()) {
            return;
        }

        const element: HTMLElement = this.elementRef.nativeElement.querySelector('.pinch-zoom-content');
        this.pinchZoom = new IvyPinch({
            ...this.params(),
            element,
        });
    }

    public toggleZoom(): void {
        this.pinchZoom?.toggleZoom();
    }

    protected isControl(): boolean {
        if (this.disabled()) {
            return false;
        }

        if (this.disableZoomControl() === 'disable') {
            return false;
        }

        if (this.isTouchScreen && this.disableZoomControl() === 'auto') {
            return false;
        }

        return true;
    }

    private detectLimitZoom(): void {
        this.pinchZoom?.detectLimitZoom();
    }

    public destroy(): void {
        this.pinchZoom?.destroy();
    }
}

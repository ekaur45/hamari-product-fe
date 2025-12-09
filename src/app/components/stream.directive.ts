import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[appStream]',
    standalone: true
})
export class StreamDirective {
    @Input() set appStream(stream: MediaStream | null) {
        const video = this.el.nativeElement as HTMLVideoElement;
        if (stream) {
            video.srcObject = stream;
        }
    }

    constructor(private el: ElementRef) { }
}

import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeValue
} from '@angular/platform-browser';

type SafeType = 'url' | 'resourceUrl' | 'script' | 'style' | 'html';

@Pipe({
  name: 'safe',
  standalone: true // optional, recommended in Angular 20
})
export class SafePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, type: SafeType = 'url'): SafeValue {
    switch (type) {
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(value);

      case 'resourceUrl':
        return this.sanitizer.bypassSecurityTrustResourceUrl(value);

      case 'script':
        return this.sanitizer.bypassSecurityTrustScript(value);

      case 'style':
        return this.sanitizer.bypassSecurityTrustStyle(value);

      case 'html':
        return this.sanitizer.bypassSecurityTrustHtml(value);

      default:
        return value;
    }
  }
}

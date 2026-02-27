import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeValue
} from '@angular/platform-browser';
import moment from 'moment';

@Pipe({
  name: 'relativeTime',
  standalone: true // optional, recommended in Angular 20
})
export class RelativeTimePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): string {
    return moment(value).fromNow();
  }
}

import { Directive, ElementRef, AfterViewInit } from '@angular/core';
import * as Prism from 'prismjs';

@Directive({
  selector: '[appPrismHighlight]',
})
export class PrismHighlightDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    Prism.highlightElement(this.el.nativeElement);
  }
}

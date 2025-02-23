import {
  Component,
  Input,
  OnChanges,
  SimpleChange,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import dayjs from 'dayjs';

@Component({
  selector: 'app-value-renderer',
  standalone: false,
  templateUrl: './value-renderer.component.html',
  styleUrls: ['./value-renderer.component.css'],
  // Provide DatePipe if you want to inject it
  providers: [DatePipe],
})
export class ValueRendererComponent implements OnChanges, OnInit {
  @Input() value: any;

  constructor(public datePipe: DatePipe) {}

  ngOnChanges(changes: { [propName: string]: SimpleChange }): void {
    if (changes['value']) {
      this.fixValue();
    }
  }

  ngOnInit(): void {
    this.fixValue();
  }

  fixValue(): void {
    if (
      typeof this.value === 'string' &&
      this.value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    ) {
      this.value = dayjs(this.value);
    }
  }

  isDate(val: any): boolean {
    return val instanceof Date && !isNaN(val.getTime());
  }

  isDayjs(val: any): boolean {
    return dayjs.isDayjs(val);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isPlainObject(val: any): boolean {
    return (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      !this.isDate(val) &&
      !this.isDayjs(val)
    );
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  /**
   * If the array items are themselves objects or dates, you can do further logic here.
   * For simplicity, we treat array items as simple strings.
   */
  formatSimple(item: any): string {
    if (item === null || item === undefined || item === '') {
      return 'Blank';
    }

    if (this.isDate(item)) {
      return this.datePipe.transform(item, 'short') ?? item.toString();
    }
    if (dayjs.isDayjs(item)) {
      return item.format('YYYY-MM-DD');
    }
    if (typeof item === 'object') {
      return '[object]'; // or JSON.stringify(item)
    }
    return String(item);
  }
}

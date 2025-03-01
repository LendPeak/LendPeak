import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import dayjs, { Dayjs } from 'dayjs';

@Component({
  selector: 'app-value-renderer',
  templateUrl: './value-renderer.component.html',
  styleUrls: ['./value-renderer.component.css'],
  providers: [DatePipe],
  standalone: false,
})
export class ValueRendererComponent implements OnInit, OnChanges {
  @Input() value: any;

  constructor(public datePipe: DatePipe) {}

  ngOnInit(): void {
    this.fixValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.fixValue();
    }
  }

  /**
   * If the input is an ISO string that looks like a date,
   * convert it to a dayjs object for easier display.
   */
  fixValue(): void {
    if (
      typeof this.value === 'string' &&
      this.value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
    ) {
      this.value = dayjs(this.value);
    }
  }

  // --- Type checks ---
  isDate(val: any): val is Date {
    return val instanceof Date && !isNaN(val.getTime());
  }

  isDayjs(val: any): val is Dayjs {
    return dayjs.isDayjs(val);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  /**
   * We call it "plain object" if:
   * - it's not null
   * - typeof is object
   * - not an Array
   * - not a Date
   * - not a dayjs object
   */
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
    if (!obj) return [];
    return Object.keys(obj);
  }

  /**
   * Extract all unique keys across an array of objects
   * so we can render them as table columns.
   */
  getAllKeysInArrayOfObjects(arr: any[]): string[] {
    const keySet = new Set<string>();
    arr.forEach((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach((k) => keySet.add(k));
      }
    });
    return Array.from(keySet);
  }
}

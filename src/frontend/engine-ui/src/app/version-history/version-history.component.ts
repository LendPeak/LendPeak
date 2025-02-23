import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { AmortizationVersionManager } from 'lendpeak-engine/models/AmortizationVersionManager';
import { AmortizationVersion } from 'lendpeak-engine/models/AmortizationVersion';
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-version-history',
  templateUrl: './version-history.component.html',
  styleUrls: ['./version-history.component.css'],
  standalone: false,
})
export class VersionHistoryComponent implements OnChanges {
  @Input() manager!: AmortizationVersionManager;
  @Input() refreshEvent?: EventEmitter<AmortizationVersionManager>;
  @Output() onRollback = new EventEmitter<{
    versionId: string;
    event: Event;
  }>();

  // If you want to store version history as a local array:
  versions: AmortizationVersion[] = [];
  public versionEvents: any[] = [];
  private refreshSub?: Subscription;
  private datePipe = new DatePipe('en-US');

  constructor() {}

  ngOnInit() {
    this.refresh();
    if (this.refreshEvent) {
      this.refreshSub = this.refreshEvent.subscribe((newManager) => {
        this.manager = newManager;
        this.refresh();
      });
    }
  }

  // Good practice: unsubscribe in OnDestroy
  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manager']) {
      this.manager = changes['manager'].currentValue;
      // this.manager = changes['manager'].currentValue;
      // console.log('New manager: ', this.manager);
      this.refresh();
    }
  }

  refresh(): void {
    if (this.manager) {
      this.versionEvents = [];

      const events = this.manager.versions;

      this.versionEvents = [...events];
      this.versionEvents = this.versionEvents.reverse();
    } else {
      console.warn('No manager provided');
      return;
    }
  }

  formatValue(value: any): string {
    if (value == null) {
      return 'Blank';
    }

    // 1) If it’s a Date object
    if (value instanceof Date) {
      return this.datePipe.transform(value, 'medium') ?? String(value);
    }

    // 2) If it’s a Dayjs object
    if (dayjs.isDayjs(value)) {
      return value.format('YYYY-MM-DD HH:mm:ss'); // or any format you like
    }

    // 3) If it's a normal object or array, just show JSON.
    //    (Optionally you can do a partial approach if the object is huge.)
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2); // multiline JSON if you want
      } catch (err) {
        return '[object Object]'; // fallback
      }
    }

    // 4) For everything else (numbers, strings, booleans, etc.)
    return String(value);
  }

  objectKeys = Object.keys; // for *ngFor over object keys

  isEmpty(obj: any): boolean {
    return !obj || Object.keys(obj).length === 0;
  }

  rollbackVersion(versionId: string, event: Event): void {
    this.onRollback.emit({ versionId, event });
  }

  isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FinancialOpsVersionManager } from 'lendpeak-engine/models/FinancialOpsVersionManager';
import { FinancialOpsVersion } from 'lendpeak-engine/models/FinancialOpsVersionManager';
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';
import { DatePipe } from '@angular/common';

/**
 * A component that displays version history for Bills + Deposits (financial ops).
 */
@Component({
  selector: 'app-financial-ops-history',
  templateUrl: './financial-ops-history.component.html',
  styleUrls: ['./financial-ops-history.component.css'],
  standalone: false,
})
export class FinancialOpsHistoryComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() manager!: FinancialOpsVersionManager;
  /**
   * If you have an event emitter from the parent that refreshes the manager,
   * you can accept it here. If not, you can remove this logic.
   */
  @Input() refreshEvent?: EventEmitter<FinancialOpsVersionManager>;

  /**
   * Emitted when the user clicks "Rollback" on a given version.
   * The payload has `versionId` and the DOM event, so the parent can confirm/rollback.
   */
  @Output() onRollback = new EventEmitter<{
    versionId: string;
    event: Event;
  }>();

  // Data we display in the template
  versions: FinancialOpsVersion[] = [];
  versionEvents: FinancialOpsVersion[] = [];

  private refreshSub?: Subscription;
  private datePipe = new DatePipe('en-US');

  ngOnInit(): void {
    // Initial load
    this.refresh();
    // If we have a refreshEvent from the parent, subscribe
    if (this.refreshEvent) {
      this.refreshSub = this.refreshEvent.subscribe((newManager) => {
        this.manager = newManager;
        this.refresh();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manager']) {
      this.manager = changes['manager'].currentValue;
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private refresh(): void {
    if (!this.manager) {
      console.warn('FinancialOpsHistoryComponent: No manager provided.');
      return;
    }

    // We can simply read manager.versions or manager.getVersionHistory()
    const events = this.manager.getVersionHistory(/*includeDeleted=*/ false);
    // Reverse them if you want newest -> oldest
    this.versionEvents = [...events].reverse();
  }

  /**
   * Utility for formatting oldValue/newValue in the table
   * (similar logic to your loan version code).
   */
  formatValue(value: any): string {
    if (value == null) {
      return 'Blank';
    }
    // 1) Date?
    if (value instanceof Date) {
      return this.datePipe.transform(value, 'medium') ?? String(value);
    }
    // 2) dayjs?
    if (dayjs.isDayjs(value)) {
      return (value as any).format('YYYY-MM-DD HH:mm:ss');
    }
    // 3) object => JSON
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[object Object]';
      }
    }
    // 4) Default
    return String(value);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
  isEmpty(obj: any): boolean {
    return !obj || Object.keys(obj).length === 0;
  }

  /**
   * Called when user clicks "Rollback"
   */
  rollbackVersion(versionId: string, event: Event) {
    this.onRollback.emit({ versionId, event });
  }

  isLatestVersion(version: FinancialOpsVersion): boolean {
    return this.manager.isLatestVersion(version.versionId);
  }
}

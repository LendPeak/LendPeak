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

@Component({
  selector: 'app-version-history',
  templateUrl: './version-history.component.html',
  styleUrls: ['./version-history.component.css'],
  standalone: false,
})
export class VersionHistoryComponent implements OnChanges {
  @Input() manager!: AmortizationVersionManager;
  @Input() refreshEvent?: EventEmitter<AmortizationVersionManager>;
  @Output() onRollback = new EventEmitter<string>(); // if you want to notify parent

  // If you want to store version history as a local array:
  versions: AmortizationVersion[] = [];
  public versionEvents: any[] = [];
  private refreshSub?: Subscription;

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

  rollbackToVersion(versionId: string) {
    // Optionally emit to the parent
    this.onRollback.emit(versionId);
  }

  objectKeys = Object.keys; // for *ngFor over object keys

  isEmpty(obj: any): boolean {
    return !obj || Object.keys(obj).length === 0;
  }

  rollbackVersion(versionId: string) {
    // e.g. call your manager.rollback(...) or emit an event to your parent
    console.log('Rollback to version: ', versionId);
  }
}

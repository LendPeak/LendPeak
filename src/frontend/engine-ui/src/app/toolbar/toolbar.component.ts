// toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from 'primeng/api';
import dayjs from 'dayjs';
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
  standalone: false,
})
export class ToolbarComponent {
  @Input() snapshotDate: Date = new Date();
  @Output() snapshotDateChange = new EventEmitter<Date>();

  @Input() toolbarActions: MenuItem[] = [];

  isToday(date: Date): boolean {
    return DateUtil.normalizeDate(date).isEqual(DateUtil.today());
  }

  onSnapshotDateChange(date: Date) {
    this.snapshotDateChange.emit(date);
  }
}

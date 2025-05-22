// toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from 'primeng/api';
import dayjs from 'dayjs';
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { sequence } from '@angular/animations';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
  standalone: false,
})
export class ToolbarComponent {
  @Input() snapshotDate: Date = new Date();
  @Output() snapshotDateChange = new EventEmitter<Date>();
  @Output() openDemoLoanBrowser = new EventEmitter<void>();

  @Input() toolbarActions: MenuItem[] = [];

  isToday(date: Date): boolean {
    const normalizeDate = DateUtil.normalizeDate(
      `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
    );
    const today = DateUtil.today();
    //  console.log(`isToday: ${date} | ${normalizeDate} === ${today}`);
    return normalizeDate.isEqual(today);
  }

  onSnapshotDateChange(date: Date) {
    this.snapshotDateChange.emit(date);
  }
}

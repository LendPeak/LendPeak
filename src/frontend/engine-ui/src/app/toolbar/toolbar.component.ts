// toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from 'primeng/api';
import dayjs from 'dayjs';

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
    return dayjs(date).isSame(dayjs(), 'day');
  }

  onSnapshotDateChange(date: Date) {
    this.snapshotDateChange.emit(date);
  }
}

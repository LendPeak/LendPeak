// toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from 'primeng/api';
import dayjs from 'dayjs';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent {
  @Input() snapshotDate: Date = new Date();
  @Output() snapshotDateChange = new EventEmitter<Date>();

  @Input() toolbarActions: MenuItem[] = [];
  @Output() saveUIState = new EventEmitter<void>();
  @Output() resetUIState = new EventEmitter<void>();

  
  isToday(date: Date): boolean {
    return dayjs(date).isSame(dayjs(), 'day');
  }

  onSnapshotDateChange(date: Date) {
    this.snapshotDateChange.emit(date);
  }

  onSaveUIState() {
    this.saveUIState.emit();
  }

  onResetUIState() {
    this.resetUIState.emit();
  }
}

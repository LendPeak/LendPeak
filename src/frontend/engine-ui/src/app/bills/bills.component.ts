// bills.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Bill } from 'lendpeak-engine/models/Bill';
import { Dayjs } from 'dayjs';

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css'],
})
export class BillsComponent {
  @Input() bills: Bill[] = [];
  @Input() snapshotDate: Date = new Date();

  @Output() billAction = new EventEmitter<void>();

  selectedBill: Bill | null = null;
  showPaymentDetailsDialog: boolean = false;

  viewPaymentDetails(bill: Bill) {
    this.selectedBill = bill;
    this.showPaymentDetailsDialog = true;
  }

  onPaymentDetailsDialogHide() {
    this.showPaymentDetailsDialog = false;
    this.selectedBill = null;
  }
}

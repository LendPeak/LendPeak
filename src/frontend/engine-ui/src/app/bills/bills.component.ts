import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { Bill } from 'lendpeak-engine/models/Bill';
import { Bills } from 'lendpeak-engine/models/Bills';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { BillPaymentDetail } from 'lendpeak-engine/models/Bill/BillPaymentDetail';

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css'],
  standalone: false,
})
export class BillsComponent implements AfterViewInit {
  @Input() bills: Bills = new Bills();
  @Input() depositRecords: DepositRecords = new DepositRecords();
  @Input() snapshotDate: Date = new Date();

  @Output() billAction = new EventEmitter<void>();

  // This will hold the references to each table row
  @ViewChildren('billRow', { read: ElementRef })
  billRows!: QueryList<ElementRef>;

  highlightedBillId?: string;

  selectedBill: Bill | null = null;
  showPaymentDetailsDialog: boolean = false;

  selectedPaymentDeposit: DepositRecord | null = null;
  showSinglePaymentDialog: boolean = false;

  ngAfterViewInit(): void {
    // The rows should be available after the view initializes.
    // If bills are loaded asynchronously later, consider calling scrollToLastDueBill after bills change.
  }

  viewPaymentDetails(bill: Bill) {
    this.selectedBill = bill;
    this.showPaymentDetailsDialog = true;
  }

  onPaymentDetailsDialogHide() {
    this.showPaymentDetailsDialog = false;
    this.selectedBill = null;
  }

  viewSinglePaymentDetail(detail: BillPaymentDetail) {
    // find the deposit in depositRecords by depositId
    const deposit = this.depositRecords.getById(detail.depositId);
    if (deposit) {
      this.selectedPaymentDeposit = deposit;
      this.showSinglePaymentDialog = true;
    }
  }

  scrollToLastDueBill() {
    // Filter unpaid due bills
    const dueBills = this.bills.all.filter((bill) =>
      bill.dueDate.isBefore(this.snapshotDate, 'day'),
    );

    if (dueBills.length === 0) {
      console.log('No due bills found');
      return;
    }

    // Sort to find the last due bill by date
    dueBills.sort((a, b) => a.dueDate.diff(b.dueDate));
    const lastDueBill = dueBills[dueBills.length - 1];

    this.highlightedBillId = lastDueBill.id;

    // Use setTimeout to ensure the view updates and billRows are available
    setTimeout(() => {
      if (!this.billRows || this.billRows.length === 0) return;

      const index = this.bills.all.findIndex((b) => b.id === lastDueBill.id);

      if (index > -1 && index < this.billRows.length) {
        const row = this.billRows.toArray()[index];
        if (row && row.nativeElement) {
          row.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }, 0);
  }

  isBillHighlighted(bill: Bill): boolean {
    return this.highlightedBillId === bill.id;
  }
}

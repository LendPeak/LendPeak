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

@Component({
    selector: 'app-bills',
    templateUrl: './bills.component.html',
    styleUrls: ['./bills.component.css'],
    standalone: false
})
export class BillsComponent implements AfterViewInit {
  @Input() bills: Bill[] = [];
  @Input() snapshotDate: Date = new Date();

  @Output() billAction = new EventEmitter<void>();

  // This will hold the references to each table row
  @ViewChildren('billRow', { read: ElementRef })
  billRows!: QueryList<ElementRef>;

  highlightedBillId?: string;

  selectedBill: Bill | null = null;
  showPaymentDetailsDialog: boolean = false;

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

  scrollToLastDueBill() {
    // Filter unpaid due bills
    const dueBills = this.bills.filter((bill) =>
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

      const index = this.bills.findIndex((b) => b.id === lastDueBill.id);

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

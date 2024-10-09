// basic-loan-info.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import dayjs from 'dayjs';

@Component({
  selector: 'app-basic-loan-info',
  templateUrl: './basic-loan-info.component.html',
  styleUrls: ['./basic-loan-info.component.css'],
})
export class BasicLoanInfoComponent {
  @Input() loan: any;
  @Input() amortization: any;

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  showTooltip(event: Event, tooltipRef: OverlayPanel) {
    tooltipRef.toggle(event);
  }

  submitLoan() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }

  updateTerm() {
    // when term is updated we need to extend the end date
    this.updateStartDate();
    // this.loanUpdated.emit();
  }

  updateStartDate() {
    // Adjust first payment date and end date based on start date
    const daysInAPeriod = this.loan.termPeriodDefinition.count[0];
    const periodUnit =
      this.loan.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.loan.termPeriodDefinition.unit;

    this.loan.firstPaymentDate = dayjs(this.loan.startDate)
      .add(daysInAPeriod, periodUnit)
      .toDate();

    this.loan.endDate = dayjs(this.loan.startDate)
      .add(this.loan.term * daysInAPeriod, periodUnit)
      .toDate();

    this.submitLoan();
  }
}

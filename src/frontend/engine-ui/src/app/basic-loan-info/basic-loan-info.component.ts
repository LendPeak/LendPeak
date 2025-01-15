// basic-loan-info.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
// Removed OverlayPanel, now import Popover from primeng/popover
import { Popover } from 'primeng/popover';
import dayjs from 'dayjs';

@Component({
  selector: 'app-basic-loan-info',
  templateUrl: './basic-loan-info.component.html',
  styleUrls: ['./basic-loan-info.component.css'],
  standalone: false,
})
export class BasicLoanInfoComponent {
  @Input() loan: any;
  @Input() amortization: any;

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  enableFirstPaymentDate = false;
  enableEndDate = false;

  showTooltip(event: Event, tooltipRef: Popover) {
    // Same usage as OverlayPanel
    tooltipRef.toggle(event);
  }

  submitLoan() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }

  updateTerm() {
    // when term is updated we need to extend the end date
    this.updateStartDate();
  }

  updateStartDate() {
    // Only do your default logic if the user hasn't explicitly enabled firstPaymentDate or endDate
    const daysInAPeriod = this.loan.termPeriodDefinition.count[0];
    const periodUnit =
      this.loan.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.loan.termPeriodDefinition.unit;

    // If user DIDN'T enable first payment date, recalc it automatically
    if (!this.enableFirstPaymentDate) {
      this.loan.firstPaymentDate = dayjs(this.loan.startDate)
        .add(daysInAPeriod, periodUnit)
        .toDate();
    }

    // If user DIDN'T enable end date, recalc it automatically
    if (!this.enableEndDate) {
      this.loan.endDate = dayjs(this.loan.startDate)
        .add(this.loan.term * daysInAPeriod, periodUnit)
        .toDate();
    }

    this.submitLoan();
  }

  // Checkbox toggles for first payment date
  onFirstPaymentToggle() {
    if (!this.enableFirstPaymentDate) {
      // user just unchecked => set firstPaymentDate to undefined
      this.loan.firstPaymentDate = undefined;
    }
    // else the user just checked => optionally set a default
    this.submitLoan();
  }

  // Checkbox toggle for end date
  onEndDateToggle() {
    if (!this.enableEndDate) {
      // user just unchecked => set endDate to undefined
      this.loan.endDate = undefined;
    }
    // else the user just checked => optionally set a default
    this.submitLoan();
  }
}

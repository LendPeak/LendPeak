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

  enableFirstPaymentDate = false;
  enableEndDate = false;

  // ngOnInit() {
  //   if (this.loan.firstPaymentDate) {
  //     this.enableFirstPaymentDate = true;
  //   }
  //   if (this.loan.endDate) {
  //     this.enableEndDate = true;
  //   }
  // }

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
    } else {
      // user just checked => optionally set a default
      // this.loan.firstPaymentDate = dayjs(this.loan.startDate)
      //   .add(this.loan.termPeriodDefinition.count[0], this.loan.termPeriodDefinition.unit)
      //   .toDate();
    }
    this.submitLoan();
  }

  // Checkbox toggle for end date
  onEndDateToggle() {
    if (!this.enableEndDate) {
      // user just unchecked => set endDate to undefined
      this.loan.endDate = undefined;
    } else {
      // user just checked => optionally set a default
      // this.loan.endDate = dayjs(this.loan.startDate)
      //   .add(this.loan.term * this.loan.termPeriodDefinition.count[0], this.loan.termPeriodDefinition.unit)
      //   .toDate();
    }
    this.submitLoan();
  }
}

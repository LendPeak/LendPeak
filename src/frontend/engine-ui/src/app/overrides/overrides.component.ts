// overrides.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import dayjs from 'dayjs';
import { AmortizationSchedule } from 'lendpeak-engine/models/Amortization';

@Component({
  selector: 'app-overrides',
  templateUrl: './overrides.component.html',
  styleUrls: ['./overrides.component.css'],
})
export class OverridesComponent {
  @Input() loan: any;
  @Input() termOptions: { label: string; value: number }[] = [];
  @Input() balanceIncreaseType: { label: string; value: string }[] = [];
  @Input() loanRepaymentPlan: AmortizationSchedule[] = [];

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  // Add this method
  onInputChange() {
    this.emitLoanChange();
  }

  // Methods related to Term Payment Amount Overrides
  addTermPaymentAmountOverride() {
    const termPaymentAmountOverride = this.loan.termPaymentAmountOverride;

    let termNumber: number;
    let paymentAmount: number;

    if (termPaymentAmountOverride.length === 0) {
      // First entry
      termNumber = 1;
      paymentAmount = 0;
    } else {
      // Following entries
      termNumber =
        termPaymentAmountOverride[termPaymentAmountOverride.length - 1]
          .termNumber + 1;
      paymentAmount =
        termPaymentAmountOverride[termPaymentAmountOverride.length - 1]
          .paymentAmount;
    }

    termPaymentAmountOverride.push({
      termNumber: termNumber,
      paymentAmount: paymentAmount,
    });

    this.loan.termPaymentAmountOverride = termPaymentAmountOverride;
    this.emitLoanChange();
  }

  removeTermPaymentAmountOverride(index: number) {
    if (this.loan.termPaymentAmountOverride.length > 0) {
      this.loan.termPaymentAmountOverride.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Rate Overrides
  addRateOverride() {
    const ratesSchedule = this.loan.ratesSchedule;
    let startDate: Date;
    let endDate: Date;

    if (ratesSchedule.length === 0) {
      // First entry: use loan's start date
      startDate = this.loan.startDate;
    } else {
      // Following entries: use end date from previous row as start date
      startDate = ratesSchedule[ratesSchedule.length - 1].endDate;
    }

    // End date is 1 month from start date
    endDate = dayjs(startDate).add(1, 'month').toDate();

    ratesSchedule.push({
      startDate: startDate,
      endDate: endDate,
      annualInterestRate: 10,
    });

    this.loan.ratesSchedule = ratesSchedule;
    this.emitLoanChange();
  }

  removeRateOverride(index: number) {
    if (this.loan.ratesSchedule.length > 0) {
      this.loan.ratesSchedule.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Change Payment Date
  addNewChangePaymentTermRow() {
    const changePaymentDates = this.loan.changePaymentDates;

    if (changePaymentDates.length === 0) {
      // First entry: use loan's start date
      changePaymentDates.push({
        termNumber: 1,
        newDate: dayjs(this.loan.startDate).add(1, 'month').toDate(),
      });
    } else {
      // Following entries: use term number from previous row + 1
      const lastTermNumber =
        changePaymentDates[changePaymentDates.length - 1].termNumber;
      changePaymentDates.push({
        termNumber: lastTermNumber + 1,
        newDate: dayjs(
          changePaymentDates[changePaymentDates.length - 1].newDate
        )
          .add(1, 'month')
          .toDate(),
      });
    }

    this.loan.changePaymentDates = changePaymentDates;
    this.emitLoanChange();
  }

  removeChangePaymentDate(index: number) {
    if (this.loan.changePaymentDates.length > 0) {
      this.loan.changePaymentDates.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Pre Bill Day Term
  addPrebillDayTermRow() {
    const preBillDaysConfiguration = this.loan.preBillDays;
    let termNumber: number;
    let preBillDays: number;

    if (preBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      preBillDays = this.loan.defaultPreBillDaysConfiguration;
    } else {
      // Following entries
      termNumber =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .termNumber + 1;
      preBillDays =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .preBillDays;
    }

    preBillDaysConfiguration.push({
      termNumber: termNumber,
      preBillDays: preBillDays,
    });

    this.loan.preBillDays = preBillDaysConfiguration;
    this.emitLoanChange();
  }

  removePreBillDayTerm(index: number) {
    if (this.loan.preBillDays.length > 0) {
      this.loan.preBillDays.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Due Bill Day Term
  addDueBillDayTermRow() {
    const dueBillDaysConfiguration = this.loan.dueBillDays;
    let termNumber: number;
    let daysDueAfterPeriodEnd: number;

    if (dueBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      daysDueAfterPeriodEnd =
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      // Following entries
      termNumber =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .termNumber + 1;
      daysDueAfterPeriodEnd =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .daysDueAfterPeriodEnd;
    }

    dueBillDaysConfiguration.push({
      termNumber: termNumber,
      daysDueAfterPeriodEnd: daysDueAfterPeriodEnd,
    });

    this.loan.dueBillDays = dueBillDaysConfiguration;
    this.emitLoanChange();
  }

  removeDueBillDayTerm(index: number) {
    if (this.loan.dueBillDays.length > 0) {
      this.loan.dueBillDays.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Balance Modifications
  addBalanceModificationRow() {
    const balanceModifications = this.loan.balanceModifications;

    const dateOfTheModification =
      balanceModifications.length === 0
        ? this.loan.startDate
        : balanceModifications[balanceModifications.length - 1].date;

    balanceModifications.push({
      amount: 0,
      date: dateOfTheModification,
      type: 'decrease',
    });

    this.loan.balanceModifications = balanceModifications;
    this.emitLoanChange();
  }

  deleteBalanceModificationRow(index: number) {
    if (this.loan.balanceModifications.length > 0) {
      this.loan.balanceModifications.splice(index, 1);
      this.emitLoanChange();
    }
  }

  balanceModificationChanged() {
    // Optional: Order the balance modifications by date
    // this.loan.balanceModifications.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    this.emitLoanChange();
  }

  // Methods related to Fees That Apply to All Terms
  addFeeForAllTerms() {
    if (!this.loan.feesForAllTerms) {
      this.loan.feesForAllTerms = [];
    }

    this.loan.feesForAllTerms.push({
      type: 'fixed',
      amount: 0,
      description: '',
    });

    this.emitLoanChange();
  }

  removeFeeForAllTerms(index: number) {
    if (this.loan.feesForAllTerms && this.loan.feesForAllTerms.length > 0) {
      this.loan.feesForAllTerms.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Fees Per Term
  addFeePerTerm() {
    if (!this.loan.feesPerTerm) {
      this.loan.feesPerTerm = [];
    }

    this.loan.feesPerTerm.push({
      termNumber: 1,
      type: 'fixed',
      amount: 0,
      description: '',
    });

    this.emitLoanChange();
  }

  // Add the missing method
  updateTermForCPD(index: number, termNumber: number) {
    if (this.loanRepaymentPlan && this.loanRepaymentPlan.length >= termNumber) {
      this.loan.changePaymentDates[index].newDate =
        this.loanRepaymentPlan[termNumber - 1].periodEndDate.toDate();
      this.emitLoanChange();
    }
  }

  removeFeePerTerm(index: number) {
    if (this.loan.feesPerTerm && this.loan.feesPerTerm.length > 0) {
      this.loan.feesPerTerm.splice(index, 1);
      this.emitLoanChange();
    }
  }

  showTooltip(event: Event, tooltipRef: OverlayPanel) {
    tooltipRef.toggle(event);
  }

  // Helper method to emit loan changes
  private emitLoanChange() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }
}

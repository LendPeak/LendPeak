import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { DropDownOptionString } from '../models/common.model';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';
import { Bill } from 'lendpeak-engine/models/Bill';
import { Currency } from 'lendpeak-engine/utils/Currency';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

@Component({
    selector: 'app-deposits',
    templateUrl: './deposits.component.html',
    styleUrls: ['./deposits.component.css'],
    standalone: false
})
export class DepositsComponent {
  @Input() deposits: DepositRecord[] = [];
  @Input() currencyOptions: DropDownOptionString[] = [];
  @Input() bills: Bill[] = [];
  @Input() snapshotDate: Date = new Date();
  @Input() payoffAmount: Currency = Currency.Zero();
  @Input() accruedInterestToDate: Currency = Currency.Zero();

  @Output() depositsChange = new EventEmitter<DepositRecord[]>();
  @Output() depositUpdated = new EventEmitter<void>();

  @ViewChildren('depositRow', { read: ElementRef })
  depositRows!: QueryList<ElementRef>;

  showDepositDialog: boolean = false;
  selectedDepositForEdit: DepositRecord | null = null;
  depositData: DepositRecord = this.getEmptyDepositData();

  nextDuePrincipal: Currency = Currency.Zero();
  nextDueInterest: Currency = Currency.Zero();
  nextDueFees: Currency = Currency.Zero();
  nextDueBillAmount: Currency = Currency.Zero();
  nextDueBillDate?: Date;
  isNextBillOverdue: boolean = false;
  daysPastDue: number = 0;
  totalFutureScheduledPayments: Currency = Currency.Zero();
  noUnpaidBills: boolean = false;

  amountCoveringNextDue: Currency = Currency.Zero();
  remainingUnpaidAfterDeposit: Currency = Currency.Zero();
  excessPayment: Currency = Currency.Zero();

  highlightedDepositId?: string;

  selectedDeposit: DepositRecord | null = null;
  showDepositUsageDetailsDialog: boolean = false;

  baselineNextDueBillAmount: Currency = Currency.Zero();
  baselineTotalFutureScheduledPayments: Currency = Currency.Zero();
  baselinePayoffAmount: Currency = Currency.Zero();
  baselineNextDuePrincipal: Currency = Currency.Zero();
  baselineNextDueInterest: Currency = Currency.Zero();
  baselineNextDueFees: Currency = Currency.Zero();

  ngAfterViewInit(): void {}

  scrollToLastDeposit() {
    if (this.deposits.length === 0) {
      return;
    }

    const lastDeposit = this.deposits[this.deposits.length - 1];
    this.highlightedDepositId = lastDeposit.id;

    setTimeout(() => {
      const lastRow = this.depositRows.last;
      if (lastRow && lastRow.nativeElement) {
        lastRow.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 0);
  }

  isDepositHighlighted(deposit: DepositRecord): boolean {
    return this.highlightedDepositId === deposit.id;
  }

  getEmptyDepositData(): DepositRecord {
    return new DepositRecord({
      amount: 0,
      sequence: this.deposits.length + 1,
      currency: 'USD',
      effectiveDate: new Date(),
      depositor: '',
      depositLocation: '',
      applyExcessToPrincipal: false,
      excessAppliedDate: undefined,
    });
  }

  openDepositDialog(deposit?: DepositRecord) {
    if (deposit) {
      this.selectedDepositForEdit = deposit;
      this.depositData = deposit;
      if (deposit.effectiveDate) {
        this.depositData.effectiveDate = deposit.effectiveDate;
      }
      if (deposit.clearingDate) {
        this.depositData.clearingDate = deposit.clearingDate;
      }
      if (deposit.excessAppliedDate) {
        this.depositData.excessAppliedDate = deposit.excessAppliedDate;
      } else {
        this.depositData.excessAppliedDate = undefined;
      }
      this.depositData.applyExcessToPrincipal =
        deposit.applyExcessToPrincipal ?? false;
    } else {
      this.depositData = this.getEmptyDepositData();
      this.selectedDepositForEdit = null;
    }
    this.showDepositDialog = true;
    this.calculateBillGuidance();
  }

  onDataChange(event: any) {
    this.depositData.syncValuesFromJSProperties();

    if (
      this.depositData.applyExcessToPrincipal &&
      this.depositData.effectiveDate.isAfter(this.depositData.excessAppliedDate)
    ) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    }

    this.calculateBillGuidance();
  }

  calculateBillGuidance() {
    const originalDepositAmount = Currency.of(this.depositData.jsAmount || 0);

    // 1. Baseline scenario (no deposit)
    this.depositData.jsAmount = 0;
    this.runGuidanceCalculation();
    // Store baseline values
    this.baselineNextDueBillAmount = this.nextDueBillAmount;
    this.baselineTotalFutureScheduledPayments =
      this.totalFutureScheduledPayments;
    this.baselinePayoffAmount = this.payoffAmount;
    // Note: AccruedInterestToDate and nextDueBill breakdown (principal, interest, fees) can also be stored if needed
    this.baselineNextDuePrincipal = this.nextDuePrincipal;
    this.baselineNextDueInterest = this.nextDueInterest;
    this.baselineNextDueFees = this.nextDueFees;

    // 2. Actual scenario (with user-entered deposit)
    this.depositData.jsAmount = originalDepositAmount.toNumber();
    this.runGuidanceCalculation();
  }

  // A refactored method that does the actual logic of reading bills and computing nextDueBillAmount, etc.
  // This separates the logic so we can call it twice (once for baseline, once for actual).
  runGuidanceCalculation() {
    const snapshotDayjs = dayjs(this.snapshotDate);

    const allUnpaidBills = this.bills.filter(
      (b) => !b.isPaid && b.jsTotalDue > 0,
    );
    this.totalFutureScheduledPayments = allUnpaidBills.reduce(
      (sum, bill) => sum.add(Currency.of(bill.jsTotalDue)),
      Currency.Zero(),
    );
    this.noUnpaidBills = this.totalFutureScheduledPayments.isZero();

    const currentlyDueBills = allUnpaidBills.filter((b) =>
      dayjs(b.jsDueDate).isSameOrBefore(snapshotDayjs, 'day'),
    );
    const upcomingBills = allUnpaidBills.filter((b) =>
      dayjs(b.jsDueDate).isAfter(snapshotDayjs, 'day'),
    );

    let nextDueBill: Bill | undefined;
    if (currentlyDueBills.length > 0) {
      nextDueBill = currentlyDueBills.sort((a, b) =>
        dayjs(a.jsDueDate).diff(dayjs(b.jsDueDate)),
      )[0];
    } else if (upcomingBills.length > 0) {
      nextDueBill = upcomingBills.sort((a, b) =>
        dayjs(a.jsDueDate).diff(dayjs(b.jsDueDate)),
      )[0];
    } else {
      nextDueBill = undefined;
    }

    if (nextDueBill) {
      this.nextDuePrincipal = Currency.of(nextDueBill.jsPrincipalDue);
      this.nextDueInterest = Currency.of(nextDueBill.jsInterestDue);
      this.nextDueFees = Currency.of(nextDueBill.jsFeesDue);
      this.nextDueBillAmount = this.nextDuePrincipal
        .add(this.nextDueInterest)
        .add(this.nextDueFees);
      this.nextDueBillDate = nextDueBill.jsDueDate;

      this.isNextBillOverdue = dayjs(nextDueBill.jsDueDate).isBefore(
        snapshotDayjs,
        'day',
      );
      this.daysPastDue = this.isNextBillOverdue
        ? snapshotDayjs.diff(dayjs(nextDueBill.jsDueDate), 'day')
        : 0;
    } else {
      this.nextDuePrincipal = Currency.Zero();
      this.nextDueInterest = Currency.Zero();
      this.nextDueFees = Currency.Zero();
      this.nextDueBillAmount = Currency.Zero();
      this.nextDueBillDate = undefined;
      this.isNextBillOverdue = false;
      this.daysPastDue = 0;
    }

    const depositAmount = Currency.of(this.depositData.jsAmount || 0);
    this.amountCoveringNextDue = Currency.Zero();
    this.remainingUnpaidAfterDeposit = Currency.Zero();
    this.excessPayment = Currency.Zero();

    if (this.noUnpaidBills) {
      this.excessPayment = depositAmount;
      return;
    }

    if (this.nextDueBillAmount.greaterThan(0)) {
      this.amountCoveringNextDue = depositAmount.greaterThan(
        this.nextDueBillAmount,
      )
        ? this.nextDueBillAmount
        : depositAmount;
    }

    const remainingAfterNextDue = depositAmount.subtract(
      this.amountCoveringNextDue,
    );
    let unpaidExcludingNext = this.totalFutureScheduledPayments.subtract(
      this.nextDueBillAmount,
    );
    const stillOwedOnNext = this.nextDueBillAmount.subtract(
      this.amountCoveringNextDue,
    );

    if (stillOwedOnNext.greaterThan(0)) {
      unpaidExcludingNext = unpaidExcludingNext.add(stillOwedOnNext);
    }

    if (remainingAfterNextDue.greaterThan(unpaidExcludingNext)) {
      this.remainingUnpaidAfterDeposit = Currency.Zero();
      this.excessPayment = remainingAfterNextDue.subtract(unpaidExcludingNext);
    } else {
      const stillUnpaid = unpaidExcludingNext.subtract(remainingAfterNextDue);
      if (stillUnpaid.greaterThan(0)) {
        this.remainingUnpaidAfterDeposit = stillUnpaid;
        this.excessPayment = Currency.Zero();
      } else {
        this.remainingUnpaidAfterDeposit = Currency.Zero();
        this.excessPayment = stillUnpaid.abs();
      }
    }
  }
  onDepositDialogHide() {
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
    this.depositUpdated.emit();
  }

  saveDeposit() {
    if (
      this.depositData.applyExcessToPrincipal &&
      !this.depositData.jsExcessAppliedDate
    ) {
      this.depositData.jsExcessAppliedDate = this.depositData.jsEffectiveDate;
    } else if (!this.depositData.applyExcessToPrincipal) {
      this.depositData.jsExcessAppliedDate = undefined;
    }

    this.depositData.syncJSPropertiesFromValues();

    if (this.selectedDepositForEdit) {
      Object.assign(this.selectedDepositForEdit, this.depositData);
    } else {
      this.deposits.push(this.depositData);
    }
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
  }

  onApplyExcessToPrincipalChange(event: any) {
    if (event.checked === true) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    } else {
      this.depositData.excessAppliedDate = undefined;
    }
    this.calculateBillGuidance();
  }

  removeDeposit(deposit: DepositRecord) {
    this.deposits = this.deposits.filter((d) => d.id !== deposit.id);
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
  }

  viewDepositUsageDetails(deposit: DepositRecord) {
    this.selectedDeposit = deposit;
    this.showDepositUsageDetailsDialog = true;
  }
}

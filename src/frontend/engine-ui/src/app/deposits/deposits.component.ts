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
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { Bills } from 'lendpeak-engine/models/Bills';
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
  standalone: false,
})
export class DepositsComponent {
  @Input() deposits: DepositRecords = new DepositRecords();
  @Input() currencyOptions: DropDownOptionString[] = [];
  @Input() bills: Bills = new Bills();
  @Input() snapshotDate: Date = new Date();
  @Input() payoffAmount: Currency = Currency.Zero();
  @Input() accruedInterestToDate: Currency = Currency.Zero();

  @Output() depositsChange = new EventEmitter<DepositRecords>();
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

    const lastDeposit = this.deposits.last;
    this.highlightedDepositId = lastDeposit?.id;

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
  }

  onDataChange(event: any) {
    this.depositData.updateModelValues();

    if (
      this.depositData.applyExcessToPrincipal &&
      this.depositData.effectiveDate.isAfter(this.depositData.excessAppliedDate)
    ) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
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

    this.depositData.updateModelValues();

    if (this.selectedDepositForEdit) {
      Object.assign(this.selectedDepositForEdit, this.depositData);
    } else {
      this.deposits.addRecord(this.depositData);
    }
    this.depositActiveUpdated();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
  }

  depositActiveUpdated() {
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
  }

  onApplyExcessToPrincipalChange(event: any) {
    if (event.checked === true) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    } else {
      this.depositData.excessAppliedDate = undefined;
    }
  }

  removeDeposit(deposit: DepositRecord) {
    this.deposits.removeRecordById(deposit.id);
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
  }

  viewDepositUsageDetails(deposit: DepositRecord) {
    this.selectedDeposit = deposit;
    this.showDepositUsageDetailsDialog = true;
  }
}

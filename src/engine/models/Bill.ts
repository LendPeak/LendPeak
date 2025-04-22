// Bill.ts
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";
import { LocalDate, ZoneId, Instant, ChronoUnit } from "@js-joda/core";

import { Currency } from "../utils/Currency";
import { AmortizationEntry } from "./Amortization/AmortizationEntry";
import { BillPaymentDetail } from "./Bill/BillPaymentDetail";

import { Bills } from "./Bills";

export interface BillParams {
  id: string;
  period: number;
  dueDate: LocalDate | Date;
  openDate: LocalDate | Date;

  originalPrincipalDue?: Currency | number;
  originalInterestDue?: Currency | number;
  originalFeesDue?: Currency | number;
  originalTotalDue?: Currency | number;

  principalDue: Currency | number;
  interestDue: Currency | number;
  feesDue: Currency | number;
  totalDue: Currency | number;

  isDSIBill?: boolean;
  amortizationEntry: AmortizationEntry;
  // New property to track deposit IDs used for payment
  paymentMetadata?: {
    depositIds?: string[];
  };
  paymentDetails?: BillPaymentDetail[];
  dateFullySatisfied?: LocalDate | Date;
  daysLate?: number;
  daysEarly?: number;

  bills?: Bills; // intentional optional circular reference to Bills so that Bill can be created with a reference to its parent Bills
}

export class Bill {
  id: string;
  period: number;
  dueDate: LocalDate;
  openDate: LocalDate;
  _principalDue!: Currency;
  _originalPrincipalDue!: Currency;
  _interestDue!: Currency;
  _originalInterestDue!: Currency;
  _feesDue!: Currency;
  _originalFeesDue!: Currency;
  _totalDue!: Currency;
  _originalTotalDue!: Currency;
  isDSIBill?: boolean;
  private _versionId: string = uuidv4();
  private _dateChanged: LocalDate = LocalDate.now();
  private initialized: boolean = false;

  bills?: Bills;

  amortizationEntry: AmortizationEntry;
  // New property to track deposit IDs used for payment
  paymentMetadata?: {
    depositIds?: string[];
  };
  paymentDetails: BillPaymentDetail[] = [];

  dateFullySatisfied?: LocalDate;
  daysLate?: number;
  daysEarly?: number;

  constructor(params: BillParams) {
    this.id = params.id;
    this.period = params.period;
    this.dueDate = DateUtil.normalizeDate(params.dueDate);
    this.openDate = DateUtil.normalizeDate(params.openDate);

    this.principalDue = params.principalDue;
    this.originalPrincipalDue = params.originalPrincipalDue || params.principalDue;

    this.interestDue = params.interestDue;
    this.originalInterestDue = params.originalInterestDue || params.interestDue;

    this.feesDue = params.feesDue;
    this.originalFeesDue = params.originalFeesDue || params.feesDue;

    this.totalDue = params.totalDue;
    this.originalTotalDue = params.originalTotalDue || params.totalDue;

    // this.isPaid = params.isPaid;
    // this.isOpen = params.isOpen;
    // this.isDue = params.isDue;
    // check if amortizationEntry is an instance of AmortizationEntry
    // if not, create a new AmortizationEntry object from the value
    if (params.amortizationEntry instanceof AmortizationEntry) {
      this.amortizationEntry = params.amortizationEntry;
    } else {
      this.amortizationEntry = new AmortizationEntry(params.amortizationEntry);
    }
    this.isDSIBill = params.isDSIBill || false;

    if (params.paymentMetadata) {
      this.paymentMetadata = params.paymentMetadata;
    }
    if (params.paymentDetails) {
      this.paymentDetails = params.paymentDetails.map((detail) => {
        return new BillPaymentDetail(detail);
      });
    }
    if (params.dateFullySatisfied) {
      this.dateFullySatisfied = DateUtil.normalizeDate(params.dateFullySatisfied);
    }
    this.daysLate = params.daysLate ?? 0;
    this.daysEarly = params.daysEarly ?? 0;

    if (params.bills) {
      this.bills = params.bills;
    }

    this.initialized = true;
    this.versionChanged();
  }

  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): LocalDate {
    return this._dateChanged;
  }

  getDaysPastDue(date: LocalDate | Date): number {
    const currentDate = DateUtil.normalizeDate(date);

    if (this.isPaid()) {
      return 0;
    }

    if (!this.isOpen(currentDate)) {
      return 0;
    }
    if (!this.isDue(currentDate)) {
      return 0;
    }

    // calculate days between due date and current date
    const days = ChronoUnit.DAYS.between(this.dueDate, currentDate);
    return days > 0 ? days : 0;
  }

  isOpen(date: LocalDate | Date): boolean {
    const currentDate = DateUtil.normalizeDate(date);
    return this.openDate.isEqual(currentDate) || this.openDate.isBefore(currentDate);
  }

  isDue(date: LocalDate | Date): boolean {
    const currentDate = DateUtil.normalizeDate(date);
    return this.dueDate.isEqual(currentDate) || this.dueDate.isBefore(currentDate);
  }

  isPaid(): boolean {
    return this.principalDue.isZero() && this.interestDue.isZero() && this.feesDue.isZero();
  }

  isPastDue(date: LocalDate | Date): boolean {
    const currentDate = DateUtil.normalizeDate(date);
    // unpaid and due date is before current date
    return !this.isPaid() && currentDate.isAfter(this.dueDate);
  }

  versionChanged() {
    if (this.initialized === true) {
      this._dateChanged = LocalDate.now();
      this._versionId = uuidv4();
      if (this.bills) {
        this.bills.versionChanged();
      }
    }
  }

  get originalPrincipalDue(): Currency {
    return this._originalPrincipalDue;
  }

  get originalInterestDue(): Currency {
    return this._originalInterestDue;
  }

  get originalFeesDue(): Currency {
    return this._originalFeesDue;
  }

  get originalTotalDue(): Currency {
    return this._originalTotalDue;
  }

  set originalPrincipalDue(value: Currency | number) {
    this._originalPrincipalDue = Currency.of(value);
    this.versionChanged();
  }

  set originalInterestDue(value: Currency | number) {
    this._originalInterestDue = Currency.of(value);
    this.versionChanged();
  }

  set originalFeesDue(value: Currency | number) {
    this._originalFeesDue = Currency.of(value);
    this.versionChanged();
  }

  set originalTotalDue(value: Currency | number) {
    this._originalTotalDue = Currency.of(value);
    this.versionChanged();
  }

  get principalDue(): Currency {
    return this._principalDue;
    this.versionChanged();
  }

  set principalDue(value: Currency | number) {
    this._principalDue = Currency.of(value);
    this.versionChanged();
  }

  get interestDue(): Currency {
    return this._interestDue;
  }

  set interestDue(value: Currency | number) {
    this._interestDue = Currency.of(value);
    this.versionChanged();
  }

  get feesDue(): Currency {
    return this._feesDue;
  }

  set feesDue(value: Currency | number) {
    this._feesDue = Currency.of(value);
    this.versionChanged();
  }

  get totalDue(): Currency {
    return this._totalDue;
  }

  set totalDue(value: Currency | number) {
    this._totalDue = Currency.of(value);
    this.versionChanged();
  }

  reducePrincipalDueBy(amount: Currency) {
    this.principalDue = this.principalDue.subtract(amount);
    this.reduceTotalDueBy(amount);
  }

  reduceInterestDueBy(amount: Currency) {
    this.interestDue = this.interestDue.subtract(amount);
    this.reduceTotalDueBy(amount);
  }

  reduceFeesDueBy(amount: Currency) {
    this.feesDue = this.feesDue.subtract(amount);
    this.reduceTotalDueBy(amount);
  }

  private reduceTotalDueBy(amount: Currency) {
    this.totalDue = this.totalDue.subtract(amount);
  }

  increasePrincipalDueBy(amount: Currency) {
    this.principalDue = this.principalDue.add(amount);
    this.increaseTotalDueBy(amount);
  }

  increaseInterestDueBy(amount: Currency) {
    this.interestDue = this.interestDue.add(amount);
    this.increaseTotalDueBy(amount);
  }

  increaseFeesDueBy(amount: Currency) {
    this.feesDue = this.feesDue.add(amount);
    this.increaseTotalDueBy(amount);
  }

  private increaseTotalDueBy(amount: Currency) {
    this.totalDue = this.totalDue.add(amount);
  }

  get jsOpenDate(): Date {
    return DateUtil.normalizeDateToJsDate(this.openDate);
  }

  get jsDueDate(): Date {
    return DateUtil.normalizeDateToJsDate(this.dueDate);
  }

  get jsTotalDue(): number {
    return this.totalDue.toNumber();
  }

  get jsPrincipalDue(): number {
    return this.principalDue.toNumber();
  }

  get jsInterestDue(): number {
    return this.interestDue.toNumber();
  }

  get jsFeesDue(): number {
    return this.feesDue.toNumber();
  }

  get jsDateFullySatisfied(): Date | undefined {
    if (!this.dateFullySatisfied) {
      return undefined;
    }
    return DateUtil.normalizeDateToJsDate(this.dateFullySatisfied);
  }

  // 1) Simple numeric getters for the original amounts
  get jsOriginalPrincipalDue(): number {
    return this._originalPrincipalDue.toNumber();
  }
  get jsOriginalInterestDue(): number {
    return this._originalInterestDue.toNumber();
  }
  get jsOriginalFeesDue(): number {
    return this._originalFeesDue.toNumber();
  }
  get jsOriginalTotalDue(): number {
    return this._originalTotalDue.toNumber();
  }

  // 2) Sum of allocated amounts from paymentDetails
  get jsAllocatedPrincipalSum(): number {
    return this.paymentDetails.reduce((sum, detail) => sum + detail.jsAllocatedPrincipal, 0);
  }

  get allocatedPrincipalSum(): Currency {
    return this.paymentDetails.reduce((sum, detail) => sum.add(detail.allocatedPrincipal), Currency.zero);
  }

  get jsAllocatedInterestSum(): number {
    return this.paymentDetails.reduce((sum, detail) => sum + detail.jsAllocatedInterest, 0);
  }

  get allocatedInterestSum(): Currency {
    return this.paymentDetails.reduce((sum, detail) => sum.add(detail.allocatedInterest), Currency.zero);
  }

  get jsAllocatedFeesSum(): number {
    return this.paymentDetails.reduce((sum, detail) => sum + detail.jsAllocatedFees, 0);
  }

  get allocatedFeesSum(): Currency {
    return this.paymentDetails.reduce((sum, detail) => sum.add(detail.allocatedFees), Currency.zero);
  }

  get jsAllocatedTotalSum(): number {
    return this.paymentDetails.reduce((sum, detail) => sum + detail.jsAllocatedTotal, 0);
  }

  get allocatedTotalSum(): Currency {
    return this.paymentDetails.reduce((sum, detail) => sum.add(detail.allocatedTotal), Currency.zero);
  }

  // 3) Remaining = Original - Sum(allocated)
  get jsRemainingPrincipal(): number {
    return this.jsOriginalPrincipalDue - this.jsAllocatedPrincipalSum;
  }

  get remainingPrincipal(): Currency {
    return this.originalPrincipalDue.subtract(this.allocatedPrincipalSum);
  }

  get jsRemainingInterest(): number {
    return this.jsOriginalInterestDue - this.jsAllocatedInterestSum;
  }

  get remainingInterest(): Currency {
    return this.originalInterestDue.subtract(this.allocatedInterestSum);
  }

  get jsRemainingFees(): number {
    return this.jsOriginalFeesDue - this.jsAllocatedFeesSum;
  }

  get remainingFees(): Currency {
    return this.originalFeesDue.subtract(this.allocatedFeesSum);
  }

  get jsRemainingTotal(): number {
    return this.jsOriginalTotalDue - this.jsAllocatedTotalSum;
  }
  get remainingTotal(): Currency {
    return this.originalTotalDue.subtract(this.allocatedTotalSum);
  }

  get summary() {
    return {
      totalDue: this.totalDue,
      principalDue: this.principalDue,
      interestDue: this.interestDue,
      feesDue: this.feesDue,
      remainingTotal: this.remainingTotal,
      remainingFees: this.remainingFees,
      remainintPrincipal: this.remainingPrincipal,
      remainingInterest: this.remainingInterest,
      allocatedTotalSum: this.allocatedTotalSum,
      allocatedFeesSum: this.allocatedFeesSum,
      allocatedPrincipalSum: this.allocatedPrincipalSum,
      allocatedInterestSum: this.allocatedInterestSum,
    };
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return {
      id: this.id,
      period: this.period,
      dueDate: this.jsDueDate,
      openDate: this.jsOpenDate,
      principalDue: this.jsPrincipalDue,
      interestDue: this.jsInterestDue,
      feesDue: this.jsFeesDue,
      totalDue: this.jsTotalDue,
      originalPrincipalDue: this.jsOriginalPrincipalDue,
      originalInterestDue: this.jsOriginalInterestDue,
      originalFeesDue: this.jsOriginalFeesDue,
      originalTotalDue: this.jsOriginalTotalDue,
      isDSIBill: this.isDSIBill,
      amortizationEntry: this.amortizationEntry.toJSON(),
      paymentMetadata: this.paymentMetadata,
      paymentDetails: this.paymentDetails.map((detail) => detail.json),
      dateFullySatisfied: this.jsDateFullySatisfied,
      daysLate: this.daysLate,
      daysEarly: this.daysEarly,
    };
  }
}

// Bill.ts
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import { Currency } from "../utils/Currency";
import { AmortizationEntry } from "./Amortization/AmortizationEntry";
import { BillPaymentDetail } from "./Bill/BillPaymentDetail";
export interface BillParams {
  id: string;
  period: number;
  dueDate: Dayjs | Date;
  openDate: Dayjs | Date;

  originalPrincipalDue?: Currency | number;
  originalInterestDue?: Currency | number;
  originalFeesDue?: Currency | number;
  originalTotalDue?: Currency | number;

  principalDue: Currency | number;
  interestDue: Currency | number;
  feesDue: Currency | number;
  totalDue: Currency | number;
  isPaid: boolean;
  isOpen: boolean;
  isDue: boolean;
  isPastDue: boolean;
  daysPastDue: number;

  isDSIBill?: boolean;
  amortizationEntry: AmortizationEntry;
  // New property to track deposit IDs used for payment
  paymentMetadata?: {
    depositIds?: string[];
  };
  paymentDetails?: BillPaymentDetail[];
  dateFullySatisfied?: Dayjs | Date;
  daysLate?: number;
  daysEarly?: number;
}

export class Bill {
  id: string;
  period: number;
  dueDate: Dayjs;
  openDate: Dayjs;
  _principalDue!: Currency;
  _originalPrincipalDue!: Currency;
  _interestDue!: Currency;
  _originalInterestDue!: Currency;
  _feesDue!: Currency;
  _originalFeesDue!: Currency;
  _totalDue!: Currency;
  _originalTotalDue!: Currency;
  isPaid: boolean;
  isOpen: boolean;
  isDue: boolean;
  isPastDue: boolean;
  daysPastDue: number;
  isDSIBill?: boolean;

  amortizationEntry: AmortizationEntry;
  // New property to track deposit IDs used for payment
  paymentMetadata?: {
    depositIds?: string[];
  };
  paymentDetails: BillPaymentDetail[] = [];

  dateFullySatisfied?: Dayjs;
  daysLate?: number;
  daysEarly?: number;

  constructor(params: BillParams) {
    this.id = params.id;
    this.period = params.period;
    this.dueDate = dayjs(params.dueDate).startOf("day");
    this.openDate = dayjs(params.openDate).startOf("day");

    this.principalDue = params.principalDue;
    this.originalPrincipalDue = params.originalPrincipalDue || params.principalDue;

    this.interestDue = params.interestDue;
    this.originalInterestDue = params.originalInterestDue || params.interestDue;

    this.feesDue = params.feesDue;
    this.originalFeesDue = params.originalFeesDue || params.feesDue;

    this.totalDue = params.totalDue;
    this.originalTotalDue = params.originalTotalDue || params.totalDue;

    this.isPaid = params.isPaid;
    this.isOpen = params.isOpen;
    this.isDue = params.isDue;
    this.isPastDue = params.isPastDue;
    this.daysPastDue = params.daysPastDue;
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
      this.dateFullySatisfied = dayjs(params.dateFullySatisfied).startOf("day");
    }
    this.daysLate = params.daysLate ?? 0;
    this.daysEarly = params.daysEarly ?? 0;
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
  }

  set originalInterestDue(value: Currency | number) {
    this._originalInterestDue = Currency.of(value);
  }

  set originalFeesDue(value: Currency | number) {
    this._originalFeesDue = Currency.of(value);
  }

  set originalTotalDue(value: Currency | number) {
    this._originalTotalDue = Currency.of(value);
  }

  get principalDue(): Currency {
    return this._principalDue;
  }

  set principalDue(value: Currency | number) {
    this._principalDue = Currency.of(value);
  }

  get interestDue(): Currency {
    return this._interestDue;
  }

  set interestDue(value: Currency | number) {
    this._interestDue = Currency.of(value);
  }

  get feesDue(): Currency {
    return this._feesDue;
  }

  set feesDue(value: Currency | number) {
    this._feesDue = Currency.of(value);
  }

  get totalDue(): Currency {
    return this._totalDue;
  }

  set totalDue(value: Currency | number) {
    this._totalDue = Currency.of(value);
  }

  get jsOpenDate(): Date {
    return this.openDate.toDate();
  }

  get jsDueDate(): Date {
    return this.dueDate.toDate();
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
    return this.dateFullySatisfied?.toDate();
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
      isPaid: this.isPaid,
      isOpen: this.isOpen,
      isDue: this.isDue,
      isPastDue: this.isPastDue,
      daysPastDue: this.daysPastDue,
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

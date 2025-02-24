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
}

export class Bill {
  id: string;
  period: number;
  dueDate: Dayjs;
  openDate: Dayjs;
  principalDue: Currency;
  interestDue: Currency;
  feesDue: Currency;
  totalDue: Currency;
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

  constructor(params: BillParams) {
    this.id = params.id;
    this.period = params.period;
    this.dueDate = dayjs(params.dueDate).startOf("day");
    this.openDate = dayjs(params.openDate).startOf("day");
    this.principalDue = Currency.of(params.principalDue);
    this.interestDue = Currency.of(params.interestDue);
    this.feesDue = Currency.of(params.feesDue);
    this.totalDue = Currency.of(params.totalDue);
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
      isPaid: this.isPaid,
      isOpen: this.isOpen,
      isDue: this.isDue,
      isPastDue: this.isPastDue,
      daysPastDue: this.daysPastDue,
      isDSIBill: this.isDSIBill,
      amortizationEntry: this.amortizationEntry.toJSON(),
      paymentMetadata: this.paymentMetadata,
      paymentDetails: this.paymentDetails.map((detail) => detail.json),
    };
  }
}

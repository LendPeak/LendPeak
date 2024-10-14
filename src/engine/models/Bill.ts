// Bill.ts
import dayjs, { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";
import { AmortizationSchedule } from "./Amortization";
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

  amortizationEntry: AmortizationSchedule;
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

  amortizationEntry: AmortizationSchedule;
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
    this.amortizationEntry = params.amortizationEntry;
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
}

export class Bills {
  bills: Bill[];
  constructor(bills: Bill[]) {
    this.bills = bills;
  }
}

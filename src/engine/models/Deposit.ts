import dayjs, { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";

export interface DepositMetadata {
  [key: string]: any; // Allows arbitrary key-value pairs
}

export interface Deposit {
  id: string; // Unique identifier for the deposit
  amount: Currency;
  currency: string; // Currency code, e.g., USD, EUR
  createdDate: Dayjs; // When the deposit record was created
  insertedDate: Dayjs; // When the deposit was inserted into the system
  effectiveDate: Dayjs; // The date the deposit takes effect
  clearingDate?: Dayjs; // Optional clearing date
  systemDate: Dayjs; // Automatically set by the system
  paymentMethod?: string; // Optional payment method
  depositor?: string; // Who made the deposit
  depositLocation?: string; // Where the deposit was made
  applyExcessToPrincipal: boolean; // Whether to apply excess to principal
  excessAppliedDate?: Dayjs; // Date when excess was applied
  metadata?: DepositMetadata; // Custom metadata
}

export class DepositRecord implements Deposit {
  id: string;
  amount: Currency;
  currency: string;
  createdDate: Dayjs;
  insertedDate: Dayjs;
  effectiveDate: Dayjs;
  clearingDate?: Dayjs;
  systemDate: Dayjs;
  paymentMethod?: string;
  depositor?: string;
  depositLocation?: string;
  applyExcessToPrincipal: boolean;
  excessAppliedDate?: Dayjs;

  metadata?: DepositMetadata;

  constructor(params: {
    id: string;
    amount: Currency;
    currency: string;
    effectiveDate: Dayjs;
    clearingDate?: Dayjs;
    paymentMethod?: string;
    depositor?: string;
    depositLocation?: string;
    applyExcessToPrincipal?: boolean;
    excessAppliedDate?: Dayjs;
    metadata?: DepositMetadata;
  }) {
    this.id = params.id;
    this.amount = params.amount;
    this.currency = params.currency;
    this.createdDate = dayjs(); // Set to current date/time
    this.insertedDate = dayjs(); // Set to current date/time
    this.effectiveDate = params.effectiveDate.startOf("day");
    this.clearingDate = params.clearingDate?.startOf("day");
    this.systemDate = dayjs(); // Automatically set, cannot be faked
    this.paymentMethod = params.paymentMethod;
    this.depositor = params.depositor;
    this.depositLocation = params.depositLocation;
    this.metadata = params.metadata || {};
    this.applyExcessToPrincipal = params.applyExcessToPrincipal || false;
    if (this.applyExcessToPrincipal && !params.excessAppliedDate) {
      this.excessAppliedDate = this.effectiveDate;
    } else {
      this.excessAppliedDate = params.excessAppliedDate;
    }
  }
}

/*
// Example Usage:

import dayjs from "dayjs";

const deposit = new DepositRecord({
  id: "DEP-123456",
  amount: Currency.of(1000),
  currency: "USD",
  effectiveDate: dayjs("2023-10-01"),
  paymentMethod: "Bank Transfer",
  depositor: "John Doe",
  depositLocation: "Main Branch",
  metadata: {
    note: "First installment payment",
    referenceNumber: "REF-987654",
  },
});

// System date is automatically set
console.log(deposit.systemDate.format("YYYY-MM-DD HH:mm:ss"));

*/

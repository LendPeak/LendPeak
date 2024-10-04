// Bill.ts
import { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";
import { AmortizationSchedule } from "./Amortization";

export interface Bill {
  id: string;
  period: number;
  dueDate: Dayjs;
  principalDue: Currency;
  interestDue: Currency;
  feesDue: Currency;
  totalDue: Currency;
  isPaid: boolean;
  amortizationEntry: AmortizationSchedule;
  // New property to track deposit IDs used for payment
  paymentMetadata?: {
    depositIds?: string[];
  };
}

export interface UIBill {
  id: string;
  period: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  isPaid: boolean;
  isOpen: boolean;
  isDue: boolean;
  isPastDue: boolean;
  // Reference to the amortization schedule entry (optional)
  amortizationEntry: AmortizationSchedule;
  paymentMetadata?: {
    depositIds?: string[];
  };
  paymentDetails?: {
    depositId: string;
    allocatedPrincipal: number;
    allocatedInterest: number;
    allocatedFees: number;
    date: Date;
  }[];
}

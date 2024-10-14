import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  TermPaymentAmount,
  AmortizationSchedule,
  TermPeriodDefinition,
  PreBillDaysConfiguration,
  BillDueDaysConfiguration,
  TILADisclosures,
  Fee,
} from 'lendpeak-engine/models/Amortization';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { Decimal } from 'decimal.js';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';


export interface LoanFeeForAllTerms {
  type: 'fixed' | 'percentage';
  amount?: number; // For fixed amount fees
  percentage?: number; // For percentage-based fees (as percentage, e.g., 5% is 5)
  basedOn?: 'interest' | 'principal' | 'totalPayment';
  description?: string;
  metadata?: any;
}

export interface LoanFeePerTerm extends LoanFeeForAllTerms {
  termNumber: number;
}

export interface UILoan {
  objectVersion: number;
  principal: number;
  originationFee: number;
  interestRate: number;
  term: number;
  startDate: Date;
  firstPaymentDate: Date;
  endDate: Date;
  calendarType: string;
  roundingMethod: string;
  flushMethod: string;
  feesForAllTerms: LoanFeeForAllTerms[];
  feesPerTerm: LoanFeePerTerm[];

  roundingPrecision: number;
  flushThreshold: number;
  termPaymentAmount: number | undefined;
  allowRateAbove100: boolean;
  defaultPreBillDaysConfiguration: number;
  defaultBillDueDaysAfterPeriodEndConfiguration: number;
  dueBillDays: BillDueDaysConfiguration[];
  preBillDays: PreBillDaysConfiguration[];
  balanceModifications: BalanceModification[];
  changePaymentDates: {
    termNumber: number;
    newDate: Date;
  }[];
  ratesSchedule: {
    startDate: Date;
    endDate: Date;
    annualInterestRate: number;
  }[];
  termPaymentAmountOverride: { termNumber: number; paymentAmount: number }[];
  periodsSchedule: {
    period: number;
    startDate: Date;
    endDate: Date;
    interestRate: number;
    paymentAmount: number;
  }[];
  deposits: LoanDeposit[];
  termPeriodDefinition: TermPeriodDefinition;
}

export interface LoanDeposit {
  id: string;
  amount: number;
  currency: string;
  createdDate: Date;
  insertedDate: Date;
  effectiveDate: Date;
  clearingDate?: Date;
  systemDate: Date;
  paymentMethod?: string;
  depositor?: string;
  depositLocation?: string;
  usageDetails: {
    billId: string;
    period: number;
    billDueDate: Date;
    allocatedPrincipal: number;
    allocatedInterest: number;
    allocatedFees: number;
    date: Date;
  }[];
  unusedAmount?: number;
  balanceModificationId?: string;
  applyExcessToPrincipal: boolean;
  excessAppliedDate?: Date;
  metadata?: any;
}

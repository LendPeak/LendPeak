import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  TermPaymentAmount,
  TermPeriodDefinition,
  PreBillDaysConfiguration,
  BillDueDaysConfiguration,
  TILADisclosures,
  Fee,
  BillingModel,
} from 'lendpeak-engine/models/Amortization';
import { AmortizationEntry } from 'lendpeak-engine/models/Amortization/AmortizationEntry';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';

import { Currency } from 'lendpeak-engine/utils/Currency';
import { Decimal } from 'decimal.js';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';
import { PaymentAllocationStrategyName } from 'lendpeak-engine/models/PaymentApplication';

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
  id?: string;
  name?: string;
  description?: string;
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
  perDiemCalculationType: PerDiemCalculationType;
  roundingPrecision: number;
  flushThreshold: number;
  termPaymentAmount: number | undefined;
  allowRateAbove100: boolean;
  defaultPreBillDaysConfiguration: number;
  defaultBillDueDaysAfterPeriodEndConfiguration: number;
  dueBillDays: BillDueDaysConfiguration[];
  preBillDays: PreBillDaysConfiguration[];
  balanceModifications: BalanceModification[];
  billingModel: BillingModel;
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
  deposits: DepositRecord[];
  termPeriodDefinition: TermPeriodDefinition;
  paymentAllocationStrategy: PaymentAllocationStrategyName;
  termInterestOverride?: { termNumber: number; interestAmount: number }[];
}

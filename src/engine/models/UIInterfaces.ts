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
} from "./Amortization";

import { UIBalanceModification, LoanFeePerTerm, UIFee } from "../factories/UIFactories";

import { AmortizationEntry } from "./Amortization/AmortizationEntry";
import { PerDiemCalculationType } from "./InterestCalculator";

import { Currency } from "../utils/Currency";
import { Decimal } from "decimal.js";
import { BalanceModification } from "./Amortization/BalanceModification";
import { DepositRecord } from "./Deposit";
import { PaymentAllocationStrategyName } from "./PaymentApplication";

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
  feesForAllTerms: UIFee[];
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

export interface ActualLoanSummary {
  nextBillDate?: Date;
  actualPrincipalPaid: Currency;
  actualInterestPaid: Currency;
  lastPaymentDate?: Date;
  lastPaymentAmount: Currency;
  actualRemainingPrincipal: Currency;
  actualCurrentPayoff: Currency;
}

export interface PastDueSummary {
  pastDueCount: number;
  totalPastDuePrincipal: Currency;
  totalPastDueInterest: Currency;
  totalPastDueFees: Currency;
  totalPastDueAmount: Currency;
  daysContractIsPastDue: number;
}

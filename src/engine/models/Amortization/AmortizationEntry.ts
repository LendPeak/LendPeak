import { Currency, RoundingMethod } from "../../utils/Currency";
import { Calendar, CalendarType } from "../Calendar";
import { InterestCalculator, PerDiemCalculationType } from "../InterestCalculator";
import Decimal from "decimal.js";
import { BalanceModification } from "./BalanceModification";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export interface AmortizationScheduleMetadata {
  splitInterestPeriod?: boolean;
  splitBalancePeriod?: boolean;
  unbilledInterestApplied?: boolean;
  unbilledInterestAppliedAmount?: number;
  interestLessThanOneCent?: boolean;
  unbilledInterestAmount?: number;
  actualInterestValue?: number;
  finalAdjustment?: boolean;
  deferredInterestAppliedAmount?: number;
  amountAddedToDeferredInterest?: number;
  deferredFeesAppliedAmount?: number;
  amountAddedToDeferredFees?: number;
}

/**
 * Represents a single entry in the amortization schedule.
 */
export interface AmortizationEntryParams {
  term: number;
  periodStartDate: Dayjs;
  periodEndDate: Dayjs;
  prebillDaysConfiguration: number;
  billDueDaysAfterPeriodEndConfiguration: number;
  billablePeriod: boolean;
  periodBillOpenDate: Dayjs;
  periodBillDueDate: Dayjs;
  periodInterestRate: Decimal;
  principal: Currency;
  // interest tracking fields
  dueInterestForTerm: Currency; // tracks total interest that is due for the term
  accruedInterestForPeriod: Currency; // track accrued interest for the period
  billedInterestForTerm: Currency; // tracks total accrued interest along with any deferred interest from previous periods
  billedDeferredInterest: Currency;
  unbilledTotalDeferredInterest: Currency; // tracks deferred interest

  // fees
  fees: Currency;
  billedDeferredFees: Currency;
  unbilledTotalDeferredFees: Currency; // tracks deferred interest

  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
  balanceModificationAmount: Currency;
  balanceModification?: BalanceModification;
  perDiem: Currency;
  daysInPeriod: number;
  interestRoundingError: Currency;
  unbilledInterestDueToRounding: Currency; // tracks unbilled interest due to rounding
  metadata: AmortizationScheduleMetadata; // Metadata to track any adjustments or corrections
}

export class AmortizationEntry {
  term: number;
  periodStartDate: Dayjs;
  periodEndDate: Dayjs;
  prebillDaysConfiguration: number;
  billDueDaysAfterPeriodEndConfiguration: number;
  billablePeriod: boolean;
  periodBillOpenDate: Dayjs;
  periodBillDueDate: Dayjs;
  periodInterestRate: Decimal;
  principal: Currency;
  // interest tracking fields
  dueInterestForTerm: Currency; // tracks total interest that is due for the term
  accruedInterestForPeriod: Currency; // track accrued interest for the period
  billedInterestForTerm: Currency; // tracks total accrued interest along with any deferred interest from previous periods
  billedDeferredInterest: Currency;
  unbilledTotalDeferredInterest: Currency; // tracks deferred interest

  // fees
  fees: Currency;
  billedDeferredFees: Currency;
  unbilledTotalDeferredFees: Currency; // tracks deferred interest

  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
  balanceModificationAmount: Currency;
  balanceModification?: BalanceModification;
  perDiem: Currency;
  daysInPeriod: number;
  interestRoundingError: Currency;
  unbilledInterestDueToRounding: Currency; // tracks unbilled interest due to rounding
  metadata: AmortizationScheduleMetadata; // Metadata to track any adjustments or corrections

  constructor(params: AmortizationEntryParams) {
    this.term = params.term;
    this.periodStartDate = params.periodStartDate;
    this.periodEndDate = params.periodEndDate;
    this.prebillDaysConfiguration = params.prebillDaysConfiguration;
    this.billDueDaysAfterPeriodEndConfiguration = params.billDueDaysAfterPeriodEndConfiguration;
    this.billablePeriod = params.billablePeriod;
    this.periodBillOpenDate = params.periodBillOpenDate;
    this.periodBillDueDate = params.periodBillDueDate;
    this.periodInterestRate = params.periodInterestRate;
    this.principal = params.principal;
    this.dueInterestForTerm = params.dueInterestForTerm;
    this.accruedInterestForPeriod = params.accruedInterestForPeriod;
    this.billedInterestForTerm = params.billedInterestForTerm;
    this.billedDeferredInterest = params.billedDeferredInterest;
    this.unbilledTotalDeferredInterest = params.unbilledTotalDeferredInterest;
    this.fees = params.fees;
    this.billedDeferredFees = params.billedDeferredFees;
    this.unbilledTotalDeferredFees = params.unbilledTotalDeferredFees;
    this.totalPayment = params.totalPayment;
    this.endBalance = params.endBalance;
    this.startBalance = params.startBalance;
    this.balanceModificationAmount = params.balanceModificationAmount;
    this.balanceModification = params.balanceModification;
    this.perDiem = params.perDiem;
    this.daysInPeriod = params.daysInPeriod;
    this.interestRoundingError = params.interestRoundingError;
    this.unbilledInterestDueToRounding = params.unbilledInterestDueToRounding;
    this.metadata = params.metadata;
  }

  /**
   * Converts the AmortizationEntry instance into a JSON object.
   * @returns A JSON-compatible object representing the AmortizationEntry instance.
   */
  public toJSON(): any {
    return {
      term: this.term,
      periodStartDate: this.periodStartDate.toISOString(),
      periodEndDate: this.periodEndDate.toISOString(),
      prebillDaysConfiguration: this.prebillDaysConfiguration,
      billDueDaysAfterPeriodEndConfiguration: this.billDueDaysAfterPeriodEndConfiguration,
      billablePeriod: this.billablePeriod,
      periodBillOpenDate: this.periodBillOpenDate.toISOString(),
      periodBillDueDate: this.periodBillDueDate.toISOString(),
      periodInterestRate: this.periodInterestRate.toString(),
      principal: this.principal.toNumber(),
      dueInterestForTerm: this.dueInterestForTerm.toNumber(),
      accruedInterestForPeriod: this.accruedInterestForPeriod.toNumber(),
      billedInterestForTerm: this.billedInterestForTerm.toNumber(),
      billedDeferredInterest: this.billedDeferredInterest.toNumber(),
      unbilledTotalDeferredInterest: this.unbilledTotalDeferredInterest.toNumber(),
      fees: this.fees.toNumber(),
      billedDeferredFees: this.billedDeferredFees.toNumber(),
      unbilledTotalDeferredFees: this.unbilledTotalDeferredFees.toNumber(),
      totalPayment: this.totalPayment.toNumber(),
      endBalance: this.endBalance.toNumber(),
      startBalance: this.startBalance.toNumber(),
      balanceModificationAmount: this.balanceModificationAmount.toNumber(),
      balanceModification: this.balanceModification ? this.balanceModification.toJSON() : undefined,
      perDiem: this.perDiem.toNumber(),
      daysInPeriod: this.daysInPeriod,
      interestRoundingError: this.interestRoundingError.toNumber(),
      unbilledInterestDueToRounding: this.unbilledInterestDueToRounding.toNumber(),
      metadata: this.metadata,
    };
  }

  /**
   * Reconstructs an AmortizationEntry instance from a JSON object.
   * @param json The JSON object representing an AmortizationEntry instance.
   * @returns A new AmortizationEntry instance.
   */
  public static fromJSON(json: any): AmortizationEntry {
    return new AmortizationEntry({
      term: json.term,
      periodStartDate: dayjs(json.periodStartDate),
      periodEndDate: dayjs(json.periodEndDate),
      prebillDaysConfiguration: json.prebillDaysConfiguration,
      billDueDaysAfterPeriodEndConfiguration: json.billDueDaysAfterPeriodEndConfiguration,
      billablePeriod: json.billablePeriod,
      periodBillOpenDate: dayjs(json.periodBillOpenDate),
      periodBillDueDate: dayjs(json.periodBillDueDate),
      periodInterestRate: new Decimal(json.periodInterestRate),
      principal: Currency.of(json.principal),
      dueInterestForTerm: Currency.of(json.dueInterestForTerm),
      accruedInterestForPeriod: Currency.of(json.accruedInterestForPeriod),
      billedInterestForTerm: Currency.of(json.billedInterestForTerm),
      billedDeferredInterest: Currency.of(json.billedDeferredInterest),
      unbilledTotalDeferredInterest: Currency.of(json.unbilledTotalDeferredInterest),
      fees: Currency.of(json.fees),
      billedDeferredFees: Currency.of(json.billedDeferredFees),
      unbilledTotalDeferredFees: Currency.of(json.unbilledTotalDeferredFees),
      totalPayment: Currency.of(json.totalPayment),
      endBalance: Currency.of(json.endBalance),
      startBalance: Currency.of(json.startBalance),
      balanceModificationAmount: Currency.of(json.balanceModificationAmount),
      balanceModification: json.balanceModification ? BalanceModification.fromJSON(json.balanceModification) : undefined,
      perDiem: Currency.of(json.perDiem),
      daysInPeriod: json.daysInPeriod,
      interestRoundingError: Currency.of(json.interestRoundingError),
      unbilledInterestDueToRounding: Currency.of(json.unbilledInterestDueToRounding),
      metadata: json.metadata,
    });
  }
}

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
  staticInterestOverrideApplied?: boolean;
  equivalentAnnualRate?: number;
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
  jsTerm!: number;

  zeroPeriod: number;
  jsZeroPeriod!: number;

  periodStartDate: Dayjs;
  jsPeriodStartDate!: string;

  periodEndDate: Dayjs;
  jsPeriodEndDate!: string;

  prebillDaysConfiguration: number;
  jsPrebillDaysConfiguration!: number;

  billDueDaysAfterPeriodEndConfiguration: number;
  jsBillDueDaysAfterPeriodEndConfiguration!: number;

  billablePeriod: boolean;
  jsBillablePeriod!: boolean;

  periodBillOpenDate: Dayjs;
  jsPeriodBillOpenDate!: string;

  periodBillDueDate: Dayjs;
  jsPeriodBillDueDate!: string;

  periodInterestRate: Decimal;
  jsPeriodInterestRate!: string;

  principal: Currency;
  jsPrincipal!: number;

  // interest tracking fields
  dueInterestForTerm: Currency; // tracks total interest that is due for the term
  jsDueInterestForTerm!: number;

  accruedInterestForPeriod: Currency; // track accrued interest for the period
  jsAccruedInterestForPeriod!: number;

  billedInterestForTerm: Currency; // tracks total accrued interest along with any deferred interest from previous periods
  jsBilledInterestForTerm!: number;

  billedDeferredInterest: Currency;
  jsBilledDeferredInterest!: number;

  unbilledTotalDeferredInterest: Currency; // tracks deferred interest
  jsUnbilledTotalDeferredInterest!: number;
  // fees
  fees: Currency;
  jsFees!: number;

  billedDeferredFees: Currency;
  jsBilledDeferredFees!: number;

  unbilledTotalDeferredFees: Currency; // tracks deferred interest
  jsUnbilledTotalDeferredFees!: number;

  totalPayment: Currency;
  jsTotalPayment!: number;

  endBalance: Currency;
  jsEndBalance!: number;

  startBalance: Currency;
  jsStartBalance!: number;

  balanceModificationAmount: Currency;
  jsBalanceModificationAmount!: number;

  balanceModification?: BalanceModification;

  perDiem: Currency;
  jsPerDiem!: number;

  daysInPeriod: number;
  jsDaysInPeriod!: number;

  interestRoundingError: Currency;
  jsInterestRoundingError!: number;

  unbilledInterestDueToRounding: Currency; // tracks unbilled interest due to rounding
  jsUnbilledInterestDueToRounding!: number;

  metadata: AmortizationScheduleMetadata; // Metadata to track any adjustments or corrections

  constructor(params: AmortizationEntryParams) {
    this.term = params.term;
    this.zeroPeriod = params.term - 1;
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
    this.updateJsValues();
  }

  /**
   * Updates the JS values to match the current values.
   */
  public updateJsValues(): void {
    this.jsTerm = this.term;
    this.jsZeroPeriod = this.zeroPeriod;
    this.jsPeriodStartDate = this.periodStartDate.toISOString();
    this.jsPeriodEndDate = this.periodEndDate.toISOString();
    this.jsPrebillDaysConfiguration = this.prebillDaysConfiguration;
    this.jsBillDueDaysAfterPeriodEndConfiguration = this.billDueDaysAfterPeriodEndConfiguration;
    this.jsBillablePeriod = this.billablePeriod;
    this.jsPeriodBillOpenDate = this.periodBillOpenDate.toISOString();
    this.jsPeriodBillDueDate = this.periodBillDueDate.toISOString();
    this.jsPeriodInterestRate = this.periodInterestRate.toString();
    this.jsPrincipal = this.principal.toNumber();
    this.jsDueInterestForTerm = this.dueInterestForTerm.toNumber();
    this.jsAccruedInterestForPeriod = this.accruedInterestForPeriod.toNumber();
    this.jsBilledInterestForTerm = this.billedInterestForTerm.toNumber();
    this.jsBilledDeferredInterest = this.billedDeferredInterest.toNumber();
    this.jsUnbilledTotalDeferredInterest = this.unbilledTotalDeferredInterest.toNumber();
    this.jsFees = this.fees.toNumber();
    this.jsBilledDeferredFees = this.billedDeferredFees.toNumber();
    this.jsUnbilledTotalDeferredFees = this.unbilledTotalDeferredFees.toNumber();
    this.jsTotalPayment = this.totalPayment.toNumber();
    this.jsEndBalance = this.endBalance.toNumber();
    this.jsStartBalance = this.startBalance.toNumber();
    this.jsBalanceModificationAmount = this.balanceModificationAmount.toNumber();
    this.jsPerDiem = this.perDiem.toNumber();
    this.jsDaysInPeriod = this.daysInPeriod;
    this.jsInterestRoundingError = this.interestRoundingError.toNumber();
    this.jsUnbilledInterestDueToRounding = this.unbilledInterestDueToRounding.toNumber();
  }

  /**
   * Updates the model values to match the current JS values.
   */

  public updateModelValues(): void {
    this.term = this.jsTerm;
    this.zeroPeriod = this.jsZeroPeriod;
    this.periodStartDate = dayjs(this.jsPeriodStartDate);
    this.periodEndDate = dayjs(this.jsPeriodEndDate);
    this.prebillDaysConfiguration = this.jsPrebillDaysConfiguration;
    this.billDueDaysAfterPeriodEndConfiguration = this.jsBillDueDaysAfterPeriodEndConfiguration;
    this.billablePeriod = this.jsBillablePeriod;
    this.periodBillOpenDate = dayjs(this.jsPeriodBillOpenDate);
    this.periodBillDueDate = dayjs(this.jsPeriodBillDueDate);
    this.periodInterestRate = new Decimal(this.jsPeriodInterestRate);
    this.principal = Currency.of(this.jsPrincipal);
    this.dueInterestForTerm = Currency.of(this.jsDueInterestForTerm);
    this.accruedInterestForPeriod = Currency.of(this.jsAccruedInterestForPeriod);
    this.billedInterestForTerm = Currency.of(this.jsBilledInterestForTerm);
    this.billedDeferredInterest = Currency.of(this.jsBilledDeferredInterest);
    this.unbilledTotalDeferredInterest = Currency.of(this.jsUnbilledTotalDeferredInterest);
    this.fees = Currency.of(this.jsFees);
    this.billedDeferredFees = Currency.of(this.jsBilledDeferredFees);
    this.unbilledTotalDeferredFees = Currency.of(this.jsUnbilledTotalDeferredFees);
    this.totalPayment = Currency.of(this.jsTotalPayment);
    this.endBalance = Currency.of(this.jsEndBalance);
    this.startBalance = Currency.of(this.jsStartBalance);
    this.balanceModificationAmount = Currency.of(this.jsBalanceModificationAmount);
    this.perDiem = Currency.of(this.jsPerDiem);
    this.daysInPeriod = this.jsDaysInPeriod;
    this.interestRoundingError = Currency.of(this.jsInterestRoundingError);
    this.unbilledInterestDueToRounding = Currency.of(this.jsUnbilledInterestDueToRounding);
  }

  toJSON() {
    return this.json;
  }

  /**
   * Converts the AmortizationEntry instance into a JSON object.
   * @returns A JSON-compatible object representing the AmortizationEntry instance.
   */
  get json(): any {
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
      balanceModification: this.balanceModification ? this.balanceModification.json : undefined,
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

import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator } from "./InterestCalculator";
import Decimal from "decimal.js";

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
}

export interface BalanceModification {
  amount: Currency;
  date: Dayjs;
  type: "increase" | "decrease";
  description?: string;
  metadata?: any;
}

/**
 * Interface representing each entry in the payment schedule.
 */
export interface PaymentScheduleEntry {
  paymentNumber: number;
  paymentDate: Dayjs;
  paymentAmount: Currency;
  principal: Currency;
  interest: Currency;
  balance: Currency;
}

/**
 * Interface representing the TILA disclosures.
 */
export interface TILADisclosures {
  amountFinanced: Currency;
  financeCharge: Currency;
  totalOfPayments: Currency;
  annualPercentageRate: Decimal;
  paymentSchedule: PaymentScheduleEntry[];
}

/**
 * Represents a single entry in the amortization schedule.
 */
export interface AmortizationSchedule {
  period: number;
  periodStartDate: Dayjs;
  periodEndDate: Dayjs;
  prebillDaysConfiguration: number;
  billDueDaysAfterPeriodEndConfiguration: number;
  billablePeriod: boolean;
  periodBillOpenDate: Dayjs;
  periodBillDueDate: Dayjs;
  periodInterestRate: Decimal;
  principal: Currency;
  interest: Currency;
  fees: Currency;
  billedDeferredInterest: Currency;
  realInterest: Currency; // tracks real interest value
  totalInterestForPeriod: Currency; // tracks total interest for the period
  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
  balanceModificationAmount: Currency;
  balanceModification?: BalanceModification;
  perDiem: Currency;
  daysInPeriod: number;
  unbilledDeferredInterestFromCurrentPeriod: Currency; // tracks deferred interest from the current period
  unbilledTotalDeferredInterest: Currency; // tracks deferred interest
  interestRoundingError: Currency;
  unbilledInterestDueToRounding: Currency; // tracks unbilled interest due to rounding
  metadata: AmortizationScheduleMetadata; // Metadata to track any adjustments or corrections
}

export interface PeriodSchedule {
  startDate: Dayjs;
  endDate: Dayjs;
}

export interface RateSchedule {
  annualInterestRate: Decimal;
  startDate: Dayjs;
  endDate: Dayjs;
}

export interface Fee {
  type: "fixed" | "percentage";
  amount?: Currency; // For fixed amount fees
  percentage?: Decimal; // For percentage-based fees
  basedOn?: "interest" | "principal" | "totalPayment"; // What the percentage is applied to
  description?: string;
  metadata?: any;
}

/**
 * Enum for flush cumulative rounding error types.
 */
export enum FlushUnbilledInterestDueToRoundingErrorType {
  NONE = "none",
  AT_END = "at_end",
  AT_THRESHOLD = "at_threshold",
}

export interface TermPeriodDefinition {
  unit: "year" | "month" | "week" | "day" | "complex";
  count: number[];
}

export interface TermPaymentAmount {
  termNumber: number;
  paymentAmount: Currency;
}

export interface ChangePaymentDate {
  termNumber: number;
  newDate: Dayjs;
  oneTimeChange?: boolean;
}

export interface PreBillDaysConfiguration {
  termNumber: number;
  preBillDays: number;
}

export interface BillDueDaysConfiguration {
  termNumber: number;
  daysDueAfterPeriodEnd: number;
}

export interface AmortizationParams {
  loanAmount: Currency;
  originationFee?: Currency;
  annualInterestRate: Decimal;
  term: number;
  preBillDays?: PreBillDaysConfiguration[];
  dueBillDays?: BillDueDaysConfiguration[];
  billDueDaysAfterPeriodEnd?: BillDueDaysConfiguration[];
  defaultPreBillDaysConfiguration?: number;
  defaultBillDueDaysAfterPeriodEndConfiguration?: number;
  startDate: Dayjs;
  endDate?: Dayjs;
  calendarType?: CalendarType;
  roundingMethod?: RoundingMethod;
  flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType;
  roundingPrecision?: number;
  flushThreshold?: Currency;
  periodsSchedule?: PeriodSchedule[];
  ratesSchedule?: RateSchedule[];
  allowRateAbove100?: boolean;
  termPaymentAmountOverride?: TermPaymentAmount[];
  termPaymentAmount?: Currency; // allows one to specify EMI manually instead of calculating it
  firstPaymentDate?: Dayjs;
  termPeriodDefinition?: TermPeriodDefinition;
  changePaymentDates?: ChangePaymentDate[];
  balanceModifications?: BalanceModification[];
  // staticFeePerBill?: Currency; // A fixed fee amount applied to each bill.
  // customFeesPerTerm?: { termNumber: number; feeAmount: Currency }[]; // An array specifying custom fee amounts for each term.
  // feePercentageOfTotalPayment?: Decimal; // A percentage of the total payment to be applied as a fee.
  // customFeePercentagesPerTerm?: { termNumber: number; feePercentage: Decimal }[]; // An array specifying custom percentages per term.
  feesPerTerm?: { termNumber: number; fees: Fee[] }[];
  feesForAllTerms?: Fee[];
}

const DEFAULT_PRE_BILL_DAYS_CONFIGURATION = 0;
const DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION = 0;

/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export class Amortization {
  loanAmount: Currency;
  originationFee: Currency;
  totalLoanAmount: Currency;
  annualInterestRate: Decimal;
  term: number;
  preBillDays: PreBillDaysConfiguration[];
  dueBillDays: BillDueDaysConfiguration[];
  defaultPreBillDaysConfiguration: number;
  defaultBillDueDaysAfterPeriodEndConfiguration: number;
  startDate: Dayjs;
  endDate: Dayjs;
  calendar: Calendar;
  roundingMethod: RoundingMethod;
  flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType; // Updated property
  totalChargedInterestRounded: Currency; // tracks total charged interest (rounded)
  totalChargedInterestUnrounded: Currency; // racks total charged interest (unrounded)
  unbilledInterestDueToRounding: Currency; // racks unbilled interest due to rounding
  unbilledDeferredInterest: Currency; // tracks deferred interest
  roundingPrecision: number; // tracks precision for rounding
  flushThreshold: Currency; // property to track the threshold for flushing cumulative rounding error
  periodsSchedule: PeriodSchedule[] = [];
  rateSchedules: RateSchedule[] = [];
  allowRateAbove100: boolean = false;
  termPaymentAmountOverride: TermPaymentAmount[] = [];
  equitedMonthlyPayment: Currency;
  firstPaymentDate?: Dayjs;
  termPeriodDefinition: TermPeriodDefinition;
  changePaymentDates: ChangePaymentDate[] = [];
  repaymentSchedule: AmortizationSchedule[];
  balanceModifications: BalanceModification[] = [];
  _arp?: Decimal;

  // Fee configurations
  // private staticFeePerBill: Currency;
  // private customFeesPerTerm: Map<number, Currency>;
  // private feePercentageOfTotalPayment: Decimal;
  // private customFeePercentagesPerTerm: Map<number, Decimal>;
  private feesPerTerm: Map<number, Fee[]>;
  private feesForAllTerms: Fee[]; // New property for global fees

  constructor(params: AmortizationParams) {
    // validate that loan amount is greater than zero
    if (params.loanAmount.getValue().isZero() || params.loanAmount.getValue().isNegative()) {
      throw new Error("Invalid loan amount, must be greater than zero");
    }
    this.loanAmount = params.loanAmount;

    if (params.originationFee) {
      if (params.originationFee.getValue().isNegative()) {
        throw new Error("Invalid origination fee, value cannot be negative");
      }
      this.originationFee = params.originationFee;
    } else {
      this.originationFee = Currency.of(0);
    }

    if (params.balanceModifications) {
      this.balanceModifications = params.balanceModifications;
      // fix dates to start at the beginning of the day
      this.balanceModifications = this.balanceModifications.map((balanceModification) => {
        return { amount: balanceModification.amount, date: balanceModification.date.startOf("day"), type: balanceModification.type, description: balanceModification.description };
      });

      // sort balance modifications by date
      this.balanceModifications.sort((a, b) => {
        return a.date.diff(b.date);
      });
    }

    this.totalLoanAmount = this.loanAmount.add(this.originationFee);

    // Initialize feesPerTerm
    this.feesPerTerm = new Map();
    if (params.feesPerTerm) {
      for (const feeConfig of params.feesPerTerm) {
        this.feesPerTerm.set(feeConfig.termNumber, feeConfig.fees);
      }
    }

    // Initialize feesForAllTerms
    this.feesForAllTerms = params.feesForAllTerms || [];

    if (params.termPeriodDefinition) {
      this.termPeriodDefinition = params.termPeriodDefinition;
    } else {
      this.termPeriodDefinition = { unit: "month", count: [1] };
    }

    if (params.changePaymentDates) {
      this.changePaymentDates = params.changePaymentDates;
      this.changePaymentDates = this.changePaymentDates.map((changePaymentDate) => {
        return { termNumber: changePaymentDate.termNumber, newDate: changePaymentDate.newDate.startOf("day") };
      });
    }

    if (params.allowRateAbove100 !== undefined) {
      this.allowRateAbove100 = params.allowRateAbove100;
    }

    if (params.firstPaymentDate) {
      this.firstPaymentDate = params.firstPaymentDate;
    } else {
      this.firstPaymentDate = params.startDate.add(1, "month");
    }

    // validate annual interest rate, it should not be negative or greater than 100%
    if (params.annualInterestRate.isNegative()) {
      throw new Error("Invalid annual interest rate, value cannot be negative");
    }

    if (params.annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
      throw new Error("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
    }
    this.annualInterestRate = params.annualInterestRate;

    // validate term, it should be greater than zero
    if (params.term <= 0) {
      throw new Error("Invalid term, must be greater than zero");
    }
    this.term = params.term;
    this.startDate = dayjs(params.startDate).startOf("day");

    if (params.endDate) {
      this.endDate = dayjs(params.endDate).startOf("day");
    } else {
      const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
      this.endDate = params.endDate ? dayjs(params.endDate).startOf("day") : this.startDate.add(this.term * this.termPeriodDefinition.count[0], termUnit);
    }

    // validate that the end date is after the start date
    if (this.endDate.isBefore(this.startDate)) {
      throw new Error("Invalid end date, must be after the start date");
    }

    if (params.termPaymentAmountOverride) {
      this.termPaymentAmountOverride = params.termPaymentAmountOverride;
    }

    this.calendar = new Calendar(params.calendarType || CalendarType.ACTUAL_ACTUAL);
    this.roundingMethod = params.roundingMethod || RoundingMethod.ROUND_HALF_UP;
    this.flushUnbilledInterestRoundingErrorMethod = params.flushUnbilledInterestRoundingErrorMethod || FlushUnbilledInterestDueToRoundingErrorType.NONE;
    this.totalChargedInterestRounded = Currency.of(0);
    this.totalChargedInterestUnrounded = Currency.of(0);
    this.unbilledInterestDueToRounding = Currency.of(0);
    this.roundingPrecision = params.roundingPrecision || 2;
    // validate that the rounding precision is greater than or equal to zero
    if (this.roundingPrecision < 0) {
      throw new Error("Invalid rounding precision, must be greater than or equal to zero, number represents decimal places");
    }
    this.flushThreshold = params.flushThreshold || Currency.of(0.01); // Default threshold is 1 cent

    // Initialize the schedule periods and rates
    if (!params.periodsSchedule) {
      this.generatePeriodicSchedule();
    } else {
      this.periodsSchedule = params.periodsSchedule;

      for (let period of this.periodsSchedule) {
        period.startDate = period.startDate.startOf("day");
        period.endDate = period.endDate.startOf("day");
      }
    }

    if (!params.ratesSchedule) {
      this.generateRatesSchedule();
    } else {
      this.rateSchedules = params.ratesSchedule;

      // all start and end dates must be at the start of the day, we dont want to count hours
      // at least not just yet... maybe in the future
      for (let rate of this.rateSchedules) {
        rate.startDate = rate.startDate.startOf("day");
        rate.endDate = rate.endDate.startOf("day");
      }

      // rate schedule might be partial and not necesserily aligns with billing periods
      // if first period is not equal to start date, we need to backfill
      // original start date and rate to the first period
      // same goes for in-between periods, if first period end date is not equal to next period start date
      // we need to backfill the rate and start date to the next period
      // finally same goes for the last period, if end date is not equal to the end date of the term
      // we need to backfill the rate and end date to the last period

      if (!this.startDate.isSame(this.rateSchedules[0].startDate, "day")) {
        // console.log(`adding rate schedule at the start ${this.startDate.format("YYYY-MM-DD")} and ${this.rateSchedules[0].startDate.format("YYYY-MM-DD")}`);
        this.rateSchedules.unshift({ annualInterestRate: this.annualInterestRate, startDate: this.startDate, endDate: this.rateSchedules[0].startDate });
      }

      for (let i = 0; i < this.rateSchedules.length - 1; i++) {
        if (!this.rateSchedules[i].endDate.isSame(this.rateSchedules[i + 1].startDate, "day")) {
          // console.log(`adding rate schedule between ${this.rateSchedules[i].endDate.format("YYYY-MM-DD")} and ${this.rateSchedules[i + 1].startDate.format("YYYY-MM-DD")}`);
          this.rateSchedules.splice(i + 1, 0, { annualInterestRate: this.annualInterestRate, startDate: this.rateSchedules[i].endDate, endDate: this.rateSchedules[i + 1].startDate });
        }
      }

      if (!this.endDate.isSame(this.rateSchedules[this.rateSchedules.length - 1].endDate, "day")) {
        // console.log(`adding rate schedule for the end between ${this.rateSchedules[this.rateSchedules.length - 1].endDate.format("YYYY-MM-DD")} and ${this.endDate.format("YYYY-MM-DD")}`);
        this.rateSchedules.push({ annualInterestRate: this.annualInterestRate, startDate: this.rateSchedules[this.rateSchedules.length - 1].endDate, endDate: this.endDate });
      }
    }

    if (params.termPaymentAmount !== undefined) {
      this.equitedMonthlyPayment = params.termPaymentAmount;
    } else {
      this.equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
    }

    if (params.defaultPreBillDaysConfiguration !== undefined) {
      this.defaultPreBillDaysConfiguration = params.defaultPreBillDaysConfiguration;
    } else {
      this.defaultPreBillDaysConfiguration = DEFAULT_PRE_BILL_DAYS_CONFIGURATION;
    }

    if (params.preBillDays && params.preBillDays.length > 0) {
      this.preBillDays = params.preBillDays;
    } else {
      this.preBillDays = [{ preBillDays: this.defaultPreBillDaysConfiguration, termNumber: 1 }];
    }

    if (params.defaultBillDueDaysAfterPeriodEndConfiguration !== undefined) {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = params.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION;
    }

    if (params.dueBillDays && params.dueBillDays.length > 0) {
      this.dueBillDays = params.dueBillDays;
    } else {
      this.dueBillDays = [{ daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration, termNumber: 1 }];
    }

    this.generatePreBillDaysForAllTerms();
    this.generateDueBillDaysForAllTerms();

    this.unbilledDeferredInterest = Currency.of(0);

    // validate the schedule periods and rates
    this.verifySchedulePeriods();
    this.validateRatesSchedule();

    this.repaymentSchedule = this.generateSchedule();
  }

  private calculateFeesForPeriod(termNumber: number, principal: Currency | null, interest: Currency, totalPayment: Currency): { totalFees: Currency; feesAfterPrincipal: Fee[] } {
    // Retrieve per-term fees
    const termFees = this.feesPerTerm.get(termNumber) || [];
    // Retrieve fees that apply to all terms
    const allTermFees = this.feesForAllTerms;

    // Combine the fees
    const fees = [...allTermFees, ...termFees];

    let totalFees = Currency.Zero();
    let feesBeforePrincipal: Fee[] = [];
    let feesAfterPrincipal: Fee[] = [];

    for (const fee of fees) {
      if (fee.type === "fixed") {
        feesBeforePrincipal.push(fee);
      } else if (fee.type === "percentage") {
        if (fee.basedOn === "interest" || fee.basedOn === "totalPayment") {
          feesBeforePrincipal.push(fee);
        } else if (fee.basedOn === "principal") {
          feesAfterPrincipal.push(fee);
        } else {
          throw new Error(`Invalid basedOn value for fee in term ${termNumber}`);
        }
      } else {
        throw new Error(`Invalid fee type for term ${termNumber}`);
      }
    }

    // Calculate feesBeforePrincipal
    for (const fee of feesBeforePrincipal) {
      let feeAmount: Currency = Currency.Zero();
      if (fee.type === "fixed") {
        feeAmount = fee.amount!;
      } else if (fee.type === "percentage") {
        let baseAmount: Currency;
        if (fee.basedOn === "interest") {
          baseAmount = interest;
        } else if (fee.basedOn === "totalPayment") {
          baseAmount = totalPayment;
        } else {
          throw new Error(`Invalid basedOn value for fee in term ${termNumber}`);
        }
        feeAmount = baseAmount.multiply(fee.percentage!);
      }
      totalFees = totalFees.add(feeAmount);
    }

    // Return the totalFees and the feesAfterPrincipal to be handled after principal is calculated
    return { totalFees, feesAfterPrincipal };
  }

  get apr(): Decimal {
    if (!this._arp) {
      this._arp = this.calculateAPR();
    }
    return this._arp;
  }

  get loanTermInMonths(): number {
    const startDate = this.startDate;
    const endDate = this.endDate;
    return endDate.diff(startDate, "month");
  }

  generatePreBillDaysForAllTerms(): void {
    // we need to fill the gaps between the periods with pre-bill days
    // anything that is defined before first term will use default pre-bill days
    // any gaps between terms will use previously defined pre-bill days

    const completedPreBillDays: PreBillDaysConfiguration[] = [];
    for (let preBillDay of this.preBillDays) {
      completedPreBillDays[preBillDay.termNumber - 1] = preBillDay;
    }

    let lastUserDefinedTerm = this.preBillDays[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedPreBillDays[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedPreBillDays[i] = { termNumber: i + 1, preBillDays: this.defaultPreBillDaysConfiguration };
        } else {
          completedPreBillDays[i] = { termNumber: i + 1, preBillDays: lastUserDefinedTerm.preBillDays };
        }
      }
      lastUserDefinedTerm = completedPreBillDays[i];
    }

    //console.log("completedPreBillDays", completedPreBillDays);

    this.preBillDays = completedPreBillDays;
  }

  generateDueBillDaysForAllTerms(): void {
    // we need to fill the gaps between the periods with due-bill days
    // anything that is defined before first term will use default due-bill days
    // any gaps between terms will use previously defined due-bill days

    const completedDueDayBillDays: BillDueDaysConfiguration[] = [];
    for (let dueBillDay of this.dueBillDays) {
      completedDueDayBillDays[dueBillDay.termNumber - 1] = dueBillDay;
    }

    let lastUserDefinedTerm = this.dueBillDays[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedDueDayBillDays[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedDueDayBillDays[i] = { termNumber: i + 1, daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration };
        } else {
          completedDueDayBillDays[i] = { termNumber: i + 1, daysDueAfterPeriodEnd: lastUserDefinedTerm.daysDueAfterPeriodEnd };
        }
      }
      lastUserDefinedTerm = completedDueDayBillDays[i];
    }

    // console.log("completedDueBillDays", completedDueDayBillDays);

    this.dueBillDays = completedDueDayBillDays;
  }

  calculateAPR(): Decimal {
    // Group repayments by period number, summing up principal and interest
    const paymentsMap = new Map<number, { principal: Decimal; interest: Decimal; paymentDate: Date }>();

    for (const schedule of this.repaymentSchedule) {
      const period = schedule.period;
      let payment = paymentsMap.get(period);
      if (!payment) {
        // Initialize a new payment object
        payment = {
          principal: schedule.principal.getValue(),
          interest: schedule.interest.getValue(),
          paymentDate: schedule.periodEndDate.toDate(),
        };
        paymentsMap.set(period, payment);
      } else {
        // Accumulate principal and interest
        payment.principal = payment.principal.add(schedule.principal.getValue());
        payment.interest = payment.interest.add(schedule.interest.getValue());
        // Update payment date if the current one is later
        if (schedule.periodEndDate.toDate() > payment.paymentDate) {
          payment.paymentDate = schedule.periodEndDate.toDate();
        }
      }
    }

    // Extract the payments array from the paymentsMap
    const payments = Array.from(paymentsMap.values());

    // Sort payments by paymentDate to ensure correct order
    payments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());

    // Now proceed to calculate the APR using the combined payments
    const apr = InterestCalculator.calculateRealAPR(
      {
        loanAmount: this.totalLoanAmount.getValue(),
        originationFee: this.originationFee.getValue(),
        terms: payments,
      },
      10
    );
    return apr;
  }

  /**
   * Validate the schedule rates.
   */

  validateRatesSchedule(): void {
    if (this.rateSchedules.length < 1) {
      throw new Error("Invalid schedule rates, at least one rate is required");
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isSame(this.rateSchedules[0].startDate, "day")) {
      throw new Error(`Invalid schedule rates: The start date (${this.startDate.format("YYYY-MM-DD")}) does not match the first rate schedule start date (${this.rateSchedules[0].startDate.format("YYYY-MM-DD")}).`);
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.rateSchedules[this.rateSchedules.length - 1].endDate, "day")) {
      throw new Error(
        `Invalid schedule rates: The end date (${this.endDate.format("YYYY-MM-DD")}) does not match the last rate schedule end date (${this.rateSchedules[this.rateSchedules.length - 1].endDate.format("YYYY-MM-DD")}).`
      );
    }

    // verify that rate is not negative
    for (let rate of this.rateSchedules) {
      if (rate.annualInterestRate.isNegative()) {
        throw new Error("Invalid annual interest rate, value cannot be negative");
      }
    }

    // verify that rate is not greater than 100% unless explicitly allowed
    for (let rate of this.rateSchedules) {
      if (rate.annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
        throw new Error("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
      }
    }
  }

  /**
   * Validate the schedule periods.
   */
  verifySchedulePeriods(): void {
    if (this.periodsSchedule.length !== this.term) {
      throw new Error("Invalid schedule periods, number of periods must match the term");
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isSame(this.periodsSchedule[0].startDate, "day")) {
      throw new Error("Invalid schedule periods, start date does not match the loan start date");
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.periodsSchedule[this.periodsSchedule.length - 1].endDate, "day")) {
      throw new Error("Invalid schedule periods, end date does not match the loan end date");
    }

    for (let i = 0; i < this.periodsSchedule.length - 1; i++) {
      // Check if the periods are in ascending order
      if (!this.periodsSchedule[i].endDate.isSame(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are not in ascending order");
      }
      // Check if the periods are non-overlapping
      if (this.periodsSchedule[i].endDate.isAfter(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are overlapping");
      }
    }
  }

  /**
   * Generate schedule periods based on the term and start date.
   */

  generatePeriodicSchedule(): void {
    let startDate = this.startDate;
    for (let i = 0; i < this.term; i++) {
      let endDate: Dayjs;
      if (i === 0 && this.firstPaymentDate) {
        endDate = this.firstPaymentDate.startOf("day");
      } else {
        const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
        endDate = startDate.add(this.termPeriodDefinition.count[0], termUnit).startOf("day");
      }

      // check for change payment date
      if (this.changePaymentDates.length > 0) {
        const changePaymentDate = this.changePaymentDates.find((changePaymentDate) => changePaymentDate.termNumber === i + 1);
        if (changePaymentDate) {
          endDate = changePaymentDate.newDate.startOf("day");
        }
      }
      this.periodsSchedule.push({ startDate, endDate });
      startDate = endDate;
    }

    // final period should end at the end date
    this.periodsSchedule[this.periodsSchedule.length - 1].endDate = this.endDate;
  }

  /**
   * Generate schedule rates based on the term and start date.
   */

  generateRatesSchedule(): void {
    let startDate = this.startDate;
    const endDate = this.endDate;
    this.rateSchedules.push({ annualInterestRate: this.annualInterestRate, startDate, endDate });
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printShortAmortizationSchedule(): void {
    const amortization = this.generateSchedule();
    console.table(
      amortization.map((row) => {
        return {
          period: row.period,
          periodStartDate: row.periodStartDate.format("YYYY-MM-DD"),
          periodEndDate: row.periodEndDate.format("YYYY-MM-DD"),
          periodInterestRate: row.periodInterestRate,
          principal: row.principal.getRoundedValue(this.roundingPrecision).toNumber(),
          balanceModificationAmount: row.balanceModificationAmount.toNumber(),
          //totalInterestForPeriod: row.totalInterestForPeriod.toNumber(), // Include total interest for the period in the printed table
          interest: row.interest.getRoundedValue(this.roundingPrecision).toNumber(),
          //realInterest: row.realInterest.toNumber(), // Include real interest value in the printed table
          //interestRoundingError: row.interestRoundingError.toNumber(),
          totalPayment: row.totalPayment.getRoundedValue(this.roundingPrecision).toNumber(),
          perDiem: row.perDiem.getRoundedValue(this.roundingPrecision).toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          endBalance: row.endBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          // unbilledInterestDueToRounding: row.unbilledInterestDueToRounding.toNumber(), // Include unbilled interest due to rounding in the printed table
          metadata: JSON.stringify(row.metadata), // Include metadata in the printed table
        };
      })
    );
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printAmortizationSchedule(): void {
    const amortization = this.generateSchedule();
    console.table(
      amortization.map((row) => {
        return {
          period: row.period,
          periodStartDate: row.periodStartDate.format("YYYY-MM-DD"),
          periodEndDate: row.periodEndDate.format("YYYY-MM-DD"),
          periodInterestRate: row.periodInterestRate,
          principal: row.principal.getRoundedValue(this.roundingPrecision).toNumber(),
          balanceModificationAmount: row.balanceModificationAmount.toNumber(),
          totalInterestForPeriod: row.totalInterestForPeriod.toNumber(), // Include total interest for the period in the printed table
          interest: row.interest.getRoundedValue(this.roundingPrecision).toNumber(),
          realInterest: row.realInterest.toNumber(), // Include real interest value in the printed table
          interestRoundingError: row.interestRoundingError.toNumber(),
          totalPayment: row.totalPayment.getRoundedValue(this.roundingPrecision).toNumber(),
          perDiem: row.perDiem.getRoundedValue(this.roundingPrecision).toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          endBalance: row.endBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          unbilledInterestDueToRounding: row.unbilledInterestDueToRounding.toNumber(), // Include unbilled interest due to rounding in the printed table
          metadata: JSON.stringify(row.metadata), // Include metadata in the printed table
        };
      })
    );
  }

  /**
   * Get interest rates between the specified start and end dates.
   *
   * Passed start and end date not necessarily spawn a single rate schedule row,
   * so we will return new rate schedules for this range of dates.
   * For example, if the passed start date is 01-13-2023 and the end date is 02-13-2023,
   * and we have rate schedules for 01-01-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-28-2023 at 6%,
   * then we will return two rate schedules for the passed range of dates:
   * 01-13-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-13-2023 at 6%.
   *
   * @param startDate The start date of the range.
   * @param endDate The end date of the range.
   * @returns An array of rate schedules within the specified date range.
   */
  getInterestRatesBetweenDates(startDate: Dayjs, endDate: Dayjs): RateSchedule[] {
    const rates: RateSchedule[] = [];

    for (let rate of this.rateSchedules) {
      if (startDate.isBefore(rate.endDate) && endDate.isAfter(rate.startDate)) {
        const effectiveStartDate = startDate.isAfter(rate.startDate) ? startDate : rate.startDate;
        const effectiveEndDate = endDate.isBefore(rate.endDate) ? endDate : rate.endDate;
        rates.push({ annualInterestRate: rate.annualInterestRate, startDate: effectiveStartDate, endDate: effectiveEndDate });
      }
    }

    return rates;
  }

  getTermPaymentAmount(termNumber: number): Currency {
    if (this.termPaymentAmountOverride.length > 0) {
      const term = this.termPaymentAmountOverride.find((term) => term.termNumber === termNumber);
      if (term) {
        return term.paymentAmount;
      }
    }
    return this.equitedMonthlyPayment;
  }

  getModifiedBalance(
    startDate: Dayjs,
    endDate: Dayjs,
    balance: Currency
  ): {
    balance: Currency;
    balanceModification?: BalanceModification;
    modificationAmount: Currency;
    startDate: Dayjs;
    endDate: Dayjs;
  }[] {
    // range may contain more than one balance or might not contain any modification,
    // in that case we will return just a single balance with the original balance
    const balances: {
      balance: Currency;
      balanceModification?: BalanceModification;
      modificationAmount: Currency;
      startDate: Dayjs;
      endDate: Dayjs;
    }[] = [];

    let balanceToModify = Currency.of(balance);
    // console.log(
    //   this.balanceModifications,
    //   "balance modifications:",
    //   this.balanceModifications.map((modification) => {
    //     return {
    //       date: modification.date.format("YYYY-MM-DD"),
    //       type: modification.type,
    //       amount: modification.amount.toNumber(),
    //     };
    //   })
    // );
    for (let modification of this.balanceModifications) {
      // see if there are any modifications in the range
      // console.log(`Checking modification ${modification.date.format("YYYY-MM-DD")} and comparing it to ${startDate.format("YYYY-MM-DD")} and ${endDate.format("YYYY-MM-DD")}`);

      if (modification.date.isSameOrAfter(startDate) && modification.date.isSameOrBefore(endDate)) {
        // we found a modification, lets get its start date
        let modificationStartDate = balances.length > 0 ? balances[balances.length - 1].endDate : startDate;
        let modificationEndDate = modification.date;
        let modificationAmount: Currency;
        let modifiedBalance: Currency;
        switch (modification.type) {
          case "increase":
            modifiedBalance = balanceToModify.add(modification.amount);
            modificationAmount = modification.amount;
            break;
          case "decrease":
            modifiedBalance = balanceToModify.subtract(modification.amount);
            modificationAmount = modification.amount.negated();
            break;
          default:
            throw new Error("Invalid balance modification type");
        }
        balances.push({ balance: modifiedBalance, balanceModification: modification, modificationAmount, startDate: modificationStartDate, endDate: modificationEndDate });
      }
    }
    // if we dont have any modifications in the range, we will just return the original balance
    if (balances.length === 0) {
      balances.push({ balance, startDate, endDate, modificationAmount: Currency.Zero() });
    } else {
      // if we have modifications, we will add the last balance to the end of the range
      balances.push({ balance: balances[balances.length - 1].balance, startDate: balances[balances.length - 1].endDate, endDate, modificationAmount: Currency.Zero() });
    }
    // console.log(
    //   balances.map((balance) => {
    //     return {
    //       startDate: balance.startDate.format("YYYY-MM-DD"),
    //       endDate: balance.endDate.format("YYYY-MM-DD"),
    //       balance: balance.balance.toNumber(),
    //       modificationAmount: balance.modificationAmount.toNumber(),
    //     };
    //   })
    // );

    return balances;
  }

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  generateSchedule(): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    let startBalance = this.totalLoanAmount;

    let periodIndex = 0;
    for (let period of this.periodsSchedule) {
      periodIndex++;
      const periodStartDate = period.startDate;
      const periodEndDate = period.endDate;
      const preBillDaysConfiguration = this.preBillDays[periodIndex - 1].preBillDays;
      const dueBillDaysConfiguration = this.dueBillDays[periodIndex - 1].daysDueAfterPeriodEnd;
      const billOpenDate = periodEndDate.subtract(preBillDaysConfiguration, "day");
      const billDueDate = periodEndDate.add(dueBillDaysConfiguration, "day");
      const fixedMonthlyPayment = this.getTermPaymentAmount(periodIndex);
      let totalInterestForPeriod = Currency.Zero();

      const loanBalancesInAPeriod = this.getModifiedBalance(periodStartDate, periodEndDate, startBalance);
      const lastBalanceInPeriod = loanBalancesInAPeriod.length;
      let currentBalanceIndex = 0;
      for (let periodStartBalance of loanBalancesInAPeriod) {
        currentBalanceIndex++;
        const periodRates = this.getInterestRatesBetweenDates(periodStartBalance.startDate, periodStartBalance.endDate);

        const lastRateInPeriod = periodRates.length;
        let currentRate = 0;
        for (let interestRateForPeriod of periodRates) {
          currentRate++;
          const metadata: AmortizationScheduleMetadata = {};

          if (periodRates.length > 1) {
            metadata.splitInterestPeriod = true;
          }

          if (loanBalancesInAPeriod.length > 1) {
            metadata.splitBalancePeriod = true;
          }

          const daysInPeriod = this.calendar.daysBetween(interestRateForPeriod.startDate, interestRateForPeriod.endDate);

          if (daysInPeriod === 0) {
            continue;
          }

          const interestCalculator = new InterestCalculator(interestRateForPeriod.annualInterestRate, this.calendar.calendarType);

          let rawInterest: Currency;
          if (interestRateForPeriod.annualInterestRate.isZero()) {
            rawInterest = Currency.Zero();
          } else {
            rawInterest = interestCalculator.calculateInterestForDays(startBalance, daysInPeriod);
          }

          // Handle unbilled interest due to rounding error if applicable
          if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD) {
            if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
              rawInterest = rawInterest.add(this.unbilledInterestDueToRounding);
              metadata.unbilledInterestApplied = true;
              metadata.unbilledInterestAppliedAmount = this.unbilledInterestDueToRounding.toNumber();
              this.unbilledInterestDueToRounding = Currency.Zero();
            }
          }

          const rawInterestForPeriod = rawInterest;
          const roundedInterestForPeriod = this.round(rawInterestForPeriod);

          let appliedDeferredIneterest = Currency.of(0);
          if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
            rawInterest = rawInterest.add(this.unbilledDeferredInterest);
            metadata.deferredInterestAppliedAmount = this.unbilledDeferredInterest.toNumber();
            appliedDeferredIneterest = this.unbilledDeferredInterest;
            this.unbilledDeferredInterest = Currency.Zero();
          }

          let roundedInterest = this.round(rawInterest);

          let interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();

          if (!interestRoundingError.getValue().isZero()) {
            metadata.unbilledInterestAmount = interestRoundingError.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
          }

          totalInterestForPeriod = totalInterestForPeriod.add(rawInterest);

          if (currentRate !== lastRateInPeriod || currentBalanceIndex !== lastBalanceInPeriod) {
            // Handle split periods (non-billable periods)
            const endBalance = periodStartBalance.balance;
            schedule.push({
              period: periodIndex,
              billablePeriod: false,
              periodStartDate: interestRateForPeriod.startDate,
              periodEndDate: interestRateForPeriod.endDate,
              periodInterestRate: interestRateForPeriod.annualInterestRate,
              principal: Currency.of(0),
              interest: roundedInterestForPeriod,
              billedDeferredInterest: appliedDeferredIneterest,
              periodBillOpenDate: billOpenDate,
              periodBillDueDate: billDueDate,
              billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
              prebillDaysConfiguration: preBillDaysConfiguration,
              realInterest: rawInterestForPeriod,
              totalInterestForPeriod,
              fees: Currency.of(0),
              interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
              balanceModificationAmount: periodStartBalance.modificationAmount,
              balanceModification: periodStartBalance.balanceModification,
              endBalance: Currency.of(endBalance),
              startBalance: Currency.of(startBalance),
              totalPayment: Currency.of(0),
              perDiem: this.round(rawInterestForPeriod.divide(daysInPeriod)),
              daysInPeriod: daysInPeriod,
              unbilledDeferredInterestFromCurrentPeriod: Currency.of(0),
              unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
              unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
              metadata,
            });
            startBalance = endBalance;
            continue;
          }

          // Calculate fees
          const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(
            periodIndex,
            null, // We don't have principal yet
            roundedInterestForPeriod,
            fixedMonthlyPayment
          );

          let availableForPrincipalAndFees = fixedMonthlyPayment.subtract(roundedInterestForPeriod).subtract(totalFeesBeforePrincipal);

          let principal: Currency;
          let totalFeesAfterPrincipal: Currency;

          if (feesAfterPrincipal.length > 0) {
            // Sum up the total percentage for fees based on principal
            let totalPercentage = feesAfterPrincipal.reduce((sum, fee) => sum.add(fee.percentage!), new Decimal(0));

            principal = availableForPrincipalAndFees.divide(new Decimal(1).add(totalPercentage));

            if (principal.getValue().isNegative()) {
              principal = Currency.Zero();
            }

            totalFeesAfterPrincipal = principal.multiply(totalPercentage);
          } else {
            principal = availableForPrincipalAndFees;
            totalFeesAfterPrincipal = Currency.Zero();
          }

          let totalFees = totalFeesBeforePrincipal.add(totalFeesAfterPrincipal);

          // Adjust for negative available amounts
          if (principal.getValue().isNegative() || totalFees.getValue().isNegative()) {
            // Handle negative amounts by setting principal and fees to zero
            principal = Currency.Zero();
            totalFees = fixedMonthlyPayment.subtract(roundedInterestForPeriod);
          }

          // It is possible that our EMI is less than the interest for the period
          let deferredInterestFromCurrentPeriod = Currency.of(0);
          if (principal.getValue().isNegative()) {
            principal = Currency.of(0);
            totalInterestForPeriod = fixedMonthlyPayment.subtract(totalFees);
            // Rest of the interest that cannot be billed will go to deferred interest
            deferredInterestFromCurrentPeriod = totalInterestForPeriod.subtract(totalInterestForPeriod);
            metadata.amountAddedToDeferredInterest = deferredInterestFromCurrentPeriod.toNumber();
            this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
            deferredInterestFromCurrentPeriod = deferredInterestFromCurrentPeriod.subtract(appliedDeferredIneterest);
            appliedDeferredIneterest = appliedDeferredIneterest.subtract(rawInterestForPeriod);
            if (appliedDeferredIneterest.getValue().isNegative()) {
              appliedDeferredIneterest = Currency.of(0);
            }
          }

          const balanceBeforePayment = Currency.of(startBalance);
          const balanceAfterPayment = startBalance.subtract(principal);

          // Update cumulative interest
          this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(totalInterestForPeriod);
          this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(totalInterestForPeriod);

          if (totalInterestForPeriod.getValue().isZero() && rawInterest.getValue().greaterThan(0) && fixedMonthlyPayment.getValue().greaterThan(0)) {
            metadata.interestLessThanOneCent = true;
            metadata.actualInterestValue = totalInterestForPeriod.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(totalInterestForPeriod);
          }

          startBalance = balanceAfterPayment;

          schedule.push({
            period: periodIndex,
            billablePeriod: true,
            periodStartDate: interestRateForPeriod.startDate,
            periodEndDate: interestRateForPeriod.endDate,
            periodBillOpenDate: billOpenDate,
            periodBillDueDate: billDueDate,
            billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
            prebillDaysConfiguration: preBillDaysConfiguration,
            periodInterestRate: interestRateForPeriod.annualInterestRate,
            principal: principal,
            fees: totalFees,
            interest: roundedInterestForPeriod,
            billedDeferredInterest: appliedDeferredIneterest,
            realInterest: rawInterestForPeriod,
            totalInterestForPeriod,
            balanceModificationAmount: periodStartBalance.modificationAmount,
            endBalance: balanceAfterPayment,
            startBalance: balanceBeforePayment,
            totalPayment: fixedMonthlyPayment,
            perDiem: this.round(rawInterestForPeriod.divide(daysInPeriod)),
            daysInPeriod: daysInPeriod,
            unbilledDeferredInterestFromCurrentPeriod: deferredInterestFromCurrentPeriod,
            unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
            interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
            metadata,
          });
        }
      }
    }

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.interest).add(lastPayment.fees);
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      lastPayment.metadata.finalAdjustment = true;
    }

    // Apply unbilled interest due to rounding at the end if applicable
    if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_END) {
      if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
        const lastPayment = schedule[schedule.length - 1];
        const adjustedInterest = lastPayment.interest.add(this.unbilledInterestDueToRounding);
        const adjustedInterestRounded = this.round(adjustedInterest);
        if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
          lastPayment.interest = adjustedInterestRounded;
          lastPayment.realInterest = adjustedInterest;
          lastPayment.interestRoundingError = adjustedInterestRounded.getRoundingErrorAsCurrency();
          lastPayment.totalPayment = lastPayment.principal.add(lastPayment.interest).add(lastPayment.fees);
          lastPayment.metadata.unbilledInterestApplied = true;
          lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber();
        }
      }
    }

    this.repaymentSchedule = schedule;
    return schedule;
  }

  /**
   * Calculates the fixed monthly payment for the loan.
   * @returns The fixed monthly payment as a Currency object.
   */
  private calculateFixedMonthlyPayment(): Currency {
    if (this.annualInterestRate.isZero()) {
      return this.round(this.totalLoanAmount.divide(this.term));
    }
    const monthlyRate = this.annualInterestRate.dividedBy(12);
    const numerator = this.totalLoanAmount.multiply(monthlyRate);
    const denominator = Currency.of(1).subtract(Currency.of(1).divide(new Decimal(1).plus(monthlyRate).pow(this.term)));
    return this.round(numerator.divide(denominator));
  }

  /**
   * Rounds a Currency value to the specified precision using the specified rounding method.
   * @param value The Currency value to round.
   * @returns The rounded Currency value.
   */
  private round(value: Currency): Currency {
    return value.round(this.roundingPrecision, this.roundingMethod);
  }

  /**
   * Generates the TILA disclosures for the loan.
   * @returns An object containing all the TILA-required fields.
   */
  generateTILADisclosures(): TILADisclosures {
    // Ensure the amortization schedule is generated
    const schedule = this.repaymentSchedule;

    if (schedule.length === 0) {
      throw new Error("Amortization schedule is empty. Please generate the amortization schedule before generating TILA disclosures.");
    }

    // Amount Financed: The net amount of credit provided to the borrower
    const amountFinanced = this.loanAmount.subtract(this.originationFee);

    // Total of Payments: The total amount the borrower will have paid after making all scheduled payments
    const totalOfPayments = schedule.reduce((sum, payment) => {
      if (payment.billablePeriod) {
        return sum.add(payment.totalPayment);
      }
      return sum;
    }, Currency.Zero());

    // Finance Charge: The total cost of credit as a dollar amount
    // Finance Charge = Total of Payments - Amount Financed
    const financeCharge = totalOfPayments.subtract(amountFinanced);

    // Annual Percentage Rate (APR): Already calculated in the class
    const annualPercentageRate = this.apr;

    // Payment Schedule: Details of each payment
    const paymentSchedule: PaymentScheduleEntry[] = schedule
      .filter((payment) => payment.billablePeriod)
      .map((payment) => ({
        paymentNumber: payment.period,
        paymentDate: payment.periodEndDate,
        paymentAmount: payment.totalPayment,
        principal: payment.principal,
        interest: payment.interest,
        balance: payment.endBalance,
      }));

    return {
      amountFinanced,
      financeCharge,
      totalOfPayments,
      annualPercentageRate,
      paymentSchedule,
    };
  }

  /**
   * Generates a formatted TILA disclosure document as a string.
   * @returns A string containing the formatted TILA disclosure document.
   */
  printTILADocument(): string {
    const tilaDisclosures = this.generateTILADisclosures();

    // Format numbers and dates
    const formatCurrency = (value: Currency): string => `$${value.toCurrencyString()}`;
    const formatPercentage = (value: Decimal): string => `${value.toFixed(2)}%`;
    const formatDate = (date: Dayjs): string => date.format("MM/DD/YYYY");

    // Build the document string
    let document = "";
    document += "TRUTH IN LENDING DISCLOSURE STATEMENT\n";
    document += "-------------------------------------\n\n";

    document += `ANNUAL PERCENTAGE RATE (APR): ${formatPercentage(tilaDisclosures.annualPercentageRate)}\n`;
    document += `Finance Charge: ${formatCurrency(tilaDisclosures.financeCharge)}\n`;
    document += `Amount Financed: ${formatCurrency(tilaDisclosures.amountFinanced)}\n`;
    document += `Total of Payments: ${formatCurrency(tilaDisclosures.totalOfPayments)}\n\n`;

    document += "PAYMENT SCHEDULE:\n";
    document += "-----------------------------------------------------------\n";
    document += "Payment No. | Payment Date | Payment Amount | Principal | Interest | Balance\n";
    document += "------------|--------------|----------------|-----------|----------|----------\n";

    tilaDisclosures.paymentSchedule.forEach((payment) => {
      document += `${payment.paymentNumber.toString().padStart(11)} | `;
      document += `${formatDate(payment.paymentDate).padEnd(12)} | `;
      document += `${formatCurrency(payment.paymentAmount).padStart(14)} | `;
      document += `${formatCurrency(payment.principal).padStart(9)} | `;
      document += `${formatCurrency(payment.interest).padStart(8)} | `;
      document += `${formatCurrency(payment.balance).padStart(8)}\n`;
    });

    document += "-----------------------------------------------------------\n";

    return document;
  }
}

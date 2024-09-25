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
    // APR = ((Interest + Fees / Loan amount) / Number of days in loan term) x 365 x 100

    // using dayjs calculate the number of months between start date and end date
    // then convert to days
    const payments = this.repaymentSchedule.map((schedule) => {
      return {
        principal: schedule.principal.getValue(),
        interest: schedule.interest.getValue(),
        paymentDate: schedule.periodEndDate.toDate(),
      };
    });

    // print payments object to log for debugging but i want new Decimal, etc.. so i can copy
    // paste this from debug into some test
    // const formattedPayments = payments
    //   .map((payment) => {
    //     return `{ principal: new Decimal(${payment.principal}), interest: new Decimal(${payment.interest}), paymentDate: new Date("${payment.paymentDate.toISOString().split("T")[0]}") }`;
    //   })
    //   .join(",\n  ");
    // console.log(`const terms = [\n  ${formattedPayments}\n];`);

    // console.log(`loanAmount: Currency.of(${this.loanAmount.getValue()}),`);
    // console.log(`originationFee: Currency.of(${this.originationFee.getValue()}),`);
    // console.log("apr inpit", {
    //   loanAmount: this.loanAmount.getValue(),
    //   originationFee: new Decimal(0),
    //   terms: payments,
    // });
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
    console.log(
      this.balanceModifications,
      "balance modifications:",
      this.balanceModifications.map((modification) => {
        return {
          date: modification.date.format("YYYY-MM-DD"),
          type: modification.type,
          amount: modification.amount.toNumber(),
        };
      })
    );
    for (let modification of this.balanceModifications) {
      // see if there are any modifications in the range
      console.log(`Checking modification ${modification.date.format("YYYY-MM-DD")} and comparing it to ${startDate.format("YYYY-MM-DD")} and ${endDate.format("YYYY-MM-DD")}`);
      const modificationDate = dayjs(modification.date).startOf("day");
      if (modificationDate.isSameOrAfter(startDate) && modificationDate.isSameOrBefore(endDate)) {
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
    console.log(
      balances.map((balance) => {
        return {
          startDate: balance.startDate.format("YYYY-MM-DD"),
          endDate: balance.endDate.format("YYYY-MM-DD"),
          balance: balance.balance.toNumber(),
          modificationAmount: balance.modificationAmount.toNumber(),
        };
      })
    );

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
      // each schedule period may have multiple rates
      // we will use same period index for inserted schedule line
      // but separate date ranges and separate calculations for each rate
      let totalInterestForPeriod = Currency.Zero();

      const loanBalancesInAPeriod = this.getModifiedBalance(periodStartDate, periodEndDate, startBalance);
      const lastBalanceInPeriod = loanBalancesInAPeriod.length;
      let currentBalanceIndex = 0;
      for (let periodStartBalance of loanBalancesInAPeriod) {
        currentBalanceIndex++;
        // startBalance = interestStartBalance.balance;
        const periodRates = this.getInterestRatesBetweenDates(periodStartBalance.startDate, periodStartBalance.endDate);

        // Flag to track the last rate in the period, each entry will not have principal portion
        // as it just captures for ease of auditing and debugging interest portion
        // for the portion of the period. The last entry will have the principal portion
        const lastRateInPeriod = periodRates.length;
        let currentRate = 0;
        for (let interestRateForPeriod of periodRates) {
          currentRate++;
          const metadata: AmortizationScheduleMetadata = {}; // Initialize metadata

          if (periodRates.length > 1) {
            metadata.splitInterestPeriod = true; // Track split interest period in metadata
          }

          if (loanBalancesInAPeriod.length > 1) {
            metadata.splitBalancePeriod = true; // Track split balance period in metadata
          }

          const daysInPeriod = this.calendar.daysBetween(periodStartBalance.startDate, periodStartBalance.endDate);

          const interestCalculator = new InterestCalculator(interestRateForPeriod.annualInterestRate, this.calendar.calendarType);

          let rawInterest: Currency;
          if (interestRateForPeriod.annualInterestRate.isZero()) {
            rawInterest = Currency.Zero();
          } else {
            rawInterest = interestCalculator.calculateInterestForDays(startBalance, daysInPeriod);
          }

          // lets check if we have unbilledInterestDueToRounding that is greater than or equal to flushThreshold
          if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD) {
            if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
              rawInterest = rawInterest.add(this.unbilledInterestDueToRounding);
              // add metadata to track the unbilled interest applied
              metadata.unbilledInterestApplied = true;
              metadata.unbilledInterestAppliedAmount = this.unbilledInterestDueToRounding.toNumber();
              this.unbilledInterestDueToRounding = Currency.Zero(); // Reset unbilled interest here, it will be recalculated below
            }
          }

          const rawInterestForPeriod = rawInterest;
          const roundedInterestForPeriod = this.round(rawInterestForPeriod);

          const perDiem = this.round(rawInterestForPeriod.divide(daysInPeriod));
          let appliedDeferredIneterest = Currency.of(0);
          // if we have deferred interest from previous period, we will add it to the interest
          if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
            rawInterest = rawInterest.add(this.unbilledDeferredInterest);
            metadata.deferredInterestAppliedAmount = this.unbilledDeferredInterest.toNumber();
            appliedDeferredIneterest = this.unbilledDeferredInterest;
            this.unbilledDeferredInterest = Currency.Zero(); // Reset deferred interest here, it will be recalculated below
          }

          let roundedInterest = this.round(rawInterest);

          let interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();

          if (!interestRoundingError.getValue().isZero()) {
            metadata.unbilledInterestAmount = interestRoundingError.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
          }

          totalInterestForPeriod = totalInterestForPeriod.add(rawInterest);

          if (currentRate !== lastRateInPeriod) {
            // we will just create a line for interest portion and move to the next part of the loop
            // these periods are not billable, they are here for auditability and
            // transparance on how the interest is calculated
            // and to document clearly periods that have multiple rates
            // or balance is being accrued on different principal balance
            schedule.push({
              period: periodIndex,
              billablePeriod: false,
              periodStartDate: dayjs(interestRateForPeriod.startDate),
              periodEndDate: dayjs(interestRateForPeriod.endDate),
              periodInterestRate: interestRateForPeriod.annualInterestRate,
              principal: Currency.of(0),
              interest: roundedInterestForPeriod,
              billedDeferredInterest: appliedDeferredIneterest,
              periodBillOpenDate: billOpenDate,
              periodBillDueDate: billDueDate,
              billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
              prebillDaysConfiguration: preBillDaysConfiguration,
              realInterest: rawInterestForPeriod, // Track real interest value
              totalInterestForPeriod,
              interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
              balanceModificationAmount: periodStartBalance.modificationAmount,
              endBalance: Currency.of(startBalance),
              startBalance: Currency.of(startBalance),
              totalPayment: Currency.of(0),
              perDiem,
              daysInPeriod: daysInPeriod,
              unbilledDeferredInterestFromCurrentPeriod: Currency.of(0),
              unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
              unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
              metadata, // Include metadata in the schedule entry
            });
            continue;
          }

          if (currentBalanceIndex !== lastBalanceInPeriod) {
            // this is a split balance period, we will just create a line for interest portion and move to the next part of the loop
            // these periods are not billable, they are here for auditability and
            // transparance on how the interest is calculated
            // and to document clearly periods that have multiple rates
            // or balance is being accrued on different principal balance
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
              realInterest: rawInterestForPeriod, // Track real interest value
              totalInterestForPeriod,
              interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
              balanceModificationAmount: periodStartBalance.modificationAmount,
              balanceModification: periodStartBalance.balanceModification,
              endBalance: Currency.of(endBalance),
              startBalance: Currency.of(startBalance),
              totalPayment: Currency.of(0),
              perDiem,
              daysInPeriod: daysInPeriod,
              unbilledDeferredInterestFromCurrentPeriod: Currency.of(0),
              unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
              unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
              metadata, // Include metadata in the schedule entry
            });
            startBalance = endBalance;
            continue;
          }

          let totalInterestForPeriodRounded = this.round(totalInterestForPeriod);
          let principal = fixedMonthlyPayment.subtract(totalInterestForPeriodRounded);

          // it is possible that our EMI is less than the interest for the period
          let deferredInterestFromCurrentPeriod = Currency.of(0);
          if (principal.getValue().isNegative()) {
            principal = Currency.of(0);
            totalInterestForPeriodRounded = this.round(fixedMonthlyPayment);
            // now rest of the interest that cannot be billed will go to deferred interest
            // and will have to be repaid next period
            deferredInterestFromCurrentPeriod = totalInterestForPeriod.subtract(totalInterestForPeriodRounded);
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

          // Track cumulative interest without rounding
          this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(totalInterestForPeriodRounded);
          this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(totalInterestForPeriod);

          if (totalInterestForPeriodRounded.getValue().isZero() && totalInterestForPeriod.getValue().greaterThan(0) && fixedMonthlyPayment.getValue().greaterThan(0)) {
            metadata.interestLessThanOneCent = true; // Track when interest is less than one cent
            metadata.actualInterestValue = totalInterestForPeriod.toNumber(); // Store the actual interest value
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(totalInterestForPeriod); // Add unrounded interest to unbilled interest due to rounding
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
            interest: roundedInterestForPeriod,
            billedDeferredInterest: appliedDeferredIneterest,
            realInterest: rawInterestForPeriod,
            totalInterestForPeriod,
            balanceModificationAmount: periodStartBalance.modificationAmount,
            endBalance: balanceAfterPayment,
            startBalance: balanceBeforePayment,
            totalPayment: fixedMonthlyPayment,
            perDiem,
            daysInPeriod: daysInPeriod,
            unbilledDeferredInterestFromCurrentPeriod: deferredInterestFromCurrentPeriod,
            unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
            interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
            metadata, // Include metadata in the schedule entry
          });
        }
      }
    }

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.interest);
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      //  lastPayment.daysInPeriod = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
      lastPayment.interestRoundingError = lastPayment.interest.getRoundingErrorAsCurrency();
      lastPayment.metadata.finalAdjustment = true; // Track final adjustment in metadata
    }

    // Check if unbilledInterestDueToRounding is greater than one cent and apply it to the last payment
    if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_END) {
      if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
        const lastPayment = schedule[schedule.length - 1];
        const adjustedInterest = lastPayment.interest.add(this.unbilledInterestDueToRounding);
        const adjustedInterestRounded = this.round(adjustedInterest);
        if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
          lastPayment.interest = adjustedInterestRounded;
          lastPayment.realInterest = adjustedInterest;
          lastPayment.interestRoundingError = adjustedInterestRounded.getRoundingErrorAsCurrency();
          lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
          lastPayment.metadata.unbilledInterestApplied = true; // Track unbilled interest application in metadata
          lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber(); // Track the amount of unbilled interest applied
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

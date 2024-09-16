import dayjs, { Dayjs } from "dayjs";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator } from "./InterestCalculator";
import Decimal from "decimal.js";

export interface AmortizationScheduleMetadata {
  splitInterestPeriod?: boolean;
  unbilledInterestApplied?: boolean;
  unbilledInterestAppliedAmount?: number;
  interestLessThanOneCent?: boolean;
  unbilledInterestAmount?: number;
  actualInterestValue?: number;
  finalAdjustment?: boolean;
  deferredInterestAppliedAmount?: number;
  amountAddedToDeferredInterest?: number;
}
/**
 * Represents a single entry in the amortization schedule.
 */
export interface AmortizationSchedule {
  period: number;
  periodStartDate: Dayjs;
  periodEndDate: Dayjs;
  periodInterestRate: Decimal;
  principal: Currency;
  interest: Currency;
  billedDeferredInterest: Currency;
  realInterest: Currency; // tracks real interest value
  totalInterestForPeriod: Currency; // tracks total interest for the period
  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
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

export interface TermPaymentAmount {
  termNumber: number;
  paymentAmount: Currency;
}

export interface AmortizationParams {
  loanAmount: Currency;
  annualInterestRate: Decimal;
  term: number;
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
}

/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export class Amortization {
  loanAmount: Currency;
  annualInterestRate: Decimal;
  term: number; // in months
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

  constructor(params: AmortizationParams) {
    // validate that loan amount is greater than zero
    if (params.loanAmount.getValue().isZero() || params.loanAmount.getValue().isNegative()) {
      throw new Error("Invalid loan amount, must be greater than zero");
    }
    this.loanAmount = params.loanAmount;

    if (params.allowRateAbove100 !== undefined) {
      this.allowRateAbove100 = params.allowRateAbove100;
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
    this.endDate = params.endDate ? dayjs(params.endDate).startOf("day") : this.startDate.add(this.term, "month");

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

    this.equitedMonthlyPayment = this.calculateFixedMonthlyPayment();

    this.unbilledDeferredInterest = Currency.of(0);

    // validate the schedule periods and rates
    this.verifySchedulePeriods();
    this.validateRatesSchedule();
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
      throw new Error("Invalid schedule periods");
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isSame(this.periodsSchedule[0].startDate, "day")) {
      throw new Error("Invalid schedule periods");
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.periodsSchedule[this.periodsSchedule.length - 1].endDate, "day")) {
      throw new Error("Invalid schedule periods");
    }

    for (let i = 0; i < this.periodsSchedule.length - 1; i++) {
      // Check if the periods are in ascending order
      if (!this.periodsSchedule[i].endDate.isSame(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods");
      }
      // Check if the periods are non-overlapping
      if (this.periodsSchedule[i].endDate.isAfter(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods");
      }
    }
  }

  /**
   * Generate schedule periods based on the term and start date.
   */

  generatePeriodicSchedule(): void {
    let startDate = this.startDate;
    for (let i = 0; i < this.term; i++) {
      const endDate = this.calendar.addMonths(startDate, 1);
      this.periodsSchedule.push({ startDate, endDate });
      startDate = endDate;
    }
  }

  /**
   * Generate schedule rates based on the term and start date.
   */

  generateRatesSchedule(): void {
    let startDate = this.startDate;
    const endDate = this.calendar.addMonths(startDate, this.term);
    this.rateSchedules.push({ annualInterestRate: this.annualInterestRate, startDate, endDate });
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

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  generateSchedule(): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    let startBalance = this.loanAmount;

    let periodIndex = 0;
    for (let period of this.periodsSchedule) {
      periodIndex++;
      const periodStartDate = period.startDate;
      const periodEndDate = period.endDate;
      const periodRates = this.getInterestRatesBetweenDates(periodStartDate, periodEndDate);
      const fixedMonthlyPayment = this.getTermPaymentAmount(periodIndex);

      // each schedule period may have multiple rates
      // we will use same period index for inserted schedule line
      // but separate date ranges and separate calculations for each rate
      let totalInterestForPeriod = Currency.Zero();

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

        const daysInPeriod = this.calendar.daysBetween(interestRateForPeriod.startDate, interestRateForPeriod.endDate);
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
          schedule.push({
            period: periodIndex,
            periodStartDate: interestRateForPeriod.startDate,
            periodEndDate: interestRateForPeriod.endDate,
            periodInterestRate: interestRateForPeriod.annualInterestRate,
            principal: Currency.of(0),
            interest: roundedInterestForPeriod,
            billedDeferredInterest: appliedDeferredIneterest,

            realInterest: rawInterestForPeriod, // Track real interest value
            totalInterestForPeriod,
            interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),

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
          periodStartDate: interestRateForPeriod.startDate,
          periodEndDate: interestRateForPeriod.endDate,
          periodInterestRate: interestRateForPeriod.annualInterestRate,
          principal: principal,
          interest: roundedInterestForPeriod,
          billedDeferredInterest: appliedDeferredIneterest,
          realInterest: rawInterestForPeriod,
          totalInterestForPeriod,
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

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.interest);
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      lastPayment.daysInPeriod = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
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

    return schedule;
  }

  /**
   * Calculates the fixed monthly payment for the loan.
   * @returns The fixed monthly payment as a Currency object.
   */
  private calculateFixedMonthlyPayment(): Currency {
    if (this.annualInterestRate.isZero()) {
      return this.round(this.loanAmount.divide(this.term));
    }
    const monthlyRate = this.annualInterestRate.dividedBy(12);
    const numerator = this.loanAmount.multiply(monthlyRate);
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
}

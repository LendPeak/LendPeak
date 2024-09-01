import dayjs, { Dayjs } from "dayjs";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator } from "./InterestCalculator";
import Decimal from "decimal.js";

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
  realInterest: Currency; // New property to track real interest value
  totalInterestForPeriod: Currency; // New property to track total interest for the period
  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
  perDiem: Currency;
  daysInPeriod: number;
  roundingError: Currency;
  cummulativeRoundError: Currency;
  unbilledInterestDueToRounding: Currency; // New property to track unbilled interest due to rounding
  metadata: Record<string, any>; // Metadata to track any adjustments or corrections
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
export enum FlushCumulativeRoundingErrorType {
  NONE = "none",
  AT_END = "at_end",
  AT_THRESHOLD = "at_threshold",
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
  flushCumulativeRoundingError: FlushCumulativeRoundingErrorType; // Updated property
  cumulativeInterestWithoutRounding: Currency; // New property to track cumulative interest without rounding
  totalChargedInterestRounded: Currency; // New property to track total charged interest (rounded)
  totalChargedInterestUnrounded: Currency; // New property to track total charged interest (unrounded)
  unbilledInterestDueToRounding: Currency; // New property to track unbilled interest due to rounding
  roundingPrecision: number; // New property to track precision for rounding
  flushThreshold: Currency; // New property to track the threshold for flushing cumulative rounding error
  periodsSchedule: PeriodSchedule[] = [];
  rateSchedules: RateSchedule[] = [];

  constructor(params: {
    loanAmount: Currency;
    interestRate: Decimal;
    term: number;
    startDate: Dayjs;
    endDate?: Dayjs;
    calendarType?: CalendarType;
    roundingMethod?: RoundingMethod;
    flushCumulativeRoundingError?: FlushCumulativeRoundingErrorType;
    roundingPrecision?: number;
    flushThreshold?: Currency;
    periodsSchedule?: PeriodSchedule[];
    ratesSchedule?: RateSchedule[];
  }) {
    this.loanAmount = params.loanAmount;
    this.annualInterestRate = params.interestRate;
    this.term = params.term;
    this.startDate = params.startDate;
    this.endDate = params.endDate || this.startDate.add(this.term, "month");
    this.calendar = new Calendar(params.calendarType || CalendarType.ACTUAL_ACTUAL);
    this.roundingMethod = params.roundingMethod || RoundingMethod.ROUND_HALF_UP;
    this.flushCumulativeRoundingError = params.flushCumulativeRoundingError || FlushCumulativeRoundingErrorType.NONE;
    this.cumulativeInterestWithoutRounding = Currency.of(0);
    this.totalChargedInterestRounded = Currency.of(0);
    this.totalChargedInterestUnrounded = Currency.of(0);
    this.unbilledInterestDueToRounding = Currency.of(0);
    this.roundingPrecision = params.roundingPrecision || 2;
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
    }

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
      throw new Error("Invalid schedule rates");
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.rateSchedules[this.rateSchedules.length - 1].endDate, "day")) {
      throw new Error("Invalid schedule rates");
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
          interest: row.interest.getRoundedValue(this.roundingPrecision).toNumber(),
          realInterest: row.realInterest.toNumber(), // Include real interest value in the printed table
          roundingError: row.roundingError.toNumber(),
          cummulativeRoundError: row.cummulativeRoundError.toNumber(),
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

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  generateSchedule(): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    let startBalance = this.loanAmount;
    const fixedMonthlyPayment = this.calculateFixedMonthlyPayment();

    let cummulativeRoundError = Currency.of(0);

    let periodIndex = 0;
    for (let period of this.periodsSchedule) {
      periodIndex++;
      const periodStartDate = period.startDate;
      const periodEndDate = period.endDate;
      const periodRates = this.getInterestRatesBetweenDates(periodStartDate, periodEndDate);

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
        const metadata: Record<string, any> = {}; // Initialize metadata

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
        if (this.unbilledInterestDueToRounding.getValue().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
          rawInterest = rawInterest.add(this.unbilledInterestDueToRounding);
          // add metadata to track the unbilled interest applied
          metadata.unbilledInterestApplied = true;
          metadata.unbilledInterestAppliedAmount = this.unbilledInterestDueToRounding.toNumber();
          this.unbilledInterestDueToRounding = Currency.Zero(); // Reset unbilled interest here, it will be recalculated below
        }
        let roundedInterest = this.round(rawInterest);
        const perDiem = this.round(rawInterest.divide(daysInPeriod));
        totalInterestForPeriod = totalInterestForPeriod.add(rawInterest);

        if (currentRate !== lastRateInPeriod) {
          // we will just create a line for interest portion and move to the next part of the loop
          schedule.push({
            period: periodIndex,
            periodStartDate: interestRateForPeriod.startDate,
            periodEndDate: interestRateForPeriod.endDate,
            periodInterestRate: interestRateForPeriod.annualInterestRate,
            principal: Currency.of(0),
            interest: roundedInterest,
            realInterest: rawInterest, // Track real interest value
            totalInterestForPeriod,
            endBalance: Currency.of(startBalance),
            startBalance: Currency.of(startBalance),
            totalPayment: Currency.of(0),
            perDiem,
            daysInPeriod: daysInPeriod,
            roundingError: roundedInterest.getRoundingErrorAsCurrency(),
            cummulativeRoundError,
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
            metadata, // Include metadata in the schedule entry
          });
          continue;
        }

        let rawPrincipal = fixedMonthlyPayment.subtract(totalInterestForPeriod);

        let roundedPrincipal = this.round(rawPrincipal);

        let totalInterestForPeriodRounded = this.round(totalInterestForPeriod);

        // Check for rounding discrepancy
        const totalRoundedPayment = totalInterestForPeriodRounded.add(roundedPrincipal);
        if (!totalRoundedPayment.getValue().equals(fixedMonthlyPayment.getValue())) {
          const discrepancy = fixedMonthlyPayment.subtract(totalRoundedPayment);
          rawPrincipal = rawPrincipal.add(discrepancy);
          roundedPrincipal = this.round(rawPrincipal);
          metadata.roundingDiscrepancyAdjustment = true; // Track adjustment in metadata
          metadata.discrepancyAmount = discrepancy.toNumber(); // Track the amount of discrepancy
        }

        const balanceBeforePayment = Currency.of(startBalance);
        const balanceAfterPayment = startBalance.subtract(rawPrincipal);
        const roundedBalanceAfterPayment = startBalance.subtract(roundedPrincipal);

        let roundingError: Currency;
        // Track cumulative interest without rounding
        this.cumulativeInterestWithoutRounding = this.cumulativeInterestWithoutRounding.add(totalInterestForPeriod);
        this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(totalInterestForPeriodRounded);
        this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(totalInterestForPeriod);

        if (totalInterestForPeriodRounded.getValue().isZero() && totalInterestForPeriod.getValue().greaterThan(0)) {
          metadata.interestLessThanOneCent = true; // Track when interest is less than one cent
          metadata.actualInterestValue = totalInterestForPeriod.toNumber(); // Store the actual interest value
          this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(totalInterestForPeriod); // Add unrounded interest to unbilled interest due to rounding
          roundingError = Currency.of(0);
        } else {
          roundingError = roundedBalanceAfterPayment.subtract(balanceAfterPayment);
          cummulativeRoundError = cummulativeRoundError.add(roundingError);
        }

        // Flush cumulative rounding error if it exceeds the threshold
        if (this.flushCumulativeRoundingError === FlushCumulativeRoundingErrorType.AT_THRESHOLD && cummulativeRoundError.getValue().abs().comparedTo(this.flushThreshold.getValue()) >= 0) {
          const flushAmount = cummulativeRoundError;
          const adjustedInterest = this.round(totalInterestForPeriodRounded.add(flushAmount));
          if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
            totalInterestForPeriodRounded = adjustedInterest;
            cummulativeRoundError = cummulativeRoundError.subtract(flushAmount);
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.subtract(flushAmount); // Update unbilled interest due to rounding
            metadata.cumulativeRoundingErrorFlushed = true; // Track cumulative rounding error flush in metadata
            metadata.cumulativeRoundingErrorAmount = flushAmount.toNumber(); // Track the amount of cumulative rounding error
          }
        }

        startBalance = roundedBalanceAfterPayment;

        schedule.push({
          period: periodIndex,
          periodStartDate: interestRateForPeriod.startDate,
          periodEndDate: interestRateForPeriod.endDate,
          periodInterestRate: interestRateForPeriod.annualInterestRate,
          principal: roundedPrincipal,
          interest: roundedInterest,
          realInterest: rawInterest, // Track real interest value
          totalInterestForPeriod,
          endBalance: roundedBalanceAfterPayment,
          startBalance: balanceBeforePayment,
          totalPayment: fixedMonthlyPayment,
          perDiem,
          daysInPeriod: daysInPeriod,
          roundingError,
          cummulativeRoundError,
          unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
          metadata, // Include metadata in the schedule entry
        });
      }
    }

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = this.round(lastPayment.principal.add(startBalance));
      lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      lastPayment.daysInPeriod = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
      lastPayment.roundingError = this.round(lastPayment.totalPayment.subtract(lastPayment.principal.add(lastPayment.interest)));
      lastPayment.metadata.finalAdjustment = true; // Track final adjustment in metadata
    }

    // Flush cumulative rounding error based on the setting
    if (this.flushCumulativeRoundingError === FlushCumulativeRoundingErrorType.AT_END && cummulativeRoundError.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      const flushAmount = cummulativeRoundError;
      const adjustedInterest = this.round(lastPayment.interest.add(flushAmount));
      if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
        lastPayment.interest = adjustedInterest;
        lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
        cummulativeRoundError = cummulativeRoundError.subtract(flushAmount);
        this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.subtract(flushAmount); // Update unbilled interest due to rounding
        lastPayment.metadata.cumulativeRoundingErrorFlushed = true; // Track cumulative rounding error flush in metadata
        lastPayment.metadata.cumulativeRoundingErrorAmount = flushAmount.toNumber(); // Track the amount of cumulative rounding error
      }
    }

    // Check if unbilledInterestDueToRounding is greater than one cent and apply it to the last payment
    if (this.unbilledInterestDueToRounding.getValue().greaterThanOrEqualTo(0.01)) {
      const lastPayment = schedule[schedule.length - 1];
      const adjustedInterest = this.round(lastPayment.interest.add(this.unbilledInterestDueToRounding));
      if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
        lastPayment.interest = adjustedInterest;
        lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
        lastPayment.metadata.unbilledInterestApplied = true; // Track unbilled interest application in metadata
        lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber(); // Track the amount of unbilled interest applied
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

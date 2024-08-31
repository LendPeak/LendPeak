import dayjs, { Dayjs } from "dayjs";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator } from "./InterestCalculator";
/**
 * Represents a single entry in the amortization schedule.
 */
export interface AmortizationSchedule {
  period: number;
  paymentDate: Dayjs;
  principal: Currency;
  interest: Currency;
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
  interestRate: number;
  term: number; // in months
  startDate: Dayjs;
  calendar: Calendar;
  roundingMethod: RoundingMethod;
  interestCalculator: InterestCalculator;
  flushCumulativeRoundingError: FlushCumulativeRoundingErrorType; // Updated property
  cumulativeInterestWithoutRounding: Currency; // New property to track cumulative interest without rounding
  totalChargedInterestRounded: Currency; // New property to track total charged interest (rounded)
  totalChargedInterestUnrounded: Currency; // New property to track total charged interest (unrounded)
  unbilledInterestDueToRounding: Currency; // New property to track unbilled interest due to rounding
  roundingPrecision: number; // New property to track precision for rounding
  flushThreshold: Currency; // New property to track the threshold for flushing cumulative rounding error

  constructor(params: {
    loanAmount: Currency;
    interestRate: number;
    term: number;
    startDate: Dayjs;
    calendarType?: CalendarType;
    roundingMethod?: RoundingMethod;
    flushCumulativeRoundingError?: FlushCumulativeRoundingErrorType;
    roundingPrecision?: number;
    flushThreshold?: Currency;
  }) {
    this.loanAmount = params.loanAmount;
    this.interestRate = params.interestRate;
    this.term = params.term;
    this.startDate = params.startDate;
    this.calendar = new Calendar(params.calendarType || CalendarType.ACTUAL_ACTUAL);
    this.roundingMethod = params.roundingMethod || RoundingMethod.ROUND_HALF_UP;
    this.interestCalculator = new InterestCalculator(this.interestRate, params.calendarType || CalendarType.ACTUAL_ACTUAL);
    this.flushCumulativeRoundingError = params.flushCumulativeRoundingError || FlushCumulativeRoundingErrorType.NONE;
    this.cumulativeInterestWithoutRounding = Currency.of(0);
    this.totalChargedInterestRounded = Currency.of(0);
    this.totalChargedInterestUnrounded = Currency.of(0);
    this.unbilledInterestDueToRounding = Currency.of(0);
    this.roundingPrecision = params.roundingPrecision || 2;
    this.flushThreshold = params.flushThreshold || Currency.of(0.01); // Default threshold is 1 cent
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
          paymentDate: row.paymentDate.format("YYYY-MM-DD"),
          principal: row.principal.getRoundedValue(this.roundingPrecision).toNumber(),
          interest: row.interest.getRoundedValue(this.roundingPrecision).toNumber(),
          totalPayment: row.totalPayment.getRoundedValue(this.roundingPrecision).toNumber(),
          perDiem: row.perDiem.getRoundedValue(this.roundingPrecision).toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          endBalance: row.endBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          roundingError: row.roundingError.getValue().toNumber(),
          cummulativeRoundError: row.cummulativeRoundError.getValue().toNumber(),
          unbilledInterestDueToRounding: row.unbilledInterestDueToRounding.getValue().toNumber(), // Include unbilled interest due to rounding in the printed table
          metadata: JSON.stringify(row.metadata), // Include metadata in the printed table
        };
      })
    );
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

    for (let period = 1; period <= this.term; period++) {
      const paymentDate = this.calendar.addMonths(this.startDate, period);
      const daysInMonth = this.calendar.daysInMonth(paymentDate);
      const metadata: Record<string, any> = {}; // Initialize metadata

      let rawInterest = this.interestRate === 0 ? Currency.of(0) : this.interestCalculator.calculateInterestForDays(startBalance, daysInMonth);
      let rawPrincipal = fixedMonthlyPayment.subtract(rawInterest);

      let roundedInterest = this.round(rawInterest);
      let roundedPrincipal = this.round(rawPrincipal);

      // Check for rounding discrepancy
      const totalRoundedPayment = roundedInterest.add(roundedPrincipal);
      if (!totalRoundedPayment.getValue().equals(fixedMonthlyPayment.getValue())) {
        const discrepancy = fixedMonthlyPayment.subtract(totalRoundedPayment);
        rawPrincipal = rawPrincipal.add(discrepancy);
        roundedPrincipal = this.round(rawPrincipal);
        metadata.roundingDiscrepancyAdjustment = true; // Track adjustment in metadata
        metadata.discrepancyAmount = discrepancy.getValue().toNumber(); // Track the amount of discrepancy
      }

      const balanceBeforePayment = Currency.of(startBalance);
      const balanceAfterPayment = startBalance.subtract(rawPrincipal);
      const roundedBalanceAfterPayment = startBalance.subtract(roundedPrincipal);
      const perDiem = this.round(rawInterest.divide(daysInMonth));

      let roundingError: Currency;
      // Track cumulative interest without rounding
      this.cumulativeInterestWithoutRounding = this.cumulativeInterestWithoutRounding.add(rawInterest);
      this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(roundedInterest);
      this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(rawInterest);

      if (roundedInterest.getValue().toNumber() === 0 && rawInterest.getValue().toNumber() > 0) {
        metadata.interestLessThanOneCent = true; // Track when interest is less than one cent
        metadata.actualInterestValue = rawInterest.getValue().toNumber(); // Store the actual interest value
        this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(rawInterest); // Add unrounded interest to unbilled interest due to rounding
        roundingError = Currency.of(0);
      } else {
        roundingError = roundedBalanceAfterPayment.subtract(balanceAfterPayment);
        cummulativeRoundError = cummulativeRoundError.add(roundingError);
      }



      startBalance = roundedBalanceAfterPayment;

      schedule.push({
        period,
        paymentDate,
        principal: roundedPrincipal,
        interest: roundedInterest,
        endBalance: roundedBalanceAfterPayment,
        startBalance: balanceBeforePayment,
        totalPayment: fixedMonthlyPayment,
        perDiem,
        daysInPeriod: daysInMonth,
        roundingError,
        cummulativeRoundError,
        unbilledInterestDueToRounding: this.unbilledInterestDueToRounding, // Track unbilled interest due to rounding
        metadata, // Include metadata in the schedule entry
      });
    }

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.getValue().toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = this.round(lastPayment.principal.add(startBalance));
      lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      lastPayment.daysInPeriod = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
      lastPayment.roundingError = this.round(lastPayment.totalPayment.subtract(lastPayment.principal.add(lastPayment.interest)));
      lastPayment.metadata.finalAdjustment = true; // Track final adjustment in metadata
    }




    return schedule;
  }

  /**
   * Calculates the fixed monthly payment for the loan.
   * @returns The fixed monthly payment as a Currency object.
   */
  private calculateFixedMonthlyPayment(): Currency {
    if (this.interestRate === 0) {
      return this.round(this.loanAmount.divide(this.term));
    }
    const monthlyRate = this.interestRate / 12;
    const numerator = this.loanAmount.multiply(monthlyRate);
    const denominator = Currency.of(1).subtract(Currency.of(1).divide((1 + monthlyRate) ** this.term));
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

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
  metadata: Record<string, any>; // Metadata to track any adjustments or corrections
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
  flushCumulativeRoundingErrorAtTheEnd: boolean; // New property to control flushing of cumulative rounding error
  cumulativeInterestWithoutRounding: Currency; // New property to track cumulative interest without rounding
  totalChargedInterestRounded: Currency; // New property to track total charged interest (rounded)
  totalChargedInterestUnrounded: Currency; // New property to track total charged interest (unrounded)
  unbilledInterestDueToRounding: Currency; // New property to track unbilled interest due to rounding
  precision: number; // New property to track precision for rounding

  constructor(
    loanAmount: Currency,
    interestRate: number,
    term: number,
    startDate: Dayjs,
    calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL,
    roundingMethod: RoundingMethod = RoundingMethod.ROUND_HALF_UP,
    flushCumulativeRoundingErrorAtTheEnd: boolean = false, // Default to false
    precision: number = 2 // Default precision to 2
  ) {
    this.loanAmount = loanAmount;
    this.interestRate = interestRate;
    this.term = term;
    this.startDate = startDate;
    this.calendar = new Calendar(calendarType);
    this.roundingMethod = roundingMethod;
    this.interestCalculator = new InterestCalculator(interestRate, calendarType);
    this.flushCumulativeRoundingErrorAtTheEnd = flushCumulativeRoundingErrorAtTheEnd; // Initialize the new property
    this.cumulativeInterestWithoutRounding = Currency.of(0); // Initialize cumulative interest without rounding
    this.totalChargedInterestRounded = Currency.of(0); // Initialize total charged interest (rounded)
    this.totalChargedInterestUnrounded = Currency.of(0); // Initialize total charged interest (unrounded)
    this.unbilledInterestDueToRounding = Currency.of(0); // Initialize unbilled interest due to rounding
    this.precision = precision; // Initialize precision
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
          principal: row.principal.getRoundedValue().toNumber(),
          interest: row.interest.getRoundedValue().toNumber(),
          totalPayment: row.totalPayment.getRoundedValue().toNumber(),
          perDiem: row.perDiem.getRoundedValue().toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue().toNumber(),
          endBalance: row.endBalance.getRoundedValue().toNumber(),
          roundingError: row.roundingError.getValue().toNumber(),
          cummulativeRoundError: row.cummulativeRoundError.getValue().toNumber(),
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

      let rawInterest = this.interestRate === 0 ? Currency.of(0) : this.interestCalculator.calculateInterestForDays(startBalance, daysInMonth);
      let rawPrincipal = fixedMonthlyPayment.subtract(rawInterest);

      const roundedInterest = this.round(rawInterest);
      let roundedPrincipal = this.round(rawPrincipal);

      const metadata: Record<string, any> = {}; // Initialize metadata

      // Check for rounding discrepancy
      const totalRoundedPayment = roundedInterest.add(roundedPrincipal);
      if (totalRoundedPayment.getValue().comparedTo(fixedMonthlyPayment.getValue()) !== 0) {
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

      const roundingError = roundedBalanceAfterPayment.subtract(balanceAfterPayment);
      cummulativeRoundError = cummulativeRoundError.add(roundingError);

      // Track cumulative interest without rounding
      this.cumulativeInterestWithoutRounding = this.cumulativeInterestWithoutRounding.add(rawInterest);
      this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(roundedInterest);
      this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(rawInterest);

      if (roundedInterest.getValue().toNumber() === 0 && rawInterest.getValue().toNumber() > 0) {
        metadata.interestLessThanOneCent = true; // Track when interest is less than one cent
        metadata.actualInterestValue = rawInterest.getValue().toNumber(); // Store the actual interest value
        this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(rawInterest); // Add unrounded interest to unbilled interest due to rounding
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

    // Flush cumulative rounding error to the last payment if the setting is enabled
    if (this.flushCumulativeRoundingErrorAtTheEnd && cummulativeRoundError.getValue().toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.interest = this.round(lastPayment.interest.add(cummulativeRoundError));
      lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
      lastPayment.metadata.cumulativeRoundingErrorFlushed = true; // Track cumulative rounding error flush in metadata
      lastPayment.metadata.cumulativeRoundingErrorAmount = cummulativeRoundError.getValue().toNumber(); // Track the amount of cumulative rounding error
    }

    // Check if unbilledInterestDueToRounding is greater than one cent and apply it to the last payment
    if (this.unbilledInterestDueToRounding.getValue().comparedTo(0.01) > 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.interest = this.round(lastPayment.interest.add(this.unbilledInterestDueToRounding));
      lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
      lastPayment.metadata.unbilledInterestApplied = true; // Track unbilled interest application in metadata
      lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.getValue().toNumber(); // Track the amount of unbilled interest applied
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
    return value.round(this.precision, this.roundingMethod);
  }
}

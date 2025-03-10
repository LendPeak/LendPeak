import { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import Decimal from "decimal.js";

export type PerDiemCalculationType = "AnnualRateDividedByDaysInYear" | "MonthlyRateDividedByDaysInMonth";

export interface PaymentSplit {
  principal: Currency;
  interest: Currency;
  remainingDeferredInterest: Currency;
}

export interface rateScheduleRow {
  startDate: Dayjs;
  endDate: Dayjs;
  annualInterestRate: number;
}

export interface AmortizationTerm {
  principal: Decimal;
  interest: Decimal;
  paymentDate: Date;
}

export interface APRInputs {
  loanAmount: Decimal;
  originationFee: Decimal;
  terms: AmortizationTerm[];
}

export class InterestCalculator {
  private calendar: Calendar;
  private annualInterestRate: Decimal;
  private perDiemCalculationType: PerDiemCalculationType;
  private daysInAMonth?: number;
  private _perDiem?: Currency;

  constructor(annualInterestRate: Decimal, calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL, perDiemCalculationType: PerDiemCalculationType = "AnnualRateDividedByDaysInYear", daysInAMonth?: number) {
    this.annualInterestRate = annualInterestRate;
    this.calendar = new Calendar(calendarType);
    this.perDiemCalculationType = perDiemCalculationType;

    if (this.perDiemCalculationType === "MonthlyRateDividedByDaysInMonth") {
      if (daysInAMonth === undefined) {
        throw new Error("Days in a month must be provided for MonthlyRateDividedByDaysInMonth calculation type.");
      }
      this.daysInAMonth = daysInAMonth;
    }
  }

  static yearFraction(startDate: Date, endDate: Date): number {
    const millisPerYear = 1000 * 60 * 60 * 24 * 365.25;
    return (endDate.getTime() - startDate.getTime()) / millisPerYear;
  }

  static calculateRealAPR({ loanAmount, originationFee, terms }: APRInputs, precision: number = 10): Decimal {
    const maxIterations = 100;
    const tolerance = 1e-9;

    // Input validation
    if (loanAmount.lessThanOrEqualTo(0)) {
      throw new Error("Loan amount must be greater than zero.");
    }

    if (originationFee.lessThan(0)) {
      throw new Error("Origination fee cannot be negative.");
    }

    if (originationFee.greaterThan(loanAmount)) {
      throw new Error("Origination fee cannot exceed the loan amount.");
    }

    if (terms.length === 0) {
      throw new Error("At least one payment term is required.");
    }

    // Build cash flows
    const netLoanAmount = loanAmount.minus(originationFee);

    // Ensure netLoanAmount is positive
    if (netLoanAmount.lessThanOrEqualTo(0)) {
      throw new Error("Net loan amount after subtracting origination fee must be greater than zero.");
    }

    const cashFlows: Decimal[] = [];

    // Cash inflow at time zero (from the lender's perspective, it's an outflow)
    cashFlows.push(netLoanAmount.negated());

    terms.forEach((term) => {
      const payment = term.principal.plus(term.interest);
      // Payments are inflows to the lender (outflows from borrower), so they are positive
      cashFlows.push(payment);
    });

    // Function to calculate NPV for a given monthly interest rate
    const npv = (monthlyRate: Decimal): Decimal => {
      return cashFlows.reduce((sum, cashFlow, index) => {
        const discountFactor = new Decimal(1).plus(monthlyRate).pow(index);
        return sum.plus(cashFlow.div(discountFactor));
      }, new Decimal(0));
    };

    // Function to calculate derivative of NPV with respect to monthlyRate
    const npvDerivative = (monthlyRate: Decimal): Decimal => {
      return cashFlows.reduce((sum, cashFlow, index) => {
        if (index === 0) {
          return sum; // No derivative at time zero
        }
        const discountFactor = new Decimal(1).plus(monthlyRate).pow(index + 1);
        const termDerivative = cashFlow.times(-index).div(discountFactor);
        return sum.plus(termDerivative);
      }, new Decimal(0));
    };

    // Newton-Raphson method to find the APR that solves the NPV equation
    let monthlyRate = new Decimal(0.01 / 12); // Initial guess for monthly rate
    let iteration = 0;

    while (iteration < maxIterations) {
      const currentNPV = npv(monthlyRate);
      const derivative = npvDerivative(monthlyRate);

      if (derivative.abs().lessThan(tolerance)) {
        console.warn("APR calculation failed: Derivative is too small. This may occur due to invalid or inconsistent input values, such as negative balances or improper cash flows.");

        // Return zero APR
        return new Decimal(0);
      }

      const newRate = monthlyRate.minus(currentNPV.div(derivative));

      if (newRate.minus(monthlyRate).abs().lessThan(tolerance)) {
        monthlyRate = newRate;
        break;
      }

      monthlyRate = newRate;
      iteration++;
    }

    if (iteration === maxIterations) {
      throw new Error("APR calculation failed: Maximum number of iterations reached. This may occur due to invalid inputs or the method not converging.");
    }

    // Convert monthly rate to annual rate (APR)
    const annualRate = monthlyRate.times(12);

    // Return APR in percentage format with the desired precision
    return annualRate.times(100).toDecimalPlaces(precision);
  }

  /**
   * Calculate the interest for a period between two dates.
   * @param principal - The principal amount on which interest is calculated (Currency).
   * @param startDate - The start date of the period.
   * @param endDate - The end date of the period.
   * @returns {Currency} - The interest amount as a Currency object.
   */
  calculateInterest(principal: Currency, startDate: Dayjs, endDate: Dayjs): Currency {
    if (this.annualInterestRate.equals(0)) {
      return Currency.of(0);
    }
    const days = this.calendar.daysBetween(startDate, endDate);
    const interestAmount = this.calculateInterestForDays(principal, days);
    return Currency.of(interestAmount);
  }

  get perDiem(): Currency {
    if (this._perDiem === undefined) {
      throw new Error("Per diem is not set.");
    }
    return this._perDiem;
  }

  set perDiem(value: Currency) {
    this._perDiem = value;
  }

  /**
   * Calculate the daily interest value based on the principal and annual interest rate.
   * @param principal - The principal amount on which daily interest is calculated (Currency).
   * @returns {Currency} - The daily interest amount as a Currency object.
   */
  calculateDailyInterest(principal: Currency, customAnnualInterestRate?: Decimal): Currency {
    const annualRate = customAnnualInterestRate !== undefined ? customAnnualInterestRate : this.annualInterestRate;
    if (annualRate.isZero()) {
      return Currency.of(0);
    }

    let dailyInterestRate: Decimal;
    if (this.perDiemCalculationType === "AnnualRateDividedByDaysInYear") {
      dailyInterestRate = this.calculateDailyInteresUsingAnnualRateDividedByDaysInYear(annualRate);
    } else if (this.perDiemCalculationType === "MonthlyRateDividedByDaysInMonth") {
      dailyInterestRate = this.calculateDailyInterestUsingMonthlyRateDividedByDaysInMonth(annualRate);
    } else {
      throw new Error(`Invalid per diem calculation type: ${this.perDiemCalculationType}`);
    }
    const dailyInterestAmount = principal.multiply(dailyInterestRate);
    this.perDiem = dailyInterestAmount;
    return dailyInterestAmount;
  }

  calculateDailyInteresUsingAnnualRateDividedByDaysInYear(annualInterestRate: Decimal, customAnnualInterestRate?: Decimal): Decimal {
    return new Decimal(annualInterestRate).dividedBy(this.calendar.daysInYear());
  }

  calculateDailyInterestUsingMonthlyRateDividedByDaysInMonth(annualInterestRate: Decimal, customAnnualInterestRate?: Decimal): Decimal {
    if (this.daysInAMonth === undefined) {
      throw new Error("Days in a month must be defined.");
    }
    return new Decimal(annualInterestRate).dividedBy(12).dividedBy(this.daysInAMonth);
  }

  /**
   * Calculate the interest for a specified number of days.
   * @param principal - The principal amount on which interest is calculated (Currency).
   * @param days - The number of days for which to calculate interest.
   * @param customAnnualInterestRate - (Optional) A custom annual interest rate to use for the calculation.
   * @returns {Currency} - The interest amount as a Currency object.
   */
  calculateInterestForDays(principal: Currency, days: number, customAnnualInterestRate?: Decimal): Currency {
    const annualRate = customAnnualInterestRate !== undefined ? customAnnualInterestRate : this.annualInterestRate;
    if (annualRate.isZero()) {
      return Currency.of(0);
    }
    const dailyInterestRate = this.calculateDailyInterest(principal, annualRate);
    const interestAmount = dailyInterestRate.multiply(days);
    return interestAmount;
  }

  /**
   * Calculate the principal and interest split based on the EMI or max payment amount.
   * @param principal - The principal amount (Currency).
   * @param startDate - The start date of the interest period.
   * @param endDate - The end date of the interest period.
   * @param emi - The equated monthly installment or maximum payment amount (Currency).
   * @param deferredInterest - (Optional) The deferred interest that needs to be paid off first (Currency).
   * @returns {PaymentSplit} - The split of principal and interest, and any remaining deferred interest.
   */
  calculatePaymentSplit(principal: Currency, startDate: Dayjs, endDate: Dayjs, emi: Currency, deferredInterest: Currency = Currency.Zero()): PaymentSplit {
    let interest = this.calculateInterest(principal, startDate, endDate);
    let remainingDeferredInterest = deferredInterest;

    // First, pay off deferred interest
    if (remainingDeferredInterest.getValue().greaterThan(0)) {
      if (emi.getValue().greaterThanOrEqualTo(remainingDeferredInterest.getValue())) {
        emi = emi.subtract(remainingDeferredInterest.getValue());
        interest = interest.add(remainingDeferredInterest.getValue());
        remainingDeferredInterest = Currency.Zero();
      } else {
        remainingDeferredInterest = remainingDeferredInterest.subtract(emi.getValue());
        return { principal: Currency.Zero(), interest: emi.round(), remainingDeferredInterest: remainingDeferredInterest.round() };
      }
    }

    // Pay the interest next
    if (emi.getValue().greaterThanOrEqualTo(interest.getValue())) {
      const principalPayment = emi.subtract(interest.getValue());
      return { principal: principalPayment.round(), interest: interest.round(), remainingDeferredInterest: remainingDeferredInterest.round() };
    } else {
      return { principal: Currency.Zero(), interest: emi.round(), remainingDeferredInterest: interest.subtract(emi.getValue()).round() };
    }
  }

  /**
   * Calculates an equivalent annual interest rate given the accrued interest for some partial period.
   * Also returns the difference (variance) from a "base" annual rate plus checks if this variance
   * exceeds a specified allowable threshold.
   *
   * @param startBalance - The principal balance at the start (Currency).
   * @param accruedInterestForPeriod - Actual interest amount accrued for this partial period (Currency).
   * @param baseAnnualRate - The "baseline" annual rate (e.g., your nominal `this.annualInterestRate`) (Decimal).
   * @param allowRateAbove100 - Flag indicating if rates above 100% are allowed (boolean).
   * @param acceptableRateVariance - The threshold for deciding if the new rate is "too far" from base (Decimal).
   * @param daysInPeriod - How many days of actual interest accrued in this partial period (number).
   * @returns An object with details about the calculated equivalent annual rate and how it compares to the baseline.
   */
  public calculateEquivalentAnnualRateMetadata(
    startBalance: Currency,
    accruedInterestForPeriod: Currency,
    baseAnnualRate: Decimal,
    allowRateAbove100: boolean,
    acceptableRateVariance: Decimal,
    daysInPeriod: number
  ): {
    equivalentAnnualRate: Decimal;
    equivalentAnnualRateVariance: Decimal;
    equivalentAnnualRateVarianceExceeded: boolean;
    // Additional fields from your snippet
    actualInterestValue: number;
    acceptableRateVariance: number;
  } {
    const daysInYear = this.calendar.daysInYear();
    let annualizedEquivalentRate = new Decimal(0);

    // Only compute if there is principal and at least 1 day
    if (startBalance.getValue().greaterThan(0) && daysInPeriod > 0) {
      const fractionOfYear = daysInPeriod / daysInYear; // e.g. (30 days) / (365 or 360)
      const interestDecimal = accruedInterestForPeriod.getValue(); // e.g. 55.55 interest
      const principalDecimal = startBalance.getValue(); // e.g. 5000.00
      const rawRate = interestDecimal.div(principalDecimal.mul(fractionOfYear));
      // Enforce <= 100% if not allowed
      annualizedEquivalentRate = rawRate.lessThanOrEqualTo(1) || allowRateAbove100 ? rawRate : new Decimal(1);
    }

    // Compare to base rate
    const equivalentAnnualRateVariance = annualizedEquivalentRate.minus(baseAnnualRate);
    const equivalentAnnualRateVarianceExceeded = equivalentAnnualRateVariance.abs().greaterThanOrEqualTo(acceptableRateVariance);

    return {
      // the actual interest in "currency" terms
      actualInterestValue: accruedInterestForPeriod.toNumber(),
      // the new “annual rate” portion
      equivalentAnnualRate: annualizedEquivalentRate,
      // difference from e.g. your nominal rate
      equivalentAnnualRateVariance,
      // how big a difference is "too big"
      acceptableRateVariance: acceptableRateVariance.toNumber(),
      // boolean check
      equivalentAnnualRateVarianceExceeded,
    };
  }
}

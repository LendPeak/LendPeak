import { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import Decimal from "decimal.js";

interface PaymentSplit {
  principal: Currency;
  interest: Currency;
  remainingDeferredInterest: Currency;
}

class InterestCalculator {
  private annualInterestRate: number; // Annual interest rate as a percentage
  private calendar: Calendar;

  constructor(annualInterestRate: number, calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL) {
    this.annualInterestRate = annualInterestRate;
    this.calendar = new Calendar(calendarType);
  }

  /**
   * Calculate the interest for a period between two dates.
   * @param principal - The principal amount on which interest is calculated (Currency).
   * @param startDate - The start date of the period.
   * @param endDate - The end date of the period.
   * @returns {Currency} - The interest amount as a Currency object.
   */
  calculateInterest(principal: Currency, startDate: Dayjs, endDate: Dayjs): Currency {
    if (this.annualInterestRate === 0) {
      return Currency.of(0);
    }
    const days = this.calendar.daysBetween(startDate, endDate);
    const interestAmount = this.calculateInterestForDays(principal, days);
    return Currency.of(interestAmount);
  }

  /**
   * Calculate the daily interest value based on the principal and annual interest rate.
   * @param principal - The principal amount on which daily interest is calculated (Currency).
   * @returns {Currency} - The daily interest amount as a Currency object.
   */
  calculateDailyInterest(principal: Currency, customAnnualInterestRate?: number): Currency {
    const annualRate = customAnnualInterestRate !== undefined ? customAnnualInterestRate : this.annualInterestRate;
    if (annualRate === 0) {
      return Currency.of(0);
    }
    const dailyInterestRate = new Decimal(annualRate).dividedBy(this.calendar.daysInYear());
    const dailyInterestAmount = principal.multiply(dailyInterestRate);
    return dailyInterestAmount;
  }

  /**
   * Calculate the interest for a specified number of days.
   * @param principal - The principal amount on which interest is calculated (Currency).
   * @param days - The number of days for which to calculate interest.
   * @param customAnnualInterestRate - (Optional) A custom annual interest rate to use for the calculation.
   * @returns {Currency} - The interest amount as a Currency object.
   */
  calculateInterestForDays(principal: Currency, days: number, customAnnualInterestRate?: number): Currency {
    const annualRate = customAnnualInterestRate !== undefined ? customAnnualInterestRate : this.annualInterestRate;
    if (annualRate === 0) {
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
}

export { InterestCalculator, PaymentSplit };

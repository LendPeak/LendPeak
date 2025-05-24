import { LocalDate } from "@js-joda/core";
import { InterestCalculator, PaymentSplit } from "@models/InterestCalculator";
import { CalendarType } from "@models/Calendar";
import { Currency } from "@utils/Currency";
import Decimal from "decimal.js";

describe("InterestCalculator", () => {
  const principal = Currency.of(100_000); // $100,000 principal
  const annualInterestRate = new Decimal(0.05); // 5% annual interest rate
  const startDate = LocalDate.parse("2024-01-01");
  const endDate = LocalDate.parse("2024-02-01");

  let interestCalculator: InterestCalculator;

  beforeEach(() => {
    interestCalculator = new InterestCalculator(annualInterestRate);
  });

  it("should calculate daily interest rate using annual rate divided by days in year", () => {
    const rate = (interestCalculator as any).calculateDailyInterestUsingAnnualRateDividedByDaysInYear(annualInterestRate);
    // Calendar defaults to today's date which is non-leap (365 days)
    expect(rate.toNumber()).toBeCloseTo(annualInterestRate.toNumber() / 365, 10);
  });

  it("should calculate the correct daily interest", () => {
    const dailyInterest = interestCalculator.calculateDailyInterest(principal);
    expect(dailyInterest.getRoundedValue().toNumber()).toBeCloseTo(13.7, 2);
  });

  it("should calculate the correct interest between two dates (Actual/Actual)", () => {
    const interest = interestCalculator.calculateInterest(principal, startDate, endDate);
    expect(interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2);
  });

  it("should calculate the correct interest between two dates (30/360)", () => {
    interestCalculator = new InterestCalculator(annualInterestRate, CalendarType.THIRTY_360);
    const interest = interestCalculator.calculateInterest(principal, startDate, endDate);
    expect(interest.getRoundedValue().toNumber()).toBeCloseTo(416.67, 2);
  });

  it("should calculate the correct P&I split with no deferred interest", () => {
    const emi = Currency.of(1500);
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi);

    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(1075.34, 2); // 1500 - 424.66 = 1075.34
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2);
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0);
  });

  it("should calculate the correct P&I split with deferred interest less than EMI", () => {
    const emi = Currency.of(1500);
    const deferredInterest = Currency.of(200);
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi, deferredInterest);

    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(675.34, 2);
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(624.66, 2); // Interest + deferred interest paid
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0);
  });

  it("should calculate the correct P&I split with deferred interest more than EMI", () => {
    const emi = Currency.of(400);
    const deferredInterest = Currency.of(500);
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi, deferredInterest);

    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(0, 2);
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(400, 2);
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBeCloseTo(100, 2);
  });

  it("should calculate the correct P&I split with EMI equal to interest", () => {
    const emi = Currency.of(424.66);
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi);

    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(0, 2);
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2);
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0);
  });

  describe("MonthlyRateDividedByDaysInMonth calculation type", () => {
    it("should throw an error when daysInAMonth is zero", () => {
      expect(() => {
        new InterestCalculator(
          annualInterestRate,
          CalendarType.ACTUAL_ACTUAL,
          "MonthlyRateDividedByDaysInMonth",
          0 // Zero days in month
        );
      }).toThrow("Days in a month must be greater than zero");
    });

    it("should throw an error when daysInAMonth is negative", () => {
      expect(() => {
        new InterestCalculator(
          annualInterestRate,
          CalendarType.ACTUAL_ACTUAL,
          "MonthlyRateDividedByDaysInMonth",
          -30 // Negative days
        );
      }).toThrow("Days in a month must be greater than zero");
    });

    it("should throw an error when daysInAMonth is undefined for MonthlyRateDividedByDaysInMonth type", () => {
      expect(() => {
        new InterestCalculator(
          annualInterestRate,
          CalendarType.ACTUAL_ACTUAL,
          "MonthlyRateDividedByDaysInMonth"
          // daysInAMonth is undefined
        );
      }).toThrow("Days in a month must be provided for MonthlyRateDividedByDaysInMonth calculation type.");
    });

    it("should calculate correctly when daysInAMonth is valid", () => {
      const calculator = new InterestCalculator(
        annualInterestRate,
        CalendarType.ACTUAL_ACTUAL,
        "MonthlyRateDividedByDaysInMonth",
        30 // Valid days in month
      );
      
      const dailyInterest = calculator.calculateDailyInterest(principal);
      // 100,000 * 0.05 / 12 / 30 = 13.89
      expect(dailyInterest.getRoundedValue().toNumber()).toBeCloseTo(13.89, 2);
    });

    it("should handle calculateInterestForDays with zero daysInAMonth", () => {
      expect(() => {
        new InterestCalculator(
          annualInterestRate,
          CalendarType.ACTUAL_ACTUAL,
          "MonthlyRateDividedByDaysInMonth",
          0
        );
      }).toThrow("Days in a month must be greater than zero");
    });
  });
});

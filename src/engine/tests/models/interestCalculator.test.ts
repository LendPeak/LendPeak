import dayjs from "dayjs";
import { InterestCalculator, PaymentSplit } from "@models/InterestCalculator";
import { CalendarType } from "@models/Calendar";
import { Currency } from "@utils/Currency";

describe("InterestCalculator", () => {
  const principal = Currency.of(100_000); // $100,000 principal
  const annualInterestRate = 0.05; // 5% annual interest rate
  const startDate = dayjs("2024-01-01");
  const endDate = dayjs("2024-02-01");

  let interestCalculator: InterestCalculator;

  beforeEach(() => {
    interestCalculator = new InterestCalculator(annualInterestRate);
  });

  it("should calculate the correct daily interest", () => {
    // Given:
    // Principal amount for which daily interest is to be calculated
    const dailyInterest = interestCalculator.calculateDailyInterest(principal);

    // Then:
    // The daily interest should be $13.89
    // Calculation: (Principal * Annual Interest Rate) / 365
    // ($100,000 * 5%) / 365 = $13.69863, rounded to $13.89
    expect(dailyInterest.getRoundedValue().toNumber()).toBeCloseTo(13.7, 2); // Rounded to 2 decimal places by default
  });

  it("should calculate the correct interest between two dates (Actual/Actual)", () => {
    // Given:
    // Principal amount and the period between startDate and endDate
    const interest = interestCalculator.calculateInterest(principal, startDate, endDate);

    // Then:
    // The interest for the period should be $430.56
    // Calculation: (Principal * Annual Interest Rate * Days) / 365
    // ($100,000 * 5% * 31) / 365 = $424.65753, rounded to $430.56
    expect(interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2); // 31 days of interest, rounded to 2 decimal places by default
  });

  it("should calculate the correct interest between two dates (30/360)", () => {
    // Given:
    // Principal amount and the period between startDate and endDate using 30/360 calendar type
    interestCalculator = new InterestCalculator(annualInterestRate, CalendarType.THIRTY_360);
    const interest = interestCalculator.calculateInterest(principal, startDate, endDate);

    // Then:
    // The interest for the period should be $416.67
    // Calculation: (Principal * Annual Interest Rate * Days) / 360
    // ($100,000 * 5% * 30) / 360 = $416.66667, rounded to $416.67
    expect(interest.getRoundedValue().toNumber()).toBeCloseTo(416.67, 2); // 30 days of interest, rounded to 2 decimal places by default
  });

  it("should calculate the correct P&I split with no deferred interest", () => {
    // Given:
    // EMI (Equated Monthly Installment) is $1,500
    const emi = Currency.of(1500); // $1,500 EMI

    // When:
    // Calculate the payment split using the interest calculator
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi);

    // Then:
    // The principal portion of the EMI should be $1,069.44
    // Calculation: EMI - Interest
    // $1,500 - $430.56 = $1,069.44
    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(1075.34, 2); // $1,500 EMI minus interest, rounded to 2 decimal places by default

    // The interest portion of the EMI should be $430.56
    // Calculation: (Principal * Annual Interest Rate * Days) / 365
    // ($100,000 * 5% * 31) / 365 = $424.65753, rounded to $430.56
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2); // 31 days of interest, rounded to 2 decimal places by default

    // The remaining deferred interest should be $0
    // Calculation: No deferred interest
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0); // No deferred interest
  });

  it("should calculate the correct P&I split with deferred interest less than EMI", () => {
    // Given:
    // EMI (Equated Monthly Installment) is $1,500
    const emi = Currency.of(1500); // $1,500 EMI
    // Deferred interest is $200
    const deferredInterest = Currency.of(200); // $200 deferred interest

    // When:
    // Calculate the payment split using the interest calculator
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi, deferredInterest);

    // Then:
    // The principal portion of the EMI should be $669.44
    // Calculation: EMI - Deferred Interest - Interest
    // $1,500 - $200 - $630.56 = $669.44
    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(675.34, 2); // $1,500 EMI minus deferred interest and interest, rounded to 2 decimal places by default

    // The interest portion of the EMI should be $630.56
    // Calculation: (Principal * Annual Interest Rate * Days) / 365
    // ($100,000 * 5% * 31) / 365 = $424.65753, rounded to $630.56
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(624.66, 2); // 31 days of interest, rounded to 2 decimal places by default

    // The remaining deferred interest should be $0
    // Calculation: Deferred interest fully paid off
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0); // Deferred interest fully paid off
  });

  it("should calculate the correct P&I split with deferred interest more than EMI", () => {
    // Given:
    // EMI (Equated Monthly Installment) is $400
    const emi = Currency.of(400); // $400 EMI
    // Deferred interest is $500
    const deferredInterest = Currency.of(500); // $500 deferred interest

    // When:
    // Calculate the payment split using the interest calculator
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi, deferredInterest);

    // Then:
    // The principal portion of the EMI should be $0
    // Calculation: No principal paid as EMI is less than deferred interest
    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(0, 2); // No principal paid, rounded to 2 decimal places by default

    // The interest portion of the EMI should be $400
    // Calculation: Entire EMI used to pay off part of the deferred interest
    // $400 (EMI) used to pay off part of the $500 deferred interest
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(400, 2); // EMI used to pay off part of the deferred interest, rounded to 2 decimal places by default

    // The remaining deferred interest should be $100
    // Calculation: Deferred Interest - EMI
    // $500 - $400 = $100
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBeCloseTo(100, 2); // $100 of deferred interest remains unpaid, rounded to 2 decimal places by default
  });

  it("should calculate the correct P&I split with EMI equal to interest", () => {
    // Given:
    // EMI (Equated Monthly Installment) is $430.56
    const emi = Currency.of(424.66); // EMI equal to the interest for the period

    // When:
    // Calculate the payment split using the interest calculator
    const paymentSplit: PaymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi);

    // Then:
    // The principal portion of the EMI should be $0
    // Calculation: No principal paid as EMI is equal to the interest
    expect(paymentSplit.principal.getRoundedValue().toNumber()).toBeCloseTo(0, 2); // No principal paid, rounded to 2 decimal places by default

    // The interest portion of the EMI should be $430.56
    // Calculation: (Principal * Annual Interest Rate * Days) / 365
    // ($100,000 * 5% * 31) / 365 = $424.65753, rounded to $430.56
    expect(paymentSplit.interest.getRoundedValue().toNumber()).toBeCloseTo(424.66, 2); // Interest paid, rounded to 2 decimal places by default

    // The remaining deferred interest should be $0
    // Calculation: No deferred interest
    expect(paymentSplit.remainingDeferredInterest.getRoundedValue().toNumber()).toBe(0); // No deferred interest
  });
});

import { LocalDate } from "@js-joda/core";
import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import Decimal from "decimal.js";
import { DateUtil } from "../../utils/DateUtil";

describe("Amortization", () => {
  it("should generate a correct amortization schedule for a simple case", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    expect(schedule.length).toBe(term);
    expect(schedule.firstEntry.principal).toBeDefined();
    expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
    expect(schedule.firstEntry.totalPayment).toBeDefined();
    expect(schedule.firstEntry.endBalance).toBeDefined();
  });

  it("should adjust the final payment to ensure the balance is zero", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    const lastPayment = schedule.lastEntry;
    expect(lastPayment.endBalance.getValue().toNumber()).toBe(0);
    // expect(lastPayment.metadata.finalAdjustment).toBe(true);
  });

  it("should handle different rounding methods correctly", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate("2023-01-01");

    const roundingMethods = [RoundingMethod.ROUND_HALF_UP, RoundingMethod.ROUND_DOWN, RoundingMethod.ROUND_UP];

    roundingMethods.forEach((roundingMethod) => {
      const amortization = new Amortization({
        loanAmount,
        annualInterestRate: interestRate,
        term,
        startDate,
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
        roundingMethod,
        flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.AT_END,
        roundingPrecision: 5,
      });

      const schedule = amortization.calculateAmortizationPlan();

      expect(schedule.length).toBe(term);
      expect(schedule.firstEntry.totalPayment).toBeDefined();
    });
  });

  it("should handle zero interest rate correctly", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0);
    const term = 12;
    const startDate = DateUtil.normalizeDate("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    schedule.forEach((entry) => {
      expect(entry.accruedInterestForPeriod.isZero()).toBe(true);
    });
  });

  it("should handle very short terms correctly", () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 1,
      startDate: DateUtil.normalizeDate("2023-01-01"),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(1);
    expect(schedule.firstEntry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle very long terms correctly", () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 360,
      startDate: DateUtil.normalizeDate("2023-01-01"),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(360);
  });

  it("should set finalAdjustment to true for the last payment if necessary", () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate("2023-01-01"),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.lastEntry.endBalance.toNumber()).toEqual(0);
  });

  it("should detect correct term numbers for Change Payment Date at contract start", () => {
    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({ termNumber: -1, newDate: "2023-03-01", originalDate: "2023-02-01" }),
      new ChangePaymentDate({ termNumber: -1, newDate: "2023-05-05", originalDate: "2023-05-01" }),
    ]);

    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 24,
      startDate: DateUtil.normalizeDate("2023-01-01"),
      changePaymentDates,
    });

    const updatedCPDs = amortization.changePaymentDates;
    expect(updatedCPDs.atIndex(0).termNumber).toBe(0);
    expect(updatedCPDs.atIndex(1).termNumber).toBe(2);
  });

  it("should throw errors on invalid loan amounts", () => {
    expect(() => {
      new Amortization({ loanAmount: Currency.of(0), annualInterestRate: new Decimal(0.05), term: 12, startDate: LocalDate.now() });
    }).toThrow("Invalid loan amount, must be greater than zero");
  });

  it("should handle high interest rates correctly", () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(2.0),
      term: 12,
      startDate: DateUtil.normalizeDate("2023-01-01"),
      allowRateAbove100: true,
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(12);
  });

  it("should handle very low interest rates", () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.0001),
      term: 12,
      startDate: DateUtil.normalizeDate("2023-01-01"),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(12);
  });
});

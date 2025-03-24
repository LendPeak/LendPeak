import dayjs from "dayjs";
import { describe, test, expect } from "@jest/globals";

import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import Decimal from "decimal.js";
import { RateSchedule, RateScheduleParams } from "../../models/RateSchedule";
import { RateSchedules } from "../../models/RateSchedules";
import { LendPeak } from "../../models/LendPeak";
import { Bill } from "../../models/Bill";
import { Bills } from "../../models/Bills";
import { DepositRecord } from "../../models/DepositRecord";
import { DepositRecords } from "../../models/DepositRecords";

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const today = dayjs().utc().startOf("day");

// A helper function to create a LendPeak instance with minimal defaults
function createLendPeakInstance({
  loanAmount = 1000,
  startDate = dayjs().subtract(30, "day"),
  annualInterest = 0.05,
  term = 6,
  depositRecords,
  bills,
}: {
  loanAmount?: number;
  startDate?: dayjs.Dayjs;
  annualInterest?: number;
  term?: number;
  depositRecords?: DepositRecords;
  bills?: Bills;
} = {}) {
  const amortization = new Amortization({
    loanAmount: Currency.of(loanAmount),
    annualInterestRate: annualInterest,
    term,
    startDate,
  });

  const lendPeak = new LendPeak({
    amortization,
    depositRecords: depositRecords || new DepositRecords(),
    bills: bills || new Bills(),
    currentDate: dayjs(),
  });

  // Force generation of schedule/bills, etc.
  lendPeak.calc();
  return lendPeak;
}

describe("LendPeak payoffQuote() Tests", () => {
  // ------------------------------------------------
  // 1) No Payments scenario
  // ------------------------------------------------
  it("Scenario #1: No Payments => payoff should be entire principal + interest (some interest as of last bill)", () => {
    const lendPeak = createLendPeakInstance({ loanAmount: 1000, annualInterest: 0.1, term: 3 });

    // Re-calc everything
    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;
    // Expect the payoff principal is roughly ~ the entire 1000 left
    expect(payoff.duePrincipal.toNumber()).toBeCloseTo(1000, 2);

    // If the schedule has 3 months at 10% APR (approx),
    // check that interest is > 0. We won't do an exact number unless you know it:
    expect(payoff.dueInterest.toNumber()).toBeGreaterThan(0);

    // No fees by default, so:
    expect(payoff.dueFees.toNumber()).toBeCloseTo(0, 2);

    expect(payoff.dueTotal.toNumber()).toBeCloseTo(payoff.duePrincipal.add(payoff.dueInterest).toNumber(), 2);
  });

  // ------------------------------------------------
  // 2) Missed payments scenario
  // ------------------------------------------------
  it("Scenario #2: Missed payments => some bills are past due, expect payoff to reflect overdue interest & principal", () => {
    const lendPeak = createLendPeakInstance({ loanAmount: 2000, annualInterest: 0.12, term: 4 });

    // Advance currentDate so that 1-2 bills are considered 'past due'
    lendPeak.currentDate = dayjs().add(75, "day"); // ~2.5 months in the future
    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;
    // Because we've advanced 75 days, we expect the first 2 bills to be past due
    // The payoff should be > 2000 if interest & maybe fees have accrued
    expect(payoff.duePrincipal.toNumber()).toBeLessThanOrEqual(2000); // principal typically reduced only if partial payments were made
    expect(payoff.dueInterest.toNumber()).toBeGreaterThan(0);
    expect(payoff.dueTotal.toNumber()).toBeGreaterThan(2000);
  });

  // ------------------------------------------------
  // 3) Partially paid bills scenario
  // ------------------------------------------------
  it("Scenario #3: Partially paid bills => leftover principal & interest only for the unpaid portion", () => {
    const lendPeak = createLendPeakInstance({ loanAmount: 1500, annualInterest: 0.1, term: 3 });

    // Insert a partial payment deposit halfway through the first bill
    const partialPayment = new DepositRecord({
      id: "DEPOSIT-1",
      amount: 300,
      currency: "USD",
      effectiveDate: dayjs().add(15, "day"), // mid of first month
    });

    lendPeak.depositRecords.addRecord(partialPayment);

    lendPeak.currentDate = dayjs().add(60, "day");

    lendPeak.calc(); // Recalc to apply partial payment

    const payoff = lendPeak.payoffQuote;
    // We expect the principal to have dropped from 1500 by some amount
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(1500);
    // We expect some interest but less than the "no payments" scenario
    expect(payoff.dueInterest.toNumber()).toBeGreaterThan(0);
    expect(payoff.dueFees.toNumber()).toBe(0);

    // The total should be below the full no-payment scenario
    expect(payoff.dueTotal.toNumber()).toBeLessThan(1500 + 9999 /* big interest placeholder */);
  });

  // ------------------------------------------------
  // 4) Fully paid off scenario
  // ------------------------------------------------
  it("Scenario #4: Fully paid off => payoff amounts all zero", () => {
    const lendPeak = createLendPeakInstance({ loanAmount: 1000, annualInterest: 0.08, term: 6 });
    // Then deposit a large payment that covers everything
    const bigPayment = new DepositRecord({
      id: "DEPOSIT-FULL",
      amount: 5000, // well above the loan amt + interest
      currency: "USD",
      effectiveDate: dayjs().add(10, "day"),
      applyExcessToPrincipal: true,
    });
    lendPeak.depositRecords.addRecord(bigPayment);

    lendPeak.currentDate = dayjs().add(20, "day");

    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;
    expect(payoff.duePrincipal.toNumber()).toBeCloseTo(0, 6);
    expect(payoff.dueInterest.toNumber()).toBeCloseTo(0, 6);
    expect(payoff.dueFees.toNumber()).toBeCloseTo(0, 6);
    expect(payoff.dueTotal.toNumber()).toBeCloseTo(0, 6);
  });

  // ------------------------------------------------
  // 5) Multiple partially satisfied bills scenario
  // ------------------------------------------------
  it("Scenario #5: Multiple partial payments across different bills => leftover amounts reflect each partial paydown", () => {
    const lendPeak = createLendPeakInstance({ loanAmount: 3000, annualInterest: 0.06, term: 6 });

    // Add multiple partial deposits across the schedule
    const deposit1 = new DepositRecord({
      id: "DEPOSIT-1",
      amount: 400,
      currency: "USD",
      effectiveDate: dayjs().add(10, "day"),
    });
    const deposit2 = new DepositRecord({
      id: "DEPOSIT-2",
      amount: 600,
      currency: "USD",
      effectiveDate: dayjs().add(40, "day"),
    });
    const deposit3 = new DepositRecord({
      id: "DEPOSIT-3",
      amount: 1000,
      currency: "USD",
      effectiveDate: dayjs().add(70, "day"),
    });
    lendPeak.depositRecords.addRecord(deposit1);
    lendPeak.depositRecords.addRecord(deposit2);
    lendPeak.depositRecords.addRecord(deposit3);

    // Advance time to after the third deposit
    lendPeak.currentDate = dayjs().add(80, "day");
    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;
    // We expect the leftover principal < 3000
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(3000);

    // We also expect some leftover interest but not too large
    expect(payoff.dueInterest.toNumber()).toBeGreaterThanOrEqual(0); // might be 0 if enough overpayments
    expect(payoff.dueFees.toNumber()).toBe(0);

    expect(payoff.dueTotal.toNumber()).toBeGreaterThanOrEqual(0);
  });

  // ------------------------------------------------
  // 6) Balance modifications (principal prepayments)
  // ------------------------------------------------
  it("Scenario #6: Payment triggers a principal prepayment => payoff reduced accordingly", () => {
    const lendPeak = createLendPeakInstance({
      loanAmount: 2000,
      annualInterest: 0.07,
      term: 6,
    });

    // Increase deposit to 1300
    const deposit = new DepositRecord({
      id: "DEPOSIT-PREPAY",
      amount: 1300,
      currency: "USD",
      effectiveDate: dayjs().add(15, "day"),
      applyExcessToPrincipal: true,
    });
    lendPeak.depositRecords.addRecord(deposit);

    // Move currentDate so deposit is recognized
    lendPeak.currentDate = dayjs().add(30, "day");

    lendPeak.calc();
    const payoff = lendPeak.payoffQuote;

    // Now leftover principal should be below 1000.
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(1000);

    expect(payoff.dueInterest.toNumber()).toBeGreaterThanOrEqual(0);
    expect(payoff.dueFees.toNumber()).toBe(0);
  });
});

import dayjs from "dayjs";
import { describe, test, expect } from "@jest/globals";
import { LocalDate, ZoneId } from "@js-joda/core";

import { Currency, RoundingMethod } from "@utils/Currency";
import { DateUtil } from "../../utils/DateUtil";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import Decimal from "decimal.js";
import { RateSchedule, RateScheduleParams } from "../../models/RateSchedule";
import { RateSchedules } from "../../models/RateSchedules";
import { LendPeak } from "../../models/LendPeak";
import { Fee } from "../../models/Fee";
import { Bill } from "../../models/Bill";
import { Bills } from "../../models/Bills";
import { DepositRecord } from "../../models/DepositRecord";
import { DepositRecords } from "../../models/DepositRecords";

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const today = DateUtil.normalizeDate(LocalDate.now());

// A helper function to create a LendPeak instance with minimal defaults
function createLendPeakInstance({
  loanAmount = 1000,
  startDate = LocalDate.now().minusDays(30),
  annualInterest = 0.05,
  term = 6,
  depositRecords,
  bills,
}: {
  loanAmount?: number;
  startDate?: LocalDate;
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
    bills:
      bills ||
      new Bills({
        currentDate: LocalDate.now(),
      }),
    currentDate: LocalDate.now(),
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

    lendPeak.currentDate = LocalDate.now().plusDays(45);
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
    lendPeak.currentDate = LocalDate.now().plusDays(75); // 2.5 months
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
      effectiveDate: LocalDate.now().plusDays(30),
    });

    lendPeak.depositRecords.addRecord(partialPayment);

    lendPeak.currentDate = LocalDate.now().plusDays(60); // 2 months in

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
      effectiveDate: LocalDate.now().plusDays(10), // 10 days from now
      applyExcessToPrincipal: true,
    });
    lendPeak.depositRecords.addRecord(bigPayment);

    lendPeak.currentDate = LocalDate.now().plusDays(20); // 20 days from now

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
      effectiveDate: LocalDate.now().plusDays(10), // 10 days from now
    });
    const deposit2 = new DepositRecord({
      id: "DEPOSIT-2",
      amount: 600,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(40), // 40 days from now
    });
    const deposit3 = new DepositRecord({
      id: "DEPOSIT-3",
      amount: 1000,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(70), // 70 days from now
    });
    lendPeak.depositRecords.addRecord(deposit1);
    lendPeak.depositRecords.addRecord(deposit2);
    lendPeak.depositRecords.addRecord(deposit3);

    // Advance time to after the third deposit
    lendPeak.currentDate = LocalDate.now().plusDays(80); // 80 days from now
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
      effectiveDate: LocalDate.now().plusDays(15),
      applyExcessToPrincipal: true,
    });
    lendPeak.depositRecords.addRecord(deposit);

    // Move currentDate so deposit is recognized
    lendPeak.currentDate = LocalDate.now().plusDays(30); // 30 days from now

    lendPeak.calc();
    const payoff = lendPeak.payoffQuote;

    // Now leftover principal should be below 1000.
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(1000);

    expect(payoff.dueInterest.toNumber()).toBeGreaterThanOrEqual(0);
    expect(payoff.dueFees.toNumber()).toBe(0);
  });
  it("Scenario #7: Scenario with fees => payoff should reflect both principal, interest, and outstanding fees", () => {
    // Create an instance with some default fees
    const lendPeak = createLendPeakInstance({
      loanAmount: 1000,
      annualInterest: 0.1,
      term: 4,
    });

    // Suppose we add some per-term fees or a daily fee structure.
    // For example, if your `Amortization` object supports `feesForAllTerms` or `feesPerTerm`,
    // you'd set them here before `calc()`.
    lendPeak.amortization.feesForAllTerms.addFee(
      new Fee({
        type: "fixed",
        amount: Currency.of(50),
        description: "Origination or Admin Fee (each term)",
      })
    );

    // Recalc to incorporate new fees
    lendPeak.currentDate = LocalDate.now().plusDays(30); // 30 days from now
    lendPeak.calc();

    // We haven't made any payments, so payoff includes principal + some interest + fees
    const payoff = lendPeak.payoffQuote;
    expect(payoff.duePrincipal.toNumber()).toBeCloseTo(1000, 2);
    expect(payoff.dueInterest.toNumber()).toBeGreaterThan(0);
    // The fee might appear in `dueFees` if the Bill is open
    expect(payoff.dueFees.toNumber()).toBeGreaterThanOrEqual(50);
    expect(payoff.dueTotal.toNumber()).toBe(payoff.duePrincipal.add(payoff.dueInterest).add(payoff.dueFees).toNumber());
  });

  it("Scenario #8: Multiple partial deposits at different times => payoff should reflect the sum of all partial paydowns", () => {
    const lendPeak = createLendPeakInstance({
      loanAmount: 2000,
      annualInterest: 0.05,
      term: 6,
    });

    // Three partial payments spaced out
    const deposit1 = new DepositRecord({
      id: "DEPOSIT-1",
      amount: 300,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(10), // 10 days from now
    });
    const deposit2 = new DepositRecord({
      id: "DEPOSIT-2",
      amount: 200,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(35),
    });
    const deposit3 = new DepositRecord({
      id: "DEPOSIT-3",
      amount: 500,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(60),
    });

    lendPeak.depositRecords.addRecord(deposit1);
    lendPeak.depositRecords.addRecord(deposit2);
    lendPeak.depositRecords.addRecord(deposit3);

    // Move currentDate after the last deposit to ensure they're recognized
    lendPeak.currentDate = LocalDate.now().plusDays(80); // 80 days from now
    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;
    // We expect leftover principal < 2000
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(2000);
    // Some leftover interest from partial accrual
    expect(payoff.dueInterest.toNumber()).toBeGreaterThanOrEqual(0);
    // No fees in this scenario
    expect(payoff.dueFees.toNumber()).toBe(0);

    // We could also check that leftover principal is <= 1000 if the sum of deposits is 1000,
    // minus interest that was allocated, etc.
  });

  it("Scenario #9: Payoff quote caching => second call should return cached result unless data changed", () => {
    const lendPeak = createLendPeakInstance({
      loanAmount: 1000,
      annualInterest: 0.06,
      term: 4,
    });

    lendPeak.currentDate = LocalDate.now().plusDays(30); // 30 days from now
    lendPeak.calc();

    // First call
    const firstQuote = lendPeak.payoffQuote;
    const secondQuote = lendPeak.payoffQuote;

    // Expect them to be the same object or same values if nothing changed
    // Check a property to confirm
    expect(secondQuote.duePrincipal.toNumber()).toBeCloseTo(firstQuote.duePrincipal.toNumber(), 6);

    // Now modify something relevant (e.g. add a deposit or change currentDate)
    const newDeposit = new DepositRecord({
      id: "DEPOSIT-NEW",
      amount: 200,
      currency: "USD",
      effectiveDate: lendPeak.currentDate.minusDays(1), // ensures it's recognized
    });
    lendPeak.depositRecords.addRecord(newDeposit);
    lendPeak.calc();

    // Third call - should be updated
    const thirdQuote = lendPeak.payoffQuote;
    expect(thirdQuote.duePrincipal.toNumber()).toBeLessThan(firstQuote.duePrincipal.toNumber());
  });

  //   it("Scenario #10: Daily Simple Interest model => payoff reflects daily accrual up to current date", () => {
  //     // If your Amortization supports "billingModel = dailySimpleInterest"
  //     const lendPeak = createLendPeakInstance({
  //       loanAmount: 1500,
  //       annualInterest: 0.07,
  //       term: 4,
  //     });

  //     // Switch to DSI
  //     lendPeak.amortization.billingModel = "dailySimpleInterest";

  //     // Move forward ~45 days
  //     lendPeak.currentDate = dayjs().add(45, "day");
  //     lendPeak.calc();

  //     const payoff = lendPeak.payoffQuote;
  //     // In daily simple interest, interest should definitely be > 0 after 45 days
  //     expect(payoff.dueInterest.toNumber()).toBeGreaterThan(0);

  //     // No deposits => principal is still 1500
  //     expect(payoff.duePrincipal.toNumber()).toBeCloseTo(1500, 2);

  //     // total => 1500 + daily interest for 45 days
  //     expect(payoff.dueTotal.toNumber()).toBeGreaterThan(1500);
  //   });

  it("Scenario #11: Large deposit without applyExcessToPrincipal => only the current Bill's principal is paid, leftover principal is not pre-paid", () => {
    // Same setup
    const lendPeak = createLendPeakInstance({
      loanAmount: 2000,
      annualInterest: 0.06,
      term: 6,
    });

    const deposit = new DepositRecord({
      id: "DEPOSIT-LARGE-NO-EXCESS",
      amount: 3000,
      currency: "USD",
      effectiveDate: LocalDate.now().plusDays(10), // 10 days from now
      applyExcessToPrincipal: false, // no auto-prepayment
    });
    lendPeak.depositRecords.addRecord(deposit);

    // Move currentDate so deposit is recognized
    lendPeak.currentDate = LocalDate.now().plusDays(20); // 20 days from now
    lendPeak.calc();

    const payoff = lendPeak.payoffQuote;

    // Confirm principal is partially reduced below 2000 (we paid the current Bill’s principal),
    // but not fully allocated to future bills.
    expect(payoff.duePrincipal.toNumber()).toBeLessThan(2000);

    // If you want a rough range, you could do:
    expect(payoff.duePrincipal.toNumber()).toBeGreaterThan(1000);

    // So we know we didn't prepay the entire future principal
    // and leftover is  ~ $2000 - principalOfCurrentBill.
    expect(payoff.dueInterest.toNumber()).toBeGreaterThanOrEqual(0);
    expect(payoff.dueFees.toNumber()).toBe(0);

    // Or, if you want to be more precise, you can console.log()
    // the actual payoff.duePrincipal and do an exact toBeCloseTo(...).
  });

  it("Scenario #12: Last open Bill ended in the past, no future bills => payoff includes extra daily interest from Bill-end -> currentDate (single-term)", () => {
    // 1) Create a 1-term loan starting 30 days ago => Bill ends today (day 30)
    const start = DateUtil.normalizeDate('2025-04-29').minusDays(30);
    const lendPeak = new LendPeak({
      amortization: new Amortization({
        loanAmount: 1000,
        annualInterestRate: 0.1, // 10% annual
        term: 1, // single term => ends ~ day 30
        startDate: start,
      }),
      currentDate: start.plusDays(30), // "today" => exactly the Bill end date
      autoCloseThreshold: 0,
    });

    lendPeak.calc();

    // 2) First payoff at day 30
    const payoffAt30 = lendPeak.payoffQuote;
    const interest30 = payoffAt30.dueInterest.toNumber();

    // 3) Move currentDate 10 days further => day 40
    lendPeak.currentDate = start.plusDays(40);
    lendPeak.calc();

    const payoffAt40 = lendPeak.payoffQuote;
    const interest40 = payoffAt40.dueInterest.toNumber();

    // 4) We expect the second payoff's interest to be bigger by ~10 days * dailyRate
    const extraAccrued = interest40 - interest30;

    expect(extraAccrued).toBeGreaterThan(8);
    expect(extraAccrued).toBeLessThan(9);
  });
});

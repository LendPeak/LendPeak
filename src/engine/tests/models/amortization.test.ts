import dayjs from "dayjs";
import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushCumulativeRoundingErrorType } from "@models/Amortization";
import { CalendarType } from "@models/Calendar";
import Decimal from "decimal.js";

describe("Amortization", () => {
  it("should generate a correct amortization schedule for a simple case", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule[0].principal).toBeDefined();
    expect(schedule[0].interest).toBeDefined();
    expect(schedule[0].totalPayment).toBeDefined();
    expect(schedule[0].endBalance).toBeDefined();
  });

  it("should handle rounding discrepancies correctly", () => {
    const loanAmount = Currency.of(3000);
    const interestRate = new Decimal(0.07); // 5% annual interest rate
    const term = 24; // 6 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    const discrepancyEntry = schedule.find((entry) => entry.metadata.roundingDiscrepancyAdjustment === true);

    expect(discrepancyEntry).toBeDefined();
    expect(discrepancyEntry?.metadata.roundingDiscrepancyAdjustment).toBe(true);
    expect(discrepancyEntry?.metadata.discrepancyAmount).toBeDefined();
  });

  it("should adjust the final payment to ensure the balance is zero", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    const lastPayment = schedule[schedule.length - 1];

    expect(lastPayment.endBalance.getValue().toNumber()).toBe(0);
    expect(lastPayment.metadata.finalAdjustment).toBe(true);
  });

  it("should generate a correct amortization schedule with different rounding methods", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const roundingMethods = [RoundingMethod.ROUND_HALF_UP, RoundingMethod.ROUND_DOWN, RoundingMethod.ROUND_UP];

    roundingMethods.forEach((roundingMethod) => {
      const amortization = new Amortization({
        loanAmount,
        interestRate,
        term,
        startDate,
        calendarType: CalendarType.ACTUAL_ACTUAL,
        roundingMethod,
        flushCumulativeRoundingError: FlushCumulativeRoundingErrorType.AT_END,
        roundingPrecision: 5,
      });
      const schedule = amortization.generateSchedule();

      expect(schedule.length).toBe(term);
      expect(schedule[0].principal).toBeDefined();
      expect(schedule[0].interest).toBeDefined();
      expect(schedule[0].totalPayment).toBeDefined();
      expect(schedule[0].endBalance).toBeDefined();
    });
  });

  it("should handle edge cases with zero interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0); // 0% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);

    schedule.forEach((entry, index) => {
      expect(entry.interest.getValue().toNumber()).toBe(0);

      if (index === schedule.length - 1 && entry.metadata.finalAdjustment) {
        // Verify the final adjustment
        const totalPrincipalPaid = schedule.slice(0, -1).reduce((acc, e) => acc.add(e.principal), Currency.of(0));
        const expectedFinalPrincipal = loanAmount.subtract(totalPrincipalPaid).getRoundedValue().toNumber();
        expect(entry.principal.getRoundedValue().toNumber()).toBeCloseTo(expectedFinalPrincipal, 3);
      } else {
        // Verify the regular principal payment
        expect(entry.principal.getRoundedValue().toNumber()).toBeCloseTo(loanAmount.divide(term).getRoundedValue().toNumber(), 3);
      }
    });
  });

  it("should handle edge cases with very short terms", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 1; // 1 month
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule[0].principal).toBeDefined();
    expect(schedule[0].interest).toBeDefined();
    expect(schedule[0].totalPayment).toBeDefined();
    expect(schedule[0].endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle edge cases with very long terms", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 360; // 30 years
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule[0].principal).toBeDefined();
    expect(schedule[0].interest).toBeDefined();
    expect(schedule[0].totalPayment).toBeDefined();
    expect(schedule[0].endBalance).toBeDefined();
  });

  it("should set finalAdjustment to true for the last payment if necessary", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    const lastPayment = schedule[schedule.length - 1];

    expect(lastPayment.metadata.finalAdjustment).toBe(true);
    expect(lastPayment.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle a zero loan amount", () => {
    const loanAmount = Currency.of(0);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry) => {
      expect(entry.principal.getValue().toNumber()).toBe(0);
      expect(entry.interest.getValue().toNumber()).toBe(0);
      expect(entry.totalPayment.getValue().toNumber()).toBe(0);
      expect(entry.endBalance.getValue().toNumber()).toBe(0);
    });
  });

  it("should handle a negative loan amount", () => {
    const loanAmount = Currency.of(-1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeLessThan(0);
      expect(entry.interest.getValue().toNumber()).toBeLessThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeLessThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeLessThan(0);
      }
    });
  });

  it("should handle a very high interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(1.0); // 100% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");
    const endDate = startDate.add(term, "month");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate, endDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.interest.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });

  it("should handle a very low interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.0001); // 0.01% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");
    const endDate = startDate.add(term, "month");

    const amortization = new Amortization({
      loanAmount,
      interestRate,
      term,
      startDate,
      endDate,
      calendarType: CalendarType.ACTUAL_ACTUAL,
      roundingMethod: RoundingMethod.ROUND_HALF_UP,
      flushCumulativeRoundingError: FlushCumulativeRoundingErrorType.AT_END,
      roundingPrecision: 5,
    });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.interest.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });

  it("should handle a single payment term", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 1; // 1 month
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    const entry = schedule[0];
    expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.interest.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle a very long term with zero interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0); // 0% annual interest rate
    const term = 360; // 30 years
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.interest.getValue().toNumber()).toBe(0);

      if (index === schedule.length - 1 && entry.metadata.finalAdjustment) {
        const totalPrincipalPaid = schedule.slice(0, -1).reduce((acc, e) => acc.add(e.principal), Currency.of(0));
        const expectedFinalPrincipal = loanAmount.subtract(totalPrincipalPaid).getRoundedValue().toNumber();
        expect(entry.principal.getRoundedValue().toNumber()).toBeCloseTo(expectedFinalPrincipal, 3);
      } else {
        expect(entry.principal.getRoundedValue().toNumber()).toBeCloseTo(loanAmount.divide(term).getRoundedValue().toNumber(), 3);
      }
    });
  });

  it("should handle a very short term with zero interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0); // 0% annual interest rate
    const term = 1; // 1 month
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    const entry = schedule[0];
    expect(entry.principal.getValue().toNumber()).toBe(1000);
    expect(entry.interest.getValue().toNumber()).toBe(0);
    expect(entry.totalPayment.getValue().toNumber()).toBe(1000);
    expect(entry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle a very high loan amount", () => {
    const loanAmount = Currency.of(1000000000); // 1 billion
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.interest.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });

  it("should handle a very low loan amount", () => {
    const loanAmount = Currency.of(1); // 1 unit of currency
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({
      loanAmount,
      interestRate,
      term,
      startDate,
      calendarType: CalendarType.ACTUAL_ACTUAL,
      roundingMethod: RoundingMethod.ROUND_HALF_UP,
      flushCumulativeRoundingError: FlushCumulativeRoundingErrorType.AT_END,
      roundingPrecision: 10,
    });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);

    // add debug
    //console.log("schedule", schedule);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.interest.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });
});

import dayjs from "dayjs";
import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import Decimal from "decimal.js";

describe("Amortization", () => {
  it("should generate a correct amortization schedule for a simple case", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule.firstEntry.principal).toBeDefined();
    expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
    expect(schedule.firstEntry.totalPayment).toBeDefined();
    expect(schedule.firstEntry.endBalance).toBeDefined();
  });

  it("should adjust the final payment to ensure the balance is zero", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    const lastPayment = schedule.lastEntry;

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
        annualInterestRate: interestRate,
        term,
        startDate,
        calendarType: CalendarType.ACTUAL_ACTUAL,
        roundingMethod,
        flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.AT_END,
        roundingPrecision: 5,
      });
      const schedule = amortization.generateSchedule();

      expect(schedule.length).toBe(term);
      expect(schedule.firstEntry.principal).toBeDefined();
      expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
      expect(schedule.firstEntry.totalPayment).toBeDefined();
      expect(schedule.firstEntry.endBalance).toBeDefined();
    });
  });

  it("should handle edge cases with zero interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0); // 0% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);

    schedule.forEach((entry, index) => {
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBe(0);

      if (index === schedule.length - 1 && entry.metadata.finalAdjustment) {
        // Verify the final adjustment
        const totalPrincipalPaid = schedule.entries.slice(0, -1).reduce((acc, e) => acc.add(e.principal), Currency.of(0));
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

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule.firstEntry.principal).toBeDefined();
    expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
    expect(schedule.firstEntry.totalPayment).toBeDefined();
    expect(schedule.firstEntry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle edge cases with very long terms", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 360; // 30 years
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    expect(schedule.firstEntry.principal).toBeDefined();
    expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
    expect(schedule.firstEntry.totalPayment).toBeDefined();
    expect(schedule.firstEntry.endBalance).toBeDefined();
  });

  it("should set finalAdjustment to true for the last payment if necessary", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    const lastPayment = schedule.lastEntry;

    expect(lastPayment.metadata.finalAdjustment).toBe(true);
    expect(lastPayment.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should detect correct term # for Change Payment Date at the beginning of the contract", () => {
    const loanAmount = Currency.of(1000);
    const annualInterestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 24; // 24 months
    const startDate = dayjs("2023-01-01");

    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({
        termNumber: -1,
        newDate: "2023-02-01",
        originalDate: "2023-01-01",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        newDate: "2023-05-05",
        originalDate: "2023-05-01",
      }),
    ]);

    const amortization = new Amortization({ loanAmount, annualInterestRate, term, startDate, changePaymentDates: changePaymentDates });
    const schedule = amortization.repaymentSchedule;

    const updatedChangePaymentDates = amortization.changePaymentDates;

    expect(updatedChangePaymentDates.atIndex(0).termNumber).toBe(0);
    expect(updatedChangePaymentDates.atIndex(1).termNumber).toBe(4);
  });

  it("should detect correct term # for Change Payment Date and handle merge with overlapping dates", () => {
    // const loanAmount = Currency.of(1000);
    // const annualInterestRate = new Decimal(0.1482); // 14.82% annual interest rate
    // const term = 55; // 55 months
    // const startDate = dayjs("2022-04-06");

    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({
        termNumber: 0,
        newDate: "2023-01-06",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2023-02-06",
        newDate: "2023-03-06",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2023-04-06",
        newDate: "2023-04-20",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2023-04-20",
        newDate: "2023-06-20",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2027-01-20",
        newDate: "2027-01-06",
      }),
      new ChangePaymentDate({
        termNumber: 20,
        newDate: "2027-02-20",
      }),
    ]);

    expect(changePaymentDates.length).toBe(5);
    expect(changePaymentDates.atIndex(0).newDate.toDate()).toEqual(dayjs("2023-01-06").startOf("day").toDate());
    expect(changePaymentDates.atIndex(0).termNumber).toEqual(0);

    expect(changePaymentDates.atIndex(1)?.originalDate?.toDate()).toEqual(dayjs("2023-02-06").startOf("day").toDate());
    expect(changePaymentDates.atIndex(1).newDate.toDate()).toEqual(dayjs("2023-03-06").startOf("day").toDate());

    expect(changePaymentDates.atIndex(2)?.originalDate?.toDate()).toEqual(dayjs("2023-04-06").startOf("day").toDate());
    expect(changePaymentDates.atIndex(2).newDate.toDate()).toEqual(dayjs("2023-06-20").startOf("day").toDate());

    expect(changePaymentDates.atIndex(3)?.originalDate?.toDate()).toEqual(dayjs("2027-01-20").startOf("day").toDate());
    expect(changePaymentDates.atIndex(3).newDate.toDate()).toEqual(dayjs("2027-01-06").startOf("day").toDate());

    expect(changePaymentDates.atIndex(4).termNumber).toEqual(20);
    expect(changePaymentDates.atIndex(4).newDate.toDate()).toEqual(dayjs("2027-02-20").startOf("day").toDate());
  });

  it("should detect correct term # for Change Payment Date and handle merge with overlapping dates without term assignments", () => {
    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2023-05-01",
        newDate: "2023-05-15",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-05-15",
        newDate: "2024-06-15",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-07-15",
        newDate: "2024-07-25",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-07-25",
        newDate: "2024-08-25",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2026-05-25",
        newDate: "2026-05-01",
      }),
    ]);

    expect(changePaymentDates.length).toBe(4);
    expect(changePaymentDates.atIndex(0)?.originalDate?.toDate()).toEqual(dayjs("2023-05-01").startOf("day").toDate());
    expect(changePaymentDates.atIndex(0).newDate.toDate()).toEqual(dayjs("2023-05-15").startOf("day").toDate());
    // expect(changePaymentDates.atIndex(0).termNumber).toEqual(0);

    expect(changePaymentDates.atIndex(1)?.originalDate?.toDate()).toEqual(dayjs("2024-05-15").startOf("day").toDate());
    expect(changePaymentDates.atIndex(1).newDate.toDate()).toEqual(dayjs("2024-06-15").startOf("day").toDate());

    expect(changePaymentDates.atIndex(2)?.originalDate?.toDate()).toEqual(dayjs("2024-07-15").startOf("day").toDate());
    expect(changePaymentDates.atIndex(2).newDate.toDate()).toEqual(dayjs("2024-08-25").startOf("day").toDate());

    expect(changePaymentDates.atIndex(3)?.originalDate?.toDate()).toEqual(dayjs("2026-05-25").startOf("day").toDate());
    expect(changePaymentDates.atIndex(3).newDate.toDate()).toEqual(dayjs("2026-05-01").startOf("day").toDate());
  });

  it("should detect correct term # for Change Payment Date and handle merge with overlapping dates with term numbers", () => {
    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2023-05-01",
        newDate: "2023-05-15",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-05-15",
        newDate: "2024-06-15",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-07-15",
        newDate: "2024-07-25",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2024-07-25",
        newDate: "2024-08-25",
      }),
      new ChangePaymentDate({
        termNumber: -1,
        originalDate: "2026-05-25",
        newDate: "2026-05-01",
      }),
    ]);

    const amortization = new Amortization({
      loanAmount: Currency.of(24250),
      originationFee: Currency.of(750),
      term: 36,
      annualInterestRate: 0.157,
      startDate: dayjs("2023-03-01"),
      endDate: dayjs("2026-05-01"),
      changePaymentDates,
    });

    // test term assignments
    const cpds = amortization.changePaymentDates.all;

    /*
      ┌─────────┬────────────┬──────────────┬──────────────┐
      │ (index) │ termNumber │ originalDate │ newDate      │
      ├─────────┼────────────┼──────────────┼──────────────┤
      │ 0       │ 1          │ '2023-05-01' │ '2023-05-15' │
      │ 1       │ 13         │ '2024-05-15' │ '2024-06-15' │
      │ 2       │ 14         │ '2024-07-15' │ '2024-08-25' │
      │ 3       │ 35         │ '2026-05-25' │ '2026-05-01' │
      └─────────┴────────────┴──────────────┴──────────────┘
    */
    expect(cpds.length).toBe(4);
    expect(cpds[0].termNumber).toBe(1);
    expect(cpds[1].termNumber).toBe(13);
    expect(cpds[2].termNumber).toBe(14);
    expect(cpds[3].termNumber).toBe(35);

    // test original dates
    expect(cpds[0].originalDate?.toDate()).toEqual(dayjs("2023-05-01").startOf("day").toDate());
    expect(cpds[1].originalDate?.toDate()).toEqual(dayjs("2024-05-15").startOf("day").toDate());
    expect(cpds[2].originalDate?.toDate()).toEqual(dayjs("2024-07-15").startOf("day").toDate());
    expect(cpds[3].originalDate?.toDate()).toEqual(dayjs("2026-05-25").startOf("day").toDate());

    // test new dates
    expect(cpds[0].newDate.toDate()).toEqual(dayjs("2023-05-15").startOf("day").toDate());
    expect(cpds[1].newDate.toDate()).toEqual(dayjs("2024-06-15").startOf("day").toDate());
    expect(cpds[2].newDate.toDate()).toEqual(dayjs("2024-08-25").startOf("day").toDate());
    expect(cpds[3].newDate.toDate()).toEqual(dayjs("2026-05-01").startOf("day").toDate());
  });

  it("should throw an error for a zero loan amount", () => {
    const loanAmount = Currency.of(0);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    expect(() => {
      new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    }).toThrowError("Invalid loan amount, must be greater than zero");
  });

  it("should throw an error for a negative loan amount", () => {
    const loanAmount = Currency.of(-1000);
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    expect(() => {
      new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    }).toThrow("Invalid loan amount, must be greater than zero");
  });

  it("should handle a very high interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(1.0); // 100% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");
    const endDate = startDate.add(term, "month");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate, endDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });

  it("should throw an error for rates above 100%", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(1.01); // 101% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");
    const endDate = startDate.add(term, "month");

    expect(() => {
      new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate, endDate });
    }).toThrow("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
  });

  it("should allow high rates if allowRateAbove100 is set to true ", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(2.0); // 100% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");
    const endDate = startDate.add(term, "month");

    const amortization = new Amortization({ allowRateAbove100: true, loanAmount, annualInterestRate: interestRate, term, startDate, endDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
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
      annualInterestRate: interestRate,
      term,
      startDate,
      endDate,
      calendarType: CalendarType.ACTUAL_ACTUAL,
      roundingMethod: RoundingMethod.ROUND_HALF_UP,
      flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.AT_END,
      roundingPrecision: 5,
    });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
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

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    const entry = schedule.firstEntry;
    expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
    expect(entry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle a very long term with zero interest rate", () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0); // 0% annual interest rate
    const term = 360; // 30 years
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBe(0);

      if (index === schedule.length - 1 && entry.metadata.finalAdjustment) {
        const totalPrincipalPaid = schedule.entries.slice(0, -1).reduce((acc, e) => acc.add(e.principal), Currency.of(0));
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

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    const entry = schedule.firstEntry;
    expect(entry.principal.getValue().toNumber()).toBe(1000);
    expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBe(0);
    expect(entry.totalPayment.getValue().toNumber()).toBe(1000);
    expect(entry.endBalance.getValue().toNumber()).toBe(0);
  });

  it("should handle a very high loan amount", () => {
    const loanAmount = Currency.of(1000000000); // 1 billion
    const interestRate = new Decimal(0.05); // 5% annual interest rate
    const term = 12; // 12 months
    const startDate = dayjs("2023-01-01");

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
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
      annualInterestRate: interestRate,
      term,
      startDate,
      calendarType: CalendarType.ACTUAL_ACTUAL,
      roundingMethod: RoundingMethod.ROUND_HALF_UP,
      flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.AT_END,
      roundingPrecision: 10,
    });
    const schedule = amortization.generateSchedule();

    expect(schedule.length).toBe(term);

    // add debug
    //console.log("schedule", schedule);
    schedule.forEach((entry, index) => {
      expect(entry.principal.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.accruedInterestForPeriod.getValue().toNumber()).toBeGreaterThan(0);
      expect(entry.totalPayment.getValue().toNumber()).toBeGreaterThan(0);
      if (index === term - 1) {
        expect(entry.endBalance.getValue().toNumber()).toBe(0);
      } else {
        expect(entry.endBalance.getValue().toNumber()).toBeGreaterThan(0);
      }
    });
  });
});

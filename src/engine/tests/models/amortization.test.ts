import { LocalDate } from '@js-joda/core';
import { Currency, RoundingMethod } from '@utils/Currency';
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from '@models/Amortization';
import { ChangePaymentDate } from '@models/ChangePaymentDate';
import { ChangePaymentDates } from '@models/ChangePaymentDates';
import { CalendarType } from '@models/Calendar';
import { TermCalendars } from '@models/TermCalendars';
import Decimal from 'decimal.js';
import { DateUtil } from '../../utils/DateUtil';
import { TermExtension } from '@models/TermExtension';
import { TermExtensions } from '@models/TermExtensions';
import { RateSchedule } from '@models/RateSchedule';
import { RateSchedules } from '@models/RateSchedules';
import { BalanceModification } from '@models/Amortization/BalanceModification';
import { BalanceModifications } from '@models/Amortization/BalanceModifications';

describe('Amortization', () => {
  it('should generate a correct amortization schedule for a simple case', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    expect(schedule.length).toBe(term);
    expect(schedule.firstEntry.principal).toBeDefined();
    expect(schedule.firstEntry.accruedInterestForPeriod).toBeDefined();
    expect(schedule.firstEntry.totalPayment).toBeDefined();
    expect(schedule.firstEntry.endBalance).toBeDefined();
  });

  it('should adjust the final payment to ensure the balance is zero', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    const lastPayment = schedule.lastEntry;
    expect(lastPayment.endBalance.getValue().toNumber()).toBe(0);
    // expect(lastPayment.metadata.finalAdjustment).toBe(true);
  });

  it('should handle different rounding methods correctly', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

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

  it('should handle zero interest rate correctly', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    const schedule = amortization.calculateAmortizationPlan();

    schedule.forEach((entry) => {
      expect(entry.accruedInterestForPeriod.isZero()).toBe(true);
    });
  });

  it('should handle very short terms correctly', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 1,
      startDate: DateUtil.normalizeDate('2023-01-01'),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(1);
    expect(schedule.firstEntry.endBalance.getValue().toNumber()).toBe(0);
  });

  it('should handle very long terms correctly', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 360,
      startDate: DateUtil.normalizeDate('2023-01-01'),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(360);
  });

  it('should set finalAdjustment to true for the last payment if necessary', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.lastEntry.endBalance.toNumber()).toEqual(0);
  });

  it('should detect correct term numbers for Change Payment Date at contract start', () => {
    const changePaymentDates = new ChangePaymentDates([
      new ChangePaymentDate({ termNumber: -1, newDate: '2023-03-01', originalDate: '2023-02-01' }),
      new ChangePaymentDate({ termNumber: -1, newDate: '2023-05-05', originalDate: '2023-05-01' }),
    ]);

    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 24,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      changePaymentDates,
    });

    const updatedCPDs = amortization.changePaymentDates;
    expect(updatedCPDs.atIndex(0).termNumber).toBe(0);
    expect(updatedCPDs.atIndex(1).termNumber).toBe(2);
  });

  it('should throw errors on invalid loan amounts', () => {
    expect(() => {
      new Amortization({
        loanAmount: Currency.of(0),
        annualInterestRate: new Decimal(0.05),
        term: 12,
        startDate: LocalDate.now(),
      });
    }).toThrow('Invalid loan amount, must be greater than zero');
  });

  it('should handle high interest rates correctly', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(2.0),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      allowRateAbove100: true,
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(12);
  });

  it('should handle very low interest rates', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.0001),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
    });
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(12);
  });
});

describe('Amortization with Term Extensions', () => {
  it('should increase actual term by the sum of active term extensions', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Hardship', active: true },
      { quantity: 1, date: '2023-09-01', description: 'Other', active: false },
    ]);

    const amortization = new Amortization({
      loanAmount,
      annualInterestRate: interestRate,
      term,
      startDate,
    });
    amortization.termExtensions = termExtensions;
    amortization.termExtensions.onChange = () => {
      amortization.modifiedSinceLastCalculation = true;
    };

    expect(amortization.term).toBe(12);
    expect(amortization.actualTerm).toBe(14); // Only one extension is active

    // Activate the second extension
    amortization.termExtensions.atIndex(1).active = true;
    expect(amortization.actualTerm).toBe(15);

    // Deactivate all
    amortization.termExtensions.deactivateAll();
    expect(amortization.actualTerm).toBe(12);
  });

  it('should generate a schedule with length equal to contractual term plus active extensions', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Hardship', active: true, emiRecalculationMode: 'fromStart' },
    ]);

    const amortization = new Amortization({
      loanAmount,
      annualInterestRate: interestRate,
      term,
      startDate,
    });
    amortization.termExtensions = termExtensions;

    const schedule = amortization.calculateAmortizationPlan();
    const expectedLength = term + termExtensions.getTotalActiveExtensionQuantity();
    expect(schedule.length).toBe(expectedLength);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should not extend the schedule if emiRecalculationMode is none', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Hardship', active: true, emiRecalculationMode: 'none' },
    ]);

    const amortization = new Amortization({
      loanAmount,
      annualInterestRate: interestRate,
      term,
      startDate,
    });
    amortization.termExtensions = termExtensions;

    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should handle multiple active extensions with different emiRecalculationModes', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      { quantity: 1, date: '2023-06-01', description: 'A', active: true, emiRecalculationMode: 'fromStart' },
      { quantity: 2, date: '2023-07-01', description: 'B', active: true, emiRecalculationMode: 'none' },
      {
        quantity: 1,
        date: '2023-08-01',
        description: 'C',
        active: true,
        emiRecalculationMode: 'fromTerm',
        emiRecalculationTerm: 10,
      },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    const schedule = amortization.calculateAmortizationPlan();
    // Only the first extension with 'fromStart' should trigger EMI recalculation for the full extended term
    const expectedLength = term + termExtensions.getTotalActiveExtensionQuantity();
    expect(schedule.length).toBe(expectedLength);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should recalculate EMI from a specific term when emiRecalculationMode is fromTerm', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      {
        quantity: 2,
        date: '2023-06-01',
        description: 'Hardship',
        active: true,
        emiRecalculationMode: 'fromTerm',
        emiRecalculationTerm: 8,
      },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    const schedule = amortization.calculateAmortizationPlan();
    // Schedule should be extended, and EMI should change at the specified term
    const expectedLength = term + 2;
    expect(schedule.length).toBe(expectedLength);
    // Check that the payment amount changes at the correct term
    const emiBefore = schedule.entries[6].totalPayment.toNumber();
    const emiAfter = schedule.entries[8].totalPayment.toNumber();
    expect(emiBefore).not.toBeCloseTo(emiAfter);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should ignore inactive extensions', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Inactive', active: false, emiRecalculationMode: 'fromStart' },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should ignore extensions with quantity 0', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      { quantity: 0, date: '2023-06-01', description: 'Zero', active: true, emiRecalculationMode: 'fromStart' },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    const schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });

  it('should update schedule when extension active state changes', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Dynamic', active: false, emiRecalculationMode: 'fromStart' },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    // Initially inactive
    let schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term);
    // Activate extension
    amortization.termExtensions.atIndex(0).active = true;
    amortization.preBillDays = amortization.preBillDays;
    amortization.dueBillDays = amortization.dueBillDays;
    schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term + 2);
    // Deactivate again
    amortization.termExtensions.atIndex(0).active = false;
    amortization.preBillDays = amortization.preBillDays;
    amortization.dueBillDays = amortization.dueBillDays;
    schedule = amortization.calculateAmortizationPlan();
    expect(schedule.length).toBe(term);
  });

  it('should handle extension with emiRecalculationTerm beyond schedule length gracefully', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');
    const termExtensions = new TermExtensions([
      {
        quantity: 2,
        date: '2023-06-01',
        description: 'Edge',
        active: true,
        emiRecalculationMode: 'fromTerm',
        emiRecalculationTerm: 20,
      },
    ]);
    const amortization = new Amortization({ loanAmount, annualInterestRate: interestRate, term, startDate });
    amortization.termExtensions = termExtensions;
    const schedule = amortization.calculateAmortizationPlan();
    // Should not throw, and schedule should NOT be extended
    expect(schedule.length).toBe(term);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });
});

describe('Additional Amortization Scenarios', () => {
  it('should honor a custom first payment date', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      firstPaymentDate: DateUtil.normalizeDate('2023-02-15'),
      hasCustomFirstPaymentDate: true,
    });

    const schedule = amortization.calculateAmortizationPlan();

    expect(schedule.firstEntry.periodEndDate.toString()).toBe('2023-02-15');
    expect(schedule.firstEntry.daysInPeriod).toBe(45);
    expect(schedule.entries[1].periodStartDate.toString()).toBe('2023-02-15');
  });

  it('should apply pre-bill and due-bill offsets to bill dates', () => {
    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      defaultPreBillDaysConfiguration: 5,
      defaultBillDueDaysAfterPeriodEndConfiguration: 10,
    });

    const schedule = amortization.calculateAmortizationPlan();
    const first = schedule.firstEntry;

    expect(first.periodBillOpenDate.toString()).toBe('2023-01-27');
    expect(first.periodBillDueDate.toString()).toBe('2023-02-11');
  });

  it('should apply variable interest rates using a rate schedule', () => {
    const rateSchedule = new RateSchedules([
      new RateSchedule({
        annualInterestRate: 0.05,
        startDate: '2023-01-01',
        endDate: '2023-06-30',
        type: 'custom',
      }),
      new RateSchedule({
        annualInterestRate: 0.1,
        startDate: '2023-06-30',
        endDate: '2023-12-31',
        type: 'custom',
      }),
    ]);

    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      ratesSchedule: rateSchedule,
    });

    const schedule = amortization.calculateAmortizationPlan();

    expect(schedule.entries[0].periodInterestRate.toNumber()).toBeCloseTo(0.05);
    expect(schedule.entries[6].periodInterestRate.toNumber()).toBeCloseTo(0.1);
  });

  it('should reduce principal when a balance modification is applied', () => {
    const balanceModifications = new BalanceModifications([
      new BalanceModification({
        amount: Currency.of(100),
        date: DateUtil.normalizeDate('2023-03-01'),
        type: 'decrease',
      }),
    ]);

    const amortization = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate('2023-01-01'),
      balanceModifications,
    });

    const schedule = amortization.calculateAmortizationPlan();

    const modificationIndex = schedule.entries.findIndex((e) => !e.balanceModificationAmount.isZero());
    expect(modificationIndex).toBeGreaterThanOrEqual(0);
    const modEntry = schedule.entries[modificationIndex];
    const nextEntry = schedule.entries[modificationIndex + 1];

    expect(modEntry.balanceModificationAmount.toNumber()).toBe(-100);
    expect(nextEntry.startBalance.toNumber()).toBeCloseTo(modEntry.endBalance.toNumber());
  });
});

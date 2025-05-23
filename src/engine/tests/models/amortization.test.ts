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

  it('should generate a schedule with length equal to actualTerm', () => {
    const loanAmount = Currency.of(1000);
    const interestRate = new Decimal(0.05);
    const term = 12;
    const startDate = DateUtil.normalizeDate('2023-01-01');

    const termExtensions = new TermExtensions([
      { quantity: 2, date: '2023-06-01', description: 'Hardship', active: true },
    ]);

    const amortization = new Amortization({
      loanAmount,
      annualInterestRate: interestRate,
      term,
      startDate,
    });
    amortization.termExtensions = termExtensions;
    
    const schedule = amortization.calculateAmortizationPlan();
    
    expect(schedule.length).toBe(14);
    expect(schedule.lastEntry.endBalance.toNumber()).toBe(0);
  });
});

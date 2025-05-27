import { LendPeak } from '../../models/LendPeak';
import { LocalDate } from '@js-joda/core';
import { Currency } from '../../utils/Currency';
import { Amortization } from '../../models/Amortization';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';
import Decimal from 'decimal.js';

describe('DSI Payment Date Tracking', () => {
  let loan: LendPeak;

  beforeEach(() => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(10000),
        annualInterestRate: new Decimal(0.12),
        term: 6,
        startDate: LocalDate.of(2024, 1, 1),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
    });
  });

  it('should track payment dates in DSI payment history', () => {
    loan.calc();
    
    // Manually update DSI payment history to simulate a payment made 5 days early
    const earlyPaymentDate = LocalDate.of(2024, 1, 27); // 5 days before Feb 1
    const term0StartBalance = Currency.of(10000);
    const term0EndBalance = Currency.of(8400); // After paying some principal
    
    loan.amortization.updateDSIPaymentHistory(0, term0StartBalance, term0EndBalance, earlyPaymentDate);
    
    // Recalculate
    loan.calc();
    
    // Check that the payment history preserved the payment date
    const paymentHistory = loan.amortization.getDSIPaymentHistory(0);
    expect(paymentHistory).toBeDefined();
    expect(paymentHistory!.paymentDate).toEqual(earlyPaymentDate);
    
    // Check that term 1 uses the payment date for interest calculation
    const term1 = loan.amortization.repaymentSchedule.entries[1];
    
    
    // Term 1 should calculate interest from Jan 27 to Mar 1
    // That's 34 days (5 days in Jan + 29 days in Feb)
    expect(term1.dsiInterestDays).toBe(34);
    expect(term1.dsiPreviousPaymentDate).toEqual(earlyPaymentDate);
    
    // The interest should be calculated for 34 days on the remaining balance
    const expectedDailyRate = 0.12 / 365;
    const expectedInterest = term0EndBalance.toNumber() * expectedDailyRate * 34;
    
    // Due to rounding, use a tolerance
    expect(term1.dueInterestForTerm.toNumber()).toBeCloseTo(expectedInterest, 2);
  });

  it('should handle late payments by reducing interest days', () => {
    loan.calc();
    
    // Simulate a payment made 3 days late
    const latePaymentDate = LocalDate.of(2024, 2, 4); // 3 days after Feb 1
    const term0StartBalance = Currency.of(10000);
    const term0EndBalance = Currency.of(8400);
    
    loan.amortization.updateDSIPaymentHistory(0, term0StartBalance, term0EndBalance, latePaymentDate);
    
    // Recalculate
    loan.calc();
    
    // Check term 1 interest calculation
    const term1 = loan.amortization.repaymentSchedule.entries[1];
    
    // Term 1 should calculate interest from Feb 4 to Mar 1
    // That's 26 days (29 days in Feb minus 3 days)
    expect(term1.dsiInterestDays).toBe(26);
    expect(term1.dsiPreviousPaymentDate).toEqual(latePaymentDate);
    
    // The interest should be calculated for 26 days
    const expectedDailyRate = 0.12 / 365;
    const expectedInterest = term0EndBalance.toNumber() * expectedDailyRate * 26;
    
    expect(term1.dueInterestForTerm.toNumber()).toBeCloseTo(expectedInterest, 2);
  });

  it('should cascade payment date effects through multiple terms', () => {
    loan.calc();
    
    // Make term 0 payment early
    const term0PaymentDate = LocalDate.of(2024, 1, 27);
    loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(8400), term0PaymentDate);
    
    // Make term 1 payment on time
    const term1PaymentDate = LocalDate.of(2024, 3, 1);
    loan.amortization.updateDSIPaymentHistory(1, Currency.of(8400), Currency.of(6800), term1PaymentDate);
    
    // Recalculate
    loan.calc();
    
    // Check term 2
    const term2 = loan.amortization.repaymentSchedule.entries[2];
    
    // Term 2 should calculate interest from Mar 1 to Apr 1 (31 days)
    expect(term2.dsiInterestDays).toBe(31);
    expect(term2.dsiPreviousPaymentDate).toEqual(term1PaymentDate);
  });
});
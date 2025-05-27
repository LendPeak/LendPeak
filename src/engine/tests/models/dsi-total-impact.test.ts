import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';
import { DepositRecord } from '../../models/DepositRecord';

describe('DSI Total Impact Calculation', () => {
  let loan: LendPeak;
  const loanAmount = 10000;
  const annualRate = 0.12;
  const term = 6;
  const startDate = LocalDate.of(2024, 1, 1);

  beforeEach(() => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(loanAmount),
        annualInterestRate: new Decimal(annualRate),
        term: term,
        startDate: startDate,
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 7, 1), // After loan end
    });
  });

  it('should return zero impact for non-DSI loans', () => {
    loan.billingModel = 'amortized';
    loan.calc();
    
    const impact = loan.totalDSIImpact;
    expect(impact.netAmount).toBe(0);
    expect(impact.savings).toBe(0);
    expect(impact.penalty).toBe(0);
  });

  it('should calculate total savings for early payments', () => {
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Simulate early payments for all terms
    for (let i = 0; i < term; i++) {
      const entry = schedule.entries[i];
      const earlyPaymentDate = entry.periodEndDate.minusDays(5); // 5 days early
      
      loan.amortization.updateDSIPaymentHistory(
        i,
        i === 0 ? Currency.of(loanAmount) : schedule.entries[i-1].endBalance,
        entry.endBalance,
        earlyPaymentDate,
        entry.dueInterestForTerm,
        entry.principal,
        Currency.zero,
        entry.daysInPeriod - 5 // Reduced interest days
      );
    }
    
    loan.calc();
    
    const impact = loan.totalDSIImpact;
    
    // Should have savings (positive net amount)
    expect(impact.netAmount).toBeGreaterThan(0);
    expect(impact.savings).toBeGreaterThan(0);
    expect(impact.penalty).toBe(0);
    
    console.log('Early payments impact:', {
      netAmount: impact.netAmount,
      savings: impact.savings,
      penalty: impact.penalty
    });
  });

  it('should calculate total penalty for late payments', () => {
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Simulate late payments for all terms
    for (let i = 0; i < term; i++) {
      const entry = schedule.entries[i];
      const latePaymentDate = entry.periodEndDate.plusDays(10); // 10 days late
      
      loan.amortization.updateDSIPaymentHistory(
        i,
        i === 0 ? Currency.of(loanAmount) : schedule.entries[i-1].endBalance,
        entry.endBalance,
        latePaymentDate,
        entry.dueInterestForTerm,
        entry.principal,
        Currency.zero,
        entry.daysInPeriod + 10 // Extra interest days
      );
    }
    
    loan.calc();
    
    const impact = loan.totalDSIImpact;
    
    // Should have penalty (negative net amount)
    expect(impact.netAmount).toBeLessThan(0);
    expect(impact.savings).toBe(0);
    expect(impact.penalty).toBeGreaterThan(0);
    
    console.log('Late payments impact:', {
      netAmount: impact.netAmount,
      savings: impact.savings,
      penalty: impact.penalty
    });
  });

  it('should calculate mixed savings and penalty correctly', () => {
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Mix of early and late payments
    for (let i = 0; i < term; i++) {
      const entry = schedule.entries[i];
      let paymentDate: LocalDate;
      let interestDays: number;
      
      if (i % 2 === 0) {
        // Even terms: pay early
        paymentDate = entry.periodEndDate.minusDays(7);
        interestDays = entry.daysInPeriod - 7;
      } else {
        // Odd terms: pay late
        paymentDate = entry.periodEndDate.plusDays(5);
        interestDays = entry.daysInPeriod + 5;
      }
      
      loan.amortization.updateDSIPaymentHistory(
        i,
        i === 0 ? Currency.of(loanAmount) : schedule.entries[i-1].endBalance,
        entry.endBalance,
        paymentDate,
        entry.dueInterestForTerm,
        entry.principal,
        Currency.zero,
        interestDays
      );
    }
    
    loan.calc();
    
    const impact = loan.totalDSIImpact;
    
    // Should have both savings and penalty
    expect(impact.savings).toBeGreaterThan(0);
    expect(impact.penalty).toBeGreaterThan(0);
    // Net amount could be positive or negative depending on the specific values
    
    console.log('Mixed payments impact:', {
      netAmount: impact.netAmount,
      savings: impact.savings,
      penalty: impact.penalty
    });
  });

  it('should handle DSI overrides correctly', () => {
    // Test that totalDSIImpact correctly filters by billing model
    // We'll manually set DSI savings/penalty on various terms and verify
    // that only DSI terms are included in the total
    
    // Start with amortized loan
    loan.billingModel = 'amortized';
    loan.billingModelOverrides = [
      { term: 2, model: 'dailySimpleInterest' }, // Switch to DSI from term 2
      { term: 4, model: 'amortized' } // Switch back to amortized from term 4
    ];
    
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Verify billing models are set correctly
    expect(schedule.entries[0].billingModel).toBe('amortized');
    expect(schedule.entries[1].billingModel).toBe('dailySimpleInterest');
    expect(schedule.entries[2].billingModel).toBe('dailySimpleInterest');
    expect(schedule.entries[3].billingModel).toBe('amortized');
    
    // Manually set DSI savings/penalty to test the totalDSIImpact getter
    // In a real scenario, these would be set by payment processing
    schedule.entries[0].dsiInterestSavings = 10; // Term 1 (amortized - should be ignored)
    schedule.entries[1].dsiInterestSavings = 20; // Term 2 (DSI - should be included)
    schedule.entries[2].dsiInterestPenalty = 15; // Term 3 (DSI - should be included)
    schedule.entries[3].dsiInterestPenalty = 25; // Term 4 (amortized - should be ignored)
    
    const impact = loan.totalDSIImpact;
    
    console.log('DSI overrides impact test:', {
      netAmount: impact.netAmount,
      savings: impact.savings,
      penalty: impact.penalty
    });
    
    // Should only include DSI terms (2 and 3)
    expect(impact.savings).toBe(20); // Only term 2
    expect(impact.penalty).toBe(15); // Only term 3
    expect(impact.netAmount).toBe(5); // 20 - 15
    
    // Verify the getter is working correctly
    expect(impact.savings).toBeGreaterThan(0);
    expect(impact.penalty).toBeGreaterThan(0);
  });
});
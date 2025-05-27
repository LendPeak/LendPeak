import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';

describe('DSI Current Term No Delinquency', () => {
  it('should show correct re-amortized principal for current active term when there are no delinquencies', () => {
    // Create a loan that has been paid on time up to term 19
    const loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(20000),
        annualInterestRate: new Decimal(0.1355), // 13.55% annual
        term: 24,
        startDate: LocalDate.of(2023, 9, 21),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2025, 5, 27), // Current date during term 20
    });

    loan.calc();
    
    // Simulate that all payments up to term 19 have been made on time
    const schedule = loan.amortization.repaymentSchedule;
    for (let i = 0; i < 20; i++) {
      const entry = schedule.entries[i];
      const paymentDate = entry.periodEndDate; // On-time payment
      const startBalance = i === 0 ? Currency.of(20000) : schedule.entries[i-1].endBalance;
      const endBalance = entry.endBalance;
      
      // Update DSI payment history
      loan.amortization.updateDSIPaymentHistory(
        i,
        startBalance,
        endBalance,
        paymentDate,
        entry.dueInterestForTerm,
        entry.principal,
        entry.fees,
        entry.daysInPeriod
      );
    }
    
    // Recalculate with payment history
    loan.calc();
    
    const updatedSchedule = loan.amortization.repaymentSchedule;
    
    // Find term 20 (current active term)
    const term20 = updatedSchedule.entries[20];
    
    console.log('Term 20 details:', {
      term: term20.term,
      isCurrentActiveTerm: term20.isCurrentActiveTerm,
      isDelinquent: term20.isDelinquent,
      startBalance: term20.startBalance.toNumber(),
      endBalance: term20.endBalance.toNumber(),
      principal: term20.principal.toNumber(),
      reAmortizedStartBalance: term20.reAmortizedStartBalance?.toNumber(),
      reAmortizedEndBalance: term20.reAmortizedEndBalance?.toNumber(),
      reAmortizedPrincipal: term20.reAmortizedPrincipal?.toNumber(),
      reAmortizedInterest: term20.reAmortizedInterest?.toNumber(),
    });
    
    // Term 20 should be the current active term
    expect(term20.isCurrentActiveTerm).toBe(true);
    
    // Term 20 should NOT be delinquent (no prior delinquencies)
    expect(term20.isDelinquent).toBe(false);
    
    // Term 20 should have proper re-amortized principal (not zero)
    expect(term20.reAmortizedPrincipal).toBeDefined();
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    
    // Re-amortized principal should be close to the scheduled principal
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeCloseTo(term20.principal.toNumber(), 0);
    
    // Term 21 should also have correct values
    const term21 = updatedSchedule.entries[21];
    
    console.log('Term 21 details:', {
      term: term21.term,
      isCurrentActiveTerm: term21.isCurrentActiveTerm,
      isDelinquent: term21.isDelinquent,
      reAmortizedStartBalance: term21.reAmortizedStartBalance?.toNumber(),
      reAmortizedPrincipal: term21.reAmortizedPrincipal?.toNumber(),
    });
    
    // Term 21 should be a future term with proper re-amortization
    expect(term21.isCurrentActiveTerm).toBe(false);
    expect(term21.isDelinquent).toBe(false);
    expect(term21.reAmortizedPrincipal).toBeDefined();
    expect(term21.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
  });
});
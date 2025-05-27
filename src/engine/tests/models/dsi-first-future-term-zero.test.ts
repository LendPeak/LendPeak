import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';

describe('DSI First Future Term Zero Issue', () => {
  let loan: LendPeak;
  const loanAmount = 10000;
  const annualRate = 0.12;
  const term = 12;
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
    });
  });

  it('should have non-zero re-amortized values on first future term when current term is delinquent', () => {
    // Set current date to April 15 (during term 3)
    loan.amortization.currentDate = LocalDate.of(2024, 4, 15);
    loan.calc();
    
    // Make payments for terms 0 and 1 only
    loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(9134.59), LocalDate.of(2024, 2, 1), Currency.of(100), Currency.of(765.41), Currency.zero, 31);
    loan.amortization.updateDSIPaymentHistory(1, Currency.of(9134.59), Currency.of(8265.48), LocalDate.of(2024, 3, 1), Currency.of(86.38), Currency.of(782.73), Currency.zero, 29);
    
    // Recalculate
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Export to CSV to debug
    const csv = loan.amortization.export.exportRepaymentScheduleToCSV();
    console.log('\nCSV Export (first few terms):');
    const lines = csv.split('\n');
    console.log(lines[0]); // Header
    for (let i = 1; i <= 5 && i < lines.length; i++) {
      console.log(`Term ${i-1}: ${lines[i]}`);
    }
    
    // Find the first future term
    let firstFutureTerm = -1;
    for (let i = 0; i < schedule.entries.length; i++) {
      const entry = schedule.entries[i];
      if (!entry.isDelinquent && !entry.isCurrentActiveTerm && entry.billingModel === 'dailySimpleInterest' && entry.billablePeriod) {
        firstFutureTerm = i;
        break;
      }
    }
    
    console.log(`\nFirst future term index: ${firstFutureTerm}`);
    
    if (firstFutureTerm >= 0) {
      const futureEntry = schedule.entries[firstFutureTerm];
      console.log(`\nFirst future term (${firstFutureTerm}) details:`, {
        isDelinquent: futureEntry.isDelinquent,
        isCurrentActiveTerm: futureEntry.isCurrentActiveTerm,
        startBalance: futureEntry.startBalance.toNumber(),
        endBalance: futureEntry.endBalance.toNumber(),
        principal: futureEntry.principal.toNumber(),
        dueInterestForTerm: futureEntry.dueInterestForTerm.toNumber(),
        accruedInterestForPeriod: futureEntry.accruedInterestForPeriod.toNumber(),
        totalPayment: futureEntry.totalPayment.toNumber(),
        reAmortizedStartBalance: futureEntry.reAmortizedStartBalance?.toNumber(),
        reAmortizedEndBalance: futureEntry.reAmortizedEndBalance?.toNumber(),
        reAmortizedPrincipal: futureEntry.reAmortizedPrincipal?.toNumber(),
        reAmortizedInterest: futureEntry.reAmortizedInterest?.toNumber(),
      });
      
      // Check previous term
      if (firstFutureTerm > 0) {
        const prevEntry = schedule.entries[firstFutureTerm - 1];
        console.log(`\nPrevious term (${firstFutureTerm - 1}) details:`, {
          isDelinquent: prevEntry.isDelinquent,
          isCurrentActiveTerm: prevEntry.isCurrentActiveTerm,
          reAmortizedEndBalance: prevEntry.reAmortizedEndBalance?.toNumber(),
        });
      }
      
      // The issue: re-amortized values should not be zero
      expect(futureEntry.reAmortizedInterest).toBeDefined();
      expect(futureEntry.reAmortizedInterest?.toNumber()).toBeGreaterThan(0);
      expect(futureEntry.reAmortizedPrincipal).toBeDefined();
      expect(futureEntry.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
      expect(futureEntry.accruedInterestForPeriod.toNumber()).toBeGreaterThan(0);
    }
  });

  it('should check specific scenario where current active term is exactly at payment date', () => {
    // Set current date exactly at term 2 end date
    loan.amortization.currentDate = LocalDate.of(2024, 4, 1);
    loan.calc();
    
    // Make payments for terms 0 and 1
    loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(9134.59), LocalDate.of(2024, 2, 1), Currency.of(100), Currency.of(765.41), Currency.zero, 31);
    loan.amortization.updateDSIPaymentHistory(1, Currency.of(9134.59), Currency.of(8265.48), LocalDate.of(2024, 3, 1), Currency.of(86.38), Currency.of(782.73), Currency.zero, 29);
    
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Debug current active term logic
    console.log('\nTerm status:');
    for (let i = 0; i < 6; i++) {
      const entry = schedule.entries[i];
      console.log(`Term ${i}:`, {
        periodStartDate: entry.periodStartDate.toString(),
        periodEndDate: entry.periodEndDate.toString(),
        isCurrentActiveTerm: entry.isCurrentActiveTerm,
        isDelinquent: entry.isDelinquent,
      });
    }
  });
});
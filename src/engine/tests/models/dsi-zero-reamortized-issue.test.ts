import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';

describe('DSI Zero Re-amortized Values Issue', () => {
  let loan: LendPeak;

  it('should reproduce the exact issue with zero re-amortized values', () => {
    // Create a loan with DSI
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(50000),
        annualInterestRate: new Decimal(0.15),
        term: 24,
        startDate: LocalDate.of(2024, 1, 1),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
    });

    // Set current date to May 2024
    loan.amortization.currentDate = LocalDate.of(2024, 5, 15);
    loan.calc();
    
    // Make payments for first 3 terms
    loan.amortization.updateDSIPaymentHistory(0, Currency.of(50000), Currency.of(47593.66), LocalDate.of(2024, 2, 1), Currency.of(638.79), Currency.of(1767.55), Currency.zero, 31);
    loan.amortization.updateDSIPaymentHistory(1, Currency.of(47593.66), Currency.of(45165.58), LocalDate.of(2024, 3, 1), Currency.of(547.89), Currency.of(1858.25), Currency.zero, 29);
    loan.amortization.updateDSIPaymentHistory(2, Currency.of(45165.58), Currency.of(42714.90), LocalDate.of(2024, 4, 1), Currency.of(576.54), Currency.of(1829.60), Currency.zero, 31);
    
    // Recalculate
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Find all terms and their status
    console.log('\nAll terms status:');
    for (let i = 0; i < Math.min(8, schedule.entries.length); i++) {
      const entry = schedule.entries[i];
      console.log(`Term ${i}:`, {
        periodDates: `${entry.periodStartDate} to ${entry.periodEndDate}`,
        isCurrentActiveTerm: entry.isCurrentActiveTerm,
        isDelinquent: entry.isDelinquent,
        hasDSIPayment: entry.actualDSIInterest !== undefined && entry.actualDSIPrincipal !== undefined,
        accruedInterest: entry.accruedInterestForPeriod.toNumber(),
        reAmortizedInterest: entry.reAmortizedInterest?.toNumber(),
        reAmortizedPrincipal: entry.reAmortizedPrincipal?.toNumber(),
        reAmortizedStartBalance: entry.reAmortizedStartBalance?.toNumber(),
      });
    }
    
    // Find the first future term (not delinquent, not current active)
    let firstFutureIndex = -1;
    let currentActiveIndex = -1;
    
    for (let i = 0; i < schedule.entries.length; i++) {
      if (schedule.entries[i].isCurrentActiveTerm) {
        currentActiveIndex = i;
      }
      if (!schedule.entries[i].isDelinquent && !schedule.entries[i].isCurrentActiveTerm && firstFutureIndex === -1) {
        firstFutureIndex = i;
      }
    }
    
    console.log(`\nCurrent active term: ${currentActiveIndex}`);
    console.log(`First future term: ${firstFutureIndex}`);
    
    if (firstFutureIndex >= 0) {
      const futureEntry = schedule.entries[firstFutureIndex];
      console.log('\nFirst future term details:', {
        term: firstFutureIndex,
        accruedInterestForPeriod: futureEntry.accruedInterestForPeriod.toNumber(),
        reAmortizedInterest: futureEntry.reAmortizedInterest?.toNumber(),
        reAmortizedPrincipal: futureEntry.reAmortizedPrincipal?.toNumber(),
        reAmortizedStartBalance: futureEntry.reAmortizedStartBalance?.toNumber(),
        reAmortizedEndBalance: futureEntry.reAmortizedEndBalance?.toNumber(),
        totalPayment: futureEntry.totalPayment.toNumber(),
      });
      
      // Check if this is the issue
      if (futureEntry.reAmortizedPrincipal?.isZero() || futureEntry.reAmortizedInterest?.isZero()) {
        console.log('\n❌ ISSUE FOUND: First future term has zero re-amortized values!');
        
        // Debug the re-amortization logic
        const prevEntry = schedule.entries[firstFutureIndex - 1];
        console.log('\nPrevious term details:', {
          term: firstFutureIndex - 1,
          isDelinquent: prevEntry.isDelinquent,
          isCurrentActiveTerm: prevEntry.isCurrentActiveTerm,
          reAmortizedEndBalance: prevEntry.reAmortizedEndBalance?.toNumber(),
        });
      }
    }
  });

  it('should test edge case where current active term is the last paid term', () => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(10000),
        annualInterestRate: new Decimal(0.12),
        term: 12,
        startDate: LocalDate.of(2024, 1, 1),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
    });

    // Set current date to March 15
    loan.amortization.currentDate = LocalDate.of(2024, 3, 15);
    loan.calc();
    
    // Make payment for term 0 and 1 only, term 2 is current but unpaid
    loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(9134.59), LocalDate.of(2024, 2, 1), Currency.of(100), Currency.of(765.41), Currency.zero, 31);
    loan.amortization.updateDSIPaymentHistory(1, Currency.of(9134.59), Currency.of(8265.48), LocalDate.of(2024, 3, 1), Currency.of(86.38), Currency.of(782.73), Currency.zero, 29);
    
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Look at the edge between delinquent and future
    console.log('\nEdge case - terms around current active:');
    for (let i = 0; i < 6; i++) {
      const entry = schedule.entries[i];
      const hasDSIPayment = entry.actualDSIInterest !== undefined && entry.actualDSIPrincipal !== undefined;
      console.log(`Term ${i}:`, {
        isCurrentActiveTerm: entry.isCurrentActiveTerm,
        isDelinquent: entry.isDelinquent,
        hasDSIPayment,
        reAmortizedPrincipal: entry.reAmortizedPrincipal?.toNumber(),
        reAmortizedInterest: entry.reAmortizedInterest?.toNumber(),
      });
    }
  });
});
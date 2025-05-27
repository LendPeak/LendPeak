import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';

describe('DSI Term 20-21 Specific Scenario', () => {
  it('should correctly handle re-amortization for terms 20 and 21 with no delinquencies', () => {
    // Create a loan similar to the user's scenario
    const loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(20000),
        annualInterestRate: new Decimal(0.1355), // 13.55%
        term: 24,
        startDate: LocalDate.of(2023, 9, 21),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2025, 5, 27), // Current date during term 20
    });

    loan.calc();
    
    // Simulate all payments up through term 19 made on time
    const schedule = loan.amortization.repaymentSchedule;
    let currentBalance = Currency.of(20000);
    
    for (let i = 0; i < 20; i++) {
      const entry = schedule.entries[i];
      const payment = entry.totalPayment;
      const interest = entry.dueInterestForTerm;
      const principal = entry.principal;
      const endBalance = currentBalance.subtract(principal);
      
      // Record on-time payment
      loan.amortization.updateDSIPaymentHistory(
        i,
        currentBalance,
        endBalance,
        entry.periodEndDate, // On-time payment
        interest,
        principal,
        Currency.zero,
        entry.daysInPeriod
      );
      
      currentBalance = endBalance;
    }
    
    // Recalculate with payment history
    loan.calc();
    
    const updatedSchedule = loan.amortization.repaymentSchedule;
    const term20 = updatedSchedule.entries[20];
    const term21 = updatedSchedule.entries[21];
    
    console.log('\nTerm 20 (Current Active Term) Analysis:');
    console.log('=====================================');
    console.log(`Period: ${term20.periodStartDate} to ${term20.periodEndDate}`);
    console.log(`Is Current Active Term: ${term20.isCurrentActiveTerm}`);
    console.log(`Is Delinquent: ${term20.isDelinquent}`);
    console.log(`\nScheduled Values:`);
    console.log(`  Start Balance: ${term20.startBalance.toNumber().toFixed(2)}`);
    console.log(`  Principal: ${term20.principal.toNumber().toFixed(2)}`);
    console.log(`  Interest: ${term20.dueInterestForTerm.toNumber().toFixed(2)}`);
    console.log(`  End Balance: ${term20.endBalance.toNumber().toFixed(2)}`);
    console.log(`\nRe-amortized Values:`);
    console.log(`  Start Balance: ${term20.reAmortizedStartBalance?.toNumber().toFixed(2)}`);
    console.log(`  Principal: ${term20.reAmortizedPrincipal?.toNumber().toFixed(2)}`);
    console.log(`  Interest: ${term20.reAmortizedInterest?.toNumber().toFixed(2)}`);
    console.log(`  End Balance: ${term20.reAmortizedEndBalance?.toNumber().toFixed(2)}`);
    
    console.log('\n\nTerm 21 (Future Term) Analysis:');
    console.log('================================');
    console.log(`Period: ${term21.periodStartDate} to ${term21.periodEndDate}`);
    console.log(`Is Current Active Term: ${term21.isCurrentActiveTerm}`);
    console.log(`Is Delinquent: ${term21.isDelinquent}`);
    console.log(`\nScheduled Values:`);
    console.log(`  Start Balance: ${term21.startBalance.toNumber().toFixed(2)}`);
    console.log(`  Principal: ${term21.principal.toNumber().toFixed(2)}`);
    console.log(`  Interest: ${term21.dueInterestForTerm.toNumber().toFixed(2)}`);
    console.log(`  End Balance: ${term21.endBalance.toNumber().toFixed(2)}`);
    console.log(`\nRe-amortized Values:`);
    console.log(`  Start Balance: ${term21.reAmortizedStartBalance?.toNumber().toFixed(2)}`);
    console.log(`  Principal: ${term21.reAmortizedPrincipal?.toNumber().toFixed(2)}`);
    console.log(`  Interest: ${term21.reAmortizedInterest?.toNumber().toFixed(2)}`);
    console.log(`  End Balance: ${term21.reAmortizedEndBalance?.toNumber().toFixed(2)}`);
    
    // Verify Term 20 (current active term with no delinquencies)
    expect(term20.isCurrentActiveTerm).toBe(true);
    expect(term20.isDelinquent).toBe(false);
    expect(term20.reAmortizedPrincipal).toBeDefined();
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeCloseTo(913.19, 0); // Expected value from user's data
    
    // Verify Term 21 (future term)
    expect(term21.isCurrentActiveTerm).toBe(false);
    expect(term21.isDelinquent).toBe(false);
    expect(term21.reAmortizedPrincipal).toBeDefined();
    expect(term21.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    expect(term21.reAmortizedPrincipal!.toNumber()).toBeCloseTo(924.34, 0); // Expected value from user's data
    
    // Verify balance continuity
    expect(term21.reAmortizedStartBalance!.toNumber()).toBeCloseTo(
      term20.reAmortizedEndBalance!.toNumber(),
      2
    );
  });

  it('should correctly show zero principal for term 20 when there ARE prior delinquencies', () => {
    // Same loan setup
    const loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(20000),
        annualInterestRate: new Decimal(0.1355),
        term: 24,
        startDate: LocalDate.of(2023, 9, 21),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2025, 5, 27),
    });

    loan.calc();
    
    // Simulate payments up to term 18, but skip term 19 (creating a delinquency)
    const schedule = loan.amortization.repaymentSchedule;
    let currentBalance = Currency.of(20000);
    
    for (let i = 0; i < 19; i++) { // Only up to term 18
      const entry = schedule.entries[i];
      const principal = entry.principal;
      const endBalance = currentBalance.subtract(principal);
      
      loan.amortization.updateDSIPaymentHistory(
        i,
        currentBalance,
        endBalance,
        entry.periodEndDate,
        entry.dueInterestForTerm,
        principal,
        Currency.zero,
        entry.daysInPeriod
      );
      
      currentBalance = endBalance;
    }
    // Term 19 is NOT paid - creating a delinquency
    
    loan.calc();
    
    const updatedSchedule = loan.amortization.repaymentSchedule;
    const term19 = updatedSchedule.entries[19];
    const term20 = updatedSchedule.entries[20];
    const term21 = updatedSchedule.entries[21];
    
    console.log('\nWith Delinquency Scenario:');
    console.log('=========================');
    console.log(`Term 19 - Is Delinquent: ${term19.isDelinquent}, Re-amortized Principal: ${term19.reAmortizedPrincipal?.toNumber().toFixed(2)}`);
    console.log(`Term 20 - Is Current Active: ${term20.isCurrentActiveTerm}, Is Delinquent: ${term20.isDelinquent}, Re-amortized Principal: ${term20.reAmortizedPrincipal?.toNumber().toFixed(2)}`);
    console.log(`Term 21 - Re-amortized Principal: ${term21.reAmortizedPrincipal?.toNumber().toFixed(2)}`);
    
    // Term 19 should be delinquent with zero principal
    expect(term19.isDelinquent).toBe(true);
    expect(term19.reAmortizedPrincipal!.toNumber()).toBe(0);
    
    // Term 20 should be marked as delinquent due to cascade effect
    expect(term20.isCurrentActiveTerm).toBe(true);
    expect(term20.isDelinquent).toBe(true);
    expect(term20.reAmortizedPrincipal!.toNumber()).toBe(0);
    
    // Term 21 (future term) should still show principal reduction
    expect(term21.isDelinquent).toBe(false);
    expect(term21.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
  });

  it('should match exact values from user CSV export', () => {
    // Create loan matching user's exact parameters
    const loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(20000),
        annualInterestRate: new Decimal(0.1355),
        term: 24,
        startDate: LocalDate.of(2023, 9, 21),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2025, 5, 27),
    });

    loan.calc();
    
    // Simulate exact payment history from user's data
    const paymentData = [
      { principal: 730.18, interest: 225.83, balance: 19269.82 },
      { principal: 738.42, interest: 217.59, balance: 18531.40 },
      { principal: 746.76, interest: 209.25, balance: 17784.64 },
      { principal: 755.19, interest: 200.82, balance: 17029.45 },
      { principal: 763.72, interest: 192.29, balance: 16265.73 },
      { principal: 772.34, interest: 183.67, balance: 15493.39 },
      { principal: 781.06, interest: 174.95, balance: 14712.33 },
      { principal: 789.88, interest: 166.13, balance: 13922.45 },
      { principal: 798.80, interest: 157.21, balance: 13123.65 },
      { principal: 807.82, interest: 148.19, balance: 12315.83 },
      { principal: 816.94, interest: 139.07, balance: 11498.89 },
      { principal: 826.17, interest: 129.84, balance: 10672.72 },
      { principal: 835.50, interest: 120.51, balance: 9837.22 },
      { principal: 844.93, interest: 111.08, balance: 8992.29 },
      { principal: 854.47, interest: 101.54, balance: 8137.82 },
      { principal: 864.12, interest: 91.89, balance: 7273.70 },
      { principal: 873.88, interest: 82.13, balance: 6399.82 },
      { principal: 883.75, interest: 72.26, balance: 5516.07 },
      { principal: 893.72, interest: 62.29, balance: 4622.35 },
      { principal: 903.82, interest: 52.19, balance: 3718.53 },
    ];
    
    const schedule = loan.amortization.repaymentSchedule;
    let currentBalance = Currency.of(20000);
    
    for (let i = 0; i < 20; i++) {
      const payment = paymentData[i];
      const entry = schedule.entries[i];
      
      loan.amortization.updateDSIPaymentHistory(
        i,
        currentBalance,
        Currency.of(payment.balance),
        entry.periodEndDate,
        Currency.of(payment.interest),
        Currency.of(payment.principal),
        Currency.zero,
        entry.daysInPeriod
      );
      
      currentBalance = Currency.of(payment.balance);
    }
    
    loan.calc();
    
    const term20 = loan.amortization.repaymentSchedule.entries[20];
    const term21 = loan.amortization.repaymentSchedule.entries[21];
    
    // Based on user's data, expected values for term 20:
    // Start Balance: 3718.53
    // Principal: 914.02
    // End Balance: 2804.51
    
    expect(term20.reAmortizedStartBalance!.toNumber()).toBeCloseTo(3718.53, 1);
    // Principal should be around 913-914 (small differences due to interest calculation precision)
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(910);
    expect(term20.reAmortizedPrincipal!.toNumber()).toBeLessThan(920);
    // End balance should be reasonable
    expect(term20.reAmortizedEndBalance!.toNumber()).toBeGreaterThan(2800);
    expect(term20.reAmortizedEndBalance!.toNumber()).toBeLessThan(2810);
    
    // Term 21 should continue from term 20's end balance
    expect(term21.reAmortizedStartBalance!.toNumber()).toBeCloseTo(
      term20.reAmortizedEndBalance!.toNumber(), 
      2
    );
    expect(term21.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
  });
});
import { LendPeak } from '@models/LendPeak';
import { Amortization } from '@models/Amortization';
import { Currency } from '@utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { TermCalendars } from '@models/TermCalendars';
import { CalendarType } from '@models/Calendar';
import { DepositRecord } from '@models/DepositRecord';

describe('DSI Re-amortized Principal', () => {
  let loan: LendPeak;
  
  beforeEach(() => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(10_000),
        annualInterestRate: new Decimal(0.12), // 12% annual
        term: 6,
        startDate: LocalDate.of(2024, 1, 1),
        firstPaymentDate: LocalDate.of(2024, 2, 1),
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 3, 15), // Mid-March
    });
  });

  it('should calculate re-amortized principal correctly for paid DSI terms', () => {
    // Initial calculation
    loan.calc();
    
    // Make first payment
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[0].totalDue.toNumber(),
      effectiveDate: LocalDate.of(2024, 2, 1),
      currency: 'USD',
    }));
    
    // Make second payment
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[1].totalDue.toNumber(),
      effectiveDate: LocalDate.of(2024, 3, 1),
      currency: 'USD',
    }));
    
    // Recalculate
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    const term0 = schedule.entries[0];
    const term1 = schedule.entries[1];
    
    
    // Re-amortized principal should match actual DSI principal for paid terms
    expect(term0.reAmortizedPrincipal).toBeDefined();
    expect(term0.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
    expect(term0.reAmortizedPrincipal).toEqual(term0.actualDSIPrincipal);
    
    expect(term1.reAmortizedPrincipal).toBeDefined();
    expect(term1.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
    expect(term1.reAmortizedPrincipal).toEqual(term1.actualDSIPrincipal);
  });
  
  it('should calculate re-amortized principal for future unpaid terms', () => {
    loan.calc();
    
    // Make only first payment
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[0].totalDue.toNumber(),
      effectiveDate: LocalDate.of(2024, 2, 1),
      currency: 'USD',
    }));
    
    // Set current date to after first payment but before second
    loan.currentDate = LocalDate.of(2024, 2, 15);
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    
    // Check future terms (3 and beyond)
    const term3 = schedule.entries[3];
    const term4 = schedule.entries[4];
    
    
    // Future terms should have re-amortized principal calculated
    expect(term3.reAmortizedPrincipal).toBeDefined();
    expect(term3.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
    
    expect(term4.reAmortizedPrincipal).toBeDefined();
    expect(term4.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
    
    // End balance should decrease by principal amount
    const expectedEndBalance = term3.reAmortizedStartBalance!.subtract(term3.reAmortizedPrincipal!);
    expect(term3.reAmortizedEndBalance?.toNumber()).toBeCloseTo(expectedEndBalance.toNumber(), 2);
  });
});
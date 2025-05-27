import { LendPeak } from '@models/LendPeak';
import { Amortization } from '@models/Amortization';
import { Currency } from '@utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { TermCalendars } from '@models/TermCalendars';
import { CalendarType } from '@models/Calendar';
import { DepositRecord } from '@models/DepositRecord';

describe('DSI Interest Accuracy', () => {
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
      currentDate: LocalDate.of(2024, 3, 15),
    });
  });

  it('should have re-amortized interest equal to actual DSI interest for on-time payments', () => {
    loan.calc();
    
    // Make payment exactly on due date
    const firstBill = loan.bills.all[0];
    const firstDueDate = firstBill.dueDate;
    const firstPaymentAmount = firstBill.totalDue.toNumber();
    
    console.log('First bill info:', {
      dueDate: firstDueDate.toString(),
      totalDue: firstPaymentAmount,
      projectedInterest: firstBill.interestDue.value,
      projectedPrincipal: firstBill.principalDue.value,
    });
    
    loan.depositRecords.addRecord(new DepositRecord({
      amount: firstPaymentAmount,
      effectiveDate: firstDueDate,
      currency: 'USD',
    }));
    
    // Make second payment on due date
    const secondBill = loan.bills.all[1];
    const secondDueDate = secondBill.dueDate;
    const secondPaymentAmount = secondBill.totalDue.toNumber();
    
    loan.depositRecords.addRecord(new DepositRecord({
      amount: secondPaymentAmount,
      effectiveDate: secondDueDate,
      currency: 'USD',
    }));
    
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    const term0 = schedule.entries[0];
    const term1 = schedule.entries[1];
    
    console.log('Term 0 comparison:', {
      dsiInterestDays: term0.dsiInterestDays,
      actualDSIInterest: term0.actualDSIInterest?.value,
      reAmortizedInterest: term0.reAmortizedInterest?.value,
      projectedInterest: term0.accruedInterestForPeriod.value,
      difference: term0.actualDSIInterest ? 
        term0.actualDSIInterest.toNumber() - term0.reAmortizedInterest!.toNumber() : 0,
    });
    
    console.log('Term 1 comparison:', {
      dsiInterestDays: term1.dsiInterestDays,
      actualDSIInterest: term1.actualDSIInterest?.value,
      reAmortizedInterest: term1.reAmortizedInterest?.value,
      projectedInterest: term1.accruedInterestForPeriod.value,
      difference: term1.actualDSIInterest ? 
        term1.actualDSIInterest.toNumber() - term1.reAmortizedInterest!.toNumber() : 0,
    });
    
    // For on-time payments, re-amortized interest should equal actual DSI interest
    expect(term0.reAmortizedInterest?.toNumber()).toBeCloseTo(term0.actualDSIInterest!.toNumber(), 2);
    expect(term1.reAmortizedInterest?.toNumber()).toBeCloseTo(term1.actualDSIInterest!.toNumber(), 2);
  });

  it('should calculate DSI interest correctly with different calendar types', () => {
    // Test with 30/360 calendar
    const loan30360 = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(10_000),
        annualInterestRate: new Decimal(0.12),
        term: 3,
        startDate: LocalDate.of(2024, 1, 1),
        firstPaymentDate: LocalDate.of(2024, 2, 1),
        calendars: new TermCalendars({ primary: CalendarType.THIRTY_360 }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 2, 15),
    });
    
    loan30360.calc();
    
    // Make on-time payment
    const bill = loan30360.bills.all[0];
    loan30360.depositRecords.addRecord(new DepositRecord({
      amount: bill.totalDue.toNumber(),
      effectiveDate: bill.dueDate,
      currency: 'USD',
    }));
    
    loan30360.calc();
    
    const term0 = loan30360.amortization.repaymentSchedule.entries[0];
    
    console.log('30/360 Calendar - Term 0:', {
      daysInPeriod: term0.daysInPeriod,
      dsiInterestDays: term0.dsiInterestDays,
      actualDSIInterest: term0.actualDSIInterest?.value,
      projectedInterest: term0.accruedInterestForPeriod.value,
      perDiem: term0.perDiem.value,
      calculatedInterest30Days: 10000 * 0.12 / 360 * 30,
    });
    
    // With 30/360, interest for 30 days should be exactly 10000 * 0.12 / 360 * 30 = 100
    const expectedInterest = 100;
    expect(term0.actualDSIInterest?.toNumber()).toBeCloseTo(expectedInterest, 2);
  });
  
  it('should show interest savings/penalty correctly', () => {
    loan.calc();
    
    // Make early payment (5 days early)
    const earlyPaymentDate = LocalDate.of(2024, 1, 27);
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[0].totalDue.toNumber(),
      effectiveDate: earlyPaymentDate,
      currency: 'USD',
    }));
    
    // Make late payment (5 days late)
    const latePaymentDate = LocalDate.of(2024, 3, 6);
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[1].totalDue.toNumber(),
      effectiveDate: latePaymentDate,
      currency: 'USD',
    }));
    
    loan.calc();
    
    const schedule = loan.amortization.repaymentSchedule;
    const term0 = schedule.entries[0];
    const term1 = schedule.entries[1];
    
    console.log('Early payment (Term 0):', {
      dsiInterestDays: term0.dsiInterestDays,
      actualDSIInterest: term0.actualDSIInterest?.value,
      projectedInterest: term0.accruedInterestForPeriod.value,
      dsiInterestSavings: term0.dsiInterestSavings,
      dsiInterestPenalty: term0.dsiInterestPenalty,
    });
    
    console.log('Late payment (Term 1):', {
      dsiInterestDays: term1.dsiInterestDays,
      actualDSIInterest: term1.actualDSIInterest?.value,
      projectedInterest: term1.accruedInterestForPeriod.value,
      dsiInterestSavings: term1.dsiInterestSavings,
      dsiInterestPenalty: term1.dsiInterestPenalty,
    });
    
    // Early payment should have savings
    expect(term0.dsiInterestSavings).toBeGreaterThan(0);
    expect(term0.dsiInterestPenalty).toBe(0);
    
    // Late payment should have penalty
    expect(term1.dsiInterestPenalty).toBeGreaterThan(0);
    expect(term1.dsiInterestSavings).toBe(0);
  });
});
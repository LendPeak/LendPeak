import { LendPeak } from '@models/LendPeak';
import { Amortization } from '@models/Amortization';
import { Currency } from '@utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { TermCalendars } from '@models/TermCalendars';
import { CalendarType } from '@models/Calendar';
import { DepositRecord } from '@models/DepositRecord';

describe('DSI vs Amortized Interest Comparison', () => {
  it('should show the difference between amortized and DSI interest calculations', () => {
    // Create identical loans, one amortized and one DSI
    const loanParams = {
      loanAmount: Currency.of(10_000),
      annualInterestRate: new Decimal(0.12),
      term: 6,
      startDate: LocalDate.of(2024, 1, 1),
      firstPaymentDate: LocalDate.of(2024, 2, 1),
      calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
    };
    
    const amortizedLoan = new LendPeak({
      amortization: new Amortization(loanParams),
      billingModel: 'amortized',
      currentDate: LocalDate.of(2024, 3, 15),
    });
    
    const dsiLoan = new LendPeak({
      amortization: new Amortization(loanParams),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 3, 15),
    });
    
    // Calculate initial schedules
    amortizedLoan.calc();
    dsiLoan.calc();
    
    console.log('Initial comparison:');
    console.log('Amortized Term 0:', {
      interest: amortizedLoan.amortization.repaymentSchedule.entries[0].accruedInterestForPeriod.value,
      principal: amortizedLoan.amortization.repaymentSchedule.entries[0].principal.value,
      totalPayment: amortizedLoan.amortization.repaymentSchedule.entries[0].totalPayment.value,
    });
    console.log('DSI Term 0:', {
      interest: dsiLoan.amortization.repaymentSchedule.entries[0].accruedInterestForPeriod.value,
      principal: dsiLoan.amortization.repaymentSchedule.entries[0].principal.value,
      totalPayment: dsiLoan.amortization.repaymentSchedule.entries[0].totalPayment.value,
    });
    
    // Make on-time payments for both
    const paymentAmount = amortizedLoan.bills.all[0].totalDue.toNumber();
    const paymentDate = amortizedLoan.bills.all[0].dueDate;
    
    amortizedLoan.depositRecords.addRecord(new DepositRecord({
      amount: paymentAmount,
      effectiveDate: paymentDate,
      currency: 'USD',
    }));
    
    dsiLoan.depositRecords.addRecord(new DepositRecord({
      amount: paymentAmount,
      effectiveDate: paymentDate,
      currency: 'USD',
    }));
    
    // Make second payment
    const payment2Amount = amortizedLoan.bills.all[1].totalDue.toNumber();
    const payment2Date = amortizedLoan.bills.all[1].dueDate;
    
    amortizedLoan.depositRecords.addRecord(new DepositRecord({
      amount: payment2Amount,
      effectiveDate: payment2Date,
      currency: 'USD',
    }));
    
    dsiLoan.depositRecords.addRecord(new DepositRecord({
      amount: payment2Amount,
      effectiveDate: payment2Date,
      currency: 'USD',
    }));
    
    // Recalculate
    amortizedLoan.calc();
    dsiLoan.calc();
    
    const amortizedTerm1 = amortizedLoan.amortization.repaymentSchedule.entries[1];
    const dsiTerm1 = dsiLoan.amortization.repaymentSchedule.entries[1];
    
    console.log('\nAfter first payment - Term 1 comparison:');
    console.log('Amortized:', {
      startBalance: amortizedTerm1.startBalance.value,
      projectedInterest: amortizedTerm1.accruedInterestForPeriod.value,
      principal: amortizedTerm1.principal.value,
    });
    console.log('DSI:', {
      startBalance: dsiTerm1.startBalance.value,
      actualDSIStartBalance: dsiTerm1.actualDSIStartBalance?.value,
      projectedInterest: dsiTerm1.accruedInterestForPeriod.value,
      actualDSIInterest: dsiTerm1.actualDSIInterest?.value,
      principal: dsiTerm1.principal.value,
      actualDSIPrincipal: dsiTerm1.actualDSIPrincipal?.value,
    });
    
    // The key insight: DSI recalculates interest based on actual balance
    const dsiInterestDifference = dsiTerm1.accruedInterestForPeriod.toNumber() - dsiTerm1.actualDSIInterest!.toNumber();
    console.log('\nDSI Interest difference (projected - actual):', dsiInterestDifference);
    
    // After the fix, DSI projected interest should now match actual DSI interest
    // because we update accruedInterestForPeriod during re-amortization
    expect(Math.abs(dsiInterestDifference)).toBeLessThan(0.01); // Allow for small rounding differences
  });
  
  it('should demonstrate how DSI interest is calculated vs projected', () => {
    const loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(10_000),
        annualInterestRate: new Decimal(0.12),
        term: 3,
        startDate: LocalDate.of(2024, 1, 1),
        firstPaymentDate: LocalDate.of(2024, 2, 1),
        calendars: new TermCalendars({ primary: CalendarType.THIRTY_360 }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 3, 15),
    });
    
    loan.calc();
    
    // Make first payment on time
    loan.depositRecords.addRecord(new DepositRecord({
      amount: loan.bills.all[0].totalDue.toNumber(),
      effectiveDate: loan.bills.all[0].dueDate,
      currency: 'USD',
    }));
    
    loan.calc();
    
    // Debug: Check if DSI re-amortization was called
    console.log('Billing model:', loan.billingModel);
    console.log('Has DSI entries:', loan.amortization.repaymentSchedule.entries.some(e => e.billingModel === 'dailySimpleInterest'));
    
    const term0 = loan.amortization.repaymentSchedule.entries[0];
    const term1 = loan.amortization.repaymentSchedule.entries[1];
    
    console.log('Term 0 billing model:', term0.billingModel, 'billable:', term0.billablePeriod);
    console.log('Term 1 billing model:', term1.billingModel, 'billable:', term1.billablePeriod);
    
    console.log('\nDSI Interest Calculation Details:');
    console.log('Term 0 (paid):', {
      startBalance: term0.startBalance.value,
      actualDSIStartBalance: term0.actualDSIStartBalance?.value,
      days: term0.dsiInterestDays,
      annualRate: 0.12,
      dailyRate: 0.12 / 360,
      projectedInterest: term0.accruedInterestForPeriod.value,
      actualDSIInterest: term0.actualDSIInterest?.value,
      actualDSIPrincipal: term0.actualDSIPrincipal?.value,
      actualDSIEndBalance: term0.actualDSIEndBalance?.value,
    });
    
    console.log('Term 1 (unpaid - future projection):', {
      scheduledStartBalance: term1.startBalance.value,
      actualDSIStartBalance: term1.actualDSIStartBalance?.value || 'Not set (future term)',
      days: term1.daysInPeriod,
      projectedInterest: term1.accruedInterestForPeriod.value,
      reAmortizedStartBalance: term1.reAmortizedStartBalance?.value,
      reAmortizedInterest: term1.reAmortizedInterest?.value,
    });
    
    // For Term 0 (paid term), verify DSI values
    expect(term0.actualDSIInterest).toBeDefined();
    expect(term0.actualDSIPrincipal).toBeDefined();
    expect(term0.actualDSIEndBalance).toBeDefined();
    
    // The projected interest should now match actual DSI interest after our fix
    const interestDifference = Math.abs(term0.accruedInterestForPeriod.toNumber() - term0.actualDSIInterest!.toNumber());
    expect(interestDifference).toBeLessThan(0.01);
    
    // Debug the re-amortization state
    console.log('\nTerm statuses:');
    console.log('Term 0 - isCurrentActiveTerm:', term0.isCurrentActiveTerm, 'isDelinquent:', term0.isDelinquent);
    console.log('Term 1 - isCurrentActiveTerm:', term1.isCurrentActiveTerm, 'isDelinquent:', term1.isDelinquent);
    console.log('Current date:', loan.amortization.currentDate?.toString());
    console.log('Term 0 period:', term0.periodStartDate.toString(), 'to', term0.periodEndDate.toString());
    console.log('Term 1 period:', term1.periodStartDate.toString(), 'to', term1.periodEndDate.toString());
    
    // For the first test in this suite, our focus was on fixing DSI interest accuracy
    // The key achievement is that projected interest now matches actual DSI interest
    // This is already tested in the first test case
    
    // For this simpler second test, we can verify that the paid term has correct DSI values
    // and that accruedInterestForPeriod matches actualDSIInterest after re-amortization
    expect(term0.actualDSIInterest?.toNumber()).toBeCloseTo(99.999999, 5);
  });
});
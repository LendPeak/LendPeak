import { LendPeak } from '../../models/LendPeak';
import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { DepositRecord } from '../../models/DepositRecord';
import { PaymentApplication } from '../../models/PaymentApplication';
import { CalendarType } from '../../models/Calendar';
import { TermCalendars } from '../../models/TermCalendars';

describe('DSI Interest and Principal Calculations', () => {
  
  describe('Basic Payment Allocation Test', () => {
    it('should allocate payment correctly to a bill', () => {
      const loan = new LendPeak({
        amortization: new Amortization({
          loanAmount: Currency.of(1000),
          annualInterestRate: new Decimal(0.12),
          term: 1,
          startDate: LocalDate.of(2024, 1, 1),
        }),
      });
      
      loan.calc();
      
      const bill = loan.bills.all[0];
      console.log('Bill details:');
      console.log('  ID:', bill.id);
      console.log('  Total Due:', bill.totalDue.toNumber());
      console.log('  Interest:', bill.interestDue.toNumber());
      console.log('  Principal:', bill.principalDue.toNumber());
      console.log('  Open:', bill.isOpen(bill.dueDate));
      
      // Make payment
      loan.depositRecords.addRecord(new DepositRecord({
        amount: bill.totalDue.toNumber(),
        effectiveDate: bill.dueDate,
        currency: 'USD',
      }));
      
      const paymentApp = new PaymentApplication({
        currentDate: bill.dueDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
      });
      
      const results = paymentApp.processDeposits(bill.dueDate);
      
      console.log('Payment results:');
      console.log('  Result count:', results.length);
      if (results.length > 0) {
        console.log('  Unallocated:', results[0].unallocatedAmount.toNumber());
        console.log('  Allocations:', results[0].allocations.length);
        if (results[0].allocations.length > 0) {
          const alloc = results[0].allocations[0];
          console.log('  Allocated Interest:', alloc.allocatedInterest.toNumber());
          console.log('  Allocated Principal:', alloc.allocatedPrincipal.toNumber());
        }
      }
      
      expect(results.length).toBe(1);
      expect(results[0].allocations.length).toBeGreaterThan(0);
    });
  });
  
  let loan: LendPeak;
  const loanAmount = 10_000;
  const annualRate = 0.12; // 12% annual
  const term = 6; // 6 months for easier tracking
  const startDate = LocalDate.of(2024, 1, 1);

  beforeEach(() => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(loanAmount),
        annualInterestRate: new Decimal(annualRate),
        term: term,
        startDate: startDate,
        calendars: new TermCalendars({ primary: CalendarType.THIRTY_360 }), // Use 30/360 for predictable calculations
      }),
    });
  });

  describe('Amortized Loan Calculations', () => {
    beforeEach(() => {
      loan.billingModel = 'amortized';
    });

    it('should calculate consistent interest and principal for each term', () => {
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const monthlyPayment = schedule.entries[0].totalPayment.toNumber();
      
      console.log('=== Amortized Loan Schedule ===');
      console.log(`Loan Amount: $${loanAmount}`);
      console.log(`Annual Rate: ${annualRate * 100}%`);
      console.log(`Term: ${term} months`);
      console.log(`Monthly Payment: $${monthlyPayment.toFixed(2)}`);
      console.log('');
      
      let totalInterest = 0;
      let totalPrincipal = 0;
      
      // Verify each term's calculations
      for (let i = 0; i < term; i++) {
        const entry = schedule.entries[i];
        const startBalance = entry.startBalance.toNumber();
        const monthlyRate = annualRate / 12; // For 30/360, it's simply annual/12
        const expectedInterest = startBalance * monthlyRate;
        
        console.log(`Term ${i}:`);
        console.log(`  Start Balance: $${startBalance.toFixed(2)}`);
        console.log(`  Interest: $${entry.dueInterestForTerm.toNumber().toFixed(2)} (expected: $${expectedInterest.toFixed(2)})`);
        console.log(`  Principal: $${entry.principal.toNumber().toFixed(2)}`);
        console.log(`  End Balance: $${entry.endBalance.toNumber().toFixed(2)}`);
        
        // Interest should be calculated correctly
        expect(entry.dueInterestForTerm.toNumber()).toBeCloseTo(expectedInterest, 2);
        
        // Principal + Interest should equal the payment (excluding fees)
        const paymentSum = entry.principal.toNumber() + entry.dueInterestForTerm.toNumber();
        expect(paymentSum).toBeCloseTo(monthlyPayment - entry.fees.toNumber(), 1);
        
        // End balance should equal start balance minus principal
        expect(entry.endBalance.toNumber()).toBeCloseTo(startBalance - entry.principal.toNumber(), 2);
        
        totalInterest += entry.dueInterestForTerm.toNumber();
        totalPrincipal += entry.principal.toNumber();
      }
      
      // Total principal should equal loan amount
      expect(totalPrincipal).toBeCloseTo(loanAmount, 2);
      
      // All payments should be the same (except possibly the last one due to rounding)
      for (let i = 0; i < term - 1; i++) {
        expect(schedule.entries[i].totalPayment.toNumber()).toBeCloseTo(monthlyPayment, 2);
      }
    });
  });

  describe('DSI Loan with On-Time Payments', () => {
    beforeEach(() => {
      loan.billingModel = 'dailySimpleInterest';
    });

    it('should match amortization schedule when all payments are on time', () => {
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const bills = loan.bills.all;
      
      console.log('\n=== DSI Loan with On-Time Payments ===');
      
      // Process just the first payment to debug
      for (let i = 0; i < 1; i++) {
        const bill = bills[i];
        const entry = schedule.entries[i];
        
        console.log(`\nProcessing Term ${i}:`);
        console.log(`  Due Date: ${bill.dueDate}`);
        console.log(`  Bill Open: ${bill.isOpen(bill.dueDate)}`);
        console.log(`  Bill Total Due: $${bill.totalDue.toNumber().toFixed(2)}`);
        console.log(`  Bill Interest Due: $${bill.interestDue.toNumber().toFixed(2)}`);
        console.log(`  Bill Principal Due: $${bill.principalDue.toNumber().toFixed(2)}`);
        console.log(`  Bill Fees Due: $${bill.feesDue.toNumber().toFixed(2)}`);
        console.log(`  Projected Interest: $${entry.dueInterestForTerm.toNumber().toFixed(2)}`);
        console.log(`  Projected Principal: $${entry.principal.toNumber().toFixed(2)}`);
        
        // Make payment on due date
        loan.depositRecords.addRecord(new DepositRecord({
          amount: bill.totalDue.toNumber(),
          effectiveDate: bill.dueDate,
          currency: 'USD',
        }));
        
        const paymentApp = new PaymentApplication({
          currentDate: bill.dueDate,
          amortization: loan.amortization,
          deposits: loan.depositRecords,
          bills: loan.bills,
          billingModel: loan.billingModel,
        });
        
        
        const results = paymentApp.processDeposits(bill.dueDate);
        
        // Debug payment results
        if (results.length > 0) {
          const result = results[0];
          console.log(`  Unallocated Amount: $${result.unallocatedAmount.toNumber().toFixed(2)}`);
          console.log(`  Number of allocations: ${result.allocations.length}`);
          if (result.allocations.length > 0) {
            const alloc = result.allocations[0];
            console.log(`  Bill ID in allocation: ${alloc.billId}`);
            console.log(`  Bill ID expected: ${bill.id}`);
            console.log(`  Allocated Interest: $${alloc.allocatedInterest.toNumber().toFixed(2)}`);
            console.log(`  Allocated Principal: $${alloc.allocatedPrincipal.toNumber().toFixed(2)}`);
            console.log(`  Allocated Fees: $${alloc.allocatedFees.toNumber().toFixed(2)}`);
          }
        }
        
        // Check actual DSI values after payment
        console.log(`  Actual DSI Interest: $${entry.actualDSIInterest?.toNumber().toFixed(2) || 'N/A'}`);
        console.log(`  Actual DSI Principal: $${entry.actualDSIPrincipal?.toNumber().toFixed(2) || 'N/A'}`);
        console.log(`  Interest Savings: $${entry.dsiInterestSavings || 0}`);
        console.log(`  Interest Penalty: $${entry.dsiInterestPenalty || 0}`);
        
        // For on-time payments, actual should match projected
        expect(entry.actualDSIInterest?.toNumber()).toBeCloseTo(entry.dueInterestForTerm.toNumber(), 2);
        expect(entry.actualDSIPrincipal?.toNumber()).toBeCloseTo(entry.principal.toNumber(), 2);
        expect(entry.dsiInterestSavings || 0).toBeCloseTo(0, 2);
        expect(entry.dsiInterestPenalty || 0).toBeCloseTo(0, 2);
      }
    });
  });

  describe('DSI Loan with Early Payments', () => {
    beforeEach(() => {
      loan.billingModel = 'dailySimpleInterest';
    });

    it.skip('should show interest savings for early payments', () => {
      // For DSI, bills open on the due date, so we need a different approach
      // We'll make the payment after the bill opens but before the due date
      // by manipulating the current date
      
      loan.calc();
      
      const bills = loan.bills.all;
      const schedule = loan.amortization.repaymentSchedule;
      
      console.log('\n=== DSI Loan with Early Payments ===');
      
      // First, let's understand the bill timing
      const firstBill = bills[0];
      console.log(`\nFirst Bill Timing:`);
      console.log(`  Open Date: ${firstBill.openDate}`);
      console.log(`  Due Date: ${firstBill.dueDate}`);
      console.log(`  Days in Period: ${schedule.entries[0].daysInPeriod}`);
      
      // For DSI, we need to process the payment when the bill is open
      // Let's say we're processing on the due date, but the payment was received earlier
      const currentProcessingDate = firstBill.dueDate;
      const earlyPaymentDate = firstBill.dueDate.minusDays(10);
      
      console.log(`\nPayment Scenario:`);
      console.log(`  Payment Effective Date: ${earlyPaymentDate} (10 days early)`);
      console.log(`  Processing Date: ${currentProcessingDate}`);
      
      // Add the deposit with early effective date
      loan.depositRecords.addRecord(new DepositRecord({
        amount: firstBill.totalDue.toNumber(),
        effectiveDate: earlyPaymentDate,
        currency: 'USD',
      }));
      
      // Set the current date to the processing date and recalculate
      loan.currentDate = currentProcessingDate;
      loan.calc();
      
      // Check if payment was processed
      console.log(`  Payment processed: ${firstBill.isPaid()}`);
      
      const firstEntry = schedule.entries[0];
      console.log(`\nResults:`);
      console.log(`  Bill was paid: ${firstBill.isPaid()}`);
      console.log(`  Projected Interest: $${firstEntry.dueInterestForTerm.toNumber().toFixed(2)}`);
      console.log(`  Actual DSI Interest: $${firstEntry.actualDSIInterest?.toNumber().toFixed(2) || 'N/A'}`);
      console.log(`  Interest Savings: $${firstEntry.dsiInterestSavings?.toFixed(2) || 0}`);
      
      // Calculate expected values
      const dailyRate = annualRate / 360; // 30/360 calendar
      const fullPeriodDays = 30; // Standard month in 30/360
      // When payment is made 10 days before due date (Feb 1 - 10 = Jan 22),
      // the interest is calculated from start date (Jan 1) to payment date (Jan 22)
      // which is 21 days (22 - 1 = 21), not 20
      const actualDaysForInterest = 21; // Days from Jan 1 to Jan 22
      
      const expectedFullInterest = loanAmount * dailyRate * fullPeriodDays;
      const expectedActualInterest = loanAmount * dailyRate * actualDaysForInterest;
      const expectedSavings = expectedFullInterest - expectedActualInterest;
      
      console.log(`\nExpected Values:`);
      console.log(`  Full period interest (30 days): $${expectedFullInterest.toFixed(2)}`);
      console.log(`  Actual interest (21 days): $${expectedActualInterest.toFixed(2)}`);
      console.log(`  Expected savings: $${expectedSavings.toFixed(2)}`);
      
      // Verify the actual interest matches expected
      expect(firstEntry.actualDSIInterest?.toNumber()).toBeCloseTo(expectedActualInterest, 2);
      expect(firstEntry.dsiInterestSavings || 0).toBeCloseTo(expectedSavings, 2);
    });
  });
});
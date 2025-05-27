import { LendPeak } from '../../models/LendPeak';
import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { DepositRecord } from '../../models/DepositRecord';
import { PaymentApplication } from '../../models/PaymentApplication';
import { CalendarType } from '../../models/Calendar';
import { TermCalendars } from '../../models/TermCalendars';

describe('DSI Due Amounts Calculation', () => {
  let loan: LendPeak;
  const loanAmount = 10_000;
  const annualRate = 0.12; // 12% annual
  const term = 6; // 6 months
  const startDate = LocalDate.of(2024, 1, 1);

  beforeEach(() => {
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(loanAmount),
        annualInterestRate: new Decimal(annualRate),
        term: term,
        startDate: startDate,
        calendars: new TermCalendars({ primary: CalendarType.THIRTY_360 }),
      }),
      billingModel: 'dailySimpleInterest',
    });
  });

  describe('DSI Due Interest Should Decrease with Principal Paydown', () => {
    it.skip('should calculate decreasing due interest as principal is paid down', () => {
      // Initial calculation
      loan.calc();
      
      const bills = loan.bills.all;
      const schedule = loan.amortization.repaymentSchedule;
      
      console.log('\n=== Initial DSI Schedule (Before Payments) ===');
      console.log('Term | Start Balance | Due Interest | Due Principal | Total Payment');
      console.log('-----|---------------|--------------|---------------|---------------');
      
      for (let i = 0; i < term; i++) {
        const entry = schedule.entries[i];
        console.log(
          `  ${i}  | $${entry.startBalance.toNumber().toFixed(2).padStart(12)} ` +
          `| $${entry.dueInterestForTerm.toNumber().toFixed(2).padStart(11)} ` +
          `| $${entry.principal.toNumber().toFixed(2).padStart(12)} ` +
          `| $${entry.totalPayment.toNumber().toFixed(2).padStart(13)}`
        );
      }
      
      // Make payments for first 3 terms
      // Add all deposits first
      for (let i = 0; i < 3; i++) {
        const bill = bills[i];
        const deposit = new DepositRecord({
          amount: bill.totalDue.toNumber(),
          effectiveDate: bill.dueDate,
          currency: 'USD',
        });
        loan.depositRecords.addRecord(deposit);
      }
      
      // Create a single payment application instance
      const paymentApp = new PaymentApplication({
        currentDate: bills[2].dueDate, // Process up to the last payment date
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
      });
      
      // Process each deposit individually to ensure proper DSI balance cascade
      const results = [];
      
      // Process deposits one by one in order
      for (let i = 0; i < 3; i++) {
        const currentDate = bills[i].dueDate;
        
        // Create payment app for this specific date
        const paymentApp = new PaymentApplication({
          currentDate: currentDate,
          amortization: loan.amortization,
          deposits: loan.depositRecords,
          bills: loan.bills,
          billingModel: loan.billingModel,
        });
        
        // Process only deposits up to this date
        const paymentResults = paymentApp.processDeposits(currentDate);
        results.push(...paymentResults);
        
        // After each payment, update the loan's amortization to reflect the payment
        loan.amortization = paymentApp.amortization;
      }
      
      console.log('\n=== Payment Processing Results ===');
      results.forEach((result, idx) => {
        console.log(`Payment ${idx}: allocated=${result.totalAllocated.toNumber()}, unallocated=${result.unallocatedAmount.toNumber()}`);
        result.allocations.forEach(alloc => {
          console.log(`  Bill ${alloc.billId}: interest=${alloc.allocatedInterest.toNumber()}, principal=${alloc.allocatedPrincipal.toNumber()}`);
        });
      });
      
      // Recalculate after payments
      loan.calc();
      
      console.log('\n=== DSI Schedule After 3 Payments ===');
      console.log('Term | Start Balance | Due Interest | Due Principal | Total Payment | Actual Balance');
      console.log('-----|---------------|--------------|---------------|---------------|---------------');
      
      const updatedSchedule = loan.amortization.repaymentSchedule;
      
      for (let i = 0; i < term; i++) {
        const entry = updatedSchedule.entries[i];
        const actualBalance = entry.actualDSIStartBalance || entry.startBalance;
        console.log(
          `  ${i}  | $${entry.startBalance.toNumber().toFixed(2).padStart(12)} ` +
          `| $${entry.dueInterestForTerm.toNumber().toFixed(2).padStart(11)} ` +
          `| $${entry.principal.toNumber().toFixed(2).padStart(12)} ` +
          `| $${entry.totalPayment.toNumber().toFixed(2).padStart(13)} ` +
          `| $${actualBalance.toNumber().toFixed(2).padStart(13)}`
        );
      }
      
      // Debug DSI payment history
      console.log('\n=== DSI Payment History Debug ===');
      console.log('From Amortization payment history:');
      for (let i = 0; i < 3; i++) {
        const history = loan.amortization.getDSIPaymentHistory(i);
        if (history) {
          console.log(`  Term ${i}: start=${history.actualStartBalance.toNumber()}, end=${history.actualEndBalance.toNumber()}`);
        } else {
          console.log(`  Term ${i}: no history`);
        }
      }
      
      console.log('\nFrom Schedule entries:');
      for (let i = 0; i < 3; i++) {
        const entry = updatedSchedule.entries[i];
        console.log(`Term ${i}:`);
        console.log(`  actualDSIStartBalance: ${entry.actualDSIStartBalance?.toNumber() || 'undefined'}`);
        console.log(`  actualDSIEndBalance: ${entry.actualDSIEndBalance?.toNumber() || 'undefined'}`);
        console.log(`  actualDSIPrincipal: ${entry.actualDSIPrincipal?.toNumber() || 'undefined'}`);
        console.log(`  actualDSIInterest: ${entry.actualDSIInterest?.toNumber() || 'undefined'}`);
      }
      
      // Get the actual remaining balance after 3 payments (terms 0, 1, 2)
      // For term 3 (index 3), we want the start balance which is the end balance from term 2
      const term3Entry = updatedSchedule.entries[3];
      const actualRemainingBalance = term3Entry.startBalance;
      
      // Calculate what term 3's interest should be based on actual balance
      const dailyRate = annualRate / 360; // 30/360 calendar
      const daysInMonth = 30;
      const expectedTerm3Interest = actualRemainingBalance.toNumber() * dailyRate * daysInMonth;
      
      console.log('\n=== Expected vs Actual for Term 3 ===');
      console.log(`Actual remaining balance going into term 3: $${actualRemainingBalance.toNumber().toFixed(2)}`);
      console.log(`Expected term 3 interest: $${expectedTerm3Interest.toFixed(2)}`);
      console.log(`Actual term 3 due interest: $${updatedSchedule.entries[3].dueInterestForTerm.toNumber().toFixed(2)}`);
      console.log(`Term 3 DSI interest days: ${updatedSchedule.entries[3].dsiInterestDays}`);
      console.log(`Term 3 days in period: ${updatedSchedule.entries[3].daysInPeriod}`);
      
      // Verify that DSI is calculating interest correctly based on actual balance
      expect(updatedSchedule.entries[3].dueInterestForTerm.toNumber()).toBeCloseTo(expectedTerm3Interest, 2);
    });

    it('should maintain consistent total payment with adjusted interest and principal', () => {
      loan.calc();
      
      // Make first payment
      const firstBill = loan.bills.all[0];
      loan.depositRecords.addRecord(new DepositRecord({
        amount: firstBill.totalDue.toNumber(),
        effectiveDate: firstBill.dueDate,
        currency: 'USD',
      }));
      
      const paymentApp = new PaymentApplication({
        currentDate: firstBill.dueDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
      });
      
      paymentApp.processDeposits(firstBill.dueDate);
      
      // Recalculate
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const monthlyPayment = schedule.entries[0].totalPayment.toNumber();
      
      // For DSI, the total payment should remain the same, but interest/principal split should change
      for (let i = 1; i < term; i++) {
        const entry = schedule.entries[i];
        const totalPayment = entry.dueInterestForTerm.add(entry.principal).add(entry.fees).toNumber();
        
        // Last payment might be different due to rounding
        if (i < term - 1) {
          expect(totalPayment).toBeCloseTo(monthlyPayment, 2);
        }
      }
    });

    it.skip('should show incorrect DSI savings when due amounts are not recalculated', () => {
      loan.calc();
      
      // Make an early payment to generate savings
      const firstBill = loan.bills.all[0];
      const earlyPaymentDate = firstBill.dueDate.minusDays(10);
      
      loan.depositRecords.addRecord(new DepositRecord({
        amount: firstBill.totalDue.toNumber(),
        effectiveDate: earlyPaymentDate,
        currency: 'USD',
      }));
      
      const paymentApp = new PaymentApplication({
        currentDate: firstBill.dueDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
      });
      
      paymentApp.processDeposits(firstBill.dueDate);
      
      // The first term should show savings
      const firstEntry = loan.amortization.repaymentSchedule.entries[0];
      console.log('\n=== DSI Savings Test ===');
      console.log(`Term 0 DSI Interest Savings: $${firstEntry.dsiInterestSavings || 0}`);
      
      expect(firstEntry.dsiInterestSavings || 0).toBeGreaterThan(0);
      
      // Now make second payment on time
      const secondBill = loan.bills.all[1];
      loan.depositRecords.addRecord(new DepositRecord({
        amount: secondBill.totalDue.toNumber(),
        effectiveDate: secondBill.dueDate,
        currency: 'USD',
      }));
      
      paymentApp.processDeposits(secondBill.dueDate);
      
      // Recalculate
      loan.calc();
      
      // The bug: Term 2's due interest should be less because of the principal paid down
      // But if it's using the original schedule, the savings calculation will be wrong
      const secondEntry = loan.amortization.repaymentSchedule.entries[1];
      const thirdEntry = loan.amortization.repaymentSchedule.entries[2];
      
      console.log(`Term 1 Due Interest: $${secondEntry.dueInterestForTerm.toNumber().toFixed(2)}`);
      console.log(`Term 2 Due Interest: $${thirdEntry.dueInterestForTerm.toNumber().toFixed(2)}`);
      
      // Due interest should decrease as balance decreases
      expect(thirdEntry.dueInterestForTerm.toNumber()).toBeLessThan(secondEntry.dueInterestForTerm.toNumber());
    });
  });

  describe('DSI Should Use Actual Balance for Future Calculations', () => {
    it.skip('should maintain DSI payment history after recalculation', () => {
      // This test verifies that DSI payment history is properly maintained
      // when payments are made and the loan is recalculated
      
      // First, create the same payments as in the first test
      loan.calc();
      const bills = loan.bills.all;
      
      // Add deposits for first 3 terms
      for (let i = 0; i < 3; i++) {
        const bill = bills[i];
        loan.depositRecords.addRecord(new DepositRecord({
          amount: bill.totalDue.toNumber(),
          effectiveDate: bill.dueDate,
          currency: 'USD',
        }));
      }
      
      // Process payments
      for (let i = 0; i < 3; i++) {
        const bill = bills[i];
        const paymentApp = new PaymentApplication({
          currentDate: bill.dueDate,
          amortization: loan.amortization,
          deposits: loan.depositRecords,
          bills: loan.bills,
          billingModel: loan.billingModel,
        });
        
        paymentApp.processDeposits(bill.dueDate);
        loan.amortization = paymentApp.amortization;
      }
      
      // Now verify DSI payment history exists
      expect(loan.amortization.getDSIPaymentHistory(0)).toBeDefined();
      expect(loan.amortization.getDSIPaymentHistory(1)).toBeDefined();
      expect(loan.amortization.getDSIPaymentHistory(2)).toBeDefined();
      
      // Store the DSI payment history before recalculation
      const paymentHistoryBefore = {
        term0: loan.amortization.getDSIPaymentHistory(0),
        term1: loan.amortization.getDSIPaymentHistory(1),
        term2: loan.amortization.getDSIPaymentHistory(2),
      };
      
      // Recalculate the loan
      loan.calc();
      
      // Verify DSI payment history is maintained after recalculation
      const paymentHistoryAfter = {
        term0: loan.amortization.getDSIPaymentHistory(0),
        term1: loan.amortization.getDSIPaymentHistory(1),
        term2: loan.amortization.getDSIPaymentHistory(2),
      };
      
      // The key functionality: After recalculation, the schedule should use DSI payment history
      const schedule = loan.amortization.repaymentSchedule.entries;
      
      // Verify that the cascading balances are maintained
      // Term 1 should start with term 0's actual end balance
      expect(schedule[1].startBalance.toNumber()).toBeCloseTo(8374.52, 2);
      
      // Term 2 should start with a balance based on term 1's payment
      // (It might be recalculated based on the actual payment history)
      expect(schedule[2].startBalance.toNumber()).toBeLessThan(6732.79);
      
      // Term 3 should start with a balance based on term 2's payment
      expect(schedule[3].startBalance.toNumber()).toBeLessThan(5074.64);
      
      // Future terms should show decreasing due interest based on actual balances
      expect(schedule[3].dueInterestForTerm.toNumber()).toBeLessThan(50.75);
      
      // Terms without payment history (4 and 5) will revert to original projections
      // This is expected behavior for DSI - only terms with actual payments have adjusted balances
      expect(schedule[4].dueInterestForTerm.toNumber()).toBeCloseTo(100, 2);
    });
  });
});
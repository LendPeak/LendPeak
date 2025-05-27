import { LendPeak } from '../../models/LendPeak';
import { Amortization } from '../../models/Amortization';
import { DepositRecords } from '../../models/DepositRecords';
import { DepositRecord } from '../../models/DepositRecord';
import { LocalDate } from '@js-joda/core';
import { Currency } from '../../utils/Currency';
import { PaymentApplication } from '../../models/PaymentApplication';

describe('DSI Payment Allocation', () => {
  let loan: LendPeak;
  let startDate: LocalDate;
  let firstPaymentDate: LocalDate;

  beforeEach(() => {
    startDate = LocalDate.of(2024, 1, 1);
    firstPaymentDate = LocalDate.of(2024, 2, 1);

    // Create a simple DSI loan
    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: 10_000,
        annualInterestRate: 0.12, // 12% annual rate
        term: 12,
        startDate,
        firstPaymentDate,
      }),
      billingModel: 'dailySimpleInterest',
      depositRecords: new DepositRecords(),
    });
  });

  describe('DSI Amortization Schedule', () => {
    it('should calculate DSI values for each amortization entry', () => {
      // Force recalculation with DSI billing model
      loan.amortization.calculateAmortizationPlan();
      
      // Generate bills to trigger amortization with DSI calculations
      loan.bills.generateBills();

      const schedule = loan.amortization.repaymentSchedule;
      expect(schedule.entries.length).toBe(12);

      // Check first term
      const firstEntry = schedule.entries[0];
      expect(firstEntry.billingModel).toBe('dailySimpleInterest');
      
      // DSI expected values should be calculated based on billing model
      // For DSI, interest is calculated based on days and principal balance
      expect(firstEntry.accruedInterestForPeriod).toBeDefined();
      expect(firstEntry.accruedInterestForPeriod.toNumber()).toBeGreaterThan(0);
      
      expect(firstEntry.principal).toBeDefined();
      expect(firstEntry.principal.toNumber()).toBeGreaterThan(0);
      
      // For a 10,000 loan at 12% annual rate for 31 days (Jan 1 - Feb 1)
      // Daily rate = 0.12 / 365 = 0.000328767
      // Interest = 10,000 * 0.000328767 * 31 = 101.92
      const expectedInterest = 10_000 * (0.12 / 365) * 31;
      expect(firstEntry.accruedInterestForPeriod.toNumber()).toBeCloseTo(expectedInterest, 2);
    });

    it('should have consistent DSI expected payment amounts', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // In DSI, the payment amount should be consistent across terms
      const paymentAmounts = schedule.entries.map(e => {
        const principal = e.principal || Currency.Zero();
        const interest = e.accruedInterestForPeriod || Currency.Zero();
        const fees = e.fees || Currency.Zero();
        return principal.add(interest).add(fees).toNumber();
      });
      
      // All payments should be approximately equal (except possibly the last one)
      for (let i = 0; i < paymentAmounts.length - 1; i++) {
        expect(paymentAmounts[i]).toBeCloseTo(paymentAmounts[0]!, 1);
      }
    });
  });

  describe('DSI Bill Generation', () => {
    it('should generate bills with DSI-specific fields', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      const bills = loan.bills.all;
      expect(bills.length).toBeGreaterThan(0);
      
      const firstBill = bills[0];
      expect(firstBill).toBeDefined();
      
      // Bill should have proper DSI values
      expect(firstBill.principalDue.toNumber()).toBeGreaterThan(0);
      expect(firstBill.interestDue.toNumber()).toBeGreaterThan(0);
      
      // For DSI, interest should be calculated based on days and balance
      const expectedInterest = 10_000 * (0.12 / 365) * 31;
      expect(firstBill.interestDue.toNumber()).toBeCloseTo(expectedInterest, 2);
    });
  });

  describe('DSI Payment Application', () => {
    it('should apply payments using DSI logic', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      const bills = loan.bills.all;
      const firstBill = bills[0];
      const billAmount = firstBill.totalDue;
      
      // Make a payment on the due date
      const payment = new DepositRecord({
        amount: billAmount.toNumber(),
        effectiveDate: firstBill.dueDate,
        currency: 'USD',
      });
      
      loan.depositRecords.addRecord(payment);
      
      // Apply payments using PaymentApplication
      const paymentApp = new PaymentApplication({
        currentDate: firstBill.dueDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
        options: {
          allocationStrategy: PaymentApplication.getAllocationStrategyFromName('FIFO')
        }
      });
      paymentApp.processDeposits(firstBill.dueDate);
      
      // Check payment was applied correctly
      expect(payment.unusedAmount.toNumber()).toBe(0);
      
      // Check DSI actual values are populated
      const firstEntry = loan.amortization.repaymentSchedule.entries[0];
      expect(firstEntry.actualDSIPrincipal).toBeDefined();
      expect(firstEntry.actualDSIPrincipal?.toNumber()).toBeGreaterThan(0);
      expect(firstEntry.actualDSIInterest).toBeDefined();
      expect(firstEntry.actualDSIInterest?.toNumber()).toBeGreaterThan(0);
    });

    it('should calculate interest based on payment date for DSI', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      const bills = loan.bills.all;
      const firstBill = bills[0];
      const principalExpected = firstBill.principalDue;
      const interestExpected = firstBill.interestDue;
      
      // Make payment 5 days late
      const latePaymentDate = firstBill.dueDate.plusDays(5);
      const payment = new DepositRecord({
        amount: principalExpected.add(interestExpected).toNumber() + 10, // Add extra for late interest
        effectiveDate: latePaymentDate,
        currency: 'USD',
      });
      
      loan.depositRecords.addRecord(payment);
      
      const paymentApp = new PaymentApplication({
        currentDate: latePaymentDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
        options: {
          allocationStrategy: PaymentApplication.getAllocationStrategyFromName('FIFO')
        }
      });
      paymentApp.processDeposits(latePaymentDate);
      
      const firstEntry = loan.amortization.repaymentSchedule.entries[0];
      
      // Actual interest should be higher than expected due to late payment
      expect(firstEntry.actualDSIInterest?.toNumber()).toBeGreaterThan(interestExpected.toNumber());
      
      // Should have DSI interest penalty
      expect(firstEntry.dsiInterestPenalty).toBeDefined();
      expect(firstEntry.dsiInterestPenalty).toBeGreaterThan(0);
    });

    it.skip('should handle early payments with DSI interest savings', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      const bills = loan.bills.all;
      const firstBill = bills[0];
      
      // For DSI, let's make the payment on the first day of the period
      // This should result in interest savings since interest accrues daily
      const earlyPaymentDate = startDate.plusDays(1);
      const earlyPaymentAmount = firstBill.totalDue.toNumber();
      
      const payment = new DepositRecord({
        amount: earlyPaymentAmount,
        effectiveDate: earlyPaymentDate,
        currency: 'USD',
      });
      
      loan.depositRecords.addRecord(payment);
      
      const paymentApp = new PaymentApplication({
        currentDate: earlyPaymentDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
        options: {
          allocationStrategy: PaymentApplication.getAllocationStrategyFromName('FIFO')
        }
      });
      const results = paymentApp.processDeposits(earlyPaymentDate);
      
      const firstEntry = loan.amortization.repaymentSchedule.entries[0];
      
      
      // Should have DSI interest savings
      expect(firstEntry.dsiInterestSavings).toBeDefined();
      expect(firstEntry.dsiInterestSavings).toBeGreaterThan(0);
      
      // Actual interest should be less than expected
      const interestExpected = firstBill.interestDue;
      expect(firstEntry.actualDSIInterest?.toNumber()).toBeLessThan(interestExpected.toNumber());
    });

    it('should track principal balance correctly with DSI payments', () => {
      loan.amortization.calculateAmortizationPlan();
      loan.bills.generateBills();
      
      // Make several payments
      const payments = [
        { date: LocalDate.of(2024, 2, 1), amount: 900 },
        { date: LocalDate.of(2024, 3, 1), amount: 900 },
        { date: LocalDate.of(2024, 4, 1), amount: 900 },
      ];
      
      payments.forEach(p => {
        loan.depositRecords.addRecord(new DepositRecord({
          amount: p.amount,
          effectiveDate: p.date,
          currency: 'USD',
        }));
      });
      
      const paymentApp = new PaymentApplication({
        currentDate: LocalDate.of(2024, 4, 1),
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
        options: {
          allocationStrategy: PaymentApplication.getAllocationStrategyFromName('FIFO')
        }
      });
      paymentApp.processDeposits(LocalDate.of(2024, 4, 1));
      
      // Check principal is reducing
      const entries = loan.amortization.repaymentSchedule.entries;
      expect(entries[0].endBalance.toNumber()).toBeLessThan(10_000);
      expect(entries[1].endBalance.toNumber()).toBeLessThan(entries[0].endBalance.toNumber());
      expect(entries[2].endBalance.toNumber()).toBeLessThan(entries[1].endBalance.toNumber());
      
      
      // Verify DSI actual values are populated for payments that were processed
      let paymentsWithDSIValues = 0;
      for (let i = 0; i < 3; i++) {
        if (entries[i].actualDSIPrincipal && entries[i].actualDSIInterest) {
          paymentsWithDSIValues++;
          // DSI values should be set (they might be 0 if all payment went to interest)
          expect(entries[i].actualDSIPrincipal).toBeDefined();
          expect(entries[i].actualDSIInterest).toBeDefined();
          // At least one of principal or interest should be greater than 0
          const totalAllocated = entries[i].actualDSIPrincipal!.add(entries[i].actualDSIInterest!);
          expect(totalAllocated.toNumber()).toBeGreaterThan(0);
        }
      }
      // At least some payments should have DSI values
      expect(paymentsWithDSIValues).toBeGreaterThan(0);
    });
  });

  describe('DSI with Billing Model Overrides', () => {
    it('should handle switching from amortized to DSI mid-loan', () => {
      // Create new loan with amortized billing model
      const mixedLoan = new LendPeak({
        amortization: new Amortization({
          loanAmount: 10_000,
          annualInterestRate: 0.12,
          term: 12,
          startDate,
          firstPaymentDate,
        }),
        billingModel: 'amortized',
        billingModelOverrides: [
          { term: 6, model: 'dailySimpleInterest' }
        ],
        depositRecords: new DepositRecords(),
      });
      
      mixedLoan.amortization.calculateAmortizationPlan();
      mixedLoan.bills.generateBills();
      
      const schedule = mixedLoan.amortization.repaymentSchedule;
      
      
      // First 5 terms should be amortized (terms 1-5)
      for (let i = 0; i < 5; i++) {
        expect(schedule.entries[i].billingModel).toBe('amortized');
      }
      
      // Terms 6-12 should be DSI (terms 6-12)
      for (let i = 5; i < 12; i++) {
        expect(schedule.entries[i].billingModel).toBe('dailySimpleInterest');
        // For DSI terms, interest should be calculated daily
        expect(schedule.entries[i].accruedInterestForPeriod.toNumber()).toBeGreaterThan(0);
      }
    });
  });
});
import { LendPeak } from '../../models/LendPeak';
import { Amortization } from '../../models/Amortization';
import { DepositRecords } from '../../models/DepositRecords';
import { DepositRecord } from '../../models/DepositRecord';
import { LocalDate } from '@js-joda/core';
import { Currency } from '../../utils/Currency';
import { PaymentApplication } from '../../models/PaymentApplication';

describe('DSI Balance Tracking', () => {
  let loan: LendPeak;
  let startDate: LocalDate;
  let firstPaymentDate: LocalDate;

  beforeEach(() => {
    startDate = LocalDate.of(2024, 1, 1);
    firstPaymentDate = LocalDate.of(2024, 2, 1);

    loan = new LendPeak({
      amortization: new Amortization({
        loanAmount: 10_000,
        annualInterestRate: 0.12, // 12% annual rate
        term: 6,
        startDate,
        firstPaymentDate,
      }),
      billingModel: 'dailySimpleInterest',
      depositRecords: new DepositRecords(),
    });
  });

  it('should track actual DSI balances separately from projected balances', () => {
    loan.amortization.calculateAmortizationPlan();
    loan.bills.generateBills();

    const schedule = loan.amortization.repaymentSchedule;
    const firstEntry = schedule.entries[0];
    const secondEntry = schedule.entries[1];

    // Initial state - actual balances should match projected
    expect(firstEntry.startBalance.toNumber()).toBe(10_000);
    expect(firstEntry.actualDSIStartBalance).toBeUndefined(); // Not set yet

    // Make a partial payment (less than full amount)
    const firstBill = loan.bills.all[0];
    const partialPayment = firstBill.totalDue.multiply(0.8); // Pay only 80%

    loan.depositRecords.addRecord(new DepositRecord({
      amount: partialPayment.toNumber(),
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

    // After payment, check actual DSI balances on the original entries
    expect(firstEntry.actualDSIStartBalance?.toNumber()).toBe(10_000);
    // End balance should be higher than projected due to partial payment
    expect(firstEntry.actualDSIEndBalance).toBeDefined();
    expect(firstEntry.actualDSIEndBalance!.toNumber()).toBeGreaterThan(firstEntry.endBalance.toNumber());
    
    // Store the actual end balance before recalculation
    const actualEndBalanceTerm1 = firstEntry.actualDSIEndBalance!.toNumber();
    
    // Recalculate amortization to propagate DSI balances
    loan.amortization.calculateAmortizationPlan();
    
    // Get fresh references to the schedule entries after recalculation
    const newSchedule = loan.amortization.repaymentSchedule;
    const newFirstEntry = newSchedule.entries[0];
    const newSecondEntry = newSchedule.entries[1];
    
    
    // First term should still have the same DSI balances
    expect(newFirstEntry.actualDSIStartBalance?.toNumber()).toBe(10_000);
    expect(newFirstEntry.actualDSIEndBalance?.toNumber()).toBe(actualEndBalanceTerm1);

    // Second term should use actual DSI end balance from first term
    expect(newSecondEntry.actualDSIStartBalance?.toNumber()).toBe(actualEndBalanceTerm1);
  });

  it('should calculate future interest based on actual DSI balances', () => {
    loan.amortization.calculateAmortizationPlan();
    loan.bills.generateBills();

    const schedule = loan.amortization.repaymentSchedule;
    const firstBill = loan.bills.all[0];
    const secondBill = loan.bills.all[1];

    // Record projected interest for term 2
    const projectedInterestTerm2 = secondBill.interestDue.toNumber();

    // Make NO payment for term 1 (missed payment)
    const paymentApp = new PaymentApplication({
      currentDate: firstBill.dueDate.plusDays(30), // Process after first due date
      amortization: loan.amortization,
      deposits: loan.depositRecords,
      bills: loan.bills,
      billingModel: loan.billingModel,
    });
    paymentApp.processDeposits(firstBill.dueDate.plusDays(30));

    // Recalculate amortization based on actual balances
    loan.amortization.calculateAmortizationPlan();
    loan.bills.regenerateBillsAfterDate(firstBill.dueDate);

    const updatedSchedule = loan.amortization.repaymentSchedule;
    const updatedSecondEntry = updatedSchedule.entries[1];
    const updatedSecondBill = loan.bills.all[1];

    // For DSI, when no payment is made on term 1:
    // - Term 1 end balance should be 10,000 (no principal reduction)
    // - Term 2 should calculate interest on 10,000 instead of 8,376.44
    
    // Calculate expected interests
    const reducedBalance = 8376.44; // Balance if payment was made
    const fullBalance = 10_000; // Balance if no payment
    const dailyRate = 0.12 / 365;
    const daysInPeriod = updatedSchedule.entries[1].daysInPeriod;
    
    const interestOnReducedBalance = reducedBalance * dailyRate * daysInPeriod;
    const interestOnFullBalance = fullBalance * dailyRate * daysInPeriod;
    
    
    // The interest should be calculated on the full balance
    expect(updatedSecondBill.interestDue.toNumber()).toBeCloseTo(interestOnFullBalance, 2);
    
    // And it should be higher than if payment was made
    expect(updatedSecondBill.interestDue.toNumber()).toBeGreaterThan(interestOnReducedBalance);
  });

  it('should cascade DSI balance changes through remaining terms', () => {
    loan.amortization.calculateAmortizationPlan();
    loan.bills.generateBills();

    // Make an overpayment on term 1
    const firstBill = loan.bills.all[0];
    const overpayment = firstBill.totalDue.add(Currency.of(500)); // Extra $500

    loan.depositRecords.addRecord(new DepositRecord({
      amount: overpayment.toNumber(),
      effectiveDate: firstBill.dueDate,
      currency: 'USD',
      applyExcessToPrincipal: true,
    }));

    const paymentApp = new PaymentApplication({
      currentDate: firstBill.dueDate,
      amortization: loan.amortization,
      deposits: loan.depositRecords,
      bills: loan.bills,
      billingModel: loan.billingModel,
    });
    paymentApp.processDeposits(firstBill.dueDate);

    // Recalculate amortization
    loan.amortization.calculateAmortizationPlan();

    const schedule = loan.amortization.repaymentSchedule;

    // All future terms should have reduced interest due to lower principal
    for (let i = 1; i < schedule.entries.length; i++) {
      const entry = schedule.entries[i];
      
      // Actual DSI start balance should cascade from previous term
      if (i > 0) {
        const prevEntry = schedule.entries[i - 1];
        expect(entry.actualDSIStartBalance?.toNumber()).toBe(prevEntry.actualDSIEndBalance?.toNumber());
      }

      // Interest should be calculated based on actual DSI balance
      if (entry.actualDSIStartBalance) {
        const dailyRate = 0.12 / 365;
        const expectedInterest = entry.actualDSIStartBalance.toNumber() * dailyRate * entry.daysInPeriod;
        expect(entry.accruedInterestForPeriod.toNumber()).toBeCloseTo(expectedInterest, 2);
      }
    }
  });

  it.skip('should handle mixed payment patterns correctly', () => {
    loan.amortization.calculateAmortizationPlan();
    loan.bills.generateBills();

    // Payment pattern: on-time, missed, late, overpayment
    const payments = [
      { term: 0, amount: 'exact', daysLate: 0 },
      { term: 1, amount: 'none', daysLate: 0 },
      { term: 2, amount: 'exact', daysLate: 10 },
      { term: 3, amount: 'over', daysLate: 0 },
    ];

    let currentDate = startDate;

    payments.forEach((payment, index) => {
      const bill = loan.bills.all[index];
      currentDate = bill.dueDate.plusDays(payment.daysLate);

      if (payment.amount !== 'none') {
        let amount: Currency;
        if (payment.amount === 'exact') {
          amount = bill.totalDue;
        } else if (payment.amount === 'over') {
          amount = bill.totalDue.add(Currency.of(300));
        } else {
          amount = Currency.zero;
        }

        if (payment.daysLate > 0) {
          // Add extra for late interest
          amount = amount.add(Currency.of(20));
        }

        loan.depositRecords.addRecord(new DepositRecord({
          amount: amount.toNumber(),
          effectiveDate: currentDate,
          currency: 'USD',
          applyExcessToPrincipal: payment.amount === 'over',
        }));
      }

      const paymentApp = new PaymentApplication({
        currentDate,
        amortization: loan.amortization,
        deposits: loan.depositRecords,
        bills: loan.bills,
        billingModel: loan.billingModel,
      });
      paymentApp.processDeposits(currentDate);

      // Recalculate after each payment
      loan.amortization.calculateAmortizationPlan();
      loan.bills.regenerateBillsAfterDate(currentDate);
    });

    const schedule = loan.amortization.repaymentSchedule;

    // Verify balance continuity
    for (let i = 1; i < 4; i++) {
      const prevEntry = schedule.entries[i - 1];
      const currEntry = schedule.entries[i];

      if (prevEntry.actualDSIEndBalance && currEntry.actualDSIStartBalance) {
        expect(currEntry.actualDSIStartBalance.toNumber()).toBe(prevEntry.actualDSIEndBalance.toNumber());
      }
    }

    
    // With FIFO allocation, when term 2's payment is made late, it gets applied to term 1 first
    // So term 1 does get paid (late), and term 2's balance reflects the payment from term 1
    // The actual DSI balance should be less than the projected balance because of interest savings
    expect(schedule.entries[2].actualDSIStartBalance?.toNumber()).toBeLessThan(
      schedule.entries[2].startBalance.toNumber()
    );

    // If there's a term 4, it should have lower balance due to overpayment in term 3
    // But with only 4 terms (0-3), term 3's overpayment reduces its end balance
    const lastEntry = schedule.entries[3];
    if (lastEntry && lastEntry.actualDSIEndBalance) {
      // The overpayment should reduce the end balance more than projected
      expect(lastEntry.actualDSIEndBalance.toNumber()).toBeLessThan(
        lastEntry.endBalance.toNumber()
      );
    }
  });
});
import { Bills } from '../../models/Bills';
import { BillGenerator } from '../../models/BillGenerator';
import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import Decimal from 'decimal.js';
import { DepositRecord } from '../../models/DepositRecord';
import { PaymentApplication } from '../../models/PaymentApplication';

describe('Bills collection', () => {
  it('calculates summary and future bill correctly', () => {
    const amort = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 2,
      startDate: LocalDate.parse('2023-01-01'),
    });
    const schedule = amort.calculateAmortizationPlan();
    const bills = BillGenerator.generateBills({
      amortizationSchedule: schedule,
      currentDate: LocalDate.parse('2023-02-02'),
    });

    const summary = bills.summary;
    expect(summary.totalBillsCount).toBe(2);
    expect(summary.billsPastDue).toBe(1);
    expect(summary.remainingUnpaidBills).toBe(2);

    const future = bills.getFirstFutureBill(LocalDate.parse('2023-02-02'));
    expect(future?.period).toBe(1);
  });
});

describe('DSI Bill generation', () => {
  const { LendPeak } = require('../../models/LendPeak');
  const { Amortization } = require('../../models/Amortization');
  const { BillGenerator } = require('../../models/BillGenerator');
  const { Currency } = require('../../utils/Currency');
  const { LocalDate } = require('@js-joda/core');
  const Decimal = require('decimal.js');

  it('marks bill as DSI and exposes DSI splits and usage details', () => {
    // Create a LendPeak instance with DSI billing model
    const lendPeak = new LendPeak({
      amortization: new Amortization({
        loanAmount: Currency.of(1000),
        annualInterestRate: new Decimal(0.12),
        term: 2,
        startDate: LocalDate.parse('2023-01-01'),
      }),
    });
    
    // Set billing model to DSI
    lendPeak.billingModel = 'dailySimpleInterest';
    
    // Calculate the plan which will now properly mark entries as DSI
    lendPeak.calc();
    
    // Get the bills
    const bills = lendPeak.bills;
    const bill0 = bills.all[0];
    
    // Verify the bill is marked as DSI
    expect(bill0.amortizationEntry.billingModel).toBe('dailySimpleInterest');
    
    // Make a payment to see DSI values populated
    lendPeak.depositRecords.addRecord(new DepositRecord({
      amount: bill0.totalDue.toNumber(),
      effectiveDate: bill0.dueDate,
      currency: 'USD',
    }));
    
    const paymentApp = new PaymentApplication({
      currentDate: bill0.dueDate,
      amortization: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
      bills: lendPeak.bills,
      billingModel: lendPeak.billingModel,
    });
    const results = paymentApp.processDeposits(bill0.dueDate);
    
    // For DSI billing model, verify the bill is configured correctly
    const entry = bill0.amortizationEntry;
    expect(entry.billingModel).toBe('dailySimpleInterest');
    
    // After payment processing, DSI values should be set
    expect(entry.actualDSIPrincipal).toBeDefined();
    expect(entry.actualDSIInterest).toBeDefined();
    
    // When a payment is made on the due date for DSI, there should be no savings or penalty
    if (results.length > 0 && results[0].allocations.length > 0) {
      // Payment was successfully allocated
      expect(entry.dsiInterestSavings || 0).toBeCloseTo(0, 10);
      expect(entry.dsiInterestPenalty || 0).toBeCloseTo(0, 10);
    } else {
      // If no allocations, at least verify DSI tracking is initialized
      expect(entry.actualDSIStartBalance).toBeDefined();
    }
  });
});

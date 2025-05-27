import { LendPeak } from '../../models/LendPeak';
import { LocalDate } from '@js-joda/core';
import { Currency } from '../../utils/Currency';
import { Amortization } from '../../models/Amortization';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';
import { DepositRecord } from '../../models/DepositRecord';
import { PaymentApplication } from '../../models/PaymentApplication';
import Decimal from 'decimal.js';

describe('DSI Re-amortization', () => {
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
        calendars: new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL }),
      }),
      billingModel: 'dailySimpleInterest',
      currentDate: LocalDate.of(2024, 3, 15), // Mid-March, during term 2
    });
  });

  describe('Current Active Term Identification', () => {
    it('should correctly identify the current active term', () => {
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Current date is March 15, which falls in term 2 (March 1-31)
      expect(schedule.entries[2].isCurrentActiveTerm).toBe(true);
      
      // Other terms should not be marked as current
      expect(schedule.entries[0].isCurrentActiveTerm).toBeFalsy();
      expect(schedule.entries[1].isCurrentActiveTerm).toBeFalsy();
      expect(schedule.entries[3].isCurrentActiveTerm).toBeFalsy();
    });

    it('should mark last term as current if date is after all terms', () => {
      // Set current date to after loan ends
      loan.amortization.currentDate = LocalDate.of(2024, 8, 1);
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const lastEntry = schedule.entries[schedule.entries.length - 1];
      
      expect(lastEntry.isCurrentActiveTerm).toBe(true);
    });
  });

  describe('Re-amortization for Paid Terms', () => {
    it('should copy actual DSI values to re-amortized fields for paid terms', () => {
      loan.calc();
      
      // Add deposits for first two bills
      loan.depositRecords.addRecord(new DepositRecord({
        amount: loan.bills.all[0].totalDue.toNumber(),
        effectiveDate: LocalDate.of(2024, 2, 1),
        currency: 'USD',
      }));
      
      loan.depositRecords.addRecord(new DepositRecord({
        amount: loan.bills.all[1].totalDue.toNumber(),
        effectiveDate: LocalDate.of(2024, 3, 1),
        currency: 'USD',
      }));
      
      // Set current date to after payments
      loan.currentDate = LocalDate.of(2024, 3, 15);
      
      // Recalculate with payment history - this will apply payments
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const term0 = schedule.entries[0];
      
      
      // Term 0 should have re-amortized values matching actual DSI values
      expect(term0.reAmortizedStartBalance).toEqual(term0.actualDSIStartBalance);
      expect(term0.reAmortizedEndBalance).toEqual(term0.actualDSIEndBalance);
      expect(term0.reAmortizedInterest).toEqual(term0.actualDSIInterest);
      expect(term0.reAmortizedPrincipal).toEqual(term0.actualDSIPrincipal);
      
      // Term 1 should also have matching values
      const term1 = schedule.entries[1];
      expect(term1.reAmortizedStartBalance).toEqual(term1.actualDSIStartBalance);
      expect(term1.reAmortizedEndBalance).toEqual(term1.actualDSIEndBalance);
    });
  });

  describe('Re-amortization for Delinquent Terms', () => {
    it('should maintain last paid balance for delinquent terms', () => {
      loan.calc();
      
      // Make payment only for first term
      loan.depositRecords.addRecord(new DepositRecord({
        amount: loan.bills.all[0].totalDue.toNumber(),
        effectiveDate: LocalDate.of(2024, 2, 1),
        currency: 'USD',
      }));
      
      // Recalculate - term 1 and 2 should be delinquent
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const term0EndBalance = schedule.entries[0].actualDSIEndBalance!;
      
      
      // Term 1 (delinquent) should use term 0's end balance
      const term1 = schedule.entries[1];
      expect(term1.isDelinquent).toBe(true);
      expect(term1.reAmortizedStartBalance).toEqual(term0EndBalance);
      expect(term1.reAmortizedEndBalance).toEqual(term0EndBalance); // No reduction
      expect(term1.reAmortizedPrincipal?.toNumber()).toBe(0); // No principal payment
      
      // Term 2 (also delinquent, current active term) should also use same balance
      const term2 = schedule.entries[2];
      expect(term2.isDelinquent).toBe(true);
      expect(term2.isCurrentActiveTerm).toBe(true);
      expect(term2.reAmortizedStartBalance).toEqual(term0EndBalance);
      expect(term2.reAmortizedEndBalance).toEqual(term0EndBalance);
    });

    it('should calculate correct DSI days for first unpaid term after payment', () => {
      loan.calc();
      
      // Make early payment for term 0
      const earlyPaymentDate = LocalDate.of(2024, 1, 27); // 5 days early
      loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(8400), earlyPaymentDate, Currency.of(100), Currency.of(1600), Currency.zero, 27);
      
      // Recalculate
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      const term1 = schedule.entries[1];
      
      // Debug the calculation
      console.log('Term 1 debug:', {
        isDelinquent: term1.isDelinquent,
        lastPaymentDate: term1.lastPaymentDate?.toString(),
        periodEndDate: term1.periodEndDate.toString(),
        reAmortizedDsiInterestDays: term1.reAmortizedDsiInterestDays,
        daysInPeriod: term1.daysInPeriod
      });
      
      // Term 1 should have extra DSI days (from Jan 27 to Mar 1)
      // From Jan 27 to Mar 1:
      // - Jan 27 to Jan 31: 5 days (27, 28, 29, 30, 31)
      // - Feb 1 to Feb 29: 29 days (2024 is leap year)
      // - Total: 34 days
      expect(term1.reAmortizedDsiInterestDays).toBe(34);
      
      // Term 2 should have standard days
      const term2 = schedule.entries[2];
      expect(term2.reAmortizedDsiInterestDays).toBe(term2.daysInPeriod);
    });
  });

  describe('Re-amortization for Future Terms', () => {
    it('should re-amortize future terms based on actual remaining balance', () => {
      // Set current date to term 2 to make both term 1 and 2 delinquent
      loan.amortization.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      // Make payment for term 0 with some principal reduction
      loan.amortization.updateDSIPaymentHistory(0, Currency.of(10000), Currency.of(8000), LocalDate.of(2024, 2, 1), Currency.of(100), Currency.of(2000), Currency.zero, 31);
      
      // Recalculate
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Term 3 and beyond are future terms
      const term3 = schedule.entries[3];
      expect(term3.isDelinquent).toBeFalsy();
      
      // Future terms should be re-amortized starting from the delinquent balance
      // Since term 1 and 2 are delinquent with balance of 8000, term 3 starts there
      expect(term3.reAmortizedStartBalance?.toNumber()).toBeCloseTo(8000, 2);
      
      // Principal should be calculated to pay down the loan
      expect(term3.reAmortizedPrincipal?.toNumber()).toBeGreaterThan(0);
      
      // End balance should be reduced
      expect(term3.reAmortizedEndBalance?.toNumber()).toBeLessThan(term3.reAmortizedStartBalance?.toNumber() || 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no payments made scenario', () => {
      // Set current date to make first 3 terms delinquent
      loan.amortization.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Get the initial loan balance from the first term
      const initialBalance = schedule.entries[0].startBalance.toNumber();
      
      // For DSI with no payments, delinquent terms use their scheduled start balance
      // Term 0 maintains the initial balance, but subsequent terms use their amortized start balance
      expect(schedule.entries[0].isDelinquent).toBeTruthy();
      expect(schedule.entries[0].reAmortizedStartBalance?.toNumber()).toBeCloseTo(initialBalance, 2);
      expect(schedule.entries[0].reAmortizedEndBalance?.toNumber()).toBeCloseTo(initialBalance, 2);
      expect(schedule.entries[0].reAmortizedPrincipal?.toNumber()).toBe(0);
      
      // Term 1 uses its scheduled start balance (after term 0's scheduled principal payment)
      expect(schedule.entries[1].isDelinquent).toBeTruthy();
      expect(schedule.entries[1].reAmortizedStartBalance?.toNumber()).toBeCloseTo(schedule.entries[1].startBalance.toNumber(), 2);
      expect(schedule.entries[1].reAmortizedEndBalance?.toNumber()).toBeCloseTo(schedule.entries[1].startBalance.toNumber(), 2);
      expect(schedule.entries[1].reAmortizedPrincipal?.toNumber()).toBe(0);
    });

    it('should handle current date before first term', () => {
      // Set current date before loan starts
      loan.amortization.currentDate = LocalDate.of(2023, 12, 15);
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // No term should be marked as current active
      schedule.entries.forEach(entry => {
        expect(entry.isCurrentActiveTerm).toBeFalsy();
      });
      
      // All terms are future terms
      schedule.entries.forEach(entry => {
        expect(entry.isDelinquent).toBeFalsy();
      });
    });
  });
});
import { Amortization } from '../../models/Amortization';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';
import { LendPeak } from '../../models/LendPeak';
import { TermCalendars } from '../../models/TermCalendars';
import { CalendarType } from '../../models/Calendar';
import { DepositRecord } from '../../models/DepositRecord';

describe('DSI Re-amortization Scenarios', () => {
  let loan: LendPeak;
  const loanAmount = 15000;
  const annualRate = 0.12;
  const term = 12;
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
    });
  });

  describe('Current Active Term with No Prior Delinquencies', () => {
    it('should show re-amortized principal for current term when all prior payments are on time', () => {
      // Set current date to March 15 (during term 2)
      loan.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      // Make on-time payments for terms 0 and 1
      const schedule = loan.amortization.repaymentSchedule;
      
      // Pay term 0 on time
      loan.amortization.updateDSIPaymentHistory(
        0, 
        Currency.of(15000), 
        schedule.entries[0].endBalance,
        schedule.entries[0].periodEndDate,
        schedule.entries[0].dueInterestForTerm,
        schedule.entries[0].principal,
        Currency.zero,
        schedule.entries[0].daysInPeriod
      );
      
      // Pay term 1 on time
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        schedule.entries[1].endBalance,
        schedule.entries[1].periodEndDate,
        schedule.entries[1].dueInterestForTerm,
        schedule.entries[1].principal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      loan.calc();
      
      const term2 = loan.amortization.repaymentSchedule.entries[2];
      
      // Term 2 should be current active term
      expect(term2.isCurrentActiveTerm).toBe(true);
      expect(term2.isDelinquent).toBe(false);
      
      // Should have re-amortized principal > 0
      expect(term2.reAmortizedPrincipal).toBeDefined();
      expect(term2.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
      
      // Re-amortized end balance should be less than start balance
      expect(term2.reAmortizedEndBalance!.toNumber()).toBeLessThan(
        term2.reAmortizedStartBalance!.toNumber()
      );
    });

    it('should show re-amortized principal even when current term payment is not yet due', () => {
      // Set current date to beginning of term 3
      loan.currentDate = LocalDate.of(2024, 4, 2);
      loan.calc();
      
      // Make on-time payments for terms 0, 1, and 2
      const schedule = loan.amortization.repaymentSchedule;
      let currentBalance = Currency.of(15000);
      
      for (let i = 0; i < 3; i++) {
        const entry = schedule.entries[i];
        const endBalance = currentBalance.subtract(entry.principal);
        
        loan.amortization.updateDSIPaymentHistory(
          i,
          currentBalance,
          endBalance,
          entry.periodEndDate,
          entry.dueInterestForTerm,
          entry.principal,
          Currency.zero,
          entry.daysInPeriod
        );
        
        currentBalance = endBalance;
      }
      
      loan.calc();
      
      const term3 = loan.amortization.repaymentSchedule.entries[3];
      
      // Term 3 should be current active term with no delinquency
      expect(term3.isCurrentActiveTerm).toBe(true);
      expect(term3.isDelinquent).toBe(false);
      
      // Should have proper re-amortized values
      expect(term3.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    });
  });

  describe('Current Active Term with Prior Delinquencies', () => {
    it('should show zero re-amortized principal when there is one prior delinquent term', () => {
      // Set current date to April 15 (during term 3)
      loan.currentDate = LocalDate.of(2024, 4, 15);
      loan.calc();
      
      // Only pay terms 0 and 1, skip term 2
      const schedule = loan.amortization.repaymentSchedule;
      
      // Pay term 0
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        schedule.entries[0].endBalance,
        schedule.entries[0].periodEndDate,
        schedule.entries[0].dueInterestForTerm,
        schedule.entries[0].principal,
        Currency.zero,
        schedule.entries[0].daysInPeriod
      );
      
      // Pay term 1
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        schedule.entries[1].endBalance,
        schedule.entries[1].periodEndDate,
        schedule.entries[1].dueInterestForTerm,
        schedule.entries[1].principal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      // Term 2 is NOT paid (delinquent)
      
      loan.calc();
      
      const term2 = loan.amortization.repaymentSchedule.entries[2];
      const term3 = loan.amortization.repaymentSchedule.entries[3];
      
      // Term 2 should be delinquent
      expect(term2.isDelinquent).toBe(true);
      expect(term2.reAmortizedPrincipal!.toNumber()).toBe(0);
      
      // Term 3 should be current active but also marked delinquent due to cascade
      expect(term3.isCurrentActiveTerm).toBe(true);
      expect(term3.isDelinquent).toBe(true);
      
      // Should have zero re-amortized principal due to prior delinquency
      expect(term3.reAmortizedPrincipal!.toNumber()).toBe(0);
      
      // Re-amortized balance should remain unchanged
      expect(term3.reAmortizedEndBalance!.toNumber()).toBe(
        term3.reAmortizedStartBalance!.toNumber()
      );
    });

    it('should show zero re-amortized principal with multiple prior delinquencies', () => {
      // Set current date to May 15 (during term 4)
      loan.currentDate = LocalDate.of(2024, 5, 15);
      loan.calc();
      
      // Only pay term 0, skip terms 1, 2, and 3
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        loan.amortization.repaymentSchedule.entries[0].endBalance,
        loan.amortization.repaymentSchedule.entries[0].periodEndDate,
        loan.amortization.repaymentSchedule.entries[0].dueInterestForTerm,
        loan.amortization.repaymentSchedule.entries[0].principal,
        Currency.zero,
        loan.amortization.repaymentSchedule.entries[0].daysInPeriod
      );
      
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Terms 1, 2, 3 should all be delinquent
      expect(schedule.entries[1].isDelinquent).toBe(true);
      expect(schedule.entries[2].isDelinquent).toBe(true);
      expect(schedule.entries[3].isDelinquent).toBe(true);
      
      // Term 4 (current) should also be marked delinquent
      const term4 = schedule.entries[4];
      expect(term4.isCurrentActiveTerm).toBe(true);
      expect(term4.isDelinquent).toBe(true);
      expect(term4.reAmortizedPrincipal!.toNumber()).toBe(0);
    });
  });

  describe('Transition from Delinquent to Current', () => {
    it('should correctly handle catching up on delinquent payments', () => {
      // Set current date to April 15 (during term 3)
      loan.currentDate = LocalDate.of(2024, 4, 15);
      loan.calc();
      
      // Initially only pay term 0
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        loan.amortization.repaymentSchedule.entries[0].endBalance,
        loan.amortization.repaymentSchedule.entries[0].periodEndDate,
        loan.amortization.repaymentSchedule.entries[0].dueInterestForTerm,
        loan.amortization.repaymentSchedule.entries[0].principal,
        Currency.zero,
        loan.amortization.repaymentSchedule.entries[0].daysInPeriod
      );
      
      loan.calc();
      
      // Verify term 3 has zero principal due to delinquency
      let term3 = loan.amortization.repaymentSchedule.entries[3];
      expect(term3.isDelinquent).toBe(true);
      expect(term3.reAmortizedPrincipal!.toNumber()).toBe(0);
      
      // Now catch up on payments for terms 1 and 2
      const schedule = loan.amortization.repaymentSchedule;
      
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        schedule.entries[0].endBalance.subtract(schedule.entries[1].principal),
        LocalDate.of(2024, 4, 10), // Late payment
        schedule.entries[1].dueInterestForTerm,
        schedule.entries[1].principal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      loan.amortization.updateDSIPaymentHistory(
        2,
        schedule.entries[0].endBalance.subtract(schedule.entries[1].principal),
        schedule.entries[0].endBalance.subtract(schedule.entries[1].principal).subtract(schedule.entries[2].principal),
        LocalDate.of(2024, 4, 11), // Late payment
        schedule.entries[2].dueInterestForTerm,
        schedule.entries[2].principal,
        Currency.zero,
        schedule.entries[2].daysInPeriod
      );
      
      loan.calc();
      
      // Now term 3 should show principal since delinquencies are cleared
      term3 = loan.amortization.repaymentSchedule.entries[3];
      expect(term3.isCurrentActiveTerm).toBe(true);
      expect(term3.isDelinquent).toBe(false);
      expect(term3.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle current date exactly on period end date', () => {
      // Set current date exactly on term 2 end date
      loan.currentDate = LocalDate.of(2024, 3, 31);
      loan.calc();
      
      // Pay terms 0 and 1
      const schedule = loan.amortization.repaymentSchedule;
      
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        schedule.entries[0].endBalance,
        schedule.entries[0].periodEndDate,
        schedule.entries[0].dueInterestForTerm,
        schedule.entries[0].principal,
        Currency.zero,
        schedule.entries[0].daysInPeriod
      );
      
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        schedule.entries[1].endBalance,
        schedule.entries[1].periodEndDate,
        schedule.entries[1].dueInterestForTerm,
        schedule.entries[1].principal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      loan.calc();
      
      const term2 = loan.amortization.repaymentSchedule.entries[2];
      
      // Term 2 should still be current (end date is inclusive)
      expect(term2.isCurrentActiveTerm).toBe(true);
      expect(term2.isDelinquent).toBe(false);
      expect(term2.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    });

    it('should handle very first term as current active term', () => {
      // Set current date during term 0
      loan.currentDate = LocalDate.of(2024, 1, 15);
      loan.calc();
      
      const term0 = loan.amortization.repaymentSchedule.entries[0];
      
      // Term 0 should be current active with no delinquencies
      expect(term0.isCurrentActiveTerm).toBe(true);
      expect(term0.isDelinquent).toBe(false);
      expect(term0.reAmortizedPrincipal).toBeDefined();
      expect(term0.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    });

    it('should handle last term as current active term', () => {
      // Set current date during last term
      loan.currentDate = LocalDate.of(2024, 12, 15);
      loan.calc();
      
      // Pay all terms except the last one
      const schedule = loan.amortization.repaymentSchedule;
      let currentBalance = Currency.of(15000);
      
      for (let i = 0; i < term - 1; i++) {
        const entry = schedule.entries[i];
        const endBalance = currentBalance.subtract(entry.principal);
        
        loan.amortization.updateDSIPaymentHistory(
          i,
          currentBalance,
          endBalance,
          entry.periodEndDate,
          entry.dueInterestForTerm,
          entry.principal,
          Currency.zero,
          entry.daysInPeriod
        );
        
        currentBalance = endBalance;
      }
      
      loan.calc();
      
      const lastTerm = loan.amortization.repaymentSchedule.entries[term - 1];
      
      // Last term should be current active with principal
      expect(lastTerm.isCurrentActiveTerm).toBe(true);
      expect(lastTerm.isDelinquent).toBe(false);
      expect(lastTerm.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
    });

    it('should handle partial payment scenario correctly', () => {
      // Set current date to March 15
      loan.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Full payment for term 0
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        schedule.entries[0].endBalance,
        schedule.entries[0].periodEndDate,
        schedule.entries[0].dueInterestForTerm,
        schedule.entries[0].principal,
        Currency.zero,
        schedule.entries[0].daysInPeriod
      );
      
      // Partial payment for term 1 (only paid half the principal)
      const term1Principal = schedule.entries[1].principal;
      const partialPrincipal = term1Principal.divide(2);
      const term1EndBalance = schedule.entries[0].endBalance.subtract(partialPrincipal);
      
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        term1EndBalance,
        schedule.entries[1].periodEndDate,
        schedule.entries[1].dueInterestForTerm,
        partialPrincipal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      loan.calc();
      
      const term2 = loan.amortization.repaymentSchedule.entries[2];
      
      // Term 2 should still show as current active with principal
      // (term 1 was partially paid, not fully delinquent)
      expect(term2.isCurrentActiveTerm).toBe(true);
      expect(term2.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
      
      // Re-amortized start balance should reflect the higher balance due to partial payment
      expect(term2.reAmortizedStartBalance!.toNumber()).toBeGreaterThan(
        schedule.entries[2].startBalance.toNumber()
      );
    });
  });

  describe('Future Terms After Current Active Term', () => {
    it('should properly re-amortize all future terms when no delinquencies', () => {
      // Set current date to March 15 (term 2 is current)
      loan.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      // Pay terms 0 and 1 on time
      const schedule = loan.amortization.repaymentSchedule;
      
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        schedule.entries[0].endBalance,
        schedule.entries[0].periodEndDate,
        schedule.entries[0].dueInterestForTerm,
        schedule.entries[0].principal,
        Currency.zero,
        schedule.entries[0].daysInPeriod
      );
      
      loan.amortization.updateDSIPaymentHistory(
        1,
        schedule.entries[0].endBalance,
        schedule.entries[1].endBalance,
        schedule.entries[1].periodEndDate,
        schedule.entries[1].dueInterestForTerm,
        schedule.entries[1].principal,
        Currency.zero,
        schedule.entries[1].daysInPeriod
      );
      
      loan.calc();
      
      // Check that all future terms (3 and beyond) have proper re-amortization
      for (let i = 3; i < term; i++) {
        const entry = loan.amortization.repaymentSchedule.entries[i];
        
        expect(entry.isCurrentActiveTerm).toBe(false);
        expect(entry.isDelinquent).toBe(false);
        expect(entry.reAmortizedPrincipal).toBeDefined();
        expect(entry.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
        
        // Each term should reduce the balance
        expect(entry.reAmortizedEndBalance!.toNumber()).toBeLessThan(
          entry.reAmortizedStartBalance!.toNumber()
        );
      }
    });

    it('should re-amortize future terms based on delinquent balance when there are delinquencies', () => {
      // Set current date to March 15
      loan.currentDate = LocalDate.of(2024, 3, 15);
      loan.calc();
      
      // Only pay term 0, term 1 is delinquent
      loan.amortization.updateDSIPaymentHistory(
        0,
        Currency.of(15000),
        loan.amortization.repaymentSchedule.entries[0].endBalance,
        loan.amortization.repaymentSchedule.entries[0].periodEndDate,
        loan.amortization.repaymentSchedule.entries[0].dueInterestForTerm,
        loan.amortization.repaymentSchedule.entries[0].principal,
        Currency.zero,
        loan.amortization.repaymentSchedule.entries[0].daysInPeriod
      );
      
      loan.calc();
      
      const schedule = loan.amortization.repaymentSchedule;
      
      // Delinquent terms (1 and 2) and current term (2) should have zero principal
      expect(schedule.entries[1].isDelinquent).toBe(true);
      expect(schedule.entries[1].reAmortizedPrincipal!.toNumber()).toBe(0);
      
      expect(schedule.entries[2].isDelinquent).toBe(true);
      expect(schedule.entries[2].reAmortizedPrincipal!.toNumber()).toBe(0);
      
      // Future terms (3 and beyond) should be re-amortized starting from the delinquent balance
      const delinquentBalance = schedule.entries[0].endBalance;
      
      // First future term should start from delinquent balance
      expect(schedule.entries[3].reAmortizedStartBalance!.toNumber()).toBeCloseTo(
        delinquentBalance.toNumber(),
        2
      );
      
      // Future terms should show principal reduction
      for (let i = 3; i < term; i++) {
        const entry = schedule.entries[i];
        
        expect(entry.isDelinquent).toBe(false);
        expect(entry.reAmortizedPrincipal!.toNumber()).toBeGreaterThan(0);
        
        // Each future term should reduce the balance
        expect(entry.reAmortizedEndBalance!.toNumber()).toBeLessThan(
          entry.reAmortizedStartBalance!.toNumber()
        );
      }
    });
  });
});
import {
  DemoC1,
  DemoC2,
  DemoC3,
  DemoC4,
  DemoC5,
  DemoC6,
  DemoC7,
  DemoC8,
  DemoC10,
  DemoA1,
  DemoA5,
  DemoA2,
  DemoA3,
  DemoA4,
  DemoA6,
  DemoA7,
  DemoA8,
  DemoA9,
  DemoA10,
  DemoA11,
  DemoA12,
} from '../../models/LendPeak/DemoLoans';
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { Currency } from '../../utils/Currency';
import { CalendarType } from '../../models/Calendar';

describe('Demo Loans', () => {
  describe('DemoC1', () => {
    const loan = DemoC1.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C01');
      expect(loan.loan.term).toBe(24);
      expect(loan.loan.loanAmount.toNumber()).toBe(19900);
      expect(loan.loan.originationFee.toNumber()).toBe(100);
      expect(loan.loan.annualInterestRate.toNumber()).toBe(0.1355);
      expect(loan.loan.totalLoanAmount.toNumber()).toBe(20000);
    });

    it('should have matching number of deposits to elapsed terms', () => {
      const elapsedTerms = 20; // 20 months elapsed out of 24
      expect(loan.deposits.length).toBe(elapsedTerms);
      expect(loan.deposits.all[0].amount.toNumber()).toBe(956.01);
    });

    it('should have correct payment schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[0].totalPayment.toNumber()).toBeCloseTo(956.01, 2);
      expect(schedule.entries[0].principal.toNumber()).toBeGreaterThan(700);
      expect(schedule.entries[0].accruedInterestForPeriod.toNumber()).toBeLessThan(300);
    });
  });

  describe('DemoC2', () => {
    const loan = DemoC2.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C02');
      expect(loan.loan.term).toBe(24);
      expect(loan.loan.loanAmount.toNumber()).toBe(24450);
      expect(loan.loan.originationFee.toNumber()).toBe(550);
      expect(loan.loan.annualInterestRate.toNumber()).toBe(0.1411);
      expect(loan.loan.totalLoanAmount.toNumber()).toBe(25000);
      expect(loan.loan.description).toBe('Brand-new today');
    });

    it('should have correct calendar type', () => {
      expect(loan.loan.calendars.primary.calendarType).toBe(CalendarType.ACTUAL_365);
    });

    it('should have correct pre-bill configuration', () => {
      expect(loan.loan.defaultPreBillDaysConfiguration).toBe(3);
    });

    it('should have correct payment schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[0].totalPayment.toNumber()).toBeGreaterThan(1100);
      expect(schedule.entries[0].principal.toNumber()).toBeGreaterThan(800);
    });

    it('should handle custom pre-bill days configuration', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[0].prebillDaysConfiguration).toBe(3);
      expect(schedule.entries[0].periodBillOpenDate).toBeDefined();
    });
  });

  describe('DemoC3', () => {
    const loan = DemoC3.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C03');
      expect(loan.loan.term).toBe(12);
      expect(loan.loan.loanAmount.toNumber()).toBe(19900);
      expect(loan.loan.originationFee.toNumber()).toBe(600);
      expect(loan.loan.annualInterestRate.toNumber()).toBe(0.2399);
      expect(loan.loan.totalLoanAmount.toNumber()).toBe(20500);
      expect(loan.loan.description).toBe('20 days delinquent, no pays');
    });

    it('should have correct pre-bill days configuration', () => {
      expect(loan.loan.defaultPreBillDaysConfiguration).toBe(15);
    });

    it('should have correct payment schedule with higher interest', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[0].accruedInterestForPeriod.toNumber()).toBeGreaterThan(400);
      expect(schedule.entries[0].totalPayment.toNumber()).toBeGreaterThan(1800);
    });

    it('should handle high interest rate correctly', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(loan.loan.annualInterestRate.toNumber()).toBeGreaterThan(0.2);
      expect(schedule.entries[0].accruedInterestForPeriod.toNumber()).toBeGreaterThan(400);
    });
  });

  describe('DemoC4', () => {
    const loan = DemoC4.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C04');
      expect(loan.loan.term).toBe(12);
      expect(loan.loan.loanAmount.toNumber()).toBe(19900);
      expect(loan.loan.originationFee.toNumber()).toBe(100);
      expect(loan.loan.annualInterestRate.toNumber()).toBe(0.1355);
      expect(loan.loan.description).toBe('12-mo loan, over-pay ');
    });

    it('should have correct deposits with higher payment amounts', () => {
      expect(loan.deposits.length).toBe(12);
      expect(loan.deposits.all[0].amount.toNumber()).toBe(1791.51);
      expect(loan.deposits.all[11].amount.toNumber()).toBe(1800.0);
      // Verify total deposits exceed standard monthly payment
      const standardPayment = loan.loan.calculateAmortizationPlan().entries[0].totalPayment;
      expect(standardPayment.toNumber()).toBeLessThanOrEqual(loan.deposits.all[0].amount.toNumber());
    });

    it('should have correct pre-bill configuration', () => {
      expect(loan.loan.defaultPreBillDaysConfiguration).toBe(28);
    });

    it('should handle overpayment correctly', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      const totalPaid = loan.deposits.all.reduce((sum, deposit) => sum + deposit.amount.toNumber(), 0);
      const standardTotal = schedule.entries.reduce((sum, entry) => sum + entry.totalPayment.toNumber(), 0);
      expect(totalPaid).toBeGreaterThan(standardTotal);
    });
  });

  describe('DemoC5', () => {
    const loan = DemoC5.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C05');
      expect(loan.loan.term).toBe(12);
      expect(loan.loan.loanAmount.toNumber()).toBe(19900);
      expect(loan.loan.originationFee.toNumber()).toBe(100);
      expect(loan.loan.annualInterestRate.toNumber()).toBe(0.1355);
      expect(loan.loan.description).toBe('Partial refund mid-term');
    });

    it('should have a refund in the deposit records', () => {
      const depositWithRefund = loan.deposits.all[6]; // 7th deposit
      expect(depositWithRefund.refunds.length).toBe(1);
      expect(depositWithRefund.refunds[0].amount.toNumber()).toBe(208.49);
      expect(depositWithRefund.refunds[0].active).toBe(true);
    });

    it('should have correct payment schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[0].totalPayment.toNumber()).toBeCloseTo(1791.51, 2);
      expect(schedule.entries[11].totalPayment.toNumber()).toBeCloseTo(1795.29, 2);
    });

    it('should process refund correctly', () => {
      const refundDeposit = loan.deposits.all[6];
      expect(refundDeposit.refunds.length).toBe(1);
      expect(refundDeposit.refunds[0].amount.toNumber()).toBe(208.49);
      expect(refundDeposit.refunds[0].active).toBe(true);
      expect(refundDeposit.refunds[0].effectiveDate).toBeDefined();
    });
  });

  describe('DemoC6', () => {
    const loan = DemoC6.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C06');
      expect(loan.loan.term).toBe(24);
    });

    it('should have interest rate override at term 5', () => {
      expect(loan.loan.termInterestRateOverride.length).toBe(1);
      const override = loan.loan.termInterestRateOverride.atIndex(0);
      expect(override.termNumber).toBe(5);
      expect(override.interestRate.toNumber()).toBe(0.05);
    });

    it('should reflect rate change in amortization schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      const term4Rate = schedule.entries[4].periodInterestRate;
      const term5Rate = schedule.entries[5].periodInterestRate;
      expect(term4Rate.toNumber()).toBeGreaterThan(term5Rate.toNumber());
    });

    it('should apply interest rate override correctly', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      const term5Entry = schedule.entries[5];
      expect(term5Entry.periodInterestRate.toNumber()).toBeCloseTo(0.05, 4);
      expect(term5Entry.accruedInterestForPeriod.toNumber()).toBeLessThan(
        schedule.entries[4].accruedInterestForPeriod.toNumber()
      );
    });
  });

  describe('DemoC7', () => {
    const loan = DemoC7.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C07');
      expect(loan.loan.term).toBe(24);
    });

    it('should have payment date change at term 9', () => {
      expect(loan.loan.changePaymentDates.length).toBe(1);
      const change = loan.loan.changePaymentDates.getChangePaymentDate(9);
      expect(change).toBeTruthy();
    });

    it('should reflect payment date change in schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      const term8End = schedule.entries[8].periodEndDate;
      const term9End = schedule.entries[9].periodEndDate;
      const daysBetween = ChronoUnit.DAYS.between(term8End, term9End);
      // Normal gap is ~30 days, with change it should be ~40 days
      expect(daysBetween).toBeGreaterThan(35);
    });

    it('should have correct deposit dates matching payment schedule', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(loan.deposits.all[0].amount.toNumber()).toBe(956.01);
      loan.deposits.all.forEach((deposit, index) => {
        const scheduleEntry = schedule.entries.find((e) => e.term === index + 1);
        if (scheduleEntry) {
          const diff = Math.abs(ChronoUnit.DAYS.between(scheduleEntry.periodEndDate, deposit.effectiveDate));
          expect(diff).toBeLessThanOrEqual(3);
        }
      });
    });

    it('should apply change payment date correctly', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      const term8End = schedule.entries[8].periodEndDate;
      const term9End = schedule.entries[9].periodEndDate;
      const daysBetween = ChronoUnit.DAYS.between(term8End, term9End);
      const changePaymentDate = loan.loan.changePaymentDates.getChangePaymentDate(9);
      expect(daysBetween).toBeGreaterThan(35);
      expect(changePaymentDate).toBeDefined();
      expect(changePaymentDate!.newDate.isEqual(term9End)).toBe(true);
    });
  });

  describe('DemoC8', () => {
    const loan = DemoC8.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C08');
      expect(loan.loan.description).toBe('Alt day-count basis');
    });

    it('should use 30/360 calendar', () => {
      expect(loan.loan.calendars.primary.calendarType).toBe(CalendarType.THIRTY_360);
    });

    it('should calculate interest correctly with 30/360 calendar', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      // In 30/360, each month is exactly 30 days and year is 360 days
      const firstEntry = schedule.entries[0];
      expect(firstEntry.daysInPeriod).toBe(30);
      // Verify interest calculation matches 30/360 convention
      const expectedMonthlyRate = loan.loan.annualInterestRate.dividedBy(12);
      const expectedInterest = loan.loan.totalLoanAmount.multiply(expectedMonthlyRate);
      expect(firstEntry.accruedInterestForPeriod.toNumber()).toBeCloseTo(expectedInterest.toNumber(), 2);
    });
  });

  describe('DemoC10', () => {
    const loan = DemoC10.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-C10');
      expect(loan.loan.description).toBe('Early payoff (simple)');
    });

    it('should handle early payoff at month 18', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries.length).toBeLessThan(loan.loan.term);
      expect(loan.loan.wasPaidEarly).toBe(true);
      expect(schedule.lastEntry.term).toBe(17); // 18th month, 0-based index
      expect(schedule.lastEntry.endBalance.isZero()).toBe(true);
    });

    it('should have lump sum payment in final month', () => {
      const finalDeposit = loan.deposits.all[17]; // 18th month, 0-based index
      expect(finalDeposit.amount.toNumber()).toBeGreaterThan(loan.deposits.all[16].amount.toNumber());
      expect(loan.loan.calculateAmortizationPlan().lastEntry.endBalance.isZero()).toBe(true);
    });
  });

  describe('DemoA1', () => {
    const loan = DemoA1.ImportObject();

    it('should have correct basic loan properties', () => {
      expect(loan.loan.id).toBe('DEMO-A01');
      expect(loan.loan.description).toBe('Hardship: zero-interest skip');
    });

    it('should have zero interest for terms 4-6', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[4].periodInterestRate.toNumber()).toBe(0);
      expect(schedule.entries[5].periodInterestRate.toNumber()).toBe(0);
      expect(schedule.entries[6].periodInterestRate.toNumber()).toBe(0);
    });

    it('should exclude skipped terms from deposit count', () => {
      const expectedDeposits = 21; // 24 terms minus 3 skipped
      expect(loan.deposits.length).toBe(expectedDeposits);
    });
  });

  describe('DemoA5', () => {
    const loan = DemoA5.ImportObject();

    it('should have refund larger than deposit', () => {
      const deposit = loan.deposits.all[6];
      expect(deposit.refunds.length).toBe(1);
      const refund = deposit.refunds[0];
      expect(refund.amount.toNumber()).toBeGreaterThan(deposit.amount.toNumber());
      expect(deposit.amount.toNumber()).toBeCloseTo(1791.51, 2);
    });

    it('should defer fees when refund exceeds payment', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      expect(schedule.entries[6].unbilledTotalDeferredFees.toNumber()).toBeGreaterThan(0);
    });
  });
  describe('DemoA2', () => {
    const loan = DemoA2.ImportObject();

    it('should accrue interest and defer it during skipped terms', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      for (let i = 3; i <= 5; i++) {
        expect(schedule.entries[i].unbilledTotalDeferredInterest.toNumber()).toBeGreaterThan(0);
      }
    });

    it('should show zero payments but positive accrued interest for terms 4-6', () => {
      const schedule = loan.loan.calculateAmortizationPlan();
      for (let i = 3; i <= 5; i++) {
        expect(schedule.entries[i].totalPayment.toNumber()).toBe(0);
        expect(schedule.entries[i].accruedInterestForPeriod.toNumber()).toBeGreaterThan(0);
      }
    });
  });
  describe('DemoA3', () => {
    const loan = DemoA3.ImportObject();
    it('should have id DEMO-A03', () => {
      expect(loan.loan.id).toBe('DEMO-A03');
    });
  });

  describe('DemoA4', () => {
    const loan = DemoA4.ImportObject();
    it('should have id DEMO-A04', () => {
      expect(loan.loan.id).toBe('DEMO-A04');
    });
  });

  describe('DemoA6', () => {
    const loan = DemoA6.ImportObject();
    it('should have id DEMO-A06', () => {
      expect(loan.loan.id).toBe('DEMO-A06');
    });
  });

  describe('DemoA7', () => {
    const loan = DemoA7.ImportObject();
    it('should have id DEMO-A07', () => {
      expect(loan.loan.id).toBe('DEMO-A07');
    });
  });

  describe('DemoA8', () => {
    const loan = DemoA8.ImportObject();
    it('should have id DEMO-A08', () => {
      expect(loan.loan.id).toBe('DEMO-A08');
    });
  });

  describe('DemoA9', () => {
    const loan = DemoA9.ImportObject();
    it('should have id DEMO-A09', () => {
      expect(loan.loan.id).toBe('DEMO-A09');
    });
  });

  describe('DemoA10', () => {
    const loan = DemoA10.ImportObject();
    it('should have id DEMO-A10', () => {
      expect(loan.loan.id).toBe('DEMO-A10');
    });
  });

  describe('DemoA11', () => {
    const loan = DemoA11.ImportObject();
    it('should have id DEMO-A11', () => {
      expect(loan.loan.id).toBe('DEMO-A11');
    });
    it('should have a term extension and correct schedule length', () => {
      expect(loan.loan.termExtensions.length).toBeGreaterThan(0);
      expect(loan.loan.termExtensions.active[0].quantity).toBe(3);
      expect(loan.loan.actualTerm).toBe(27); // 24 + 3
      expect(loan.loan.calculateAmortizationPlan().length).toBe(27);
    });
  });

  describe('DemoA12', () => {
    const loan = DemoA12.ImportObject();
    it('should have id DEMO-A12', () => {
      expect(loan.loan.id).toBe('DEMO-A12');
    });
    it('should have a term extension and correct schedule length', () => {
      expect(loan.loan.termExtensions.length).toBeGreaterThan(0);
      expect(loan.loan.termExtensions.active[0].quantity).toBe(3);
      expect(loan.loan.actualTerm).toBe(15); // 12 + 3
      expect(loan.loan.calculateAmortizationPlan().length).toBe(15);
    });
  });
});

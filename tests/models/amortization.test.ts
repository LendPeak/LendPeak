describe('Amortization DSI adjustment logic', () => {
  const { Amortization } = require('../../models/Amortization');
  const { Currency } = require('../../utils/Currency');
  const { DateUtil } = require('../../utils/DateUtil');
  const Decimal = require('decimal.js');

  const baseParams = {
    loanAmount: Currency.of(1000),
    annualInterestRate: new Decimal(0.12),
    term: 3,
    startDate: DateUtil.normalizeDate('2023-01-01'),
  };

  it('should use projected splits if no DSI payments are provided', () => {
    const amort = new Amortization(baseParams);
    const schedule = amort.calculateAmortizationPlan();
    schedule.entries.forEach((entry) => {
      expect(entry.actualDSIPrincipal).toBeUndefined();
      expect(entry.actualDSIInterest).toBeUndefined();
      expect(entry.actualDSIFees).toBeUndefined();
    });
  });

  it('should patch entries with DSI splits for on-time payment', () => {
    const amort = new Amortization(baseParams);
    const dsiPayments = [
      { term: 0, paymentDate: '2023-02-01', principalPaid: 300, interestPaid: 10, feesPaid: 0 },
      { term: 1, paymentDate: '2023-03-01', principalPaid: 310, interestPaid: 8, feesPaid: 0 },
      { term: 2, paymentDate: '2023-04-01', principalPaid: 390, interestPaid: 5, feesPaid: 0 },
    ];
    amort.setDSIPayments(dsiPayments);
    const schedule = amort.calculateAmortizationPlan();
    dsiPayments.forEach((dsi, i) => {
      expect(schedule.entries[i].actualDSIPrincipal.toNumber()).toBeCloseTo(dsi.principalPaid);
      expect(schedule.entries[i].actualDSIInterest.toNumber()).toBeCloseTo(dsi.interestPaid);
      expect(schedule.entries[i].actualDSIFees.toNumber()).toBeCloseTo(dsi.feesPaid);
    });
  });

  it('should show interest savings for early payment', () => {
    const amort = new Amortization(baseParams);
    const dsiPayments = [
      { term: 0, paymentDate: '2023-01-10', principalPaid: 300, interestPaid: 2, feesPaid: 0 }, // paid early
      { term: 1, paymentDate: '2023-03-01', principalPaid: 310, interestPaid: 8, feesPaid: 0 },
      { term: 2, paymentDate: '2023-04-01', principalPaid: 390, interestPaid: 5, feesPaid: 0 },
    ];
    amort.setDSIPayments(dsiPayments);
    const schedule = amort.calculateAmortizationPlan();
    expect(schedule.entries[0].actualDSIInterest.toNumber()).toBeLessThan(
      schedule.entries[0].accruedInterestForPeriod.toNumber()
    );
    expect(schedule.entries[0].dsiInterestSavings).toBeGreaterThan(0);
  });

  it('should show extra interest for late payment', () => {
    const amort = new Amortization(baseParams);
    const dsiPayments = [
      { term: 0, paymentDate: '2023-02-15', principalPaid: 300, interestPaid: 20, feesPaid: 0 }, // paid late
      { term: 1, paymentDate: '2023-03-01', principalPaid: 310, interestPaid: 8, feesPaid: 0 },
      { term: 2, paymentDate: '2023-04-01', principalPaid: 390, interestPaid: 5, feesPaid: 0 },
    ];
    amort.setDSIPayments(dsiPayments);
    const schedule = amort.calculateAmortizationPlan();
    expect(schedule.entries[0].actualDSIInterest.toNumber()).toBeGreaterThan(
      schedule.entries[0].accruedInterestForPeriod.toNumber()
    );
    expect(schedule.entries[0].dsiInterestPenalty).toBeGreaterThan(0);
  });

  it('should handle partial payments and update usage details', () => {
    const amort = new Amortization(baseParams);
    const dsiPayments = [
      { term: 0, paymentDate: '2023-02-01', principalPaid: 150, interestPaid: 5, feesPaid: 0 }, // partial
      { term: 0, paymentDate: '2023-02-10', principalPaid: 150, interestPaid: 5, feesPaid: 0 }, // rest
      { term: 1, paymentDate: '2023-03-01', principalPaid: 310, interestPaid: 8, feesPaid: 0 },
      { term: 2, paymentDate: '2023-04-01', principalPaid: 390, interestPaid: 5, feesPaid: 0 },
    ];
    amort.setDSIPayments(dsiPayments);
    const schedule = amort.calculateAmortizationPlan();
    // Should sum partials for term 0
    expect(schedule.entries[0].actualDSIPrincipal.toNumber()).toBeCloseTo(300);
    expect(schedule.entries[0].actualDSIInterest.toNumber()).toBeCloseTo(10);
    expect(schedule.entries[0].usageDetails.length).toBeGreaterThan(1);
  });
});

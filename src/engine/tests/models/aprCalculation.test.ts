import { Amortization } from "@models/Amortization";
import { Currency } from "@utils/Currency";
import Decimal from "decimal.js";
import { DateUtil } from "../../utils/DateUtil";
import { InterestCalculator } from "@models/InterestCalculator";

function irr(cashFlows: { amount: Decimal; t: number }[]): Decimal {
  let rate = new Decimal(0.05);
  const maxIter = 100;
  const tol = 1e-9;
  for (let i = 0; i < maxIter; i++) {
    let npv = new Decimal(0);
    let deriv = new Decimal(0);
    for (const cf of cashFlows) {
      const discount = new Decimal(1).plus(rate).pow(cf.t);
      npv = npv.plus(cf.amount.div(discount));
      if (cf.t !== 0) {
        deriv = deriv.plus(cf.amount.times(-cf.t).div(discount.times(new Decimal(1).plus(rate))));
      }
    }
    if (deriv.abs().lessThan(tol)) {
      return new Decimal(0);
    }
    const newRate = rate.minus(npv.div(deriv));
    if (newRate.minus(rate).abs().lessThan(tol)) {
      rate = newRate;
      break;
    }
    rate = newRate;
  }
  return rate.times(100);
}

describe("APR calculation", () => {
  it("matches IRR for a simple loan with no fees", () => {
    const amort = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.1),
      term: 12,
      startDate: DateUtil.normalizeDate("2024-01-01"),
    });
    const schedule = amort.calculateAmortizationPlan();
    const startDate = DateUtil.normalizeDateToJsDate(amort.startDate);

    const cashFlows = [{ amount: new Decimal(-1000), t: 0 }];
    for (const row of schedule.entries) {
      const payment = row.principal.getValue().add(row.accruedInterestForPeriod.getValue());
      const t = InterestCalculator.yearFraction(startDate, DateUtil.normalizeDateToJsDate(row.periodEndDate));
      cashFlows.push({ amount: payment, t });
    }

    const expected = irr(cashFlows);
    expect(amort.apr.toNumber()).toBeCloseTo(expected.toNumber(), 2);
  });

  it("returns higher APR when an origination fee is present", () => {
    const amort = new Amortization({
      loanAmount: Currency.of(1000),
      originationFee: Currency.of(50),
      annualInterestRate: new Decimal(0.1),
      term: 12,
      startDate: DateUtil.normalizeDate("2024-01-01"),
    });
    const schedule = amort.calculateAmortizationPlan();
    const startDate = DateUtil.normalizeDateToJsDate(amort.startDate);

    const cashFlows = [{ amount: new Decimal(-1000), t: 0 }];
    for (const row of schedule.entries) {
      const payment = row.principal.getValue().add(row.accruedInterestForPeriod.getValue());
      const t = InterestCalculator.yearFraction(startDate, DateUtil.normalizeDateToJsDate(row.periodEndDate));
      cashFlows.push({ amount: payment, t });
    }

    const expected = irr(cashFlows);
    expect(amort.apr.toNumber()).toBeCloseTo(expected.toNumber(), 2);
    expect(amort.apr.toNumber()).toBeGreaterThan(10);
  });
});

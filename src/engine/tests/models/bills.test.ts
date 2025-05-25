import { Bills } from "../../models/Bills";
import { BillGenerator } from "../../models/BillGenerator";
import { Amortization } from "../../models/Amortization";
import { Currency } from "../../utils/Currency";
import { LocalDate } from "@js-joda/core";
import Decimal from "decimal.js";

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

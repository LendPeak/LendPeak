import { BillGenerator } from "../../models/BillGenerator";
import { Amortization } from "../../models/Amortization";
import { Currency } from "../../utils/Currency";
import { LocalDate } from "@js-joda/core";
import Decimal from "decimal.js";

describe('BillGenerator', () => {
  it('generates bills matching the amortization schedule', () => {
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

    expect(bills.length).toBe(schedule.length);
    for (let i = 0; i < bills.length; i++) {
      const bill = bills.atIndex(i);
      const entry = schedule.entries[i];
      expect(bill.openDate.isEqual(entry.periodBillOpenDate)).toBe(true);
      expect(bill.dueDate.isEqual(entry.periodBillDueDate)).toBe(true);
      expect(bill.principalDue.equals(entry.principal)).toBe(true);
    }
  });
});

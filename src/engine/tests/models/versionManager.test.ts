import { Amortization } from "../../models/Amortization";
import { AmortizationVersionManager } from "../../models/AmortizationVersionManager";
import { FinancialOpsVersionManager } from "../../models/FinancialOpsVersionManager";
import { Currency } from "../../utils/Currency";
import Decimal from "decimal.js";
import { DateUtil } from "../../utils/DateUtil";
import { Bills } from "../../models/Bills";
import { DepositRecord } from "../../models/DepositRecord";
import { DepositRecords } from "../../models/DepositRecords";

describe("Version manager basic flows", () => {
  test("AmortizationVersionManager commit and rollback", () => {
    const amort = new Amortization({
      loanAmount: Currency.of(1000),
      annualInterestRate: new Decimal(0.05),
      term: 12,
      startDate: DateUtil.normalizeDate("2023-01-01"),
    });

    const manager = new AmortizationVersionManager(amort);
    const first = manager.commitTransaction("init");

    amort.term = 6;
    amort.calculateAmortizationPlan();
    const second = manager.commitTransaction("shorten");

    expect(manager.versionNumber).toBe(2);
    expect(manager.getVersionHistory().length).toBe(2);
    expect(second.inputChanges).toHaveProperty("term");

    manager.rollback(first.versionId);
    expect(manager.versionNumber).toBe(3);
    expect(manager.getAmortization().term).toBe(12);
  });

  test("FinancialOpsVersionManager commit and rollback", () => {
    const bills = new Bills({ currentDate: DateUtil.today() });
    const deposits = new DepositRecords();
    const manager = new FinancialOpsVersionManager(bills, deposits);

    const v1 = manager.commitTransaction("init");

    deposits.addRecord(
      new DepositRecord({
        amount: Currency.of(50),
        currency: "USD",
        effectiveDate: DateUtil.normalizeDate("2023-01-01"),
      })
    );

    const v2 = manager.commitTransaction("add deposit");
    expect(manager.versionNumber).toBe(2);
    expect(manager.getVersionHistory().length).toBe(2);
    expect(Object.keys(v2.inputChanges).length).toBeGreaterThan(0);

    manager.rollback(v1.versionId);
    expect(manager.versionNumber).toBe(3);
    expect(manager.getDeposits().all.length).toBe(0);
  });
});

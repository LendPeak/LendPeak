import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoC10 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(19, ChronoUnit.MONTHS);
    const payoffDate = startDate.plus(18, ChronoUnit.MONTHS);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C10",
        name: "DEMO-C10",
        description: "Early payoff (simple)",
        startDate: startDate,
        payoffDate: payoffDate,
        originationFee: 100,
        loanAmount: 19_900,
        annualInterestRate: 0.1355,
        term: 24,
        defaultPreBillDaysConfiguration: 28,
      }),
      depositRecords: new DepositRecords([
        // First 17 regular payments
        ...Array.from(
          { length: 17 },
          (_, i) =>
            new DepositRecord({
              amount: 956.01,
              effectiveDate: startDate.plus(i + 1, ChronoUnit.MONTHS),
              id: `DEPOSIT-C10-${i + 1}`,
              currency: "USD",
            })
        ),
        // Final lump sum payment
        new DepositRecord({
          amount: 5_123.45, // Larger final payment to pay off remaining balance
          effectiveDate: payoffDate,
          id: "DEPOSIT-C10-18",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC10.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

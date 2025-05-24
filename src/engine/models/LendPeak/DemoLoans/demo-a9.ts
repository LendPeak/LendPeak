import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA9 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(11, ChronoUnit.MONTHS);
    const term = 12;
    const deposits = new DepositRecords(
      Array.from({ length: 9 }, (_, i) =>
        new DepositRecord({
          amount: 500 + i * 500,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A9-${i + 1}`,
          currency: "USD",
        })
      )
    );

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A09",
        name: "DEMO-A09",
        description: "Aggressive over-pay payoff",
        startDate,
        originationFee: 100,
        loanAmount: 8000,
        annualInterestRate: 0.11,
        term,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
      }),
      depositRecords: deposits,
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA9.LendPeakObject();
    return { loan: lendPeak.amortization, deposits: lendPeak.depositRecords };
  }
}

import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA8 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(23, ChronoUnit.MONTHS);
    const term = 24;
    const deposits = new DepositRecords([
      ...Array.from({ length: 5 }, (_, i) =>
        new DepositRecord({
          amount: 900,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A8-${i + 1}`,
          currency: "USD",
        })
      ),
      new DepositRecord({
        amount: 5900,
        effectiveDate: startDate.plusMonths(6),
        id: "DEPOSIT-A8-6-LUMP",
        currency: "USD",
      }),
      ...Array.from({ length: 18 }, (_, i) =>
        new DepositRecord({
          amount: 900,
          effectiveDate: startDate.plusMonths(i + 7),
          id: `DEPOSIT-A8-${i + 7}`,
          currency: "USD",
        })
      ),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A08",
        name: "DEMO-A08",
        description: "Re-amort after principal mod",
        startDate,
        originationFee: 100,
        loanAmount: 20000,
        annualInterestRate: 0.1,
        term,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
      }),
      depositRecords: deposits,
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA8.LendPeakObject();
    return { loan: lendPeak.amortization, deposits: lendPeak.depositRecords };
  }
}

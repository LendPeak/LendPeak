import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA10 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(11, ChronoUnit.MONTHS);
    const term = 12;
    const deposits = new DepositRecords([
      ...Array.from({ length: term - 1 }, (_, i) =>
        new DepositRecord({
          amount: 1000,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A10-${i + 1}`,
          currency: "USD",
        })
      ),
      new DepositRecord({
        amount: 995,
        effectiveDate: startDate.plusMonths(term),
        id: `DEPOSIT-A10-${term}`,
        currency: "USD",
      }),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A10",
        name: "DEMO-A10",
        description: "Auto-close waiver",
        startDate,
        originationFee: 100,
        loanAmount: 12000,
        annualInterestRate: 0.1,
        term,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
      }),
      depositRecords: deposits,
      autoCloseThreshold: 1,
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA10.LendPeakObject();
    return { loan: lendPeak.amortization, deposits: lendPeak.depositRecords };
  }
}

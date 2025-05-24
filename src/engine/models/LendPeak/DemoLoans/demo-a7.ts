import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";
import { TermPaymentAmounts } from "../../TermPaymentAmounts";
import { TermPaymentAmount } from "../../TermPaymentAmount";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA7 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(23, ChronoUnit.MONTHS);
    const term = 24;
    const payments = new TermPaymentAmounts([
      ...Array.from({ length: 12 }, (_, i) => new TermPaymentAmount({ termNumber: i + 1, paymentAmount: 200 })),
    ]);

    const deposits = new DepositRecords([
      ...Array.from({ length: 12 }, (_, i) =>
        new DepositRecord({
          amount: 200,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A7-${i + 1}`,
          currency: "USD",
        })
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        new DepositRecord({
          amount: 900,
          effectiveDate: startDate.plusMonths(i + 13),
          id: `DEPOSIT-A7-${i + 13}`,
          currency: "USD",
        })
      ),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A07",
        name: "DEMO-A07",
        description: "IO to amortised flip",
        startDate,
        originationFee: 100,
        loanAmount: 15000,
        annualInterestRate: 0.1,
        term,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        termPaymentAmountOverride: payments,
      }),
      depositRecords: deposits,
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA7.LendPeakObject();
    return { loan: lendPeak.amortization, deposits: lendPeak.depositRecords };
  }
}

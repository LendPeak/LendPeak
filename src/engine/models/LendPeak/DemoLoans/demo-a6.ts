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

export class DemoA6 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(11, ChronoUnit.MONTHS);
    const term = 12;
    const payments = new TermPaymentAmounts([
      ...Array.from({ length: 6 }, (_, i) => new TermPaymentAmount({ termNumber: i + 1, paymentAmount: 50 })),
    ]);

    const deposits = new DepositRecords([
      ...Array.from({ length: 6 }, (_, i) =>
        new DepositRecord({
          amount: 50,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A6-${i + 1}`,
          currency: "USD",
        })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        new DepositRecord({
          amount: 600,
          effectiveDate: startDate.plusMonths(i + 7),
          id: `DEPOSIT-A6-${i + 7}`,
          currency: "USD",
        })
      ),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A06",
        name: "DEMO-A06",
        description: "Negative-amort starter",
        startDate,
        originationFee: 100,
        loanAmount: 10000,
        annualInterestRate: 0.09,
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
    const lendPeak = DemoA6.LendPeakObject();
    return { loan: lendPeak.amortization, deposits: lendPeak.depositRecords };
  }
}

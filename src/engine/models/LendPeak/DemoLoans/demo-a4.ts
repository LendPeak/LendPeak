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

export class DemoA4 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(11, ChronoUnit.MONTHS);
    const term = 12;
    const payments = new TermPaymentAmounts(
      Array.from({ length: term - 1 }, (_, i) =>
        new TermPaymentAmount({ termNumber: i + 1, paymentAmount: 150 })
      )
    );

    const deposits = new DepositRecords([
      ...Array.from({ length: term - 1 }, (_, i) =>
        new DepositRecord({
          amount: 150,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A4-${i + 1}`,
          currency: "USD",
        })
      ),
      new DepositRecord({
        amount: 18500,
        effectiveDate: startDate.plusMonths(term),
        id: `DEPOSIT-A4-${term}`,
        currency: "USD",
      }),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A04",
        name: "DEMO-A04",
        description: "Balloon maturity",
        startDate,
        originationFee: 100,
        loanAmount: 20000,
        annualInterestRate: 0.08,
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
    const lendPeak = DemoA4.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

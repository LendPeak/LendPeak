import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";
import { TermPaymentAmounts } from "../../TermPaymentAmounts";
import { LocalDate, ChronoUnit } from "@js-joda/core";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA2 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A02",
        name: "DEMO-A02",
        description: "Interest-accruing skip",
        startDate: today.minus(13, ChronoUnit.MONTHS),
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1355,
        term: 12,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 28,
        termPaymentAmountOverride: new TermPaymentAmounts([
          { termNumber: 3, paymentAmount: 0 },
          { termNumber: 4, paymentAmount: 0 },
          { termNumber: 5, paymentAmount: 0 },
        ]),
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_800.0,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS),
          id: "DEPOSIT-A02-9",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA2.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

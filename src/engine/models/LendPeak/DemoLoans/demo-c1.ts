import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { DateUtil } from "../../../utils/DateUtil";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoC1 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C01",
        name: "DEMO-C01",
        description: "Vanilla 24‑mo amortised",
        startDate: today.minus(20, ChronoUnit.MONTHS),
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1355,
        term: 24,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 28,
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(19, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(18, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(17, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(16, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(15, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(14, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(13, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-9",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(9, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(8, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-12",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(7, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-13",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-14",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-15",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-16",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-17",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-18",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-19",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(0, ChronoUnit.MONTHS),
          id: "DEPOSIT-C01-20",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC1.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

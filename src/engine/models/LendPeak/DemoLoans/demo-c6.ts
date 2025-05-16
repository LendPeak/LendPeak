import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { DateUtil } from "../../../utils/DateUtil";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { TermInterestRateOverrides } from "../../TermInterestRateOverrides";
import { TermInterestRateOverride } from "../../TermInterestRateOverride";
import { Calendar, CalendarType } from "../../Calendar";
const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoC6 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C06",
        name: "DEMO-C06",
        description: "Single rate reduction on term 5 of 24 months",
        startDate: today.minus(24, ChronoUnit.MONTHS),
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1355,
        term: 24,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 28,
        termInterestRateOverride: new TermInterestRateOverrides([
          new TermInterestRateOverride({
            termNumber: 5,
            interestRate: 0.05,
          }),
        ]),
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(23, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(22, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(21, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(20, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(19, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(18, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(17, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(16, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(15, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-9",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(14, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(13, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-12",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-13",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-14",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(9, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-15",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(8, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-16",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(7, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-17",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-18",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-19",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-20",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-21",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-22",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-23",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 825.55,
          effectiveDate: today.minus(0, ChronoUnit.MONTHS),
          id: "DEPOSIT-C06-24",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC6.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

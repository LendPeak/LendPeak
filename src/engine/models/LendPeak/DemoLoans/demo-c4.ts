import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { DateUtil } from "../../../utils/DateUtil";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoC4 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C04",
        name: "DEMO-C04",
        description: "12-mo loan, over-pay ",
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
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(9, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(8, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(7, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-9",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_800.0,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS),
          id: "DEPOSIT-C04-12",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC4.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

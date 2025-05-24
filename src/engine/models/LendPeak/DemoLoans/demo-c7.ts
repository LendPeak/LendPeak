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
import { ChangePaymentDates } from "../../ChangePaymentDates";
import { ChangePaymentDate } from "../../ChangePaymentDate";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoC7 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(24, ChronoUnit.MONTHS);
    const term9Date = startDate.plusMonths(10);
    const newPaymentDate = term9Date.plusDays(10); // Move payment date 10 days later

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C07",
        name: "DEMO-C07",
        description: "24 month loan with payment date change at term 10 and rate reduction at term 5",
        startDate: startDate,
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1355,
        term: 24,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 28,
        changePaymentDates: new ChangePaymentDates([
          new ChangePaymentDate({
            termNumber: 9,
            originalDate: term9Date,
            newDate: newPaymentDate,
          }),
        ]),
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(23, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(22, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(21, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(20, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(19, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(18, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(17, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(16, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(15, ChronoUnit.MONTHS),
          id: "DEPOSIT-C07-9",
          currency: "USD",
        }),
        // Term 10 payment is 10 days later
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(14, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(13, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-12",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-13",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-14",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(9, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-15",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(8, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-16",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(7, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-17",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-18",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-19",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS).plusDays(10),
          id: "DEPOSIT-C07-20",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS).plusDays(9),
          id: "DEPOSIT-C07-21",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS).plusDays(9),
          id: "DEPOSIT-C07-22",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS).plusDays(9),
          id: "DEPOSIT-C07-23",
          currency: "USD",
        }),
        // Final payment reverts to original schedule
        new DepositRecord({
          amount: 1_023.47,
          effectiveDate: today,
          id: "DEPOSIT-C07-24",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC7.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

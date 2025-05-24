import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";
import { RateSchedules } from "../../RateSchedules";
import { RateSchedule } from "../../RateSchedule";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA3 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(12, ChronoUnit.MONTHS);
    const schedules = new RateSchedules([
      new RateSchedule({
        annualInterestRate: 0.05,
        startDate: startDate,
        endDate: startDate.plusMonths(2).minusDays(1),
      }),
      new RateSchedule({
        annualInterestRate: 0.06,
        startDate: startDate.plusMonths(2),
        endDate: startDate.plusMonths(4).minusDays(1),
      }),
      new RateSchedule({
        annualInterestRate: 0.07,
        startDate: startDate.plusMonths(4),
        endDate: startDate.plusMonths(6).minusDays(1),
      }),
      new RateSchedule({
        annualInterestRate: 0.08,
        startDate: startDate.plusMonths(6),
        endDate: startDate.plusMonths(8).minusDays(1),
      }),
      new RateSchedule({
        annualInterestRate: 0.09,
        startDate: startDate.plusMonths(8),
        endDate: startDate.plusMonths(12).minusDays(1),
      }),
    ]);

    const deposits = new DepositRecords(
      Array.from({ length: 10 }, (_, i) =>
        new DepositRecord({
          amount: 1000,
          effectiveDate: startDate.plusMonths(i + 1),
          id: `DEPOSIT-A03-${i + 1}`,
          currency: "USD",
        })
      )
    );

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A03",
        name: "DEMO-A03",
        description: "Variable-rate ladder",
        startDate,
        originationFee: 100,
        loanAmount: 20000,
        annualInterestRate: 0.05,
        term: 12,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.THIRTY_360),
        }),
        ratesSchedule: schedules,
      }),
      depositRecords: deposits,
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA3.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

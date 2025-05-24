import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";
import { RateSchedule } from "../../RateSchedule";
import { RateSchedules } from "../../RateSchedules";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA3 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(24, ChronoUnit.MONTHS);

    const rateSchedules = new RateSchedules([
      new RateSchedule({
        annualInterestRate: 0.1,
        startDate: startDate,
        endDate: startDate.plusMonths(6),
      }),
      new RateSchedule({
        annualInterestRate: 0.11,
        startDate: startDate.plusMonths(6),
        endDate: startDate.plusMonths(12),
      }),
      new RateSchedule({
        annualInterestRate: 0.12,
        startDate: startDate.plusMonths(12),
        endDate: startDate.plusMonths(16),
      }),
      new RateSchedule({
        annualInterestRate: 0.13,
        startDate: startDate.plusMonths(16),
        endDate: startDate.plusMonths(20),
      }),
      new RateSchedule({
        annualInterestRate: 0.14,
        startDate: startDate.plusMonths(20),
        endDate: startDate.plusMonths(24),
      }),
    ]);

    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A03",
        name: "DEMO-A03",
        description: "Variable-rate ladder",
        startDate: startDate,
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1,
        term: 24,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.THIRTY_ACTUAL),
        }),
        defaultPreBillDaysConfiguration: 28,
        ratesSchedule: rateSchedules,
      }),
      depositRecords: new DepositRecords(
        Array.from({ length: 24 }).map((_, i) =>
          new DepositRecord({
            amount: 956.01,
            effectiveDate: startDate.plusMonths(i + 1),
            id: `DEPOSIT-A03-${i + 1}`,
            currency: "USD",
          })
        )
      ),
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

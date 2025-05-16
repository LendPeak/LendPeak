import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { DateUtil } from "../../../utils/DateUtil";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";

const today = LocalDate.now();

export class DemoC2 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-C02",
        name: "DEMO-C02",
        description: "Brand-new today",
        startDate: today,
        originationFee: 550,
        loanAmount: 24_450,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1411,
        term: 24,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 3,
      }),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC2.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

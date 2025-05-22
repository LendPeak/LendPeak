import { LendPeak } from '../../LendPeak';
import { Amortization } from '../../Amortization';
import { DepositRecords } from '../../DepositRecords';
import { DepositRecord } from '../../DepositRecord';
import { DateUtil } from '../../../utils/DateUtil';
import { LocalDate, ChronoUnit, TemporalAdjusters } from '@js-joda/core';
import { TermCalendars } from '../../TermCalendars';
import { Calendar, CalendarType } from '../../Calendar';

const today = LocalDate.now().minus(1, ChronoUnit.MONTHS);

export class DemoC3 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: 'DEMO-C03',
        name: 'DEMO-C03',
        description: '20 days delinquent, no pays',
        startDate: today.plus(20, ChronoUnit.DAYS),
        originationFee: 600,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.2399,
        term: 12,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 15,
      }),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoC3.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

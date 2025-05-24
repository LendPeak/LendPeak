import { LendPeak } from '../../LendPeak';
import { Amortization } from '../../Amortization';
import { DepositRecords } from '../../DepositRecords';
import { TermCalendars } from '../../TermCalendars';
import { Calendar, CalendarType } from '../../Calendar';
import { TermPaymentAmounts } from '../../TermPaymentAmounts';
import { TermPaymentAmount } from '../../TermPaymentAmount';
import { TermExtensions } from '../../TermExtensions';
import { TermExtension } from '../../TermExtension';
import { LocalDate, ChronoUnit } from '@js-joda/core';

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA11 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: 'DEMO-A11',
        name: 'DEMO-A11',
        description: 'Hardship with term extension',
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
        termPaymentAmountOverride: new TermPaymentAmounts([
          new TermPaymentAmount({ termNumber: 4, paymentAmount: 0 }),
          new TermPaymentAmount({ termNumber: 5, paymentAmount: 0 }),
          new TermPaymentAmount({ termNumber: 6, paymentAmount: 0 }),
        ]),
        termExtensions: new TermExtensions([
          new TermExtension({ termChange: 1 }),
        ]),
      }),
      depositRecords: new DepositRecords([]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA11.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

import { LendPeak } from '../../LendPeak';
import { Amortization } from '../../Amortization';
import { DepositRecords } from '../../DepositRecords';
import { DepositRecord } from '../../DepositRecord';
import { TermCalendars } from '../../TermCalendars';
import { Calendar, CalendarType } from '../../Calendar';
import { TermPaymentAmounts } from '../../TermPaymentAmounts';
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { TermExtensions } from '../../TermExtensions';

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA12 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: 'DEMO-A12',
        name: 'DEMO-A12',
        description: 'Interest-accruing skip (with term extension)',
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
        termExtensions: new TermExtensions([
          { quantity: 3, date: today.minus(9, ChronoUnit.MONTHS), description: 'Hardship skip', active: true },
        ]),
      }),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA12.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
} 
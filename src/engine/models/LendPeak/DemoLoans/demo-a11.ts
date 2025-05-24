import { LendPeak } from '../../LendPeak';
import { Amortization } from '../../Amortization';
import { DepositRecords } from '../../DepositRecords';
import { DepositRecord } from '../../DepositRecord';
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { TermCalendars } from '../../TermCalendars';
import { Calendar, CalendarType } from '../../Calendar';
import { TermInterestRateOverrides } from '../../TermInterestRateOverrides';
import { TermInterestRateOverride } from '../../TermInterestRateOverride';
import { TermPaymentAmounts } from '../../TermPaymentAmounts';
import { TermPaymentAmount } from '../../TermPaymentAmount';
import { TermExtensions } from '../../TermExtensions';
import { TermExtension } from '../../TermExtension';

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA11 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(24, ChronoUnit.MONTHS);
    return new LendPeak({
      amortization: new Amortization({
        id: 'DEMO-A11',
        name: 'DEMO-A11',
        description: 'Hardship: zero-interest skip (with term extension)',
        startDate,
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
          new TermInterestRateOverride({ termNumber: 4, interestRate: 0 }),
          new TermInterestRateOverride({ termNumber: 5, interestRate: 0 }),
          new TermInterestRateOverride({ termNumber: 6, interestRate: 0 }),
        ]),
        termPaymentAmountOverride: new TermPaymentAmounts([
          new TermPaymentAmount({ termNumber: 4, paymentAmount: 0 }),
          new TermPaymentAmount({ termNumber: 5, paymentAmount: 0 }),
          new TermPaymentAmount({ termNumber: 6, paymentAmount: 0 }),
        ]),
        termExtensions: new TermExtensions([
          { quantity: 3, date: startDate.plusMonths(4), description: 'Hardship skip', active: true },
        ]),
      }),
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
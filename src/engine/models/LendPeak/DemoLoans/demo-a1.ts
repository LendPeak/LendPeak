import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { Calendar, CalendarType } from "../../Calendar";
import { TermInterestRateOverrides } from "../../TermInterestRateOverrides";
import { TermInterestRateOverride } from "../../TermInterestRateOverride";
import { TermPaymentAmounts } from "../../TermPaymentAmounts";
import { TermPaymentAmount } from "../../TermPaymentAmount";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA1 {
  static LendPeakObject(): LendPeak {
    const startDate = today.minus(24, ChronoUnit.MONTHS);
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A01",
        name: "DEMO-A01",
        description: "Hardship: zero-interest skip",
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
      }),
      depositRecords: new DepositRecords([
        // Terms 1-3
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(1),
          id: "DEPOSIT-A01-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(2),
          id: "DEPOSIT-A01-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(3),
          id: "DEPOSIT-A01-3",
          currency: "USD",
        }),
        // Skipped payments for terms 4-6
        // Resume payments term 7 onward
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(7),
          id: "DEPOSIT-A01-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(8),
          id: "DEPOSIT-A01-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(9),
          id: "DEPOSIT-A01-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(10),
          id: "DEPOSIT-A01-7",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(11),
          id: "DEPOSIT-A01-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(12),
          id: "DEPOSIT-A01-9",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(13),
          id: "DEPOSIT-A01-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(14),
          id: "DEPOSIT-A01-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(15),
          id: "DEPOSIT-A01-12",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(16),
          id: "DEPOSIT-A01-13",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(17),
          id: "DEPOSIT-A01-14",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(18),
          id: "DEPOSIT-A01-15",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(19),
          id: "DEPOSIT-A01-16",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(20),
          id: "DEPOSIT-A01-17",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(21),
          id: "DEPOSIT-A01-18",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(22),
          id: "DEPOSIT-A01-19",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(23),
          id: "DEPOSIT-A01-20",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 956.01,
          effectiveDate: startDate.plusMonths(24),
          id: "DEPOSIT-A01-21",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA1.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

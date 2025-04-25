import dayjs from "dayjs";
import { describe, test, expect } from "@jest/globals";
import { LocalDate, ZoneId } from "@js-joda/core";

import { Currency, RoundingMethod } from "@utils/Currency";
import { DateUtil } from "../../utils/DateUtil";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { Calendar, CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import { TermCalendar } from "@models/TermCalendar";
import Decimal from "decimal.js";
import { RateSchedule, RateScheduleParams } from "../../models/RateSchedule";
import { RateSchedules } from "../../models/RateSchedules";
import { LendPeak } from "../../models/LendPeak";
import { Fee } from "../../models/Fee";
import { Bill } from "../../models/Bill";
import { Bills } from "../../models/Bills";
import { DepositRecord } from "../../models/DepositRecord";
import { DepositRecords } from "../../models/DepositRecords";

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const today = DateUtil.normalizeDate(LocalDate.now());

describe("Functional Test - Early Payoff - one payment", () => {
  const lendPeak = new LendPeak({
    amortization: new Amortization({
      loanAmount: Currency.of(19_500),
      originationFee: Currency.of(500),
      annualInterestRate: new Decimal(0.0851),
      term: 36,
      startDate: DateUtil.normalizeDate("2022-06-13"),
      firstPaymentDate: DateUtil.normalizeDate("2022-07-14"),
      hasCustomFirstPaymentDate: true,
      defaultPreBillDaysConfiguration: 28,
      calendars: new TermCalendars({
        primary: new Calendar(CalendarType.THIRTY_360),
      }),
    }),
    depositRecords: new DepositRecords([
      new DepositRecord({
        amount: Currency.of(631.44),
        effectiveDate: DateUtil.normalizeDate("2022-07-15"),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        currency: "USD",
      }),
      new DepositRecord({
        amount: Currency.of(631.44),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        effectiveDate: DateUtil.normalizeDate("2022-08-15"),
        currency: "USD",
      }),
      new DepositRecord({
        amount: Currency.of(19_521),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        effectiveDate: DateUtil.normalizeDate("2022-09-12"),
        currency: "USD",
      }),
      // new DepositRecord({
      //   amount: Currency.of(19_121),
      //   applyExcessToPrincipal: true,
      //   applyExcessAtTheEndOfThePeriod: true,
      //   effectiveDate: DateUtil.normalizeDate("2022-09-12"),
      //   currency: "USD",
      // }),
      // new DepositRecord({
      //   amount: Currency.of(161.87),
      //   applyExcessToPrincipal: true,
      //   applyExcessAtTheEndOfThePeriod: true,
      //   effectiveDate: DateUtil.normalizeDate("2022-09-14"),
      //   currency: "USD",
      // }),
    ]),
    currentDate: DateUtil.normalizeDate("2022-11-01"),
  });

  // Force generation of schedule/bills, etc.
  lendPeak.calc();

  it("payoff amount must be zero", () => {
    expect(lendPeak.payoffQuote.dueTotal.toNumber()).toEqual(0);
  });

  it("verify balance modification", () => {
    expect(lendPeak.amortization.balanceModifications.length).toEqual(1);
    expect(lendPeak.amortization.balanceModifications.firstModification?.isSystemModification).toEqual(true);
  });
  it("verify bills", () => {
    // we should have 3 bil
    expect(lendPeak.bills.length).toBe(4);
    // first bill
  });
});

describe("Functional Test - Early Payoff - two payment", () => {
  const lendPeak = new LendPeak({
    amortization: new Amortization({
      loanAmount: Currency.of(19_500),
      originationFee: Currency.of(500),
      annualInterestRate: new Decimal(0.0851),
      term: 36,
      startDate: DateUtil.normalizeDate("2022-06-13"),
      firstPaymentDate: DateUtil.normalizeDate("2022-07-14"),
      hasCustomFirstPaymentDate: true,
      defaultPreBillDaysConfiguration: 28,
      calendars: new TermCalendars({
        primary: new Calendar(CalendarType.THIRTY_360),
      }),
    }),
    depositRecords: new DepositRecords([
      new DepositRecord({
        amount: Currency.of(631.44),
        effectiveDate: DateUtil.normalizeDate("2022-07-15"),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        currency: "USD",
      }),
      new DepositRecord({
        amount: Currency.of(631.44),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        effectiveDate: DateUtil.normalizeDate("2022-08-15"),
        currency: "USD",
      }),

      new DepositRecord({
        amount: Currency.of(19_121),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        effectiveDate: DateUtil.normalizeDate("2022-09-12"),
        currency: "USD",
      }),
      new DepositRecord({
        amount: Currency.of(161.87),
        applyExcessToPrincipal: true,
        applyExcessAtTheEndOfThePeriod: true,
        effectiveDate: DateUtil.normalizeDate("2022-09-14"),
        currency: "USD",
      }),
    ]),
    currentDate: DateUtil.normalizeDate("2022-11-01"),
  });

  // Force generation of schedule/bills, etc.
  lendPeak.calc();

  it("payoff amount must be zero", () => {
    expect(lendPeak.payoffQuote.dueTotal.toNumber()).toEqual(0);
  });

  it("verify balance modification", () => {
    expect(lendPeak.amortization.balanceModifications.length).toEqual(2);
    expect(lendPeak.amortization.balanceModifications.all[0]?.isSystemModification).toEqual(true);
    expect(lendPeak.amortization.balanceModifications.all[1]?.isSystemModification).toEqual(true);
  });
  it("verify bills", () => {
    // we should have 3 bil
    expect(lendPeak.bills.length).toBe(4);
    // first bill
  });
});

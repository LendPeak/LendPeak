/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClsParser, ClsPaymentTxn } from '../parsers/cls/cls.parser';

import {
  Amortization,
  AmortizationParams,
} from 'lendpeak-engine/models/Amortization';
import { TermCalendars } from 'lendpeak-engine/models/TermCalendars';
import { CalendarType } from 'lendpeak-engine/models/Calendar';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { Decimal } from 'decimal.js';

import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { StaticAllocation } from 'lendpeak-engine/models/Bill/DepositRecord/StaticAllocation';

import { PreBillDaysConfigurations } from 'lendpeak-engine/models/PreBillDaysConfigurations';

import { PreBillDaysConfiguration } from 'lendpeak-engine/models/PreBillDaysConfiguration';
import { ChangePaymentDates } from 'lendpeak-engine/models/ChangePaymentDates';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';

import { LocalDate, ChronoUnit } from '@js-joda/core';

/* ──────────────────────────────────────────────────────────────────────────
 *  CLS →  LendPeak   (Amortization  +  DepositRecords  +  Pre-Bill overrides)
 * ──────────────────────────────────────────────────────────────────────── */
export class ClsToLendPeakMapper {
  static map(parser: ClsParser): {
    loan: Amortization;
    deposits: DepositRecords;
  } {
    /* ── shorthand handles ── */
    const loan = parser.loan; // ClsLoan instance
    const schedule = parser.schedule; // ClsScheduleLine[]
    const payments = parser.payments as ClsPaymentTxn[]; // ClsPaymentTxn[]
    const history = parser.history; // raw CLSHistoryEntry[]

    /* ───────────────────────────────────────────────
     * 1.   Clean / order schedule
     * ───────────────────────────────────────────── */
    const activeSchedule = schedule
      .filter((s) => !s.isArchived)
      .sort((a, b) => a.dueDate!.compareTo(b.dueDate!));

    /* ───────────────────────────────────────────────
     * 2.   Derive high-level numbers & dates
     * ───────────────────────────────────────────── */
    const termPlanned =
      loan.termPlanned > 0 ? loan.termPlanned : activeSchedule.length;

    const firstPaymentDate = activeSchedule[0]?.dueDate;
    const startDate = DateUtil.normalizeDate(
      loan.applicationDate ||
        loan.disbursalDate ||
        firstPaymentDate ||
        DateUtil.today(),
    );

    /* ───────────────────────────────────────────────
     * 3.   Build the full Pre-Bill-Days timeline
     *      (baseline -→ every change from history)
     * ───────────────────────────────────────────── */
    type PBChange = { effectiveDate: LocalDate; value: number };

    const pbField = 'loan__Pre_Bill_Days__c';

    /** 3-A)  pull all history rows for that field, oldest → newest */
    const historyRows = history
      .filter((h) => h.field === pbField)
      .sort((a, b) =>
        DateUtil.normalizeDate(a.when).compareTo(
          DateUtil.normalizeDate(b.when),
        ),
      );

    /** 3-B)  assemble change-events */
    const pbEvents: PBChange[] = [];

    if (historyRows.length === 0) {
      /* no history ⇒ single baseline event */
      pbEvents.push({
        effectiveDate: startDate,
        value: loan.prebillDays,
      });
    } else {
      /* baseline comes from the OLDEST row's oldVal */
      const first = historyRows[0];
      pbEvents.push({
        effectiveDate: startDate,
        value: Number(first.oldVal ?? 0),
      });

      /* then every change becomes its own event */
      historyRows.forEach((h) => {
        pbEvents.push({
          effectiveDate: DateUtil.normalizeDate(h.when),
          value: Number(h.newVal),
        });
      });
    }

    /** 3-C)  “current default” is simply the last event’s value */
    const defaultPreBill = pbEvents[pbEvents.length - 1].value;

    /* ───────────────────────────────────────────────
     * 4.   Build Amortization first (needs the default)
     * ───────────────────────────────────────────── */
    const aParams: AmortizationParams = {
      id: loan.id,
      name: loan.name,
      description: `Imported from CLS (${loan.id})`,

      loanAmount: loan.principal,
      originationFee: Currency.Zero(),
      annualInterestRate: new Decimal(loan.annualRateDecimal).toDecimalPlaces(
        8,
      ),

      term: termPlanned,
      startDate,
      firstPaymentDate,

      calendars: new TermCalendars({ primary: CalendarType.THIRTY_360_US }),
      equitedMonthlyPayment: loan.paymentAmount,

      billingModel: 'amortized',

      /** ← default Pre-Bill days */
      defaultPreBillDaysConfiguration: defaultPreBill,
    };

    /* ───────────────────────────────────────────────
     * 5-B.  Change-Payment-Date overrides
     *
     *   Rules (no history used):
     *     • Expected pattern = previous due-date + 1 month
     *       (or Accrual-Start-Date → first RSI)
     *       AND day-of-month = loan__Due_Day__c
     *     • A CPD is recorded when
     *         – actual day-of-month ≠ expected day,  OR
     *         – months between previous & actual ≠ 1
     *   Each CPD becomes a ChangePaymentDate(termIdx,…)
     * ───────────────────────────────────────────── */
    const baseDueDay = Number(loan.dueDay); // loan__Due_Day__c
    const accrualStart = DateUtil.normalizeDate(loan.accrualStartDate);

    const changePaymentDates = new ChangePaymentDates();

    let prevActual = accrualStart; // “RSI 0”

    activeSchedule.forEach((rsi, termIdx) => {
      const actual = rsi.dueDate!; // never null on active rows
      const monthsDiff = prevActual.until(actual, ChronoUnit.MONTHS);
      const dayChanged = actual.dayOfMonth() !== baseDueDay;
      const gapChanged = monthsDiff !== 1;

      if (dayChanged || gapChanged) {
        /* expected date = prevActual + 1 month, forced to baseDueDay */
        let expected = prevActual.plusMonths(1);
        const lastDom = expected.lengthOfMonth();
        expected = expected.withDayOfMonth(Math.min(baseDueDay, lastDom));

        changePaymentDates.addChangePaymentDate(
          new ChangePaymentDate({
            termNumber: termIdx,
            originalDate: expected,
            newDate: actual,
          }),
        );
      }

      prevActual = actual;
    });

    if (changePaymentDates.length > 0) {
      aParams.changePaymentDates = changePaymentDates; // before we build Amortization
    }

    const amort = new Amortization(aParams);

    /* ───────────────────────────────────────────────
     * 5.   Create Pre-Bill overrides *per term*
     *      (only where different from default)
     * ───────────────────────────────────────────── */
    const pbConfigs = new PreBillDaysConfigurations();

    // helper → find Pre-Bill days value that was in effect on a date
    const getValueOn = (d: LocalDate): number => {
      let v = defaultPreBill;
      for (const ev of pbEvents) {
        if (DateUtil.isSameOrBefore(ev.effectiveDate, d)) v = ev.value;
        else break;
      }
      return v;
    };

    for (let termIdx = 0; termIdx < amort.term; termIdx++) {
      const period = amort.periodsSchedule.atIndex(termIdx);
      const valueForTerm = getValueOn(period.startDate);

      if (valueForTerm !== defaultPreBill) {
        pbConfigs.addConfiguration(
          new PreBillDaysConfiguration({
            termNumber: termIdx,
            preBillDays: valueForTerm,
            type: 'custom',
            active: true,
          }),
        );
      }
    }

    // slap overrides onto the amortization
    if (pbConfigs.length > 0) {
      amort.preBillDays = pbConfigs;
    }

    /* ───────────────────────────────────────────────
     * 6.   Map CLS LPTs → LendPeak DepositRecord(s)
     * ───────────────────────────────────────────── */
    const deposits = ClsToLendPeakMapper.mapPayments(payments);

    return { loan: amort, deposits };
  }

  /* ======================================================================
   *  INTERNAL HELPERS
   * ====================================================================*/

  /**
   * LPTs → DepositRecords
   * – keeps only cleared, non-archived, non-reversed txns
   * – builds a static allocation (principal / interest / fees)
   */
  private static mapPayments(txns: ClsPaymentTxn[]): DepositRecords {
    const depositList: DepositRecord[] = txns
      .filter((t) => {
        const r = t.raw;
        return t.cleared && !r.loan__Reversed__c && !r.loan__Archived__c;
      })
      .map((t) => {
        const r = t.raw;

        const feeTotal =
          (r.loan__Fees__c ?? 0) +
          (r.loan__Late_Charge_Interest__c ?? 0) +
          (r.loan__Late_Charge_Principal__c ?? 0) +
          (r.loan__Other_Charges_Interest__c ?? 0) +
          (r.loan__Other_Charges_Principal__c ?? 0) +
          (r.loan__Total_Charges_Interest__c ?? 0) +
          (r.loan__Total_Charges_Principal__c ?? 0);

        // const staticAlloc: StaticAllocation = {
        //   principal: t.principal.toNumber(),
        //   interest: t.interest.toNumber(),
        //   fees: feeTotal,
        //   prepayment: 0,
        // };

        return new DepositRecord({
          id: r.Name || r.Id,

          amount: t.amount,
          currency: 'USD',

          effectiveDate: t.clearingDate ?? DateUtil.today(),
          clearingDate: t.clearingDate ?? undefined,
          systemDate: t.receiptDate ?? DateUtil.today(),

          paymentMethod: r.loan__Payment_Type__c ?? undefined,
          depositor: r.loan__Receipt_ID__c ?? undefined,

          active: true,
          applyExcessToPrincipal: true,
          applyExcessAtTheEndOfThePeriod: true,
          // staticAllocation: staticAlloc,
        });
      });

    return new DepositRecords(depositList);
  }
}

import { Amortization, } from 'lendpeak-engine/models/Amortization';
import { TermCalendars } from 'lendpeak-engine/models/TermCalendars';
import { CalendarType } from 'lendpeak-engine/models/Calendar';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { Decimal } from 'decimal.js';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { PreBillDaysConfigurations } from 'lendpeak-engine/models/PreBillDaysConfigurations';
import { PreBillDaysConfiguration } from 'lendpeak-engine/models/PreBillDaysConfiguration';
import { ChangePaymentDates } from 'lendpeak-engine/models/ChangePaymentDates';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';
/* ──────────────────────────────────────────────────────────────────────────
 *  CLS →  LendPeak   (Amortization  +  DepositRecords  +  Pre-Bill overrides)
 * ──────────────────────────────────────────────────────────────────────── */
export class ClsToLendPeakMapper {
    static map(parser) {
        /* ── shorthand handles ── */
        const loan = parser.loan; // ClsLoan instance
        const schedule = parser.schedule; // ClsScheduleLine[]
        const payments = parser.payments; // ClsPaymentTxn[]
        const history = parser.history; // raw CLSHistoryEntry[]
        /* ───────────────────────────────────────────────
         * 1.   Clean / order schedule
         * ───────────────────────────────────────────── */
        const activeSchedule = schedule
            .filter((s) => !s.isArchived)
            .sort((a, b) => a.dueDate.compareTo(b.dueDate));
        /* ───────────────────────────────────────────────
         * 2.   Derive high-level numbers & dates
         * ───────────────────────────────────────────── */
        const termPlanned = loan.termPlanned > 0 ? loan.termPlanned : activeSchedule.length;
        const firstPaymentDate = activeSchedule[0]?.dueDate;
        const startDate = DateUtil.normalizeDate(loan.accrualStartDate);
        let isEarlyPayoff = false;
        if (loan.closedDate) {
            const lastSchedDate = activeSchedule[activeSchedule.length - 1]?.dueDate;
            const lastInstallmentDate = DateUtil.normalizeDate(loan.lastInstallmentDate);
            const lastDateToCompare = lastInstallmentDate.isAfter(lastSchedDate)
                ? lastInstallmentDate
                : lastSchedDate;
            const closedDate = DateUtil.normalizeDate(loan.closedDate);
            isEarlyPayoff =
                closedDate &&
                    lastDateToCompare &&
                    closedDate.isBefore(lastDateToCompare);
        }
        const pbField = 'loan__Pre_Bill_Days__c';
        /** 3-A)  pull all history rows for that field, oldest → newest */
        const historyRows = history
            .filter((h) => h.field === pbField)
            .sort((a, b) => DateUtil.normalizeDate(a.when).compareTo(DateUtil.normalizeDate(b.when)));
        /** 3-B)  assemble change-events */
        const pbEvents = [];
        if (historyRows.length === 0) {
            /* no history ⇒ single baseline event */
            pbEvents.push({
                effectiveDate: startDate,
                value: loan.prebillDays,
            });
        }
        else {
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
        const aParams = {
            id: loan.id,
            name: loan.name,
            description: `Imported from CLS (${loan.id})`,
            loanAmount: loan.principal,
            originationFee: Currency.Zero(),
            annualInterestRate: new Decimal(loan.annualRateDecimal).toDecimalPlaces(8),
            term: termPlanned,
            startDate,
            firstPaymentDate,
            payoffDate: isEarlyPayoff
                ? // ? DateUtil.normalizeDate(loan.closedDate)
                    DateUtil.normalizeDate(loan.closedDate)
                : undefined,
            calendars: new TermCalendars({ primary: CalendarType.THIRTY_360_US }),
            equitedMonthlyPayment: loan.paymentAmount,
            billingModel: 'amortized',
            /** ← default Pre-Bill days */
            defaultPreBillDaysConfiguration: defaultPreBill,
        };
        /* ----------------------------------------------------------
         * Change-Payment-Dates
         * -------------------------------------------------------- */
        const accrualStart = DateUtil.normalizeDate(loan.accrualStartDate);
        const changePaymentDates = ClsToLendPeakMapper.deriveChangePaymentDates(activeSchedule, accrualStart);
        if (changePaymentDates.length > 0) {
            aParams.changePaymentDates = changePaymentDates;
        }
        const amort = new Amortization(aParams);
        /* ───────────────────────────────────────────────
         * 5.   Create Pre-Bill overrides *per term*
         *      (only where different from default)
         * ───────────────────────────────────────────── */
        const pbConfigs = new PreBillDaysConfigurations();
        // helper → find Pre-Bill days value that was in effect on a date
        const getValueOn = (d) => {
            let v = defaultPreBill;
            for (const ev of pbEvents) {
                if (DateUtil.isSameOrBefore(ev.effectiveDate, d))
                    v = ev.value;
                else
                    break;
            }
            return v;
        };
        for (let termIdx = 0; termIdx < amort.term; termIdx++) {
            const period = amort.periodsSchedule.atIndex(termIdx);
            if (!period) {
                // can happen if we have early payoff
                break;
            }
            const valueForTerm = getValueOn(period.startDate);
            if (valueForTerm !== defaultPreBill) {
                pbConfigs.addConfiguration(new PreBillDaysConfiguration({
                    termNumber: termIdx,
                    preBillDays: valueForTerm,
                    type: 'custom',
                    active: true,
                }));
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
        return { loan: amort, deposits, rawImportData: parser.rawImportData };
    }
    /* ======================================================================
     *  INTERNAL HELPERS
     * ====================================================================*/
    /**
     * LPTs → DepositRecords
     * – keeps only cleared, non-archived, non-reversed txns
     * – builds a static allocation (principal / interest / fees)
     */
    static mapPayments(txns) {
        const depositList = txns
            .filter((t) => {
            const r = t.raw;
            return t.cleared && !r.loan__Reversed__c && !r.loan__Archived__c;
        })
            .map((t) => {
            const r = t.raw;
            const feeTotal = r.loan__Fees__c ?? 0;
            // const staticAlloc: StaticAllocation = {
            //   principal: t.principal.toNumber(),
            //   interest: t.interest.toNumber(),
            //   fees: feeTotal,
            //   prepayment: 0,
            // };
            let name = r.Name || r.Id;
            if (t.paymentType) {
                name = `${name} (${t.paymentType})`;
            }
            return new DepositRecord({
                id: name,
                amount: t.amount,
                currency: 'USD',
                effectiveDate: t.clearingDate ?? DateUtil.today(),
                clearingDate: t.clearingDate ?? undefined,
                systemDate: t.receiptDate ?? DateUtil.todayWithTime(),
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
    /* =====================================================================
     * deriveChangePaymentDates(...)
     *   • Works only from the schedule + accrualStart anchor
     *   • Baseline day-of-month = first active RSI
     * =================================================================== */
    static deriveChangePaymentDates(schedule, accrualStart) {
        const cpd = new ChangePaymentDates();
        if (schedule.length === 0)
            return cpd;
        /* ------------------------------------------------------------
         * 1.  Establish the initial cadence — day of 1st active RSI
         * ---------------------------------------------------------- */
        let regularDueDay = schedule[0].dueDate.dayOfMonth();
        /* ------------------------------------------------------------
         * 2.  Walk the schedule and flag deviations
         * ---------------------------------------------------------- */
        let prevActual = accrualStart; // anchor “term 0”
        schedule.forEach((rsi, termIdx) => {
            const actual = rsi.dueDate; // never null for active lines
            // expected = prevActual + 1 month, clamped to month-end
            const tmp = prevActual.plusMonths(1);
            const expected = tmp.withDayOfMonth(Math.min(regularDueDay, tmp.lengthOfMonth()));
            if (!actual.equals(expected)) {
                cpd.addChangePaymentDate(new ChangePaymentDate({
                    termNumber: termIdx,
                    originalDate: expected,
                    newDate: actual,
                }));
                /* Cadence just changed – adopt the new day */
                regularDueDay = actual.dayOfMonth();
            }
            prevActual = actual;
        });
        return cpd;
    }
}

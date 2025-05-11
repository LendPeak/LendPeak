// src/app/parsers/cls/cls.parser.ts

import { SFAttributes, CLSDataResponse, CLSHistoryEntry, CLSLPT, CLSLoan, CLSScheduleEntry } from "./cls.model";
import { DateUtil, Currency } from "lendpeak-engine";
import { LocalDate, LocalDateTime } from "@js-joda/core";

/* ------------------------------------------------------------------ */
/* 1. tiny helpers                                                    */
/* ------------------------------------------------------------------ */
function toDate(val: string | number | null): LocalDate {
  if (val === null || val === undefined || val === "") return DateUtil.today();
  return DateUtil.normalizeDate(val);
}

function toDateTime(val: string | number | null): LocalDateTime {
  if (val === null || val === undefined || val === "") return DateUtil.todayWithTime();
  return DateUtil.normalizeDateTime(val);
}

function toCurr(val: any): Currency {
  // Currency ctor can handle numbers, strings, Decimal, Currency
  return new Currency(val ?? 0);
}

function toNumber(val: any): number {
  const n = typeof val === "string" ? Number(val) : (val as number);
  return isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* 2.  Normalised entities                                            */
/* ------------------------------------------------------------------ */
/**
 * A *thin* wrapper that inflates/normalises primitive SFDC data into
 * strongly-typed values ready for the LendPeak mapper.
 */
export class ClsLoan {
  readonly id: string;
  readonly name: string;

  readonly principal: Currency; // = loan__Loan_Amount__c
  readonly ratePct: number; // e.g. 6  → 6 %
  readonly paymentAmount: Currency; // = loan__Payment_Amount__c
  readonly termPlanned: number; // = loan__Number_of_Installments__c
  readonly prebillDays: number; // = loan__Pre_Bill_Days__c

  readonly status: "Closed - Obligations met" | "Closed- Written Off" | "Active - Bad Standing" | "Active - Good Standing" | "Canceled" | "Closed - Obligations met";

  readonly disbursalDate: string; // ISO
  readonly applicationDate: string; // ISO  (NEW)
  readonly maturityDate: string;
  readonly dueDay: number; // = loan__Due_Day__c
  readonly accrualStartDate: string; // = loan__Accrual_Start_Date__c
  readonly closedDate?: string; // = loan__Closed_Date__c
  readonly lastInstallmentDate: string; // = loan__Last_Installment_Date__c
  readonly raw: CLSLoan;

  constructor(raw: CLSLoan) {
    this.raw = raw;
    this.id = raw.Name;
    this.name = raw.Payoff_Loan_ID__c || raw.Name;

    this.principal = Currency.of(raw.loan__Loan_Amount__c);
    this.ratePct = Number(raw.loan__Contractual_Interest_Rate__c ?? 0);
    this.paymentAmount = Currency.of(raw.loan__Payment_Amount__c ?? 0);
    this.termPlanned = Number(raw.loan__Number_of_Installments__c ?? 0);
    this.prebillDays = Number(raw.loan__Pre_Bill_Days__c ?? 0);

    this.status = raw.loan__Loan_Status__c;
    this.dueDay = Number(raw.loan__Due_Day__c ?? 0);

    /* dates normalised to YYYY-MM-DD */
    this.disbursalDate = raw.loan__Disbursal_Date__c;
    this.applicationDate = raw.loan__Application_Date__c;
    this.maturityDate = raw.loan__Maturity_Date_Current__c;
    this.accrualStartDate = raw.loan__Accrual_Start_Date__c;
    this.lastInstallmentDate = raw.loan__Last_Installment_Date__c;

    if (raw.loan__Closed_Date__c) {
      this.closedDate = raw.loan__Closed_Date__c;
    }
  }

  /** 0.06 etc. */
  get annualRateDecimal(): number {
    return this.ratePct / 100;
  }
}

export class ClsScheduleLine {
  readonly raw: CLSScheduleEntry;

  /** sequential number of the instalment (-1 if we cannot parse it) */
  readonly periodSeq: number;

  /** contractually-due date (always normalised to LocalDate) */
  readonly dueDate: LocalDate;

  readonly principalDue: Currency;
  readonly interestDue: Currency;
  readonly totalInstallment: Currency;

  /* status flags that are useful for filtering/mapping */
  readonly isArchived: boolean;
  readonly isBilled: boolean;
  readonly isPaid: boolean;

  constructor(raw: CLSScheduleEntry) {
    this.raw = raw;

    /* ───── period sequence ─────
     * loan__Id__c is usually “CLS Sequence #”.
     * If it isn’t a number, fall back to a numeric suffix in Name.
     */
    const seq = Number(raw.loan__Id__c) ?? Number((raw.Name ?? "").match(/\d+$/)?.[0]) ?? NaN;

    this.periodSeq = Number.isFinite(seq) ? seq : -1;

    /* ───── core amounts & dates ───── */
    this.dueDate = DateUtil.normalizeDate(raw.loan__Due_Date__c);
    this.principalDue = Currency.of(raw.loan__Due_Principal__c ?? 0);
    this.interestDue = Currency.of(raw.loan__Due_Interest__c ?? 0);
    this.totalInstallment = Currency.of(raw.loan__Total_Installment__c ?? 0);

    /* ───── helper flags ───── */
    this.isArchived = Boolean(raw.loan__Is_Archived__c);
    this.isBilled = Boolean(raw.loan__Is_Billed__c);
    this.isPaid = Boolean(raw.loan__isPaid__c);
  }
}

export class ClsPaymentTxn {
  readonly raw: CLSLPT;
  readonly id: string;
  //readonly postedDate:
  readonly receiptDate: LocalDateTime | null;
  readonly clearingDate: LocalDate | null;
  readonly transactionDate: LocalDate;
  readonly amount: Currency;
  readonly principal: Currency;
  readonly interest: Currency;
  readonly cleared: boolean;
  readonly active: boolean;
  readonly paymentType: "Closure-Tolerance" | "Regular";
  
  constructor(raw: CLSLPT) {
    this.raw = raw;
    this.id = raw.Id;
    this.cleared = !!raw.loan__Cleared__c;
    this.receiptDate = toDateTime(raw.loan__Receipt_Date__c);
    this.clearingDate = toDate(raw.loan__Clearing_Date__c);
    this.transactionDate = toDate(raw.loan__Transaction_Date__c);
    this.amount = toCurr(raw.loan__Transaction_Amount__c);
    this.principal = toCurr(raw.loan__Principal__c);
    this.interest = toCurr(raw.loan__Interest__c);
    this.paymentType = raw.loan__Payment_Type__c;
    this.active = !raw.loan__Reversed__c && !raw.loan__Archived__c && !raw.loan__Rejected__c && raw.loan__Interest__c > 0 && raw.loan__Principal__c > 0;
  }
}

export class ClsHistory {
  readonly raw: CLSHistoryEntry;
  readonly when: LocalDate;
  readonly field: string;
  readonly oldVal: any;
  readonly newVal: any;
  constructor(raw: CLSHistoryEntry) {
    this.raw = raw;
    this.when = toDate(raw.CreatedDate);
    this.field = raw.Field;
    this.oldVal = raw.OldValue;
    this.newVal = raw.NewValue;
  }
}

/* ------------------------------------------------------------------ */
/* 3.  Analytics façade – use this in your components / services      */
/* ------------------------------------------------------------------ */
export interface PaymentReduction {
  fromPeriod: number;
  toPeriod: number;
  oldPayment: Currency;
  newPayment: Currency;
  temporary: boolean;
}

export class ClsParser {
  readonly loan: ClsLoan;
  readonly schedule: ClsScheduleLine[];
  readonly payments: ClsPaymentTxn[];
  readonly history: ClsHistory[];
  readonly rawImportData: string;

  constructor(raw: CLSDataResponse) {
    this.rawImportData = JSON.stringify(raw);
    this.loan = new ClsLoan(raw.loan);

    // make sure schedule is ordered
    this.schedule = raw.schedule.map((s) => new ClsScheduleLine(s)).sort((a, b) => a.periodSeq - b.periodSeq);

    this.payments = raw.lpts.map((l) => new ClsPaymentTxn(l));
    this.history = raw.history.map((h) => new ClsHistory(h));
  }

  /* ─────────────── KPIs & meta info ────────────────────────────── */

  /** Balloon if last installment > 110 % of average previous */
  get hasBalloon(): boolean {
    if (this.schedule.length < 2) return false;
    const body = this.schedule.slice(0, -1);
    const avg = body.reduce((sum, l) => sum + l.totalInstallment.toNumber(), 0) / body.length;
    const last = this.schedule[this.schedule.length - 1].totalInstallment;
    return last.greaterThan(avg * 1.1);
  }

  /** Detect payment-reduction episodes on the schedule table. */
  get reductions(): PaymentReduction[] {
    if (this.schedule.length === 0) return [];

    const baseline = this.schedule.find((l) => !l.totalInstallment.isZero())!.totalInstallment;

    const cuts: PaymentReduction[] = [];
    let inCut = false;
    let current: Partial<PaymentReduction> = {};

    for (const row of this.schedule) {
      const below = row.totalInstallment.lessThan(baseline);
      if (below && !inCut) {
        // start
        inCut = true;
        current = {
          fromPeriod: row.periodSeq,
          oldPayment: baseline,
          newPayment: row.totalInstallment,
        };
      } else if (!below && inCut) {
        // end
        inCut = false;
        current.toPeriod = row.periodSeq - 1;
        current.temporary = true;
        cuts.push(current as PaymentReduction);
      }
    }
    if (inCut) {
      current.toPeriod = this.schedule[this.schedule.length - 1].periodSeq;
      current.temporary = false; // permanent – never returned to baseline
      cuts.push(current as PaymentReduction);
    }
    return cuts;
  }

  get hasPaymentReduction(): boolean {
    return this.reductions.length > 0;
  }

  get totalPrincipalPaid(): Currency {
    return this.payments.map((p) => p.principal).reduce((a, b) => a.add(b), Currency.zero);
  }

  summary() {
    return {
      id: this.loan.id,
      name: this.loan.name,
      status: this.loan.status,
      hasBalloon: this.hasBalloon,
      reductions: this.reductions,
      totalPrincipalPaid: this.totalPrincipalPaid.toNumber(),
    };
  }
}

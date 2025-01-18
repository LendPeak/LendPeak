/**
 * This file provides:
 * 1. "UI-side" interfaces for raw data (simple JS types).
 * 2. A `toAmortizationParams(...)` function that converts
 *    them to the engine's AmortizationParams structure,
 *    turning numbers into Currency, strings/Date into dayjs, etc.
 */

import Decimal from "decimal.js";
import dayjs from "dayjs";

import {
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  BillingModel,
  TermPeriodDefinition,
  JSChangePaymentDate,
  RateSchedule,
  PeriodSchedule,
  TermPaymentAmount,
  Fee,
  JSFee,
  BillDueDaysConfiguration,
  PreBillDaysConfiguration,
} from "../models/Amortization";

import { BalanceModification, IBalanceModification } from "../models/Amortization/BalanceModification";
import { Currency, RoundingMethod } from "../utils/Currency";
import { CalendarType } from "../models/Calendar";
import { PerDiemCalculationType } from "../models/InterestCalculator";

/* -----------------------------------------------------------------
   1) Define "UI" interfaces matching raw data from forms or JSON.
   -----------------------------------------------------------------*/

/**
 * A single UI-friendly representation of a rate schedule entry.
 * Example: The UI might pass {annualInterestRate: 7, startDate: "2025-01-01", endDate: "2025-03-01"}
 */
export interface UIRateSchedule {
  annualInterestRate: number; // e.g., 7 for 7%
  startDate: string | Date;
  endDate: string | Date;
}

/**
 * A single UI-friendly representation of a period schedule entry.
 * Example:
 * {
 *   startDate: "2025-01-01",
 *   endDate: "2025-02-01"
 * }
 */
export interface UIPeriodSchedule {
  startDate: string | Date;
  endDate: string | Date;
}

/**
 * A single UI-friendly representation of a "change payment date" entry.
 * Example:
 * {
 *   termNumber: 3,
 *   newDate: "2025-08-10",
 *   oneTimeChange: true
 * }
 */
export interface UIChangePaymentDate {
  termNumber: number;
  newDate: string | Date;
  oneTimeChange?: boolean;
}

/**
 * UI version of "termPaymentAmountOverride".
 */
export interface UITermPaymentAmount {
  termNumber: number;
  paymentAmount: number; // raw number for UI
}

/**
 * UI version of a single fee that applies to *all terms* or per term.
 * Example:
 * {
 *   type: "percentage",
 *   amount: 0,        // ignored if "percentage"
 *   percentage: 2.5,  // 2.5 means 2.5%
 *   basedOn: "interest",
 *   description: "2.5% fee on interest"
 * }
 */
export interface UIFee {
  type: "fixed" | "percentage";
  amount?: number; // For fixed amount fees
  percentage?: number; // For percentage-based fees, e.g. 2.5 means 2.5%
  basedOn?: "interest" | "principal" | "totalPayment";
  description?: string;
  metadata?: any;
}

/**
 * A UI-friendly version of "feesPerTerm".
 * Example:
 * {
 *   termNumber: 3,
 *   fees: [ { type: "fixed", amount: 10 } ]
 * }
 */
export interface UIFeesPerTerm {
  termNumber: number;
  fees: UIFee[];
}

/**
 * A UI-friendly version of a "balance modification".
 * This corresponds to your existing `BalanceModification` class’s constructor signature.
 * Example:
 * {
 *   type: "decrease",
 *   amount: 100,
 *   date: "2025-06-15",
 *   metadata: { depositId: "abc123" },
 *   description: "manual deposit"
 * }
 */
export interface UIBalanceModification {
  id?: string;
  type: "increase" | "decrease";
  amount: number; // raw number
  date: string | Date;
  description?: string;
  metadata?: any;
  isSystemModification?: boolean;
}

/**
 * UI-friendly version of "preBillDays" or "dueBillDays".
 * Example: { termNumber: 1, preBillDays: 5 }
 */
export interface UIPreBillDaysConfig {
  termNumber: number;
  preBillDays: number;
}
export interface UIDueBillDaysConfig {
  termNumber: number;
  daysDueAfterPeriodEnd: number;
}

/**
 * The shape of a single "fee for a given term" in your UI.
 * It's the same as LoanFeeForAllTerms but with an extra `termNumber`.
 */
export interface LoanFeePerTerm {
  termNumber: number;
  type: "fixed" | "percentage";
  amount?: number; // e.g. 10 means $10
  percentage?: number; // e.g. 3 means 3%
  basedOn?: "interest" | "principal" | "totalPayment";
  description?: string;
  metadata?: any;
}

/**
 * Groups and converts an array of LoanFeePerTerm
 * into the engine’s structure: { termNumber, fees: Fee[] }[].
 *
 * Example usage:
 *   const engineFees = convertLoanFeePerTerm([
 *     { termNumber: 1, type: 'fixed', amount: 10 },
 *     { termNumber: 1, type: 'percentage', percentage: 3, basedOn: 'interest' },
 *     { termNumber: 2, type: 'fixed', amount: 25 },
 *   ]);
 *
 *   // engineFees would be:
 *   [
 *     {
 *       termNumber: 1,
 *       fees: [
 *         { type: 'fixed', amount: Currency.of(10) },
 *         { type: 'percentage', percentage: Decimal(0.03), basedOn: 'interest' }
 *       ]
 *     },
 *     {
 *       termNumber: 2,
 *       fees: [
 *         { type: 'fixed', amount: Currency.of(25) }
 *       ]
 *     }
 *   ]
 */
export function convertLoanFeePerTerm(uiFees: LoanFeePerTerm[]): { termNumber: number; fees: Fee[] }[] {
  // 1) Group by termNumber using a Map
  const map = new Map<number, Fee[]>();

  for (const f of uiFees) {
    if (!map.has(f.termNumber)) {
      map.set(f.termNumber, []);
    }

    const feesArray = map.get(f.termNumber)!;

    // Convert the raw "LoanFeePerTerm" into an engine "Fee"
    const fee: Fee = {
      type: f.type,
      amount: f.type === "fixed" && f.amount !== undefined ? Currency.of(f.amount) : undefined,
      percentage:
        f.type === "percentage" && f.percentage !== undefined
          ? new Decimal(f.percentage).div(100) // e.g. 3 => 0.03
          : undefined,
      basedOn: f.basedOn,
      description: f.description,
      metadata: f.metadata,
    };

    feesArray.push(fee);
  }

  // 2) Convert the Map into the array that AmortizationParams expects
  const result: { termNumber: number; fees: Fee[] }[] = [];
  for (const [termNumber, fees] of map.entries()) {
    result.push({ termNumber, fees });
  }
  // Optionally, sort by termNumber if you want them in ascending order
  result.sort((a, b) => a.termNumber - b.termNumber);

  return result;
}

/**
 * The master UI interface capturing *all* fields your engine might possibly accept.
 * NOTE: Not all fields are mandatory in practice,
 * but this is a "kitchen sink" so your UI can pass them as needed.
 */
export interface UIAmortizationParams {
  // Mandatory basics:
  loanAmount: number; // e.g., 10000
  term: number; // e.g., 12
  annualInterestRate: number; // e.g., 10 means 10%
  startDate: string | Date; // e.g., "2025-01-01"

  // Common optional fields:
  endDate?: string | Date;
  originationFee?: number; // e.g., 100
  firstPaymentDate?: string | Date;

  // Additional engine settings:
  calendarType?: CalendarType | string;
  roundingMethod?: RoundingMethod | string;
  roundingPrecision?: number;
  flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType | string; // "none", "at_end", or "at_threshold"
  flushThreshold?: number; // e.g., 0.01
  perDiemCalculationType?: PerDiemCalculationType | string; // "AnnualRateDividedByDaysInYear", etc.
  billingModel?: BillingModel | string; // "amortized" or "dailySimpleInterest"
  allowRateAbove100?: boolean;

  // Possibly advanced or custom overrides:
  ratesSchedule?: UIRateSchedule[];
  periodsSchedule?: UIPeriodSchedule[];
  termPaymentAmountOverride?: UITermPaymentAmount[];
  termPaymentAmount?: number; // raw number
  changePaymentDates?: UIChangePaymentDate[];
  balanceModifications?: BalanceModification[];

  // Fee-related:
  feesForAllTerms?: UIFee[];
  feesPerTerm?: LoanFeePerTerm[];

  // Pre-bill / due-bill day overrides:
  defaultPreBillDaysConfiguration?: number; // e.g., 5
  defaultBillDueDaysAfterPeriodEndConfiguration?: number; // e.g., 3
  preBillDays?: UIPreBillDaysConfig[];
  dueBillDays?: UIDueBillDaysConfig[];

  // If your system supports "termInterestOverride":
  termInterestOverride?: {
    termNumber: number;
    interestAmount: number; // user can pass raw number
  }[];

  termInterestRateOverride?: {
    termNumber: number;
    interestRate: number; // user can pass raw number
  }[];

  // "TermPeriodDefinition" (if used):
  termPeriodDefinition?: {
    unit: "year" | "month" | "week" | "day" | "complex";
    count: number[]; // e.g. [1], or [3]
  };
}

/* -----------------------------------------------------------------
   2) The conversion function: raw UI data => AmortizationParams
   -----------------------------------------------------------------*/

/**
 * Convert UI-friendly raw data to the strongly typed engine `AmortizationParams`.
 */
export function toAmortizationParams(ui: UIAmortizationParams): AmortizationParams {
  /* ---------------------
     1) Basic numeric => Currency / Decimal
     --------------------- */
  const loanAmount = Currency.of(ui.loanAmount);
  const originationFee = ui.originationFee !== undefined ? Currency.of(ui.originationFee) : Currency.of(0);

  const annualInterestRate = new Decimal(ui.annualInterestRate).div(100);
  const termPaymentAmount = ui.termPaymentAmount !== undefined ? Currency.of(ui.termPaymentAmount) : undefined;
  /* ---------------------
     2) Convert dates => dayjs
     --------------------- */
  const startDate = dayjs(ui.startDate);
  const endDate = ui.endDate ? dayjs(ui.endDate) : undefined;
  const firstPaymentDate = ui.firstPaymentDate ? dayjs(ui.firstPaymentDate) : undefined;

  /* ---------------------
     3) Convert string-based enums => actual enums
     --------------------- */
  // Rounding method
  let roundingMethod: RoundingMethod = RoundingMethod.ROUND_HALF_EVEN;
  if (typeof ui.roundingMethod === "string") {
    switch (ui.roundingMethod) {
      case "ROUND_UP":
        roundingMethod = RoundingMethod.ROUND_UP;
        break;
      case "ROUND_DOWN":
        roundingMethod = RoundingMethod.ROUND_DOWN;
        break;
      case "ROUND_HALF_UP":
        roundingMethod = RoundingMethod.ROUND_HALF_UP;
        break;
      case "ROUND_HALF_DOWN":
        roundingMethod = RoundingMethod.ROUND_HALF_DOWN;
        break;
      case "ROUND_HALF_CEIL":
        roundingMethod = RoundingMethod.ROUND_HALF_CEIL;
        break;
      case "ROUND_HALF_FLOOR":
        roundingMethod = RoundingMethod.ROUND_HALF_FLOOR;
        break;
      default:
        roundingMethod = RoundingMethod.ROUND_HALF_EVEN; // fallback
    }
  }

  // Flush method
  let flushMethodEnum: FlushUnbilledInterestDueToRoundingErrorType = FlushUnbilledInterestDueToRoundingErrorType.NONE;
  if (typeof ui.flushUnbilledInterestRoundingErrorMethod === "string") {
    switch (ui.flushUnbilledInterestRoundingErrorMethod) {
      case "none":
        flushMethodEnum = FlushUnbilledInterestDueToRoundingErrorType.NONE;
        break;
      case "at_end":
        flushMethodEnum = FlushUnbilledInterestDueToRoundingErrorType.AT_END;
        break;
      case "at_threshold":
        flushMethodEnum = FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
        break;
      default:
        flushMethodEnum = FlushUnbilledInterestDueToRoundingErrorType.NONE;
    }
  }

  // Billing model
  let billingModel: BillingModel = "amortized";
  if (ui.billingModel === "dailySimpleInterest") {
    billingModel = "dailySimpleInterest";
  }

  // Per diem
  let perDiemCalc: PerDiemCalculationType;
  if (ui.perDiemCalculationType === "MonthlyRateDividedByDaysInMonth") {
    perDiemCalc = "MonthlyRateDividedByDaysInMonth";
  } else {
    perDiemCalc = "AnnualRateDividedByDaysInYear";
  }

  /* ---------------------
     4) Convert array fields
     --------------------- */
  // Rate schedule
  let ratesSchedule: RateSchedule[] | undefined = undefined;
  if (ui.ratesSchedule && ui.ratesSchedule.length > 0) {
    ratesSchedule = ui.ratesSchedule.map((r) => ({
      annualInterestRate: new Decimal(r.annualInterestRate).div(100),
      startDate: dayjs(r.startDate),
      endDate: dayjs(r.endDate),
    }));
  }

  // Periods schedule
  let periodsSchedule: PeriodSchedule[] | undefined = undefined;
  if (ui.periodsSchedule && ui.periodsSchedule.length > 0) {
    periodsSchedule = ui.periodsSchedule.map((p) => ({
      startDate: dayjs(p.startDate).startOf("day"),
      endDate: dayjs(p.endDate).startOf("day"),
    }));
  }

  // Term payment overrides
  let termPaymentAmountOverride: TermPaymentAmount[] | undefined = undefined;
  if (ui.termPaymentAmountOverride && ui.termPaymentAmountOverride.length > 0) {
    termPaymentAmountOverride = ui.termPaymentAmountOverride.map((t) => ({
      termNumber: t.termNumber,
      paymentAmount: Currency.of(t.paymentAmount),
    }));
  }

  // Change payment dates
  let changePaymentDates: JSChangePaymentDate[] | undefined = undefined;
  if (ui.changePaymentDates && ui.changePaymentDates.length > 0) {
    changePaymentDates = ui.changePaymentDates.map((c) => ({
      termNumber: c.termNumber,
      newDate: dayjs(c.newDate),
      oneTimeChange: c.oneTimeChange ?? false,
    }));
  }

  // Balance modifications: convert raw UI to real BalanceModification
  let balanceModifications: BalanceModification[] | undefined = undefined;
  if (ui.balanceModifications && ui.balanceModifications.length > 0) {
    balanceModifications = ui.balanceModifications.map((b) => {
      const params: IBalanceModification = {
        id: b.id,
        type: b.type,
        amount: b.amount, // raw number -> internally BalanceModification uses Currency.of(amount)
        date: b.date,
        description: b.description,
        metadata: b.metadata,
        isSystemModification: b.isSystemModification,
      };
      return new BalanceModification(params);
    });
  }

  // Fees for all terms
  let feesForAllTerms: JSFee[] | undefined = undefined;
  if (ui.feesForAllTerms && ui.feesForAllTerms.length > 0) {
    feesForAllTerms = ui.feesForAllTerms.map((f) => ({
      type: f.type,
      amount: f.amount !== undefined ? f.amount : undefined,
      percentage: f.percentage !== undefined ? new Decimal(f.percentage).div(100) : undefined,
      basedOn: f.basedOn,
      description: f.description,
      metadata: f.metadata,
    }));
  }

  // Fees per term
  let feesPerTerm: { termNumber: number; fees: Fee[] }[] | undefined;
  if (ui.feesPerTerm && ui.feesPerTerm.length > 0) {
    feesPerTerm = convertLoanFeePerTerm(ui.feesPerTerm);
  }

  // Pre-bill days
  let preBillDays: PreBillDaysConfiguration[] | undefined = undefined;
  if (ui.preBillDays && ui.preBillDays.length > 0) {
    preBillDays = ui.preBillDays.map((pbd) => ({
      termNumber: pbd.termNumber,
      preBillDays: pbd.preBillDays,
    }));
  }

  // Due-bill days
  let dueBillDays: BillDueDaysConfiguration[] | undefined = undefined;
  if (ui.dueBillDays && ui.dueBillDays.length > 0) {
    dueBillDays = ui.dueBillDays.map((dbd) => ({
      termNumber: dbd.termNumber,
      daysDueAfterPeriodEnd: dbd.daysDueAfterPeriodEnd,
    }));
  }

  // Term interest override
  let termInterestOverride: { termNumber: number; interestAmount: Currency }[] | undefined = undefined;
  if (ui.termInterestOverride && ui.termInterestOverride.length > 0) {
    termInterestOverride = ui.termInterestOverride.map((o) => ({
      termNumber: o.termNumber,
      interestAmount: Currency.of(o.interestAmount),
    }));
  }

  // Term interest rate override
  let termInterestRateOverride: { termNumber: number; interestRate: Decimal }[] | undefined = undefined;
  if (ui.termInterestRateOverride && ui.termInterestRateOverride.length > 0) {
    termInterestRateOverride = ui.termInterestRateOverride.map((o) => ({
      termNumber: o.termNumber,
      interestRate: new Decimal(o.interestRate).div(100),
    }));
  }

  // Term period definition
  let termPeriodDefinition: TermPeriodDefinition | undefined = undefined;
  if (ui.termPeriodDefinition) {
    termPeriodDefinition = {
      unit: ui.termPeriodDefinition.unit,
      count: ui.termPeriodDefinition.count,
    };
  }

  /* -----------------------------
     5) Build the engine params
     ----------------------------- */
  const engineParams: AmortizationParams = {
    // Basics
    loanAmount,
    originationFee,
    annualInterestRate,
    term: ui.term,
    startDate,
    endDate,

    // Optional
    termPaymentAmount,
    firstPaymentDate,
    calendarType: ui.calendarType ?? CalendarType.ACTUAL_ACTUAL,
    roundingMethod,
    flushUnbilledInterestRoundingErrorMethod: flushMethodEnum,
    roundingPrecision: ui.roundingPrecision ?? 2,
    flushThreshold: ui.flushThreshold !== undefined ? Currency.of(ui.flushThreshold) : Currency.of(0.01),
    perDiemCalculationType: perDiemCalc,
    billingModel,
    allowRateAbove100: ui.allowRateAbove100 ?? false,

    // Arrays
    ratesSchedule,
    periodsSchedule,
    termPaymentAmountOverride,
    changePaymentDates,
    balanceModifications,

    feesForAllTerms,
    feesPerTerm,

    // Pre-bill & due-bill
    defaultPreBillDaysConfiguration: ui.defaultPreBillDaysConfiguration ?? 0,
    defaultBillDueDaysAfterPeriodEndConfiguration: ui.defaultBillDueDaysAfterPeriodEndConfiguration ?? 0,
    preBillDays,
    dueBillDays,

    // Term overrides
    termInterestOverride,
    termInterestRateOverride,
    termPeriodDefinition,
  };

  return engineParams;
}

import Decimal from 'decimal.js';
import dayjs, { Dayjs } from 'dayjs';
import { BalanceModification } from './BalanceModification';
import { Currency } from '../../utils/Currency';
import { Calendar, CalendarType } from '../Calendar';
import { DateUtil } from '../../utils/DateUtil';
import { LocalDate, ZoneId } from '@js-joda/core';

/**
 * Optional metadata interface for the schedule entry
 */
export interface AmortizationScheduleMetadata {
  splitInterestPeriod?: boolean;
  splitBalancePeriod?: boolean;
  unbilledInterestApplied?: boolean;
  unbilledInterestAppliedAmount?: number;
  interestLessThanOneCent?: boolean;
  unbilledInterestAmount?: number;
  actualInterestValue?: number;
  finalAdjustment?: boolean;
  deferredInterestAppliedAmount?: number;
  amountAddedToDeferredInterest?: number;
  deferredFeesAppliedAmount?: number;
  amountAddedToDeferredFees?: number;
  staticInterestOverrideApplied?: boolean;
  equivalentAnnualRate?: number;
  equivalentAnnualRateVariance?: number;
  acceptableRateVariance?: number;
  equivalentAnnualRateVarianceExceeded?: boolean;
  isCustomCalendar?: boolean;
  isFinalEntry?: boolean;
}

/**
 * Constructor parameters for creating an AmortizationEntry.
 *
 * We allow only certain unions:
 * - Numbers that can be represented as `number` or `Currency`.
 * - Rates that can be `Decimal`, `number`, or `string`.
 * - Dates that can be `string | Date | Dayjs`.
 * - Booleans as `boolean`.
 */
export interface AmortizationEntryParams {
  term: number;
  // zeroPeriod can be derived from `term - 1`, but if you want it explicit, make it optional:
  // zeroPeriod?: number;
  periodStartDate: string | Date | LocalDate;
  periodEndDate: string | Date | LocalDate;

  prebillDaysConfiguration: number;
  billDueDaysAfterPeriodEndConfiguration: number;

  billablePeriod: boolean;
  billingModel?: 'amortized' | 'dailySimpleInterest';

  periodBillOpenDate: string | Date | LocalDate;
  periodBillDueDate: string | Date | LocalDate;

  periodInterestRate: string | number | Decimal;

  principal: number | Currency;

  dueInterestForTerm: number | Currency;
  accruedInterestForPeriod: number | Currency;
  billedInterestForTerm: number | Currency;
  billedDeferredInterest: number | Currency;
  unbilledTotalDeferredInterest: number | Currency;

  fees: number | Currency;
  billedDeferredFees: number | Currency;
  unbilledTotalDeferredFees: number | Currency;

  totalPayment: number | Currency;
  endBalance: number | Currency;
  startBalance: number | Currency;

  balanceModificationAmount: number | Currency;
  balanceModification?: BalanceModification | object; // or possibly some JSON type

  perDiem: number | Currency;
  daysInPeriod: number;

  calendar: Calendar;

  interestRoundingError: number | Currency;
  unbilledInterestDueToRounding: number | Currency;

  metadata?: AmortizationScheduleMetadata;
  
  // DSI balance tracking
  actualDSIStartBalance?: number | Currency;
  actualDSIEndBalance?: number | Currency;
  
  // DSI interest duration tracking
  dsiInterestDays?: number;
  dsiPreviousPaymentDate?: LocalDate;
  
  // Re-amortized fields
  reAmortizedStartBalance?: number | Currency;
  reAmortizedEndBalance?: number | Currency;
  reAmortizedInterest?: number | Currency;
  reAmortizedPrincipal?: number | Currency;
  reAmortizedFees?: number | Currency;
  reAmortizedTotalPayment?: number | Currency;
  reAmortizedDsiInterestDays?: number;
  reAmortizedPerDiem?: number | Currency;
  
  // Status flags
  isCurrentActiveTerm?: boolean;
  isDelinquent?: boolean;
  lastPaymentDate?: LocalDate;
}

/**
 * Represents one entry/row in an amortization schedule.
 */
export class AmortizationEntry {
  //
  // ================= PRIVATE BACKING FIELDS =================
  //
  private _term!: number;

  private _periodStartDate!: LocalDate;
  private _periodEndDate!: LocalDate;

  private _prebillDaysConfiguration!: number;
  private _billDueDaysAfterPeriodEndConfiguration!: number;

  private _billablePeriod!: boolean;
  private _periodBillOpenDate!: LocalDate;
  private _periodBillDueDate!: LocalDate;

  private _periodInterestRate!: Decimal;

  private _principal!: Currency;

  private _dueInterestForTerm!: Currency;
  private _accruedInterestForPeriod!: Currency;
  private _billedInterestForTerm!: Currency;
  private _billedDeferredInterest!: Currency;
  private _unbilledTotalDeferredInterest!: Currency;

  private _fees!: Currency;
  private _billedDeferredFees!: Currency;
  private _unbilledTotalDeferredFees!: Currency;

  private _totalPayment!: Currency;
  private _endBalance!: Currency;
  private _startBalance!: Currency;

  private _balanceModificationAmount!: Currency;
  private _balanceModification?: BalanceModification;

  private _perDiem!: Currency;
  private _daysInPeriod!: number;

  private _interestRoundingError!: Currency;
  private _unbilledInterestDueToRounding!: Currency;

  private _calendar!: Calendar;

  private _metadata: AmortizationScheduleMetadata = {};
  private _billingModel?: 'amortized' | 'dailySimpleInterest';

  // DSI fields
  public actualDSIPrincipal?: Currency;
  public actualDSIInterest?: Currency;
  public actualDSIFees?: Currency;
  public dsiInterestSavings?: number;
  public dsiInterestPenalty?: number;
  public usageDetails: any[] = [];
  
  // DSI actual balance tracking
  public actualDSIStartBalance?: Currency;
  public actualDSIEndBalance?: Currency;
  
  // DSI interest duration tracking
  public dsiInterestDays?: number;
  public dsiPreviousPaymentDate?: LocalDate;

  // Re-amortized balance fields
  public reAmortizedStartBalance?: Currency;
  public reAmortizedEndBalance?: Currency;

  // Re-amortized payment breakdown
  public reAmortizedInterest?: Currency;
  public reAmortizedPrincipal?: Currency;
  public reAmortizedFees?: Currency;
  public reAmortizedTotalPayment?: Currency;

  // Re-amortized DSI tracking
  public reAmortizedDsiInterestDays?: number;
  public reAmortizedPerDiem?: Currency;

  // Status flags
  public isCurrentActiveTerm?: boolean;
  public isDelinquent?: boolean;
  public lastPaymentDate?: LocalDate;

  //
  // =========== PUBLIC "js*" PROPERTIES FOR UI BINDING ===========
  //
  public jsTerm!: number;

  public jsPeriodStartDate!: Date; // store ISO or "YYYY-MM-DD"
  public jsPeriodEndDate!: Date;

  public jsPrebillDaysConfiguration!: number;
  public jsBillDueDaysAfterPeriodEndConfiguration!: number;

  public jsBillablePeriod!: boolean;
  public jsPeriodBillOpenDate!: Date;
  public jsPeriodBillDueDate!: Date;

  public jsPeriodInterestRate!: string; // e.g. "0.06" or "6" or "0.06..."
  public jsPrincipal!: number;

  public jsDueInterestForTerm!: number;
  public jsAccruedInterestForPeriod!: number;
  public jsBilledInterestForTerm!: number;
  public jsBilledDeferredInterest!: number;
  public jsUnbilledTotalDeferredInterest!: number;

  public jsFees!: number;
  public jsBilledDeferredFees!: number;
  public jsUnbilledTotalDeferredFees!: number;

  public jsTotalPayment!: number;
  public jsEndBalance!: number;
  public jsStartBalance!: number;

  public jsBalanceModificationAmount!: number;
  // Could define `jsBalanceModification` if needed.

  public jsPerDiem!: number;
  public jsDaysInPeriod!: number;

  public jsInterestRoundingError!: number;
  public jsUnbilledInterestDueToRounding!: number;

  public jsMetadata!: AmortizationScheduleMetadata;

  //
  // ===================== CONSTRUCTOR =====================
  //
  constructor(
    params: AmortizationEntryParams & {
      actualDSIPrincipal?: Currency;
      actualDSIInterest?: Currency;
      actualDSIFees?: Currency;
      dsiInterestSavings?: number;
      dsiInterestPenalty?: number;
      usageDetails?: any[];
      actualDSIStartBalance?: Currency | number;
      actualDSIEndBalance?: Currency | number;
      reAmortizedStartBalance?: Currency | number;
      reAmortizedEndBalance?: Currency | number;
      reAmortizedInterest?: Currency | number;
      reAmortizedPrincipal?: Currency | number;
      reAmortizedFees?: Currency | number;
      reAmortizedTotalPayment?: Currency | number;
      reAmortizedDsiInterestDays?: number;
      reAmortizedPerDiem?: Currency | number;
      isCurrentActiveTerm?: boolean;
      isDelinquent?: boolean;
      lastPaymentDate?: LocalDate;
    }
  ) {
    this.term = params.term;

    this.periodStartDate = params.periodStartDate;
    this.periodEndDate = params.periodEndDate;

    this.prebillDaysConfiguration = params.prebillDaysConfiguration;
    this.billDueDaysAfterPeriodEndConfiguration = params.billDueDaysAfterPeriodEndConfiguration;

    this.billablePeriod = params.billablePeriod;
    this.periodBillOpenDate = params.periodBillOpenDate;
    this.periodBillDueDate = params.periodBillDueDate;

    this.periodInterestRate = params.periodInterestRate;
    this.principal = params.principal;

    this.dueInterestForTerm = params.dueInterestForTerm;
    this.accruedInterestForPeriod = params.accruedInterestForPeriod;
    this.billedInterestForTerm = params.billedInterestForTerm;
    this.billedDeferredInterest = params.billedDeferredInterest;
    this.unbilledTotalDeferredInterest = params.unbilledTotalDeferredInterest;

    this.fees = params.fees;
    this.billedDeferredFees = params.billedDeferredFees;
    this.unbilledTotalDeferredFees = params.unbilledTotalDeferredFees;

    this.totalPayment = params.totalPayment;
    this.endBalance = params.endBalance;
    this.startBalance = params.startBalance;

    this.balanceModificationAmount = params.balanceModificationAmount;
    if (params.balanceModification) {
      // If it's a real object, parse it:
      if (params.balanceModification instanceof BalanceModification) {
        this._balanceModification = params.balanceModification;
      } else {
        this._balanceModification = BalanceModification.fromJSON(params.balanceModification);
      }
    }

    this.perDiem = params.perDiem;
    this.daysInPeriod = params.daysInPeriod;

    this.interestRoundingError = params.interestRoundingError;
    this.unbilledInterestDueToRounding = params.unbilledInterestDueToRounding;

    this.calendar = params.calendar;

    this.metadata = params.metadata ?? {};
    this.billingModel = params.billingModel;

    if (params.actualDSIPrincipal) this.actualDSIPrincipal = params.actualDSIPrincipal;
    if (params.actualDSIInterest) this.actualDSIInterest = params.actualDSIInterest;
    if (params.actualDSIFees) this.actualDSIFees = params.actualDSIFees;
    if (params.dsiInterestSavings) this.dsiInterestSavings = params.dsiInterestSavings;
    if (params.dsiInterestPenalty) this.dsiInterestPenalty = params.dsiInterestPenalty;
    if (params.usageDetails) this.usageDetails = params.usageDetails;
    if (params.actualDSIStartBalance !== undefined) {
      this.actualDSIStartBalance = Currency.of(params.actualDSIStartBalance);
    }
    if (params.actualDSIEndBalance !== undefined) {
      this.actualDSIEndBalance = Currency.of(params.actualDSIEndBalance);
    }
    if (params.dsiInterestDays !== undefined) {
      this.dsiInterestDays = params.dsiInterestDays;
    }
    if (params.dsiPreviousPaymentDate) {
      this.dsiPreviousPaymentDate = params.dsiPreviousPaymentDate;
    }

    // Initialize re-amortized fields
    if (params.reAmortizedStartBalance !== undefined) {
      this.reAmortizedStartBalance = Currency.of(params.reAmortizedStartBalance);
    }
    if (params.reAmortizedEndBalance !== undefined) {
      this.reAmortizedEndBalance = Currency.of(params.reAmortizedEndBalance);
    }
    if (params.reAmortizedInterest !== undefined) {
      this.reAmortizedInterest = Currency.of(params.reAmortizedInterest);
    }
    if (params.reAmortizedPrincipal !== undefined) {
      this.reAmortizedPrincipal = Currency.of(params.reAmortizedPrincipal);
    }
    if (params.reAmortizedFees !== undefined) {
      this.reAmortizedFees = Currency.of(params.reAmortizedFees);
    }
    if (params.reAmortizedTotalPayment !== undefined) {
      this.reAmortizedTotalPayment = Currency.of(params.reAmortizedTotalPayment);
    }
    if (params.reAmortizedDsiInterestDays !== undefined) {
      this.reAmortizedDsiInterestDays = params.reAmortizedDsiInterestDays;
    }
    if (params.reAmortizedPerDiem !== undefined) {
      this.reAmortizedPerDiem = Currency.of(params.reAmortizedPerDiem);
    }
    if (params.isCurrentActiveTerm !== undefined) {
      this.isCurrentActiveTerm = params.isCurrentActiveTerm;
    }
    if (params.isDelinquent !== undefined) {
      this.isDelinquent = params.isDelinquent;
    }
    if (params.lastPaymentDate) {
      this.lastPaymentDate = params.lastPaymentDate;
    }

    // Finally, push model data → jsX for the UI
    this.updateJsValues();
  }

  //
  // ===================== GETTERS & SETTERS =====================
  //

  public get calendar(): Calendar {
    return this._calendar;
  }

  public set calendar(value: Calendar | CalendarType) {
    if (!(value instanceof Calendar)) {
      value = new Calendar(value);
    }
    this._calendar = value;
  }

  public get term(): number {
    return this._term;
  }
  public set term(value: number) {
    if (typeof value !== 'number') {
      throw new Error(`term must be a number. Received: ${typeof value}`);
    }
    this._term = value;
  }

  public get periodStartDate(): LocalDate {
    return this._periodStartDate;
  }
  public set periodStartDate(raw: string | Date | LocalDate) {
    this._periodStartDate = DateUtil.normalizeDate(raw);
  }

  public get periodEndDate(): LocalDate {
    return this._periodEndDate;
  }
  public set periodEndDate(raw: string | Date | LocalDate) {
    this._periodEndDate = DateUtil.normalizeDate(raw);
  }

  public get prebillDaysConfiguration(): number {
    return this._prebillDaysConfiguration;
  }
  public set prebillDaysConfiguration(val: number) {
    this._prebillDaysConfiguration = this.parseNumber(val, 'prebillDaysConfiguration');
  }

  public get billDueDaysAfterPeriodEndConfiguration(): number {
    return this._billDueDaysAfterPeriodEndConfiguration;
  }
  public set billDueDaysAfterPeriodEndConfiguration(val: number) {
    this._billDueDaysAfterPeriodEndConfiguration = this.parseNumber(val, 'billDueDaysAfterPeriodEndConfiguration');
  }

  public get billablePeriod(): boolean {
    return this._billablePeriod;
  }
  public set billablePeriod(raw: boolean) {
    if (typeof raw !== 'boolean') {
      throw new Error(`billablePeriod must be boolean, got: ${raw}`);
    }
    this._billablePeriod = raw;
  }

  public get periodBillOpenDate(): LocalDate {
    return this._periodBillOpenDate;
  }
  public set periodBillOpenDate(raw: string | Date | LocalDate) {
    this._periodBillOpenDate = DateUtil.normalizeDate(raw);
  }

  public get periodBillDueDate(): LocalDate {
    return this._periodBillDueDate;
  }
  public set periodBillDueDate(raw: string | Date | LocalDate) {
    this._periodBillDueDate = DateUtil.normalizeDate(raw);
  }

  public get periodInterestRate(): Decimal {
    return this._periodInterestRate;
  }
  public set periodInterestRate(raw: string | number | Decimal) {
    if (raw instanceof Decimal) {
      this._periodInterestRate = raw;
    } else if (typeof raw === 'number' || typeof raw === 'string') {
      this._periodInterestRate = new Decimal(raw);
    } else {
      throw new Error(`periodInterestRate must be Decimal|number|string, got: ${typeof raw}`);
    }
  }

  public get principal(): Currency {
    return this._principal;
  }
  public set principal(raw: number | Currency) {
    this._principal = this.parseCurrency(raw, 'principal');
  }

  public get dueInterestForTerm(): Currency {
    return this._dueInterestForTerm;
  }
  public set dueInterestForTerm(raw: number | Currency) {
    this._dueInterestForTerm = this.parseCurrency(raw, 'dueInterestForTerm');
  }

  public get accruedInterestForPeriod(): Currency {
    return this._accruedInterestForPeriod;
  }
  public set accruedInterestForPeriod(raw: number | Currency) {
    this._accruedInterestForPeriod = this.parseCurrency(raw, 'accruedInterestForPeriod');
  }

  public get billedInterestForTerm(): Currency {
    return this._billedInterestForTerm;
  }
  public set billedInterestForTerm(raw: number | Currency) {
    this._billedInterestForTerm = this.parseCurrency(raw, 'billedInterestForTerm');
  }

  public get billedDeferredInterest(): Currency {
    return this._billedDeferredInterest;
  }
  public set billedDeferredInterest(raw: number | Currency) {
    this._billedDeferredInterest = this.parseCurrency(raw, 'billedDeferredInterest');
  }

  public get unbilledTotalDeferredInterest(): Currency {
    return this._unbilledTotalDeferredInterest;
  }
  public set unbilledTotalDeferredInterest(raw: number | Currency) {
    this._unbilledTotalDeferredInterest = this.parseCurrency(raw, 'unbilledTotalDeferredInterest');
  }

  public get fees(): Currency {
    return this._fees;
  }
  public set fees(raw: number | Currency) {
    this._fees = this.parseCurrency(raw, 'fees');
  }

  public get billedDeferredFees(): Currency {
    return this._billedDeferredFees;
  }
  public set billedDeferredFees(raw: number | Currency) {
    this._billedDeferredFees = this.parseCurrency(raw, 'billedDeferredFees');
  }

  public get unbilledTotalDeferredFees(): Currency {
    return this._unbilledTotalDeferredFees;
  }
  public set unbilledTotalDeferredFees(raw: number | Currency) {
    this._unbilledTotalDeferredFees = this.parseCurrency(raw, 'unbilledTotalDeferredFees');
  }

  public get totalPayment(): Currency {
    return this._totalPayment;
  }
  public set totalPayment(raw: number | Currency) {
    this._totalPayment = this.parseCurrency(raw, 'totalPayment');
  }

  public get endBalance(): Currency {
    return this._endBalance;
  }
  public set endBalance(raw: number | Currency) {
    this._endBalance = this.parseCurrency(raw, 'endBalance');
  }

  public get startBalance(): Currency {
    return this._startBalance;
  }
  public set startBalance(raw: number | Currency) {
    this._startBalance = this.parseCurrency(raw, 'startBalance');
  }

  public get balanceModificationAmount(): Currency {
    return this._balanceModificationAmount;
  }
  public set balanceModificationAmount(raw: number | Currency) {
    this._balanceModificationAmount = this.parseCurrency(raw, 'balanceModificationAmount');
  }

  public get balanceModification(): BalanceModification | undefined {
    return this._balanceModification;
  }
  public set balanceModification(raw: BalanceModification | object | undefined) {
    if (raw instanceof BalanceModification) {
      this._balanceModification = raw;
    } else if (typeof raw === 'object' && raw !== null) {
      this._balanceModification = BalanceModification.fromJSON(raw);
    } else if (raw === undefined) {
      this._balanceModification = undefined;
    } else {
      throw new Error(`Invalid balanceModification: must be object or BalanceModification`);
    }
  }

  public get perDiem(): Currency {
    return this._perDiem;
  }
  public set perDiem(raw: number | Currency) {
    this._perDiem = this.parseCurrency(raw, 'perDiem');
  }

  public get daysInPeriod(): number {
    return this._daysInPeriod;
  }
  public set daysInPeriod(val: number) {
    this._daysInPeriod = this.parseNumber(val, 'daysInPeriod');
  }

  public get interestRoundingError(): Currency {
    return this._interestRoundingError;
  }
  public set interestRoundingError(raw: number | Currency) {
    this._interestRoundingError = this.parseCurrency(raw, 'interestRoundingError');
  }

  public get unbilledInterestDueToRounding(): Currency {
    return this._unbilledInterestDueToRounding;
  }
  public set unbilledInterestDueToRounding(raw: number | Currency) {
    this._unbilledInterestDueToRounding = this.parseCurrency(raw, 'unbilledInterestDueToRounding');
  }

  public get metadata(): AmortizationScheduleMetadata {
    return this._metadata;
  }
  public set metadata(val: AmortizationScheduleMetadata | undefined) {
    // If not provided, default to {}
    if (!val) {
      val = {};
    }
    if (typeof val !== 'object') {
      throw new Error(`metadata must be an object, got: ${typeof val}`);
    }
    this._metadata = val;
  }

  public get billingModel(): 'amortized' | 'dailySimpleInterest' | undefined {
    return this._billingModel;
  }
  public set billingModel(val: 'amortized' | 'dailySimpleInterest' | undefined) {
    this._billingModel = val;
  }

  //
  // ===================== HELPER PARSE METHODS =====================
  //

  private parseNumber(val: any, fieldName: string): number {
    if (typeof val === 'number') return val;
    throw new Error(`${fieldName} must be a number, got: ${val}`);
  }

  private parseCurrency(raw: number | Currency, fieldName: string): Currency {
    if (raw instanceof Currency) {
      return raw;
    } else if (typeof raw === 'number') {
      return Currency.of(raw);
    }
    throw new Error(`${fieldName} must be Currency or number, got: ${typeof raw}`);
  }

  //
  // ============= updateJsValues / updateModelValues =============
  //
  /** Push model data → js* fields (for UI binding). */
  public updateJsValues(): void {
    this.jsTerm = this.term;

    this.jsPeriodStartDate = DateUtil.normalizeDateToJsDate(this.periodStartDate);
    this.jsPeriodEndDate = DateUtil.normalizeDateToJsDate(this.periodEndDate);

    this.jsPrebillDaysConfiguration = this.prebillDaysConfiguration;
    this.jsBillDueDaysAfterPeriodEndConfiguration = this.billDueDaysAfterPeriodEndConfiguration;

    this.jsBillablePeriod = this.billablePeriod;
    this.jsPeriodBillOpenDate = DateUtil.normalizeDateToJsDate(this.periodBillOpenDate);
    this.jsPeriodBillDueDate = DateUtil.normalizeDateToJsDate(this.periodBillDueDate);

    this.jsPeriodInterestRate = this.periodInterestRate.toString();
    this.jsPrincipal = this.principal.toNumber();

    this.jsDueInterestForTerm = this.dueInterestForTerm.toNumber();
    this.jsAccruedInterestForPeriod = this.accruedInterestForPeriod.toNumber();
    this.jsBilledInterestForTerm = this.billedInterestForTerm.toNumber();
    this.jsBilledDeferredInterest = this.billedDeferredInterest.toNumber();
    this.jsUnbilledTotalDeferredInterest = this.unbilledTotalDeferredInterest.toNumber();

    this.jsFees = this.fees.toNumber();
    this.jsBilledDeferredFees = this.billedDeferredFees.toNumber();
    this.jsUnbilledTotalDeferredFees = this.unbilledTotalDeferredFees.toNumber();

    this.jsTotalPayment = this.totalPayment.toNumber();
    this.jsEndBalance = this.endBalance.toNumber();
    this.jsStartBalance = this.startBalance.toNumber();

    this.jsBalanceModificationAmount = this.balanceModificationAmount.toNumber();
    // If you want: this.jsBalanceModification = ???

    this.jsPerDiem = this.perDiem.toNumber();
    this.jsDaysInPeriod = this.daysInPeriod;

    this.jsInterestRoundingError = this.interestRoundingError.toNumber();
    this.jsUnbilledInterestDueToRounding = this.unbilledInterestDueToRounding.toNumber();

    this.jsMetadata = this.metadata;
  }

  /** Push js* (UI-edited) fields → real model fields. */
  public updateModelValues(): void {
    this.term = this.jsTerm;

    this.periodStartDate = this.jsPeriodStartDate;
    this.periodEndDate = this.jsPeriodEndDate;

    this.prebillDaysConfiguration = this.jsPrebillDaysConfiguration;
    this.billDueDaysAfterPeriodEndConfiguration = this.jsBillDueDaysAfterPeriodEndConfiguration;

    this.billablePeriod = this.jsBillablePeriod;
    this.periodBillOpenDate = this.jsPeriodBillOpenDate;
    this.periodBillDueDate = this.jsPeriodBillDueDate;

    this.periodInterestRate = this.jsPeriodInterestRate;
    this.principal = this.jsPrincipal;

    this.dueInterestForTerm = this.jsDueInterestForTerm;
    this.accruedInterestForPeriod = this.jsAccruedInterestForPeriod;
    this.billedInterestForTerm = this.jsBilledInterestForTerm;
    this.billedDeferredInterest = this.jsBilledDeferredInterest;
    this.unbilledTotalDeferredInterest = this.jsUnbilledTotalDeferredInterest;

    this.fees = this.jsFees;
    this.billedDeferredFees = this.jsBilledDeferredFees;
    this.unbilledTotalDeferredFees = this.jsUnbilledTotalDeferredFees;

    this.totalPayment = this.jsTotalPayment;
    this.endBalance = this.jsEndBalance;
    this.startBalance = this.jsStartBalance;

    this.balanceModificationAmount = this.jsBalanceModificationAmount;
    // If you want to handle "jsBalanceModification", do it here.

    this.perDiem = this.jsPerDiem;
    this.daysInPeriod = this.jsDaysInPeriod;

    this.interestRoundingError = this.jsInterestRoundingError;
    this.unbilledInterestDueToRounding = this.jsUnbilledInterestDueToRounding;

    this.metadata = this.jsMetadata;
  }

  //
  // ============= toJSON() / fromJSON() =============
  //
  public toJSON(): any {
    const base = {
      term: this.term,
      periodStartDate: this.periodStartDate.toString(),
      periodEndDate: this.periodEndDate.toString(),
      prebillDaysConfiguration: this.prebillDaysConfiguration,
      billDueDaysAfterPeriodEndConfiguration: this.billDueDaysAfterPeriodEndConfiguration,

      billablePeriod: this.billablePeriod,
      periodBillOpenDate: this.periodBillOpenDate.toString(),
      periodBillDueDate: this.periodBillDueDate.toString(),

      periodInterestRate: this.periodInterestRate.toString(),
      principal: this.principal.toNumber(),

      dueInterestForTerm: this.dueInterestForTerm.toNumber(),
      accruedInterestForPeriod: this.accruedInterestForPeriod.toNumber(),
      billedInterestForTerm: this.billedInterestForTerm.toNumber(),
      billedDeferredInterest: this.billedDeferredInterest.toNumber(),
      unbilledTotalDeferredInterest: this.unbilledTotalDeferredInterest.toNumber(),

      fees: this.fees.toNumber(),
      billedDeferredFees: this.billedDeferredFees.toNumber(),
      unbilledTotalDeferredFees: this.unbilledTotalDeferredFees.toNumber(),

      totalPayment: this.totalPayment.toNumber(),
      endBalance: this.endBalance.toNumber(),
      startBalance: this.startBalance.toNumber(),

      balanceModificationAmount: this.balanceModificationAmount.toNumber(),
      balanceModification: this.balanceModification ? this.balanceModification.json : undefined,

      perDiem: this.perDiem.toNumber(),
      daysInPeriod: this.daysInPeriod,

      interestRoundingError: this.interestRoundingError.toNumber(),
      unbilledInterestDueToRounding: this.unbilledInterestDueToRounding.toNumber(),

      calendar: this.calendar.calendarType,

      metadata: this.metadata,
      
      billingModel: this.billingModel,

      actualDSIPrincipal: this.actualDSIPrincipal?.toNumber?.() ?? undefined,
      actualDSIInterest: this.actualDSIInterest?.toNumber?.() ?? undefined,
      actualDSIFees: this.actualDSIFees?.toNumber?.() ?? undefined,
      dsiInterestSavings: this.dsiInterestSavings,
      dsiInterestPenalty: this.dsiInterestPenalty,
      usageDetails: this.usageDetails,
      actualDSIStartBalance: this.actualDSIStartBalance?.toNumber?.() ?? undefined,
      actualDSIEndBalance: this.actualDSIEndBalance?.toNumber?.() ?? undefined,
      dsiInterestDays: this.dsiInterestDays,
      dsiPreviousPaymentDate: this.dsiPreviousPaymentDate?.toString?.() ?? undefined,
      
      // Re-amortized fields
      reAmortizedStartBalance: this.reAmortizedStartBalance?.toNumber?.() ?? undefined,
      reAmortizedEndBalance: this.reAmortizedEndBalance?.toNumber?.() ?? undefined,
      reAmortizedInterest: this.reAmortizedInterest?.toNumber?.() ?? undefined,
      reAmortizedPrincipal: this.reAmortizedPrincipal?.toNumber?.() ?? undefined,
      reAmortizedFees: this.reAmortizedFees?.toNumber?.() ?? undefined,
      reAmortizedTotalPayment: this.reAmortizedTotalPayment?.toNumber?.() ?? undefined,
      reAmortizedDsiInterestDays: this.reAmortizedDsiInterestDays,
      reAmortizedPerDiem: this.reAmortizedPerDiem?.toNumber?.() ?? undefined,
      isCurrentActiveTerm: this.isCurrentActiveTerm,
      isDelinquent: this.isDelinquent,
      lastPaymentDate: this.lastPaymentDate?.toString?.() ?? undefined,
    };
    return Object.assign(base /* existing fields */);
  }

  /**
   * Recreates an AmortizationEntry from a plain JSON object
   * by letting our constructor do all the type inflation.
   */
  public static fromJSON(json: any): AmortizationEntry {
    return new AmortizationEntry({
      term: json.term,
      // zeroPeriod: json.zeroPeriod, // or omit if auto-derived
      periodStartDate: json.periodStartDate,
      periodEndDate: json.periodEndDate,

      prebillDaysConfiguration: json.prebillDaysConfiguration,
      billDueDaysAfterPeriodEndConfiguration: json.billDueDaysAfterPeriodEndConfiguration,

      billablePeriod: json.billablePeriod,
      periodBillOpenDate: json.periodBillOpenDate,
      periodBillDueDate: json.periodBillDueDate,

      periodInterestRate: json.periodInterestRate,
      principal: json.principal,
      calendar: json.calendar,

      dueInterestForTerm: json.dueInterestForTerm,
      accruedInterestForPeriod: json.accruedInterestForPeriod,
      billedInterestForTerm: json.billedInterestForTerm,
      billedDeferredInterest: json.billedDeferredInterest,
      unbilledTotalDeferredInterest: json.unbilledTotalDeferredInterest,

      fees: json.fees,
      billedDeferredFees: json.billedDeferredFees,
      unbilledTotalDeferredFees: json.unbilledTotalDeferredFees,

      totalPayment: json.totalPayment,
      endBalance: json.endBalance,
      startBalance: json.startBalance,

      balanceModificationAmount: json.balanceModificationAmount,
      balanceModification: json.balanceModification,

      perDiem: json.perDiem,
      daysInPeriod: json.daysInPeriod,

      interestRoundingError: json.interestRoundingError,
      unbilledInterestDueToRounding: json.unbilledInterestDueToRounding,

      metadata: json.metadata,
      
      billingModel: json.billingModel,

      actualDSIPrincipal: json.actualDSIPrincipal,
      actualDSIInterest: json.actualDSIInterest,
      actualDSIFees: json.actualDSIFees,
      dsiInterestSavings: json.dsiInterestSavings,
      dsiInterestPenalty: json.dsiInterestPenalty,
      usageDetails: json.usageDetails,
      actualDSIStartBalance: json.actualDSIStartBalance,
      actualDSIEndBalance: json.actualDSIEndBalance,
      dsiInterestDays: json.dsiInterestDays,
      dsiPreviousPaymentDate: json.dsiPreviousPaymentDate,
      
      // Re-amortized fields
      reAmortizedStartBalance: json.reAmortizedStartBalance,
      reAmortizedEndBalance: json.reAmortizedEndBalance,
      reAmortizedInterest: json.reAmortizedInterest,
      reAmortizedPrincipal: json.reAmortizedPrincipal,
      reAmortizedFees: json.reAmortizedFees,
      reAmortizedTotalPayment: json.reAmortizedTotalPayment,
      reAmortizedDsiInterestDays: json.reAmortizedDsiInterestDays,
      reAmortizedPerDiem: json.reAmortizedPerDiem,
      isCurrentActiveTerm: json.isCurrentActiveTerm,
      isDelinquent: json.isDelinquent,
      lastPaymentDate: json.lastPaymentDate,
    });
  }

  public get json() {
    return this.toJSON();
  }
}

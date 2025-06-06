import { Currency, RoundingMethod } from '../utils/Currency';
import { Calendar, CalendarType } from './Calendar';
import { InterestCalculator, PerDiemCalculationType } from './InterestCalculator';
import { BalanceModification } from './Amortization/BalanceModification';
import { BalanceModifications } from './Amortization/BalanceModifications';
import { Decimal } from 'decimal.js';
import { ChangePaymentDate } from './ChangePaymentDate';
import { ChangePaymentDates } from './ChangePaymentDates';
import { AmortizationEntry, AmortizationScheduleMetadata } from './Amortization/AmortizationEntry';
import { TermInterestAmountOverride } from './TermInterestAmountOverride';
import { TermInterestAmountOverrides } from './TermInterestAmountOverrides';
import { TermInterestRateOverride } from './TermInterestRateOverride';
import { TermInterestRateOverrides } from './TermInterestRateOverrides';
import { RateSchedule } from './RateSchedule';
import { RateSchedules } from './RateSchedules';
import { PeriodSchedule } from './PeriodSchedule';
import { PeriodSchedules } from './PeriodSchedules';
import { AmortizationSummary } from './AmortizationSummary';
import { TILA } from './TILA';
import { Fee } from './Fee';
import { Fees } from './Fees';
import { FeesPerTerm } from './FeesPerTerm';
import { PreBillDaysConfiguration } from './PreBillDaysConfiguration';
import { PreBillDaysConfigurations } from './PreBillDaysConfigurations';
import { BillDueDaysConfiguration } from './BillDueDaysConfiguration';
import { BillDueDaysConfigurations } from './BillDueDaysConfigurations';
import { AmortizationExport } from './AmortizationExport';
import { TermPaymentAmount } from './TermPaymentAmount';
import { TermPaymentAmounts } from './TermPaymentAmounts';
import { TermCalendar } from './TermCalendar';
import { TermCalendars } from './TermCalendars';
import { DateUtil } from '../utils/DateUtil';
import { LocalDate, ChronoUnit, TemporalAdjusters } from '@js-joda/core';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import { v4 as uuidv4 } from 'uuid';

import cloneDeep from 'lodash/cloneDeep';
import { AmortizationEntries } from './Amortization/AmortizationEntries';
import { TermExtension } from './TermExtension';
import { TermExtensions } from './TermExtensions';
import { TermExtensionParams } from './TermExtension';

/** A single "slice" of balance valid over a sub-range of the period */
interface BalanceSlice {
  balance: Currency; // balance that applies to this slice
  balanceModification?: BalanceModification; // the mod that produced it (if any)
  modificationAmount: Currency; // ↑ or ↓ amount applied at that point
  startDate: LocalDate; // inclusive
  endDate: LocalDate; // exclusive (half-open interval)
}

/**
 * Enum for flush cumulative rounding error types.
 */
export enum FlushUnbilledInterestDueToRoundingErrorType {
  NONE = 'none',
  AT_END = 'at_end',
  AT_THRESHOLD = 'at_threshold',
}

export interface TermPeriodDefinition {
  unit: 'year' | 'month' | 'week' | 'day' | 'complex';
  count: number[];
}

export interface AmortizationParams {
  name?: string;
  id?: string;
  description?: string;
  loanAmount: Currency | number;
  originationFee?: Currency | number;
  annualInterestRate: Decimal | number;
  term: number;
  preBillDays?: PreBillDaysConfigurations;
  dueBillDays?: BillDueDaysConfigurations;
  defaultPreBillDaysConfiguration?: number;
  defaultBillDueDaysAfterPeriodEndConfiguration?: number;
  startDate: LocalDate | Date;
  hasCustomEndDate?: boolean;
  hasCustomFirstPaymentDate?: boolean;
  endDate?: LocalDate | Date;
  payoffDate?: LocalDate | Date;
  calendars?: TermCalendars;
  roundingMethod?: RoundingMethod | string;
  flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType | string;
  roundingPrecision?: number;
  flushThreshold?: Currency | number;
  periodsSchedule?: PeriodSchedules;
  ratesSchedule?: RateSchedules;
  allowRateAbove100?: boolean;
  termPaymentAmountOverride?: TermPaymentAmounts;
  equitedMonthlyPayment?: Currency | number | Decimal; // allows one to specify EMI manually instead of calculating it
  firstPaymentDate?: LocalDate | Date | string;
  termPeriodDefinition?: TermPeriodDefinition;
  changePaymentDates?: ChangePaymentDates;
  balanceModifications?: BalanceModifications;
  perDiemCalculationType?: PerDiemCalculationType;
  feesPerTerm?: FeesPerTerm;
  feesForAllTerms?: Fees;
  termInterestAmountOverride?: TermInterestAmountOverrides;
  termInterestRateOverride?: TermInterestRateOverrides;
  acceptableRateVariance?: number | Decimal;
  accrueInterestAfterEndDate?: boolean;
  /**
   * If **true** → interest begins accruing at the very start of a day
   * ("day 0" behaviour).
   * If **false** or omitted → interest for a given day is not due until
   * the first second **of the next day** (current default).
   *
   * This only makes a difference on partial-period pay-offs and
   * snapshot accrual calculations.
   */
  interestAccruesFromDayZero?: boolean;
  /**
   * Optional: Current date for re-amortization calculations.
   * If not provided, will use today's date.
   */
  currentDate?: LocalDate | Date;
  /**
   * Optional: Term extensions (array of params or TermExtensions instance) to extend the contractual term.
   * Follows the same pattern as other overrides.
   */
  termExtensions?: TermExtensions | TermExtension[] | TermExtensionParams[] | undefined | null;
}

// BillingModel type is exported from LendPeak.ts

/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export class Amortization {
  private static readonly DEFAULT_PRE_BILL_DAYS_CONFIGURATION = 0;
  private static readonly DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION = 0;
  private static readonly DEFAULT_ACCEPTABLE_RATE_VARIANCE = new Decimal(0.02);

  private _id: string = '';
  jsId: string = '';

  private _name: string = '';
  jsName: string = '';

  private _description: string = '';
  jsDescription: string = '';

  private _loanAmount!: Currency;
  jsLoanAmount!: number;

  private _originationFee: Currency = Currency.zero;
  jsOriginationFee!: number;

  private _term: number = 1;
  jsTerm!: number;

  private _startDate!: LocalDate;
  jsStartDate!: Date;

  private _endDate?: LocalDate;
  jsEndDate?: Date;

  private _payoffDate?: LocalDate;
  jsPayoffDate?: Date;

  private _hasCustomEndDate: boolean = false;
  jsHasCustomEndDate!: boolean;

  private _annualInterestRate: Decimal = new Decimal(0);
  jsAnnualInterestRate!: number;

  private _totalChargedInterestRounded: Currency = Currency.zero;
  jsTotalChargedInterestRounded!: number;

  private _totalChargedInterestUnrounded: Currency = Currency.zero;
  jsTotalChargedInterestUnrounded!: number;

  private _unbilledInterestDueToRounding: Currency = Currency.zero;
  jsUnbilledInterestDueToRounding!: number;

  private _unbilledDeferredInterest: Currency = Currency.zero;
  jsUnbilledDeferredInterest!: number;

  private _unbilledDeferredFees: Currency = Currency.zero;
  jsUnbilledDeferredFees!: number;

  private _roundingPrecision: number = 2;
  jsRoundingPrecision!: number;

  private _flushThreshold: Currency = Currency.of(0.01);
  jsFlushThreshold!: number;

  private _hasCustomPeriodsSchedule: boolean = false;
  jsHasCustomPeriodsSchedule!: boolean;

  private _allowRateAbove100: boolean = false;
  jsAllowRateAbove100!: boolean;

  private _firstPaymentDate?: LocalDate;
  jsFirstPaymentDate!: Date;

  private _hasCustomFirstPaymentDate: boolean = false;
  jsHasCustomFirstPaymentDate!: boolean;

  private _earlyRepayment: boolean = false;
  jsEarlyRepayment!: boolean;

  private _equitedMonthlyPayment!: Currency;
  jsEquitedMonthlyPayment!: number;

  private _hasCustomEquitedMonthlyPayment: boolean = false;
  jsHasCustomEquitedMonthlyPayment!: boolean;

  // private _hasCustomPreBillDays: boolean = false;
  // jsHasCustomPreBillDays!: boolean;

  private _hasCustomBillDueDays: boolean = false;
  jsHasCustomBillDueDays!: boolean;

  private _periodsSchedule: PeriodSchedules = new PeriodSchedules();
  private _preBillDays: PreBillDaysConfigurations = new PreBillDaysConfigurations();
  private _dueBillDays: BillDueDaysConfigurations = new BillDueDaysConfigurations();
  private _termPaymentAmountOverride: TermPaymentAmounts = new TermPaymentAmounts();
  private _balanceModifications: BalanceModifications = new BalanceModifications();
  
  // Track DSI payment history for accurate balance propagation
  private _dsiPaymentHistory: Map<number, { 
    actualStartBalance: Currency; 
    actualEndBalance: Currency; 
    paymentDate?: LocalDate;
    actualInterest?: Currency;
    actualPrincipal?: Currency;
    actualFees?: Currency;
    dsiInterestDays?: number;
  }> = new Map();

  private _defaultPreBillDaysConfiguration: number = Amortization.DEFAULT_PRE_BILL_DAYS_CONFIGURATION;
  jsDefaultPreBillDaysConfiguration!: number;

  private _defaultBillDueDaysAfterPeriodEndConfiguration: number =
    Amortization.DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION;
  jsDefaultBillDueDaysAfterPeriodEndConfiguration!: number;

  private _calendars: TermCalendars = new TermCalendars({ primary: CalendarType.ACTUAL_ACTUAL });
  private _roundingMethod: RoundingMethod = RoundingMethod.ROUND_HALF_EVEN;
  private _flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType =
    FlushUnbilledInterestDueToRoundingErrorType.NONE;
  private _rateSchedules: RateSchedules = new RateSchedules();
  private _hasCustomRateSchedule: boolean = false;
  private _termPeriodDefinition: TermPeriodDefinition = { unit: 'month', count: [1] };
  private _changePaymentDates: ChangePaymentDates = new ChangePaymentDates();
  private _repaymentSchedule!: AmortizationEntries;
  private _apr?: Decimal;
  private _perDiemCalculationType: PerDiemCalculationType = 'AnnualRateDividedByDaysInYear';
  private _feesPerTerm: FeesPerTerm = FeesPerTerm.empty();
  private _feesForAllTerms: Fees = new Fees();
  private _inputParams: AmortizationParams;
  private _termInterestAmountOverride: TermInterestAmountOverrides = new TermInterestAmountOverrides();
  private _termInterestRateOverride: TermInterestRateOverrides = new TermInterestRateOverrides();
  private _modifiedSinceLastCalculation: boolean = true;
  private _modificationCount: number = 0;
  private _modificationOptimizationTracker: any = {};
  private _export?: AmortizationExport;
  private _summary?: AmortizationSummary;
  private _tila?: TILA;
  private _acceptableRateVariance: Decimal = Amortization.DEFAULT_ACCEPTABLE_RATE_VARIANCE;
  private _versionId: string = uuidv4();
  private _dateChanged: LocalDate = LocalDate.now();
  private _accrueInterestAfterEndDate: boolean = false;

  private _interestAccruesFromDayZero: boolean = false;
  
  private _currentDate?: LocalDate;
  jsCurrentDate?: Date;

  private _termExtensions: TermExtensions = new TermExtensions();
  jsTermExtensions!: any[];

  private _emiCache: { [key: string]: { value: Currency; terms: number } } = {};

  private _contractualEquitedMonthlyPayment?: Currency;
  private _contractualTerm?: number;

  private _emiRecalculationPrincipalCache: { [term: number]: Currency } = {};

  // Callback to determine billing model for a term
  private _getBillingModelForTerm?: (term: number) => 'amortized' | 'dailySimpleInterest';

  // DSI support
  private _dsiPayments: Array<{
    term: number;
    paymentDate: string | Date;
    principalPaid: number;
    interestPaid: number;
    feesPaid: number;
  }> = [];

  constructor(params: AmortizationParams) {
    this._inputParams = cloneDeep(params);

    if (params.id) {
      this.id = params.id;
    }

    if (params.name) {
      this.name = params.name;
    }

    if (params.description) {
      this.description = params.description;
    }

    this.loanAmount = params.loanAmount;

    if (params.acceptableRateVariance !== undefined) {
      this.acceptableRateVariance = params.acceptableRateVariance;
    }


    if (params.originationFee) {
      this.originationFee = params.originationFee;
    }

    if (params.balanceModifications) {
      //console.trace("setting balance modification with params", params.balanceModifications);
      this.balanceModifications = params.balanceModifications;
    }

    if (params.perDiemCalculationType) {
      this.perDiemCalculationType = params.perDiemCalculationType;
    }

    if (params.feesPerTerm) {
      this.feesPerTerm = params.feesPerTerm;
    }

    if (params.feesForAllTerms) {
      this.feesForAllTerms = params.feesForAllTerms;
    }

    if (params.termPeriodDefinition) {
      this.termPeriodDefinition = params.termPeriodDefinition;
    }

    if (params.changePaymentDates) {
      this.changePaymentDates = params.changePaymentDates;
    }

    if (params.allowRateAbove100 !== undefined) {
      this.allowRateAbove100 = params.allowRateAbove100;
    }

    this.annualInterestRate = params.annualInterestRate;

    this.term = params.term;
    this.startDate = params.startDate;
    // Store contractual values
    this._contractualTerm = params.term;
    if (params.equitedMonthlyPayment !== undefined) {
      this._contractualEquitedMonthlyPayment = Currency.of(params.equitedMonthlyPayment);
    } else {
      // If not provided, calculate and store the initial EMI
      this._contractualEquitedMonthlyPayment = this.calculateFixedMonthlyPayment(this.totalLoanAmount, params.term);
    }

    if (params.hasCustomFirstPaymentDate !== undefined) {
      this.hasCustomFirstPaymentDate = params.hasCustomFirstPaymentDate;
    }

    if (this.hasCustomFirstPaymentDate) {
      if (params.firstPaymentDate) {
        this.firstPaymentDate = params.firstPaymentDate;
      }
    }

    if (params.hasCustomEndDate !== undefined) {
      this.hasCustomEndDate = params.hasCustomEndDate;
    }

    if (params.endDate) {
      this.endDate = params.endDate;
    }

    if (params.payoffDate) {
      this.payoffDate = params.payoffDate;
    }

    if (params.termPaymentAmountOverride && params.termPaymentAmountOverride.length > 0) {
      this.termPaymentAmountOverride = params.termPaymentAmountOverride;
    }

    if (params.calendars) {
      this.calendars = params.calendars;
    }

    if (params.roundingMethod) {
      this.roundingMethod = params.roundingMethod;
    }

    if (params.flushUnbilledInterestRoundingErrorMethod) {
      this.flushUnbilledInterestRoundingErrorMethod = params.flushUnbilledInterestRoundingErrorMethod;
    }

    if (params.roundingPrecision !== undefined) {
      this.roundingPrecision = params.roundingPrecision;
    }
    // validate that the rounding precision is greater than or equal to zero

    if (params.flushThreshold !== undefined) {
      this.flushThreshold = params.flushThreshold;
    }

    // Initialize the schedule periods and rates
    if (params.periodsSchedule) {
      this.periodsSchedule = params.periodsSchedule;
    }

    if (params.termInterestAmountOverride) {
      this.termInterestAmountOverride = params.termInterestAmountOverride;
    }

    if (params.termInterestRateOverride) {
      this.termInterestRateOverride = params.termInterestRateOverride;
    }
    if (params.ratesSchedule) {
      this.rateSchedules = params.ratesSchedule;
    }

    if (params.equitedMonthlyPayment !== undefined) {
      this.equitedMonthlyPayment = params.equitedMonthlyPayment;
    }

    if (params.defaultPreBillDaysConfiguration !== undefined) {
      this.defaultPreBillDaysConfiguration = params.defaultPreBillDaysConfiguration;
    }

    if (params.preBillDays) {
      this.preBillDays = params.preBillDays;
    }

    if (params.defaultBillDueDaysAfterPeriodEndConfiguration !== undefined) {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = params.defaultBillDueDaysAfterPeriodEndConfiguration;
    }

    if (params.dueBillDays && params.dueBillDays.length > 0) {
      this.dueBillDays = params.dueBillDays;
    }

    if (params.accrueInterestAfterEndDate !== undefined) {
      this.accrueInterestAfterEndDate = params.accrueInterestAfterEndDate;
    }

    if (params.interestAccruesFromDayZero !== undefined) {
      this.interestAccruesFromDayZero = params.interestAccruesFromDayZero;
    }
    // validate the schedule periods and rates

    // Set termExtensions using the setter, following the override pattern
    if (params.termExtensions) {
      this.termExtensions = params.termExtensions;
    } else {
      this.termExtensions = new TermExtensions();
    }

    this.calculateAmortizationPlan();

    this.verifySchedulePeriods();
    // this.validateRatesSchedule();
    this.updateJsValues();
  }

  set accrueInterestAfterEndDate(value: boolean) {
    this._accrueInterestAfterEndDate = value;
  }

  get accrueInterestAfterEndDate(): boolean {
    return this._accrueInterestAfterEndDate;
  }

  get currentDate(): LocalDate | undefined {
    return this._currentDate;
  }

  set currentDate(value: LocalDate | Date | undefined) {
    if (value) {
      this._currentDate = DateUtil.normalizeDate(value);
      this.modifiedSinceLastCalculation = true;
    } else {
      this._currentDate = undefined;
    }
  }

  set getBillingModelForTerm(callback: (term: number) => 'amortized' | 'dailySimpleInterest') {
    this._getBillingModelForTerm = callback;
  }

  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): LocalDate {
    return this._dateChanged;
  }

  versionChanged() {
    this._dateChanged = LocalDate.now();
    this._versionId = uuidv4();
  }

  set acceptableRateVariance(value: number | Decimal) {
    this._acceptableRateVariance = new Decimal(value);
  }

  get acceptableRateVariance(): Decimal {
    return this._acceptableRateVariance;
  }

  runGarbageCollection() {
    this.balanceModifications.removeMarkedForRemoval();
    this.calculateAmortizationPlan();
  }
  /**
   * JS values are primarily to assist with Angular bindings
   * to simplify the process of updating the UI when the model changes.
   */
  updateJsValues() {
    this.termPaymentAmountOverride.updateJsValues();
    this.changePaymentDates.updateJsValues();
    this.termInterestAmountOverride.updateJsValues();
    this.termInterestRateOverride.updateJsValues();
    this.balanceModifications.updateJsValues();
    this.periodsSchedule.updateJsValues();
    this.preBillDays.updateJsValues();
    this.dueBillDays.updateJsValues();
    this.termExtensions.updateJsValues();
    this.jsTermExtensions = this.termExtensions.all.map((e) => e.json);

    this.jsId = this.id;
    this.jsName = this.name;
    this.jsDescription = this.description;
    this.jsLoanAmount = this.loanAmount.toNumber();
    this.jsOriginationFee = this.originationFee.toNumber();
    this.jsTerm = this.term;
    this.jsStartDate = DateUtil.normalizeDateToJsDate(this.startDate);
    this.jsAnnualInterestRate = this.annualInterestRate.toNumber();
    this.jsTotalChargedInterestRounded = this.totalChargedInterestRounded.toNumber();
    this.jsTotalChargedInterestUnrounded = this.totalChargedInterestUnrounded.toNumber();
    this.jsUnbilledInterestDueToRounding = this.unbilledInterestDueToRounding.toNumber();
    this.jsUnbilledDeferredInterest = this.unbilledDeferredInterest.toNumber();
    this.jsUnbilledDeferredFees = this.unbilledDeferredFees.toNumber();
    this.jsRoundingPrecision = this.roundingPrecision;
    this.jsFlushThreshold = this.flushThreshold.toNumber();
    this.jsHasCustomPeriodsSchedule = this.hasCustomPeriodsSchedule;
    this.jsAllowRateAbove100 = this.allowRateAbove100;
    this.jsFirstPaymentDate = DateUtil.normalizeDateToJsDate(this.firstPaymentDate);
    this.jsEarlyRepayment = this.earlyRepayment;
    this.jsEquitedMonthlyPayment = this.equitedMonthlyPayment.toNumber();
    this.jsHasCustomEquitedMonthlyPayment = this.hasCustomEquitedMonthlyPayment;
    //  this.jsHasCustomPreBillDays = this.hasCustomPreBillDays;
    this.jsHasCustomBillDueDays = this.hasCustomBillDueDays;
    this.jsHasCustomFirstPaymentDate = this.hasCustomFirstPaymentDate;
    this.jsHasCustomEndDate = this.hasCustomEndDate;
    this.jsEndDate = DateUtil.normalizeDateToJsDate(this.endDate);
    this.jsDefaultPreBillDaysConfiguration = this.defaultPreBillDaysConfiguration;
    this.jsDefaultBillDueDaysAfterPeriodEndConfiguration = this.defaultBillDueDaysAfterPeriodEndConfiguration;
    if (this.payoffDate) {
      this.jsPayoffDate = DateUtil.normalizeDateToJsDate(this.payoffDate);
    }
  }

  updateModelValues() {
    this.id = this.jsId;
    this.name = this.jsName;
    this.description = this.jsDescription;
    this.loanAmount = Currency.of(this.jsLoanAmount);
    this.originationFee = Currency.of(this.jsOriginationFee);
    this.term = this.jsTerm;
    this.startDate = this.jsStartDate;

    this.hasCustomEndDate = this.jsHasCustomEndDate;

    if (this.hasCustomEndDate) {
      this.endDate = this.jsEndDate;
    } else {
      this.endDate = undefined;
    }

    this.annualInterestRate = new Decimal(this.jsAnnualInterestRate);
    this.totalChargedInterestRounded = Currency.of(this.jsTotalChargedInterestRounded);
    this.totalChargedInterestUnrounded = Currency.of(this.jsTotalChargedInterestUnrounded);
    this.unbilledInterestDueToRounding = Currency.of(this.jsUnbilledInterestDueToRounding);
    this.unbilledDeferredInterest = Currency.of(this.jsUnbilledDeferredInterest);
    this.unbilledDeferredFees = Currency.of(this.jsUnbilledDeferredFees);
    this.roundingPrecision = this.jsRoundingPrecision;
    this.flushThreshold = Currency.of(this.jsFlushThreshold);
    this.hasCustomPeriodsSchedule = this.jsHasCustomPeriodsSchedule;
    this.allowRateAbove100 = this.jsAllowRateAbove100;
    this.hasCustomFirstPaymentDate = this.jsHasCustomFirstPaymentDate;
    if (this.hasCustomFirstPaymentDate) {
      this.firstPaymentDate = this.jsFirstPaymentDate;
    }
    this.earlyRepayment = this.jsEarlyRepayment;
    if (this.hasCustomEquitedMonthlyPayment) {
      this.equitedMonthlyPayment = Currency.of(this.jsEquitedMonthlyPayment);
    } else {
      this.equitedMonthlyPayment = undefined;
    }
    this.hasCustomEquitedMonthlyPayment = this.jsHasCustomEquitedMonthlyPayment;
    //  this.hasCustomPreBillDays = this.jsHasCustomPreBillDays;
    this.hasCustomBillDueDays = this.jsHasCustomBillDueDays;

    this.termPaymentAmountOverride.updateModelValues();
    this.changePaymentDates.updateModelValues();
    this.termInterestAmountOverride.updateModelValues();
    this.termInterestRateOverride.updateModelValues();
    this.balanceModifications.updateModelValues();
    this.periodsSchedule.updateModelValues();
    this.rateSchedules.updateModelValues();
    this.preBillDays.updateModelValues();
    this.dueBillDays.updateModelValues();
    this.termExtensions.updateModelValues();

    this.defaultPreBillDaysConfiguration = this.jsDefaultPreBillDaysConfiguration;
    this.defaultBillDueDaysAfterPeriodEndConfiguration = this.jsDefaultBillDueDaysAfterPeriodEndConfiguration;
    this.payoffDate = this.jsPayoffDate;
  }

  /**
   * Accessors
   **/

  get tila(): TILA {
    if (!this._tila) {
      this._tila = new TILA(this);
    }
    return this._tila;
  }

  get summary(): AmortizationSummary {
    if (!this._summary) {
      this._summary = new AmortizationSummary(this);
    }
    return this._summary;
  }

  get export(): AmortizationExport {
    if (!this._export) {
      this._export = new AmortizationExport(this);
    }
    return this._export;
  }

  get hasCustomPreBillDays(): boolean {
    return this._preBillDays.hasCustom;
  }

  get hasCustomBillDueDays(): boolean {
    return this._hasCustomBillDueDays;
  }

  set hasCustomBillDueDays(value: boolean) {
    this._hasCustomBillDueDays = value;
  }

  get hasCustomPeriodsSchedule(): boolean {
    return this._hasCustomPeriodsSchedule;
  }

  set hasCustomPeriodsSchedule(value: boolean) {
    this._hasCustomPeriodsSchedule = value;
  }

  get modifiedSinceLastCalculation(): boolean {
    return this._modifiedSinceLastCalculation;
  }

  set modifiedSinceLastCalculation(value: boolean) {
    if (value === true) {
      this._modificationCount++;
      //console.trace("modified since last calculation set to: ", value, this._modificationCount);
    }
    this._modifiedSinceLastCalculation = value;
    //  console.trace("modified since last calculation set to: ", value, this._modificationCount);
  }

  set modificationOptimizationTracker(value: any) {
    this._modificationOptimizationTracker[value] = this._modificationCount;
  }

  get modificationOptimizationTracker(): any {
    return this._modificationOptimizationTracker;
  }

  isUpdatedSinceLastCalculation(key: string): boolean {
    return this._modificationOptimizationTracker[key] === this._modificationCount;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this.modifiedSinceLastCalculation = true;
    this._id = value;
    this.jsId = value;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this.modifiedSinceLastCalculation = true;

    this._name = value;
    this.jsName = value;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this.modifiedSinceLastCalculation = true;

    this._description = value;
    this.jsDescription = value;
  }

  get loanAmount(): Currency {
    return this._loanAmount;
  }

  set loanAmount(value: Currency | number | Decimal) {
    this.modifiedSinceLastCalculation = true;

    let newValue: Currency;
    if (value instanceof Currency) {
      newValue = value;
    } else {
      newValue = Currency.of(value);
    }

    if (newValue.isZero() || newValue.isNegative()) {
      throw new Error('Invalid loan amount, must be greater than zero');
    }
    this._loanAmount = newValue;
  }

  get originationFee(): Currency {
    return this._originationFee;
  }

  set originationFee(value: Currency | number | Decimal | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (!value) {
      this._originationFee = Currency.zero;
      return;
    }
    if (value instanceof Currency) {
      this._originationFee = value;
    } else {
      this._originationFee = Currency.of(value);
    }

    if (this._originationFee.isNegative()) {
      this._originationFee = Currency.zero;
      throw new Error('Invalid origination fee, value cannot be negative');
    }
  }

  get totalLoanAmount(): Currency {
    return this.loanAmount.add(this.originationFee);
  }

  get term(): number {
    return this._term;
  }

  set term(value: number) {
    this.modifiedSinceLastCalculation = true;

    if (value <= 0) {
      throw new Error('Invalid term, must be greater than zero');
    }
    this._term = value;
  }

  get preBillDays(): PreBillDaysConfigurations {
    if (!this._preBillDays || this._preBillDays.length === 0) {
      this._preBillDays = new PreBillDaysConfigurations([
        new PreBillDaysConfiguration({
          preBillDays: this.defaultPreBillDaysConfiguration,
          termNumber: 1,
          type: 'default',
        }),
      ]);
      this.generatePreBillDays();
      this.modificationOptimizationTracker = 'preBillDays';
    } else {
      if (this.modifiedSinceLastCalculation === true) {
        //  if (this._modificationOptimizationTracker?.preBillDays !== this._modificationCount) {
        if (!this.isUpdatedSinceLastCalculation('preBillDays')) {
          this.generatePreBillDays();
          this.modificationOptimizationTracker = 'preBillDays';
        }
      }
    }
    return this._preBillDays;
  }

  set preBillDays(value: PreBillDaysConfigurations | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (!value) {
      // this._hasCustomPreBillDays = false;
      this._preBillDays = new PreBillDaysConfigurations();
    } else {
      //  this._hasCustomPreBillDays = true;
      // check type and if different inflate
      if (value instanceof PreBillDaysConfigurations) {
        this._preBillDays = value;
      } else {
        this._preBillDays = new PreBillDaysConfigurations(value);
      }
    }
    this.generatePreBillDays();
  }

  private generatePreBillDays(): void {
    /* ① start with a copy of every existing row (active **and** inactive) */
    const completed = new PreBillDaysConfigurations([...this._preBillDays.all]);

    /* ② the rows that drive the propagation logic */
    const activeCustom = completed.all.filter((c) => c.type === 'custom' && c.active);

    if (activeCustom.length === 0) {
      activeCustom.push(
        new PreBillDaysConfiguration({
          termNumber: 1,
          preBillDays: this.defaultPreBillDaysConfiguration,
          type: 'default',
          active: true,
        })
      );
    }

    /* ③ back-fill the missing terms */
    let last = activeCustom[0];
    for (let i = 0; i < this.actualTerm; i++) {
      const term = i + 1;
      if (!completed.all.find((c) => c.termNumber === term)) {
        completed.addConfiguration(
          new PreBillDaysConfiguration({
            termNumber: term,
            preBillDays: last.termNumber > term ? this.defaultPreBillDaysConfiguration : last.preBillDays,
            type: 'generated',
            active: true,
          })
        );
      }
      const customHere = activeCustom.find((c) => c.termNumber === term);
      if (customHere) last = customHere;
    }

    completed.reSort(); // keep row order stable for the UI
    this._preBillDays = completed;
  }

  private generateDueBillDays(): void {
    /* ①  start with a copy of ALL current rows (active **and** inactive) */
    const completed = new BillDueDaysConfigurations([...this._dueBillDays.all]);

    /* ②  these rows actually drive the generation logic */
    const activeCustom = completed.all.filter((c) => c.type === 'custom' && c.active);

    if (activeCustom.length === 0) {
      activeCustom.push(
        new BillDueDaysConfiguration({
          termNumber: 1,
          daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration,
          type: 'default',
          active: true,
        })
      );
    }

    /* ③  back-fill the missing terms */
    let last = activeCustom[0];
    for (let i = 0; i < this.actualTerm; i++) {
      const term = i + 1;
      if (!completed.all.find((c) => c.termNumber === term)) {
        completed.addConfiguration(
          new BillDueDaysConfiguration({
            termNumber: term,
            daysDueAfterPeriodEnd:
              last.termNumber > term ? this.defaultBillDueDaysAfterPeriodEndConfiguration : last.daysDueAfterPeriodEnd,
            type: 'generated',
            active: true,
          })
        );
      }
      const customHere = activeCustom.find((c) => c.termNumber === term);
      if (customHere) last = customHere;
    }

    completed.reSort(); // keep UI ↔ model order stable
    this._dueBillDays = completed;
  }

  get dueBillDays(): BillDueDaysConfigurations {
    if (!this._dueBillDays || this._dueBillDays.length === 0) {
      this._dueBillDays = new BillDueDaysConfigurations([
        new BillDueDaysConfiguration({
          daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration,
          termNumber: 0,
          type: 'default',
        }),
      ]);
      this.generateDueBillDays();
      this.modificationOptimizationTracker = 'dueBillDays';
    } else {
      if (this.modifiedSinceLastCalculation === true) {
        if (this._modificationOptimizationTracker?.dueBillDays !== this._modificationCount) {
          //    console.log(`modification tracker version didnt match ${this._modificationOptimizationTracker?.dueBillDays} ${this._modificationCount}`);
          this.generateDueBillDays();
          this._modificationOptimizationTracker.dueBillDays = this._modificationCount;
        }
      }
    }
    return this._dueBillDays;
  }

  set dueBillDays(value: BillDueDaysConfigurations | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (!value || value.length === 0) {
      this._hasCustomBillDueDays = false;
      this._dueBillDays = new BillDueDaysConfigurations();
    } else {
      this._hasCustomBillDueDays = value.hasActiveCustom;
      if (value instanceof BillDueDaysConfigurations) {
        this._dueBillDays = value;
      } else {
        this._dueBillDays = new BillDueDaysConfigurations(value);
      }
    }
    this.generateDueBillDays();
  }

  get interestAccruesFromDayZero(): boolean {
    return this._interestAccruesFromDayZero;
  }

  set interestAccruesFromDayZero(value: boolean) {
    this.modifiedSinceLastCalculation = true;
    this._interestAccruesFromDayZero = value;
  }

  get defaultPreBillDaysConfiguration() {
    return this._defaultPreBillDaysConfiguration;
  }

  set defaultPreBillDaysConfiguration(value: number) {
    this.modifiedSinceLastCalculation = true;

    this._defaultPreBillDaysConfiguration = value;
  }
  get defaultBillDueDaysAfterPeriodEndConfiguration() {
    return this._defaultBillDueDaysAfterPeriodEndConfiguration;
  }

  set defaultBillDueDaysAfterPeriodEndConfiguration(value: number) {
    this.modifiedSinceLastCalculation = true;

    this._defaultBillDueDaysAfterPeriodEndConfiguration = value;
  }

  get termInterestRateOverride(): TermInterestRateOverrides {
    return this._termInterestRateOverride;
  }

  set termInterestRateOverride(value: TermInterestRateOverrides) {
    this.modifiedSinceLastCalculation = true;

    // Make sure 'value' is a TermInterestAmountOverrides instance
    if (!(value instanceof TermInterestRateOverrides)) {
      value = new TermInterestRateOverrides(value);
    }

    this._termInterestRateOverride = new TermInterestRateOverrides();

    for (const override of value.all) {
      if (override.termNumber <= 0 || override.termNumber > this.actualTerm) {
        throw new Error(`Invalid termInterestRateOverride: termNumber ${override.termNumber} out of range`);
      }
      if (override.interestRate.isNegative()) {
        throw new Error('Invalid termInterestRateOverride: interestAmount cannot be negative');
      }
      this._termInterestRateOverride.addOverride(override);
    }
  }

  // resetTermInterestAmountOverride(): void {
  //   this.termInterestAmountOverride = new TermInterestAmountOverrides(this._termInterestAmountOverride.all);
  // }

  get termInterestAmountOverride(): TermInterestAmountOverrides {
    return this._termInterestAmountOverride;
  }

  set termInterestAmountOverride(value: TermInterestAmountOverrides) {
    this.modifiedSinceLastCalculation = true;

    // Make sure 'value' is a TermInterestAmountOverrides instance
    if (!(value instanceof TermInterestAmountOverrides)) {
      value = new TermInterestAmountOverrides(value);
    }

    // Collect overrides in an array to sort/manipulate them before adding.
    const collected = [...value.all]; // array of whatever shape your overrides have

    // 1. For each override missing a term (i.e., override.termNumber < 0),
    //    find the term by date (if override.date is present).
    for (const override of collected) {
      if (override.termNumber < 0 && override.date) {
        const date = DateUtil.normalizeDate(override.date);

        let term = this.periodsSchedule.periods.findIndex((period) =>
          DateUtil.isBetweenHalfOpen(date, period.startDate, period.endDate)
        );

        if (term < 0) {
          // If not found in schedule, but date >= lastTermEndDate, set to last term
          const lastTermEndDate = this.periodsSchedule.periods[this.periodsSchedule.periods.length - 1].endDate;
          if (date.isAfter(lastTermEndDate) || date.isEqual(lastTermEndDate)) {
            term = this.periodsSchedule.periods.length - 1;
          } else {
            console.error(
              'termInterestOverride: date does not fall within any term',
              date,
              this.periodsSchedule.periods
            );
            throw new Error('Invalid termInterestOverride: date does not fall within any term');
          }
        }
        override.termNumber = term;
      }
    }

    // 2. Sort by date so we can ensure term numbers are assigned in chronological order
    collected.sort((a, b) => {
      const dateA = DateUtil.normalizeDate(a.date);
      const dateB = DateUtil.normalizeDate(b.date);
      return dateA.compareTo(dateB);
    });

    // 3. Fix up the term numbering in a strictly ascending manner
    this._termInterestAmountOverride = new TermInterestAmountOverrides();

    let lastTermAssigned = -1;
    for (let i = 0; i < collected.length; i++) {
      const current = collected[i];

      // If first in the list, force it to 0
      if (i === 0) {
        current.termNumber = 0;
      } else {
        // Ensure strictly increasing (no gaps or backward jumps)
        // If the current term is not strictly one more than the last assigned term,
        // we set current.termNumber = lastTermAssigned + 1
        if (current.termNumber <= lastTermAssigned || current.termNumber > lastTermAssigned + 1) {
          current.termNumber = lastTermAssigned + 1;
        }
      }

      // 4. Range check
      if (current.termNumber < 0 || current.termNumber > this.actualTerm) {
        console.warn('termInterestOverride: termNumber out of range', current.termNumber, this.actualTerm);
        continue;
        //throw new Error(`Invalid termInterestOverride: termNumber ${current.termNumber} out of range`);
      }

      this._termInterestAmountOverride.addOverride(current);
      lastTermAssigned = current.termNumber;
    }
  }

  get feesForAllTerms() {
    return this._feesForAllTerms;
  }

  set feesForAllTerms(value: Fees) {
    this.modifiedSinceLastCalculation = true;
    // check type and inflate
    if (value instanceof Fees) {
      this._feesForAllTerms = value;
    } else {
      this._feesForAllTerms = new Fees(value);
    }
  }

  get feesPerTerm() {
    return this._feesPerTerm;
  }

  set feesPerTerm(feesPerTerm: FeesPerTerm) {
    this.modifiedSinceLastCalculation = true;

    // check type and inflate
    if (feesPerTerm instanceof FeesPerTerm) {
      this._feesPerTerm = feesPerTerm;
    } else {
      this._feesPerTerm = new FeesPerTerm(feesPerTerm);
    }
  }

  get perDiemCalculationType() {
    return this._perDiemCalculationType;
  }

  set perDiemCalculationType(value: PerDiemCalculationType) {
    this.modifiedSinceLastCalculation = true;

    this._perDiemCalculationType = value;
  }

  /**
   * True when the last repayment-schedule entry ends before
   * the original contractual end-date (i.e. before the last
   * PeriodSchedule entry).  Works even after re-amortization.
   */
  get wasPaidEarly(): boolean {
    if (!this.repaymentSchedule || this.repaymentSchedule.length === 0) return false;

    if (this.payoffDate && this.payoffDate.isBefore(this.endDate)) {
      return true;
    }

    const actualEnd = this.repaymentSchedule.lastEntry.periodEndDate;
    const plannedEnd = this.periodsSchedule.lastPeriod.endDate;

    return actualEnd.isBefore(plannedEnd);
  }

  private get earlyRepayment(): boolean {
    return this._earlyRepayment;
  }

  private set earlyRepayment(value: boolean) {
    // this.modifiedSinceLastCalculation = true;

    this._earlyRepayment = value;
  }

  get balanceModifications(): BalanceModifications {
    if (!this._balanceModifications) {
      this._balanceModifications = new BalanceModifications();
    }
    return this._balanceModifications;
  }

  set balanceModifications(balanceModifications: BalanceModifications) {
    this.modifiedSinceLastCalculation = true;

    if (!(balanceModifications instanceof BalanceModifications)) {
      balanceModifications = new BalanceModifications(balanceModifications);
    }

    this._balanceModifications = balanceModifications;
  }

  get repaymentSchedule(): AmortizationEntries {
    return this._repaymentSchedule;
  }

  set repaymentSchedule(repaymentSchedule: AmortizationEntries) {
    this._repaymentSchedule = repaymentSchedule;
  }

  get changePaymentDates() {
    return this._changePaymentDates;
  }

  set changePaymentDates(changePaymentDates: ChangePaymentDates) {
    this.modifiedSinceLastCalculation = true;

    // check type and inflate
    if (changePaymentDates instanceof ChangePaymentDates) {
      this._changePaymentDates = changePaymentDates;
    } else {
      this._changePaymentDates = new ChangePaymentDates(changePaymentDates);
    }

    // update period schedule
    //this.periodsSchedule = this.generatePeriodsSchedule();
  }

  get termPeriodDefinition() {
    return this._termPeriodDefinition;
  }

  set termPeriodDefinition(termPeriodDefinition: TermPeriodDefinition) {
    this.modifiedSinceLastCalculation = true;

    this._termPeriodDefinition = termPeriodDefinition;
  }

  set hasCustomEquitedMonthlyPayment(value: boolean) {
    // console.trace("custom equited monthly payment set to", value);
    this.modifiedSinceLastCalculation = true;

    this._hasCustomEquitedMonthlyPayment = value;
  }

  get hasCustomEquitedMonthlyPayment() {
    return this._hasCustomEquitedMonthlyPayment;
  }

  get equitedMonthlyPayment(): Currency {
    if (!this._equitedMonthlyPayment || this.termExtensions.hasModified) {
      this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment(this.totalLoanAmount, this.getPayingTermCount());
      this.modificationOptimizationTracker = 'equitedMonthlyPayment';
    }
    if (this.hasCustomEquitedMonthlyPayment) {
      return this._equitedMonthlyPayment;
    } else {
      if (this.isUpdatedSinceLastCalculation('equitedMonthlyPayment')) {
        this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment(
          this.totalLoanAmount,
          this.getPayingTermCount()
        );
        this.modificationOptimizationTracker = 'equitedMonthlyPayment';
      }
      return this._equitedMonthlyPayment;
    }
  }

  set equitedMonthlyPayment(value: Currency | Decimal | number | undefined | null) {
    this.modifiedSinceLastCalculation = true;

    if (value === undefined || value === null) {
      this.hasCustomEquitedMonthlyPayment = false;
      this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment(this.totalLoanAmount, this.getPayingTermCount());
      this.modificationOptimizationTracker = 'equitedMonthlyPayment';

      return;
    } else {
      this.hasCustomEquitedMonthlyPayment = true;
    }

    if (value instanceof Currency) {
      this._equitedMonthlyPayment = value;
    } else {
      try {
        this._equitedMonthlyPayment = Currency.of(value);
      } catch (e) {
        this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
      }
    }
  }

  get termPaymentAmountOverride() {
    return this._termPaymentAmountOverride;
  }

  set termPaymentAmountOverride(termPaymentAmountOverride: TermPaymentAmounts) {
    this.modifiedSinceLastCalculation = true;

    if (termPaymentAmountOverride instanceof TermPaymentAmounts) {
      this._termPaymentAmountOverride = termPaymentAmountOverride;
    } else {
      this._termPaymentAmountOverride = new TermPaymentAmounts(termPaymentAmountOverride);
    }
  }

  get allowRateAbove100(): boolean {
    return this._allowRateAbove100;
  }

  set allowRateAbove100(value: boolean) {
    this.modifiedSinceLastCalculation = true;

    this._allowRateAbove100 = value;
  }

  get hasCustomRateSchedule(): boolean {
    return this._hasCustomRateSchedule;
  }

  set hasCustomRateSchedule(value: boolean) {
    this._hasCustomRateSchedule = value;
  }

  get rateSchedules() {
    if (!this._rateSchedules || this._rateSchedules.length === 0) {
      this._hasCustomRateSchedule = false;
      this.modificationOptimizationTracker = 'rateSchedules';
      this._rateSchedules = this.generateRatesSchedule();
      return this._rateSchedules;
    } else {
      if (this._rateSchedules.hasCustom) {
        this.hasCustomRateSchedule = true;
      }
      if (this._rateSchedules.hasModified) {
        this.modificationOptimizationTracker = 'rateSchedules';
        this._rateSchedules.resetModified();
      } else {
        return this._rateSchedules;
      }
    }

    if (this.isUpdatedSinceLastCalculation('rateSchedules')) {
      // console.log("rate schedules are not updated since last calculation");
      if (this.hasCustomRateSchedule === true) {
        this.rateSchedules = this._rateSchedules;
      } else {
        this._rateSchedules = this.generateRatesSchedule();
      }
      this.modificationOptimizationTracker = 'rateSchedules';
    }
    return this._rateSchedules;
  }

  set rateSchedules(rateSchedules: RateSchedules) {
    this.modifiedSinceLastCalculation = true;
    // check type and inflate
    if (!(rateSchedules instanceof RateSchedules)) {
      rateSchedules = new RateSchedules(rateSchedules);
    }

    const newRateSchedules = rateSchedules.allCustomAsObject;

    if (newRateSchedules.hasCustom) {
      this.hasCustomRateSchedule = true;
    } else {
      this.hasCustomRateSchedule = false;
      this._rateSchedules = this.generateRatesSchedule();
      return;
    }

    // all start and end dates must be at the start of the day, we dont want to count hours
    // at least not just yet... maybe in the future
    // for (let rate of this.rateSchedules) {
    //   rate.startDate = rate.startDate.startOf("day");
    //   rate.endDate = rate.endDate.startOf("day");
    // }

    // rate schedule might be partial and not necesserily aligns with billing periods
    // if first period is not equal to start date, we need to backfill
    // original start date and rate to the first period
    // same goes for in-between periods, if first period end date is not equal to next period start date
    // we need to backfill the rate and start date to the next period
    // finally same goes for the last period, if end date is not equal to the end date of the term
    // we need to backfill the rate and end date to the last period

    if (!this.startDate.isEqual(newRateSchedules.first.startDate)) {
      //(`adding rate schedule at the start ${this.startDate.format("YYYY-MM-DD")} and ${newRateSchedules.first.startDate.format("YYYY-MM-DD")}`);
      newRateSchedules.addScheduleAtTheBeginning(
        new RateSchedule({
          annualInterestRate: this.annualInterestRate,
          startDate: this.startDate,
          endDate: newRateSchedules.first.startDate,
          type: 'generated',
        })
      );
    }

    for (let i = 0; i < newRateSchedules.length - 1; i++) {
      if (!newRateSchedules.atIndex(i).endDate.isEqual(newRateSchedules.atIndex(i + 1).startDate)) {
        //   console.log(`adding rate schedule between ${newRateSchedules.atIndex(i).startDate.format("YYYY-MM-DD")} and ${newRateSchedules.atIndex(i + 1).endDate.format("YYYY-MM-DD")}`);
        newRateSchedules.all.splice(
          i + 1,
          0,
          new RateSchedule({
            annualInterestRate: this.annualInterestRate,
            startDate: newRateSchedules.atIndex(i).endDate,
            endDate: newRateSchedules.atIndex(i + 1).startDate,
            type: 'generated',
          })
        );
      }
    }

    if (!this.endDate.isEqual(newRateSchedules.last.endDate)) {
      //  console.log(`adding rate schedule for the end between ${newRateSchedules.last.endDate.format("YYYY-MM-DD")} and ${this.endDate.format("YYYY-MM-DD")}`);
      newRateSchedules.addSchedule(
        new RateSchedule({
          annualInterestRate: this.annualInterestRate,
          startDate: newRateSchedules.last.endDate,
          endDate: this.endDate,
          type: 'generated',
        })
      );
    }

    this._rateSchedules = newRateSchedules;
    this._rateSchedules.resetModified();
    //  this.validateRatesSchedule();
  }

  get periodsSchedule(): PeriodSchedules {
    // Always regenerate if termExtensions are modified or if the count doesn't match actualTerm
    if (
      !this._periodsSchedule ||
      this._periodsSchedule.length === 0 ||
      this.termExtensions.hasModified ||
      this._periodsSchedule.length !== this.actualTerm
    ) {
      this._periodsSchedule.periods = this.generatePeriodicSchedule();
      this.termExtensions.resetModified();
      return this._periodsSchedule;
    }
    if (this._periodsSchedule.hasCustomPeriods === true) {
      return this._periodsSchedule;
    } else {
      if (this.modifiedSinceLastCalculation === true) {
        this._periodsSchedule.periods = this.generatePeriodicSchedule();
      }
      return this._periodsSchedule;
    }
  }

  set periodsSchedule(periodsSchedule: PeriodSchedules) {
    this.modifiedSinceLastCalculation = true;

    // check type and if not PeriodSchedules, convert it
    if (periodsSchedule instanceof PeriodSchedules) {
      this._periodsSchedule = periodsSchedule;
    } else {
      this._periodsSchedule = new PeriodSchedules(periodsSchedule);
    }
    // console.log("setting periods schedule", this._periodsSchedule);
  }

  get flushThreshold(): Currency {
    return this._flushThreshold;
  }

  set flushThreshold(value: Currency | number | Decimal) {
    this.modifiedSinceLastCalculation = true;
    if (value instanceof Currency) {
      this._flushThreshold = value;
    } else {
      this._flushThreshold = Currency.of(value);
    }
  }

  get roundingPrecision() {
    return this._roundingPrecision;
  }

  set roundingPrecision(value: number) {
    this.modifiedSinceLastCalculation = true;

    if (value < 0) {
      throw new Error(
        'Invalid rounding precision, must be greater than or equal to zero, number represents decimal places'
      );
    }

    this._roundingPrecision = value;
  }

  get unbilledDeferredFees(): Currency {
    return this._unbilledDeferredFees;
  }

  set unbilledDeferredFees(value: Currency | number | Decimal) {
    if (value instanceof Currency) {
      this._unbilledDeferredFees = value;
    } else {
      this._unbilledDeferredFees = Currency.of(value);
    }
  }

  get unbilledDeferredInterest(): Currency {
    return this._unbilledDeferredInterest;
  }

  set unbilledDeferredInterest(value: Currency | number | Decimal) {
    if (value instanceof Currency) {
      this._unbilledDeferredInterest = value;
    } else {
      this._unbilledDeferredInterest = Currency.of(value);
    }
  }

  get unbilledInterestDueToRounding(): Currency {
    return this._unbilledInterestDueToRounding;
  }

  set unbilledInterestDueToRounding(value: Currency | number | Decimal) {
    if (value instanceof Currency) {
      this._unbilledInterestDueToRounding = value;
    } else {
      this._unbilledInterestDueToRounding = Currency.of(value);
    }
  }

  get totalChargedInterestUnrounded(): Currency {
    return this._totalChargedInterestUnrounded;
  }

  set totalChargedInterestUnrounded(value: Currency | number | Decimal) {
    if (value instanceof Currency) {
      this._totalChargedInterestUnrounded = value;
    } else {
      this._totalChargedInterestUnrounded = Currency.of(value);
    }
  }

  get totalChargedInterestRounded(): Currency {
    return this._totalChargedInterestRounded;
  }

  set totalChargedInterestRounded(value: Currency | number | Decimal) {
    if (value instanceof Currency) {
      this._totalChargedInterestRounded = value;
    } else {
      this._totalChargedInterestRounded = Currency.of(value);
    }
  }

  get flushUnbilledInterestRoundingErrorMethod(): FlushUnbilledInterestDueToRoundingErrorType {
    return this._flushUnbilledInterestRoundingErrorMethod;
  }

  set flushUnbilledInterestRoundingErrorMethod(value: FlushUnbilledInterestDueToRoundingErrorType | string) {
    this.modifiedSinceLastCalculation = true;

    if (typeof value === 'string') {
      let flushMethod: FlushUnbilledInterestDueToRoundingErrorType;
      switch (value) {
        case 'none':
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.NONE;
          break;
        case 'at_end':
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_END;
          break;
        case 'at_threshold':
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
          break;
        default:
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.NONE;
      }
      this._flushUnbilledInterestRoundingErrorMethod = flushMethod;
    } else {
      this._flushUnbilledInterestRoundingErrorMethod = value;
    }
  }

  get roundingMethod(): RoundingMethod {
    return this._roundingMethod;
  }

  set roundingMethod(value: RoundingMethod | string) {
    this.modifiedSinceLastCalculation = true;

    this._roundingMethod = typeof value === 'string' ? Currency.RoundingMethodFromString(value) : value;
  }

  get calendars(): TermCalendars {
    return this._calendars;
  }

  set calendars(calendars: TermCalendars) {
    this.modifiedSinceLastCalculation = true;

    this._calendars = calendars instanceof TermCalendars ? calendars : new TermCalendars(calendars);
  }


  get annualInterestRate(): Decimal {
    return this._annualInterestRate;
  }

  set annualInterestRate(value: Decimal | number) {
    this.modifiedSinceLastCalculation = true;

    const annualInterestRate = new Decimal(value);

    // validate annual interest rate, it should not be negative or greater than 100%
    if (annualInterestRate.isNegative()) {
      throw new Error('Invalid annual interest rate, value cannot be negative');
    }

    if (annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
      throw new Error(
        'Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true'
      );
    }

    this._annualInterestRate = annualInterestRate;
  }

  get hasCustomFirstPaymentDate() {
    return this._hasCustomFirstPaymentDate;
  }

  set hasCustomFirstPaymentDate(value: boolean) {
    this.modifiedSinceLastCalculation = true;
    this._hasCustomFirstPaymentDate = value;
  }

  get firstPaymentDate(): LocalDate {
    if (
      !this._firstPaymentDate ||
      (this.modifiedSinceLastCalculation === true && this._hasCustomFirstPaymentDate === false)
    ) {
      const termUnit = this.termPeriodDefinition.unit === 'complex' ? 'day' : this.termPeriodDefinition.unit;
      //this._firstPaymentDate = this.startDate.add(1 * this.termPeriodDefinition.count[0], termUnit).startOf("day");
      const unitsToAdd = this.termPeriodDefinition.count[0];

      switch (termUnit) {
        case 'day':
          this._firstPaymentDate = this.startDate.plusDays(unitsToAdd);
          break;
        case 'week':
          this._firstPaymentDate = this.startDate.plusWeeks(unitsToAdd);
          break;
        case 'month':
          this._firstPaymentDate = this.startDate.plusMonths(unitsToAdd);
          break;
        case 'year':
          this._firstPaymentDate = this.startDate.plusYears(unitsToAdd);
          break;
        default:
          throw new Error(`Unsupported termUnit: ${termUnit}`);
      }
    }
    return this._firstPaymentDate;
  }

  set firstPaymentDate(date: LocalDate | Date | string | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (date) {
      if (date instanceof Date) {
        date = DateUtil.normalizeDate(date);
      } else if (typeof date === 'string') {
        date = DateUtil.normalizeDate(date);
      } else {
        date = DateUtil.normalizeDate(date);
      }
      // this.hasCustomFirstPaymentDate = true;
      this._firstPaymentDate = date;
    } else {
      this._hasCustomFirstPaymentDate = false;
      this._firstPaymentDate = undefined;
      return;
    }
  }

  get startDate(): LocalDate {
    // console.trace("returning start date");
    return this._startDate;
  }

  set startDate(startDate: LocalDate | Date | string) {
    this.modifiedSinceLastCalculation = true;

    if (!startDate) {
      throw new Error('Invalid start date, must be a valid date');
    }
    if (startDate instanceof Date) {
      startDate = DateUtil.normalizeDate(startDate);
    } else if (typeof startDate === 'string') {
      startDate = DateUtil.normalizeDate(startDate);
    }
    this._startDate = startDate;
  }

  get payoffDate(): LocalDate | undefined {
    return this._payoffDate;
  }

  set payoffDate(value: Date | LocalDate | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (value) {
      if (value instanceof Date) {
        value = DateUtil.normalizeDate(value);
      } else if (typeof value === 'string') {
        value = DateUtil.normalizeDate(value);
      }
    }

    if (value && this._payoffDate && !this._payoffDate.isEqual(value)) {
      this.modifiedSinceLastCalculation = true;
      this._payoffDate = value;
    } else if (this._payoffDate && !value) {
      this.modifiedSinceLastCalculation = true;
      this._payoffDate = value;
    } else if (!this._payoffDate && value) {
      this.modifiedSinceLastCalculation = true;
      this._payoffDate = value;
    } else {
      // nothing to
    }
  }

  get endDate(): LocalDate {
    if (!this._endDate || (this.modifiedSinceLastCalculation === true && this.hasCustomEndDate === false)) {
      const termUnit = this.termPeriodDefinition.unit === 'complex' ? 'day' : this.termPeriodDefinition.unit;
      let chronoUnit = ChronoUnit.MONTHS;
      if (termUnit === 'day') {
        chronoUnit = ChronoUnit.DAYS;
      } else if (termUnit === 'week') {
        chronoUnit = ChronoUnit.WEEKS;
      } else if (termUnit === 'month') {
        chronoUnit = ChronoUnit.MONTHS;
      } else if (termUnit === 'year') {
        chronoUnit = ChronoUnit.YEARS;
      } else {
        throw new Error(`Invalid term unit ${termUnit}`);
      }

      this._endDate = this.startDate.plus(this.actualTerm * this.termPeriodDefinition.count[0], chronoUnit);
    }
    return this._endDate;
  }

  set hasCustomEndDate(value: boolean) {
    // console.trace("hasCustomEndDate is being set", value);
    this.modifiedSinceLastCalculation = true;
    this._endDate = undefined;
    this._hasCustomEndDate = value;
  }

  get hasCustomEndDate() {
    return this._hasCustomEndDate;
  }

  set endDate(endDate: LocalDate | Date | string | undefined) {
    this.modifiedSinceLastCalculation = true;

    // console.trace("end date is being set", endDate);
    let newEndDate: LocalDate;
    if (endDate) {
      this.hasCustomEndDate = true;
      newEndDate = DateUtil.normalizeDate(endDate);
    } else {
      this._endDate = undefined;
      return;
    }

    // validate that the end date is after the start date
    if (newEndDate.isBefore(this.startDate)) {
      throw new Error('Invalid end date, must be after the start date');
    }

    this._endDate = newEndDate;
  }

  public getInputParams(): AmortizationParams {
    return cloneDeep(this._inputParams);
  }

  public getRepaymentSchedule(): AmortizationEntries {
    return this.repaymentSchedule;
  }

  private calculateFeesForPeriod(
    termNumber: number,
    principal: Currency | null,
    interest: Currency,
    totalPayment: Currency
  ): { totalFees: Currency; feesAfterPrincipal: Fee[] } {
    // Retrieve per-term fees
    const termFees = this.feesPerTerm.getFeesForTerm(termNumber);
    // Retrieve fees that apply to all terms
    const allTermFees = this.feesForAllTerms;
    // deffered fees
    const deferredFees: Fee[] = [
      new Fee({
        type: 'fixed',
        amount: this.unbilledDeferredFees,
        description: 'Deferred fee',
      }),
    ];

    // Combine the fees
    const fees = [...deferredFees, ...allTermFees.all, ...termFees];

    let totalFees = Currency.zero;
    let feesBeforePrincipal: Fee[] = [];
    let feesAfterPrincipal: Fee[] = [];

    for (const fee of fees) {
      if (fee.type === 'fixed') {
        feesBeforePrincipal.push(fee);
      } else if (fee.type === 'percentage') {
        if (fee.basedOn === 'interest' || fee.basedOn === 'totalPayment') {
          feesBeforePrincipal.push(fee);
        } else if (fee.basedOn === 'principal') {
          feesAfterPrincipal.push(fee);
        } else {
          throw new Error(`Invalid basedOn value for fee in term ${termNumber}`);
        }
      } else {
        throw new Error(`Invalid fee type for term ${termNumber}`);
      }
    }

    // Calculate feesBeforePrincipal
    for (const fee of feesBeforePrincipal) {
      let feeAmount: Currency = Currency.zero;
      if (fee.type === 'fixed') {
        feeAmount = fee.amount!;
      } else if (fee.type === 'percentage') {
        let baseAmount: Currency;
        if (fee.basedOn === 'interest') {
          baseAmount = interest;
        } else if (fee.basedOn === 'totalPayment') {
          baseAmount = totalPayment;
        } else {
          throw new Error(`Invalid basedOn value for fee in term ${termNumber}`);
        }
        feeAmount = baseAmount.multiply(fee.percentage!);
      }
      totalFees = totalFees.add(feeAmount);
    }

    // reset deferred fees
    this.unbilledDeferredFees = Currency.zero;
    // Return the totalFees and the feesAfterPrincipal to be handled after principal is calculated
    return { totalFees, feesAfterPrincipal };
  }

  get apr(): Decimal {
    if (!this._apr) {
      this._apr = this.calculateAPR();
    }
    return this._apr;
  }

  get loanTermInMonths(): number {
    const startDate = this.startDate;
    const endDate = this.endDate;

    return ChronoUnit.MONTHS.between(startDate, endDate);
  }

  calculateAPR(): Decimal {
    // Group repayments by period number, summing up principal and interest
    const paymentsMap = new Map<number, { principal: Decimal; interest: Decimal; paymentDate: Date }>();

    for (const schedule of this.repaymentSchedule.entries) {
      const period = schedule.term;
      let payment = paymentsMap.get(period);
      if (!payment) {
        // Initialize a new payment object
        payment = {
          principal: schedule.principal.getValue(),
          interest: schedule.accruedInterestForPeriod.getValue(),
          paymentDate: DateUtil.normalizeDateToJsDate(schedule.periodEndDate),
        };
        paymentsMap.set(period, payment);
      } else {
        // Accumulate principal and interest
        payment.principal = payment.principal.add(schedule.principal.getValue());
        payment.interest = payment.interest.add(schedule.accruedInterestForPeriod.getValue());
        // Update payment date if the current one is later
        if (schedule.periodEndDate.isAfter(DateUtil.normalizeDate(payment.paymentDate))) {
          payment.paymentDate = DateUtil.normalizeDateToJsDate(schedule.periodEndDate);
        }
      }
    }

    // Extract the payments array from the paymentsMap
    const payments = Array.from(paymentsMap.values());

    // Sort payments by paymentDate to ensure correct order
    payments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());

    // Now proceed to calculate the APR using the combined payments
    const apr = InterestCalculator.calculateRealAPR(
      {
        loanAmount: this.totalLoanAmount.getValue(),
        originationFee: this.originationFee.getValue(),
        terms: payments,
        startDate: DateUtil.normalizeDateToJsDate(this.startDate),
      },
      10
    );
    return apr;
  }

  /**
   * Validate the schedule rates.
   */

  validateRatesSchedule(): void {
    if (this.rateSchedules.length < 1) {
      throw new Error('Invalid schedule rates, at least one rate is required');
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isEqual(this.rateSchedules.first.startDate)) {
      throw new Error(
        `Invalid schedule rates: The start date (${this.startDate.toString()}) does not match the first rate schedule start date (${this.rateSchedules.first.startDate.toString()}).`
      );
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isEqual(this.rateSchedules.last.endDate)) {
      throw new Error(
        `Invalid schedule rates: The end date (${this.endDate.toString()}) does not match the last rate schedule end date (${this.rateSchedules.last.endDate.toString()}).`
      );
    }

    // verify that rate is not negative
    for (let rate of this.rateSchedules.all) {
      if (rate.annualInterestRate.isNegative()) {
        throw new Error('Invalid annual interest rate, value cannot be negative');
      }
    }

    // verify that rate is not greater than 100% unless explicitly allowed
    for (let rate of this.rateSchedules.all) {
      if (rate.annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
        throw new Error(
          'Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true'
        );
      }
    }
  }

  /**
   * Validate the schedule periods.
   */
  verifySchedulePeriods(): void {
    if (this.periodsSchedule.length !== this.actualTerm) {
      if (!this.payoffDate && !this.earlyRepayment) {
        throw new Error('Invalid schedule periods, number of periods must match the actual term');
      }
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isEqual(this.periodsSchedule.firstPeriod.startDate)) {
      throw new Error('Invalid schedule periods, start date does not match the loan start date');
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isEqual(this.periodsSchedule.lastPeriod.endDate)) {
      if (!this.payoffDate || (this.payoffDate && !this.payoffDate.isEqual(this.periodsSchedule.lastPeriod.endDate))) {
        throw new Error('Invalid schedule periods, end date does not match the loan end date');
      }
    }

    for (let i = 0; i < this.periodsSchedule.length - 1; i++) {
      // Check if the periods are in ascending order
      const endDateAtIndex = this.periodsSchedule.periods[i].endDate;
      const startDateAtIndexPlusOne = this.periodsSchedule.periods[i + 1].startDate;

      if (!endDateAtIndex.isEqual(startDateAtIndexPlusOne)) {
        throw new Error('Invalid schedule periods, periods are not in ascending order');
      }
      // Check if the periods are non-overlapping
      if (endDateAtIndex.isAfter(startDateAtIndexPlusOne)) {
        throw new Error('Invalid schedule periods, periods are overlapping');
      }
    }
  }

  /**
   * Generate schedule periods based on the term and start date.
   */

  generatePeriodicSchedule(): PeriodSchedule[] {
    const periodsSchedule: PeriodSchedule[] = [];

    // Determine ONCE if the *original* loan startDate is the last day of its month
    // This value will control whether subsequent payments fall on the last day.
    const shouldUseEndOfMonth = this.startDate.isEqual(this.startDate.with(TemporalAdjusters.lastDayOfMonth()));
    let startDate = DateUtil.normalizeDate(this.startDate);

    for (let currentTerm = 0; currentTerm < this.actualTerm; currentTerm++) {
      let endDate: LocalDate;

      if (currentTerm === 0 && this.firstPaymentDate) {
        // If there's a custom first payment date, use that for the first period.
        endDate = DateUtil.normalizeDate(this.firstPaymentDate);
      } else {
        // For subsequent periods, either we continue end-of-month alignment (if we began that way)
        // or we simply add the defined term count normally.
        const termUnit = this.termPeriodDefinition.unit === 'complex' ? 'day' : this.termPeriodDefinition.unit;

        const unitsToAdd = this.termPeriodDefinition.count[0];

        if (shouldUseEndOfMonth && termUnit === 'month') {
          endDate = startDate.plusMonths(unitsToAdd).with(TemporalAdjusters.lastDayOfMonth());
        } else {
          switch (termUnit) {
            case 'day':
              endDate = startDate.plusDays(unitsToAdd);
              break;
            case 'week':
              endDate = startDate.plusWeeks(unitsToAdd);
              break;
            case 'month':
              endDate = startDate.plusMonths(unitsToAdd);
              break;
            case 'year':
              endDate = startDate.plusYears(unitsToAdd);
              break;
            default:
              throw new Error(`Unsupported term unit: ${termUnit}`);
          }
        }
      }

      const activeChangeDates = this.changePaymentDates.active; // ← new helper

      // Check if we have a custom "change payment date" for this term
      if (activeChangeDates.length > 0) {
        const matchingChange = activeChangeDates.find((changePaymentDate) => {
          if (changePaymentDate.termNumber < 0 && changePaymentDate.originalDate) {
            // i.e. if the original date is exactly the startDate
            if (endDate.isEqual(changePaymentDate.originalDate)) {
              changePaymentDate.termNumber = currentTerm;
              return true;
            }
          } else {
            return changePaymentDate.termNumber === currentTerm;
          }
        });

        if (matchingChange) {
          matchingChange.originalEndDate = endDate;
          endDate = matchingChange.newDate;
        }
      }

      // now lets see if we have a payoffDate set and if that payoffDate is
      // between start and end dates, if so, end date should be the payoff date
      if (this.payoffDate && DateUtil.isBetweenInclusive(this.payoffDate, startDate, endDate)) {
        endDate = this.payoffDate;
        // console.log("payoff date is between start and end date", startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD"));
        // terminate the loop
        currentTerm = this.actualTerm;
      }

      periodsSchedule.push(
        new PeriodSchedule({
          startDate: startDate,
          endDate: endDate,
          type: 'generated',
        })
      );

      startDate = endDate;
    }

    // Ensure the final period ends on the loan's end date
    periodsSchedule[periodsSchedule.length - 1].endDate = this.payoffDate || this.endDate;
    return periodsSchedule;
  }

  /**
   * Generate schedule rates based on the term and start date.
   */

  generateRatesSchedule(): RateSchedules {
    let startDate = this.startDate;
    const endDate = this.endDate;
    return new RateSchedules([
      new RateSchedule({
        annualInterestRate: this.annualInterestRate,
        startDate,
        endDate,
        type: 'default',
      }),
    ]);
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printShortAmortizationSchedule(): void {
    const amortization = this.calculateAmortizationPlan();
    console.table(
      amortization.entries.map((row) => {
        return {
          term: row.term,
          periodStartDate: row.periodStartDate.toString(),
          periodEndDate: row.periodEndDate.toString(),
          periodInterestRate: row.periodInterestRate,
          principal: row.principal.getRoundedValue(this.roundingPrecision).toNumber(),
          MBAmount: row.balanceModificationAmount.toNumber(),

          //totalInterestForPeriod: row.totalInterestForPeriod.toNumber(), // Include total interest for the period in the printed table
          BDInterest: row.billedDeferredInterest.getRoundedValue(this.roundingPrecision).toNumber(),
          dueInterestT: row.dueInterestForTerm.getRoundedValue(this.roundingPrecision).toNumber(),
          AInterestP: row.accruedInterestForPeriod.getRoundedValue(this.roundingPrecision).toNumber(),
          BInterestT: row.billedInterestForTerm.getRoundedValue(this.roundingPrecision).toNumber(), // Include total interest for the term in the printed table
          //realInterest: row.realInterest.toNumber(), // Include real interest value in the printed table
          //interestRoundingError: row.interestRoundingError.toNumber(),
          totalPayment: row.totalPayment.getRoundedValue(this.roundingPrecision).toNumber(),
          perDiem: row.perDiem.getRoundedValue(this.roundingPrecision).toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          endBalance: row.endBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          BalanceModification: row.balanceModificationAmount.toNumber(),
          billablePeriod: row.billablePeriod,
          // unbilledInterestDueToRounding: row.unbilledInterestDueToRounding.toNumber(), // Include unbilled interest due to rounding in the printed table
          //  metadata: JSON.stringify(row.metadata), // Include metadata in the printed table
        };
      })
    );
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printAmortizationSchedule(): void {
    const amortization = this.calculateAmortizationPlan();
    console.table(
      amortization.entries.map((row) => {
        return {
          period: row.term,
          periodStartDate: row.periodStartDate.toString(),
          periodEndDate: row.periodEndDate.toString(),
          periodInterestRate: row.periodInterestRate,
          principal: row.principal.getRoundedValue(this.roundingPrecision).toNumber(),
          balanceModificationAmount: row.balanceModificationAmount.toNumber(),
          billedfInterestForTerm: row.billedInterestForTerm.toNumber(), // Include total interest for the period in the printed table
          accruedInterestForPeriod: row.accruedInterestForPeriod.getRoundedValue(this.roundingPrecision).toNumber(),
          // unroundedInterestForPeriod: row.unroundedInterestForPeriod.toNumber(), // Include real interest value in the printed table
          interestRoundingError: row.interestRoundingError.toNumber(),
          totalPayment: row.totalPayment.getRoundedValue(this.roundingPrecision).toNumber(),
          perDiem: row.perDiem.getRoundedValue(this.roundingPrecision).toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          endBalance: row.endBalance.getRoundedValue(this.roundingPrecision).toNumber(),
          unbilledInterestDueToRounding: row.unbilledInterestDueToRounding.toNumber(), // Include unbilled interest due to rounding in the printed table
          // metadata: JSON.stringify(row.metadata), // Include metadata in the printed table
        };
      })
    );
  }

  /**
   * Get interest rates between the specified start and end dates.
   *
   * Passed start and end date not necessarily spawn a single rate schedule row,
   * so we will return new rate schedules for this range of dates.
   * For example, if the passed start date is 01-13-2023 and the end date is 02-13-2023,
   * and we have rate schedules for 01-01-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-28-2023 at 6%,
   * then we will return two rate schedules for the passed range of dates:
   * 01-13-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-13-2023 at 6%.
   *
   * @param startDate The start date of the range.
   * @param endDate The end date of the range.
   * @returns An array of rate schedules within the specified date range.
   */
  getInterestRatesBetweenDates(startDate: LocalDate, endDate: LocalDate): RateSchedule[] {
    const rates: RateSchedule[] = [];

    for (let rate of this.rateSchedules.all) {
      if (startDate.isBefore(rate.endDate) && (endDate.isEqual(rate.startDate) || endDate.isAfter(rate.startDate))) {
        const effectiveStartDate = startDate.isAfter(rate.startDate) ? startDate : rate.startDate;
        const effectiveEndDate = endDate.isBefore(rate.endDate) ? endDate : rate.endDate;
        rates.push(
          new RateSchedule({
            annualInterestRate: rate.annualInterestRate,
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
          })
        );
      }
    }

    // if perDiemCalculationType is set to "AnnualRateDividedByDaysInYear", we dont need to do anything
    // if perDiemCalculationType is set to "MonthlyRateDividedByDaysInMonth", we need to split the schedule
    // into smaller schedules based on the month, so for example 11/15/2024 to 12/15/2024 will be split into
    // 11/15/2024 to 11/30/2024 at 5% and 12/01/2024 to 12/15/2024 at 5%
    // this will allow interest calculator to calculate MonthlyRateDividedByDaysInMonth
    // correctly for terms that spawn multiple months, which is likely most of the time

    if (this.perDiemCalculationType === 'AnnualRateDividedByDaysInYear') {
      return rates;
    } else if (this.perDiemCalculationType === 'MonthlyRateDividedByDaysInMonth') {
      return rates;
    } else if (this.perDiemCalculationType === 'MonthlyRateDividedByDaysInMonthComplex') {
      const splitRates: RateSchedule[] = [];
      // we will split the rates into smaller schedules based on the month
      for (let rate of rates) {
        const startDate = rate.startDate;
        const endDate = rate.endDate;
        let currentDate = startDate;
        while (currentDate.isBefore(endDate) || currentDate.isEqual(endDate)) {
          const lastDayOfMonth = currentDate.with(TemporalAdjusters.lastDayOfMonth());

          const effectiveEndDate = endDate.isBefore(lastDayOfMonth) ? endDate : lastDayOfMonth.plusDays(1);

          splitRates.push(
            new RateSchedule({
              annualInterestRate: rate.annualInterestRate,
              startDate: currentDate,
              endDate: effectiveEndDate,
            })
          );

          currentDate = lastDayOfMonth.plusDays(1);
        }
      }
      return splitRates;
    } else {
      throw new Error(
        `Invalid per diem calculation type, getInterestRatesBetweenDates is not implemented for ${this.perDiemCalculationType}`
      );
    }
  }

  /**
   * Generate a partial amortization plan up to (but not including) a given term, using only contractual EMI.
   */
  private calculatePartialPlanUpToTerm(recalcTerm: number): Currency {
    let startBalance = this.totalLoanAmount;
    for (let termIndex = 0; termIndex < recalcTerm; termIndex++) {
      // Use contractual EMI for all terms before recalcTerm
      const fixedMonthlyPayment = this.contractualEquitedMonthlyPayment!;
      // Simple interest calculation for this period
      // (This is a simplification; you may want to use your full interest logic here)
      // We'll use the same period schedule as the main plan
      const period = this.periodsSchedule.atIndex(termIndex);
      const daysInPeriod = period.endDate.toEpochDay() - period.startDate.toEpochDay();
      const interest = startBalance.multiply(this.annualInterestRate).multiply(daysInPeriod).divide(365);
      let principal = fixedMonthlyPayment.subtract(interest);
      if (principal.greaterThan(startBalance)) {
        principal = startBalance;
      }
      startBalance = startBalance.subtract(principal);
      if (startBalance.lessThanOrEqualTo(0)) {
        startBalance = Currency.zero;
        break;
      }
    }
    return startBalance;
  }

  getTermPaymentAmount(termNumber: number, _isForRecalculation: boolean = false): Currency {
    // 1️⃣  manual override wins
    const manual = this.termPaymentAmountOverride.active.find((o) => o.termNumber === termNumber);
    if (manual) return manual.paymentAmount;

    // 2️⃣  Check for active extension with EMI recalculation
    const ext = this.termExtensions.active.find((e) => e.emiRecalculationMode && e.emiRecalculationMode !== 'none');
    if (ext) {
      if (ext.emiRecalculationMode === 'none') {
        // Maintain original EMI
        return this.contractualEquitedMonthlyPayment!;
      }
      if (ext.emiRecalculationMode === 'fromStart') {
        // Use the flag to determine how to count paying terms
        const ignoreSkip = ext.ignoreSkipTermsForEmiRecalculation;
        const payingTerms = ignoreSkip ? this.getPayingTermCount(0) : this.actualTerm - 0;
        return this.calculateFixedMonthlyPayment(this.totalLoanAmount, payingTerms);
      }
      if (ext.emiRecalculationMode === 'fromTerm' && typeof ext.emiRecalculationTerm === 'number') {
        const recalcTerm = ext.emiRecalculationTerm;
        // If the recalculation term is beyond the schedule, treat as 'none'
        if (recalcTerm >= this.actualTerm) {
          return this.contractualEquitedMonthlyPayment!;
        }
        if (termNumber < recalcTerm) {
          return this.contractualEquitedMonthlyPayment!;
        }
        // For terms at or after recalcTerm, recalculate EMI based on remaining principal and remaining terms
        if (!this._emiRecalculationPrincipalCache[recalcTerm]) {
          // Only calculate the principal at the recalculation term ONCE per plan
          // Generate a partial plan up to recalcTerm using only contractual EMI
          this._emiRecalculationPrincipalCache[recalcTerm] = this.calculatePartialPlanUpToTerm(recalcTerm);
        }
        const balance = this._emiRecalculationPrincipalCache[recalcTerm];
        const ignoreSkip = ext.ignoreSkipTermsForEmiRecalculation;
        const payingTerms = ignoreSkip ? this.getPayingTermCount(recalcTerm) : this.actualTerm - recalcTerm;
        return this.calculateFixedMonthlyPayment(balance, payingTerms);
      }
    }
    // 3️⃣  Default: use contractual EMI
    return this.contractualEquitedMonthlyPayment!;
  }

  /**
   * Returns the running balance broken into slices that reflect every
   * BalanceModification between startDate (inclusive) and endDate (exclusive).
   *
   * – multiple modifications on the **same day** are all applied in the order
   *   they appear in `balanceModifications.all`
   * – the balance is updated cumulatively, so later mods see the already-modified
   *   balance
   * – the function never lets the running balance fall below zero
   */
  public getModifiedBalance(startDate: LocalDate, endDate: LocalDate, openingBalance: Currency): BalanceSlice[] {
    const slices: BalanceSlice[] = [];

    /** 1️⃣  Pull only the mods that fall into this period and sort them */
    const modsInRange = this.balanceModifications.all
      .filter((m) => DateUtil.isBetweenHalfOpen(m.date, startDate, endDate))
      .sort((a, b) => a.date.compareTo(b.date));

    let runningBalance = Currency.of(openingBalance);
    let cursor = startDate; // marks the beginning of the next slice

    for (const mod of modsInRange) {
      /* ── slice **up to** the modification date (if at least 1 day long) ── */
      if (!cursor.isEqual(mod.date)) {
        slices.push({
          balance: runningBalance,
          modificationAmount: Currency.zero,
          startDate: cursor,
          endDate: mod.date,
        });
      }

      /* ── apply the modification ── */
      let delta: Currency;
      switch (mod.type) {
        case 'increase':
          delta = mod.amount;
          break;
        case 'decrease':
          delta = mod.amount.negated();
          break;
        default:
          throw new Error(`Unknown balance modification type "${mod.type}"`);
      }

      let newBalance = runningBalance.add(delta);

      /* keep balance from going negative and track how much of the mod was used */
      if (newBalance.isNegative()) {
        const excess = newBalance.abs();
        newBalance = Currency.zero;
        delta = delta.add(excess); // reduce delta by the excess
        mod.usedAmount = delta.negated(); // same convention as your original code
      } else {
        mod.usedAmount = delta.negated();
      }

      /* ── zero-length slice *at* the modification point ── */
      slices.push({
        balance: newBalance,
        balanceModification: mod,
        modificationAmount: delta,
        startDate: mod.date,
        endDate: mod.date, // half-open ⇒ 0-day slice
      });

      /* advance cursors for next loop */
      runningBalance = newBalance;
      cursor = mod.date;
    }

    /* 2️⃣  Tail slice from last mod (or startDate) to endDate */
    if (!cursor.isEqual(endDate)) {
      slices.push({
        balance: runningBalance,
        modificationAmount: Currency.zero,
        startDate: cursor,
        endDate: endDate,
      });
    }

    return slices;
  }

  private resetUsageDetails(): void {
    this.unbilledInterestDueToRounding = Currency.zero;
    this.unbilledDeferredInterest = Currency.zero;
    this.unbilledDeferredFees = Currency.zero;
    this.totalChargedInterestRounded = Currency.zero;
    this.totalChargedInterestUnrounded = Currency.zero;
    this.unbilledInterestDueToRounding = Currency.zero;
    this.unbilledDeferredInterest = Currency.zero;
    this.unbilledDeferredFees = Currency.zero;
    this.earlyRepayment = false;
  }

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  public calculateAmortizationPlan(_isForRecalculation: boolean = false): AmortizationEntries {
    // Clear the EMI recalculation cache at the start of each plan calculation
    this._emiRecalculationPrincipalCache = {};
    const hadRealChanges = this.modifiedSinceLastCalculation;
    this.balanceModifications.resetUsedAmounts();
    this.resetUsageDetails();
    // Patch: Ensure rate schedule covers the full actualTerm
    if (
      !this._rateSchedules ||
      !this._rateSchedules.last ||
      !this._rateSchedules.last.endDate ||
      this._rateSchedules.last.endDate.isBefore(this.endDate)
    ) {
      this._rateSchedules = this.generateRatesSchedule();
    }

    const schedule: AmortizationEntries = new AmortizationEntries();
    let startBalance = this.totalLoanAmount;
    let actualDSIBalance = this.totalLoanAmount; // Track actual DSI balance separately
    //let termIndex = 0;

    // for (let term of this.periodsSchedule.periods) {
    let lastIndex = -1;
    for (let termIndex = 0; termIndex < this.periodsSchedule.length; termIndex++) {
      lastIndex++;
      let term = this.periodsSchedule.atIndex(termIndex);
      if (this.earlyRepayment === true) {
        break;
      }

      // if (termIndex === this.periodsSchedule.length - 1) {
      //   console.log("last term");
      // }

      const termCalendar = this.calendars.getCalendarForTerm(termIndex);
      const isCustomCalendar = this.calendars.hasCalendarForTerm(termIndex);
      const periodStartDate = term.startDate;
      const periodEndDate = term.endDate;
      // For DSI billing model, prebill and due days don't apply
      const billingModel = this._getBillingModelForTerm ? this._getBillingModelForTerm(termIndex + 1) : 'amortized';
      const isDSI = billingModel === 'dailySimpleInterest';
      
      const preBillDaysConfiguration = isDSI ? 0 : this.preBillDays.atIndex(termIndex).preBillDays;
      const dueBillDaysConfiguration = isDSI ? 0 : this.dueBillDays.atIndex(termIndex).daysDueAfterPeriodEnd;
      const billOpenDate = isDSI ? periodEndDate : periodEndDate.minusDays(preBillDaysConfiguration);
      const billDueDate = isDSI ? periodEndDate : periodEndDate.plusDays(dueBillDaysConfiguration);
      const fixedMonthlyPayment = this.getTermPaymentAmount(termIndex, _isForRecalculation);

      let billedInterestForTerm = Currency.zero;

      // Check if we have a static interest override for this term
      const staticInterestOverride = this.termInterestAmountOverride.active.find(
        (override) => override.termNumber === termIndex
      );

      // For DSI, check if we have actual balance from payment history or previous term
      let balanceForCalculation = startBalance;
      if (isDSI) {
        // For DSI, we should use the end balance from the previous term if available
        // This ensures that future terms are calculated based on actual remaining balance
        if (termIndex > 0) {
          // Check payment history for previous term
          const prevPaymentHistory = this.getDSIPaymentHistory(termIndex - 1);
          if (prevPaymentHistory) {
            balanceForCalculation = prevPaymentHistory.actualEndBalance;
            actualDSIBalance = prevPaymentHistory.actualEndBalance;
            // Update startBalance for DSI to reflect actual balance
            startBalance = actualDSIBalance;
          } else {
            // No payment history for previous term, but we should still use the
            // projected balance that cascades from earlier terms, not the original loan amount
            balanceForCalculation = startBalance;
            actualDSIBalance = startBalance;
          }
        }
        
        // Note: We don't use payment history for the current term when calculating due amounts
        // The current term's payment history is only relevant for tracking what was actually paid
        
        // For DSI, we always need to recalculate based on actual balance
        // This ensures that due interest and principal are correct
      }
      
      const loanBalancesInAPeriod = this.getModifiedBalance(periodStartDate, periodEndDate, balanceForCalculation);
      const lastBalanceInPeriod = loanBalancesInAPeriod.length;
      let currentBalanceIndex = 0;

      // Handle static interest override scenario
      if (staticInterestOverride) {
        // get last balance including modifications
        const staticInterestOverrideAmount = staticInterestOverride.interestAmount;

        // Use the static interest for the entire term plus any deferred interest
        let appliedDeferredInterest = Currency.of(0);
        if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
          appliedDeferredInterest = this.unbilledDeferredInterest;
          this.unbilledDeferredInterest = Currency.zero;
        }

        const totalTermInterest = staticInterestOverrideAmount.add(appliedDeferredInterest);

        const accruedInterestForPeriod = totalTermInterest;
        const roundedInterest = this.round(totalTermInterest);
        const interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();
        if (!interestRoundingError.isZero()) {
          this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
        }

        const daysInYear = termCalendar.daysInYear();
        const daysInMonthForCalc = termCalendar.daysInMonth(periodStartDate);
        const daysInPeriodTotal = termCalendar.daysBetween(periodStartDate, periodEndDate);

        const interestCalc = new InterestCalculator(
          this.annualInterestRate,
          termCalendar.calendarType,
          this.perDiemCalculationType,
          daysInMonthForCalc
        );

        const rateMetadata = interestCalc.calculateEquivalentAnnualRateMetadata(
          startBalance,
          accruedInterestForPeriod,
          this.annualInterestRate, // baseAnnualRate
          this.allowRateAbove100,
          new Decimal(staticInterestOverride.acceptableRateVariance),
          daysInPeriodTotal
        );

        const metadata: AmortizationScheduleMetadata = {
          staticInterestOverrideApplied: true,
          isCustomCalendar: isCustomCalendar,
          actualInterestValue: rateMetadata.actualInterestValue,
          equivalentAnnualRate: rateMetadata.equivalentAnnualRate.toDecimalPlaces(8).toNumber(),
          equivalentAnnualRateVariance: rateMetadata.equivalentAnnualRateVariance.toDecimalPlaces(8).toNumber(),
          acceptableRateVariance: rateMetadata.acceptableRateVariance,
          equivalentAnnualRateVarianceExceeded: rateMetadata.equivalentAnnualRateVarianceExceeded,
        };

        // Calculate fees
        const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(
          termIndex,
          null,
          accruedInterestForPeriod,
          fixedMonthlyPayment
        );

        let availableForInterestAndPrincipal = fixedMonthlyPayment.subtract(totalFeesBeforePrincipal);
        let dueInterestForTerm: Currency;
        let deferredInterestFromCurrentPeriod: Currency;
        let totalFees: Currency;
        let billedDeferredFees = Currency.zero;
        let principal: Currency;
        let totalPayment: Currency;

        if (availableForInterestAndPrincipal.isNegative()) {
          // Fees exceed payment, so interest defers again
          principal = Currency.zero;
          dueInterestForTerm = Currency.zero;
          const unpaidFees = availableForInterestAndPrincipal.abs();
          this.unbilledDeferredFees = this.unbilledDeferredFees.add(unpaidFees);

          const paidFeesThisPeriod = totalFeesBeforePrincipal.subtract(unpaidFees);
          totalFees = paidFeesThisPeriod.greaterThan(0) ? paidFeesThisPeriod : Currency.zero;

          deferredInterestFromCurrentPeriod = accruedInterestForPeriod;
          this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
        } else {
          if (availableForInterestAndPrincipal.greaterThanOrEqualTo(accruedInterestForPeriod)) {
            dueInterestForTerm = accruedInterestForPeriod;
            principal = availableForInterestAndPrincipal.subtract(accruedInterestForPeriod);
            deferredInterestFromCurrentPeriod = Currency.zero;
          } else {
            dueInterestForTerm = availableForInterestAndPrincipal;
            principal = Currency.zero;
            deferredInterestFromCurrentPeriod = accruedInterestForPeriod.subtract(dueInterestForTerm);
            this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
          }

          // Fees after principal
          let totalFeesAfterPrincipal = Currency.zero;
          if (feesAfterPrincipal.length > 0) {
            let totalPercentage = feesAfterPrincipal.reduce((sum, fee) => sum.add(fee.percentage!), new Decimal(0));
            totalFeesAfterPrincipal = principal.multiply(totalPercentage);
          }

          totalFees = totalFeesBeforePrincipal.add(totalFeesAfterPrincipal);
        }

        totalPayment = dueInterestForTerm.add(principal).add(totalFees);
        if (totalPayment.greaterThan(fixedMonthlyPayment)) {
          principal = principal.subtract(totalPayment.subtract(fixedMonthlyPayment));
          if (principal.isNegative()) {
            principal = Currency.zero;
          }
          totalPayment = fixedMonthlyPayment;
        }

        const balanceBeforePayment = startBalance;
        const balanceAfterPayment = startBalance
          .subtract(principal)
          .subtract(
            loanBalancesInAPeriod[0].modificationAmount.isNegative()
              ? loanBalancesInAPeriod[0].modificationAmount.abs()
              : loanBalancesInAPeriod[0].modificationAmount
          );

        this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(dueInterestForTerm);
        this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(dueInterestForTerm);

        // Calculate equivalent annual rate for metadata
        // let annualizedEquivalentRate = new Decimal(0);
        // if (startBalance.getValue().greaterThan(0) && daysInPeriodTotal > 0) {
        //   const fractionOfYear = daysInPeriodTotal / daysInYear;
        //   const interestDecimal = accruedInterestForPeriod.getValue();
        //   const principalDecimal = startBalance.getValue();
        //   const annualRate = interestDecimal.div(principalDecimal.mul(fractionOfYear));
        //   annualizedEquivalentRate = annualRate.lessThanOrEqualTo(1) || this.allowRateAbove100 ? annualRate : new Decimal(1);
        // }

        // const equivalentAnnualRateVariance = annualizedEquivalentRate.minus(this.annualInterestRate);
        // const equivalentAnnualRateVarianceExceeded = equivalentAnnualRateVariance.abs().greaterThanOrEqualTo(staticInterestOverride.acceptableRateVariance);

        // const metadata: AmortizationScheduleMetadata = {
        //   staticInterestOverrideApplied: true,
        //   actualInterestValue: accruedInterestForPeriod.toNumber(),
        //   equivalentAnnualRate: annualizedEquivalentRate.toNumber(),
        //   equivalentAnnualRateVariance: equivalentAnnualRateVariance.toNumber(),
        //   acceptableRateVariance: staticInterestOverride.acceptableRateVariance,
        //   equivalentAnnualRateVarianceExceeded: equivalentAnnualRateVarianceExceeded,
        // };
        // console.log("loan balance modifications", loanBalancesInAPeriod);

        const entryParams: any = {
            term: termIndex,
            billablePeriod: true,
            billingModel: this._getBillingModelForTerm ? this._getBillingModelForTerm(termIndex + 1) : 'amortized',
            periodStartDate: periodStartDate,
            periodEndDate: periodEndDate,
            periodBillOpenDate: billOpenDate,
            periodBillDueDate: billDueDate,
            billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
            prebillDaysConfiguration: preBillDaysConfiguration,
            periodInterestRate: rateMetadata.equivalentAnnualRate,
            principal: principal,
            fees: totalFees,
            billedDeferredFees: billedDeferredFees,
            unbilledTotalDeferredFees: this.unbilledDeferredFees,
            dueInterestForTerm: dueInterestForTerm,
            accruedInterestForPeriod: accruedInterestForPeriod,
            billedDeferredInterest: appliedDeferredInterest,
            billedInterestForTerm: accruedInterestForPeriod,
            balanceModificationAmount: loanBalancesInAPeriod[0].modificationAmount,
            balanceModification: loanBalancesInAPeriod[0].balanceModification,
            endBalance: balanceAfterPayment,
            startBalance: balanceBeforePayment,
            totalPayment: totalPayment,
            perDiem: accruedInterestForPeriod.isZero()
              ? Currency.zero
              : accruedInterestForPeriod.divide(daysInPeriodTotal),
            daysInPeriod: daysInPeriodTotal,
            unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
            interestRoundingError: interestRoundingError,
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
            calendar: termCalendar,
            metadata,
          };
          
          // Add DSI balance tracking if this is a DSI term
          if (isDSI) {
            // Check if we have payment history for this term
            const paymentHistory = this.getDSIPaymentHistory(termIndex);
            if (paymentHistory) {
              entryParams.actualDSIStartBalance = paymentHistory.actualStartBalance;
              entryParams.actualDSIEndBalance = paymentHistory.actualEndBalance;
              // Also preserve the payment splits
              if (paymentHistory.actualInterest !== undefined) {
                entryParams.actualDSIInterest = paymentHistory.actualInterest;
              }
              if (paymentHistory.actualPrincipal !== undefined) {
                entryParams.actualDSIPrincipal = paymentHistory.actualPrincipal;
              }
              if (paymentHistory.actualFees !== undefined) {
                entryParams.actualDSIFees = paymentHistory.actualFees;
              }
              // Don't override dsiInterestDays from payment history during amortization calculation
              // The days should be calculated based on payment dates, not stored values
              // if (paymentHistory.dsiInterestDays !== undefined) {
              //   entryParams.dsiInterestDays = paymentHistory.dsiInterestDays;
              // }
              // Don't override dsiPreviousPaymentDate with current term's payment date
              // It should remain as the previous term's payment date for interest calculation
            } else if (termIndex > 0) {
              // Check if previous term has payment history to propagate
              const prevPaymentHistory = this.getDSIPaymentHistory(termIndex - 1);
              if (prevPaymentHistory) {
                entryParams.actualDSIStartBalance = prevPaymentHistory.actualEndBalance;
                // End balance will be set when payment is processed
              }
            }
            // Don't set actualDSIStartBalance on initial calculation - only when payment is processed
          }
          
          schedule.addEntry(new AmortizationEntry(entryParams));

        startBalance = balanceAfterPayment;
        if (balanceAfterPayment.lessThanOrEqualTo(0) && termIndex < this.actualTerm) {
          this.earlyRepayment = true;
          break;
        }
        // Move to next term
        continue;
      }

      // If no static override, proceed with normal interest calculations
      for (let periodStartBalance of loanBalancesInAPeriod) {
        if (this.earlyRepayment === true) {
          break;
        }
        currentBalanceIndex++;

        const termInterestRateOverride = this.termInterestRateOverride.active.find(
          (override) => override.termNumber === termIndex
        )?.interestRate;

        let periodRates: RateSchedule[];
        if (termInterestRateOverride) {
          periodRates = [
            new RateSchedule({
              annualInterestRate: termInterestRateOverride,
              startDate: periodStartBalance.startDate,
              endDate: periodStartBalance.endDate,
            }),
          ];
        } else {
          periodRates = this.getInterestRatesBetweenDates(periodStartBalance.startDate, periodStartBalance.endDate);
        }

        const lastRateInPeriod = periodRates.length;
        let currentRate = 0;

        for (let interestRateForPeriod of periodRates) {
          currentRate++;
          const metadata: AmortizationScheduleMetadata = {};

          if (periodRates.length > 1) {
            metadata.splitInterestPeriod = true;
          }

          metadata.isCustomCalendar = isCustomCalendar;

          if (loanBalancesInAPeriod.length > 1) {
            metadata.splitBalancePeriod = true;
          }

          const daysInPeriod = termCalendar.daysBetween(interestRateForPeriod.startDate, interestRateForPeriod.endDate);
          const daysInMonthForCalc = termCalendar.daysInMonth(interestRateForPeriod.startDate);
          
          // For DSI loans, calculate actual interest days based on payment history
          let dsiInterestDays = daysInPeriod;
          let dsiPreviousPaymentDate: LocalDate | undefined;
          
          if (isDSI) {
            // For term 0, use standard days unless there's a specific start date
            if (termIndex === 0) {
              dsiInterestDays = daysInPeriod;
              dsiPreviousPaymentDate = interestRateForPeriod.startDate;
            } else {
              // Check if previous term has payment history
              const prevPaymentHistory = this.getDSIPaymentHistory(termIndex - 1);
              
              if (prevPaymentHistory && prevPaymentHistory.paymentDate) {
                // If we have the actual payment date from the payment history, use it
                dsiPreviousPaymentDate = prevPaymentHistory.paymentDate;
                // For DSI, always calculate to the full term end date regardless of rate sub-periods
                dsiInterestDays = termCalendar.daysBetween(dsiPreviousPaymentDate, periodEndDate);
                
              } else {
                // No payment history for previous term, use the previous term's end date
                // This ensures we calculate interest for the correct period, not from an earlier payment
                const prevTerm = this.periodsSchedule.atIndex(termIndex - 1);
                if (prevTerm) {
                  dsiPreviousPaymentDate = prevTerm.endDate;
                  dsiInterestDays = daysInPeriod; // Standard days in period
                } else {
                  // Fallback to standard calculation
                  dsiInterestDays = daysInPeriod;
                  dsiPreviousPaymentDate = interestRateForPeriod.startDate;
                }
              }
            }
          }

          let treatEndDateAsNonAccruing = false;

          if (this.interestAccruesFromDayZero === false) {
            if (this.payoffDate !== undefined && periodEndDate.isEqual(this.payoffDate)) {
              treatEndDateAsNonAccruing = true;
            } else if (daysInPeriod === 0) {
              treatEndDateAsNonAccruing = true;
            }
          }

          const interestCalculator = new InterestCalculator(
            interestRateForPeriod.annualInterestRate,
            termCalendar.calendarType,
            this.perDiemCalculationType,
            daysInMonthForCalc,
            /* treatEndDateAsNonAccruing = */ treatEndDateAsNonAccruing
          );

          // Use actual DSI balance for interest calculation if in DSI mode
          // For DSI with payment history, we should use the tracked balance, not the period balance
          const balanceForInterestCalc = isDSI ? balanceForCalculation : periodStartBalance.balance;
          
          let interestForPeriod: Currency;
          if (interestRateForPeriod.annualInterestRate.isZero()) {
            interestForPeriod = Currency.zero;
          } else {
            // For DSI, use actual interest days; for amortized, use standard days in period
            const interestDaysToUse = isDSI ? dsiInterestDays : daysInPeriod;
            interestForPeriod = interestCalculator.calculateInterestForDays(balanceForInterestCalc, interestDaysToUse);
            // interestForPeriod = this.round(interestForPeriod);
          }
          const rateMetadata = interestCalculator.calculateEquivalentAnnualRateMetadata(
            balanceForInterestCalc,
            interestForPeriod,
            interestRateForPeriod.annualInterestRate,
            this.allowRateAbove100,
            this.acceptableRateVariance,
            daysInPeriod
          );

          metadata.equivalentAnnualRate = rateMetadata.equivalentAnnualRate.toDecimalPlaces(8).toNumber();
          metadata.equivalentAnnualRateVariance = rateMetadata.equivalentAnnualRateVariance
            .toDecimalPlaces(8)
            .toNumber();
          metadata.acceptableRateVariance = rateMetadata.acceptableRateVariance;
          metadata.equivalentAnnualRateVarianceExceeded = rateMetadata.equivalentAnnualRateVarianceExceeded;
          metadata.actualInterestValue = rateMetadata.actualInterestValue;

          const finalPeriodInterestRate = rateMetadata.equivalentAnnualRate;

          const perDiem = interestForPeriod.isZero() ? Currency.zero : interestCalculator.perDiem;

          // Handle unbilled interest due to rounding error if at threshold
          if (
            this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD
          ) {
            if (
              this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())
            ) {
              interestForPeriod = interestForPeriod.add(this.unbilledInterestDueToRounding);
              metadata.unbilledInterestApplied = true;
              metadata.unbilledInterestAppliedAmount = this.unbilledInterestDueToRounding.toNumber();
              this.unbilledInterestDueToRounding = Currency.zero;
            }
          }

          const accruedInterestForPeriod = interestForPeriod;
          let appliedDeferredInterest = Currency.of(0);
          if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
            interestForPeriod = interestForPeriod.add(this.unbilledDeferredInterest);
            metadata.deferredInterestAppliedAmount = this.unbilledDeferredInterest.toNumber();
            appliedDeferredInterest = this.unbilledDeferredInterest;
            this.unbilledDeferredInterest = Currency.zero;
          }

          const roundedInterest = this.round(interestForPeriod);
          const interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();
          if (!interestRoundingError.isZero()) {
            metadata.unbilledInterestAmount = interestRoundingError.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
          }

          interestForPeriod = roundedInterest;

          billedInterestForTerm = billedInterestForTerm.add(interestForPeriod);

          // If not at the last subperiod
          if (currentRate !== lastRateInPeriod || currentBalanceIndex !== lastBalanceInPeriod) {
            // Non-billable sub-period
            const endBalance = periodStartBalance.balance;
            schedule.addEntry(
              new AmortizationEntry({
                term: termIndex,
                billablePeriod: false,
                billingModel: this._getBillingModelForTerm ? this._getBillingModelForTerm(termIndex + 1) : 'amortized',
                periodStartDate: interestRateForPeriod.startDate,
                periodEndDate: interestRateForPeriod.endDate,
                periodInterestRate: interestRateForPeriod.annualInterestRate,
                principal: Currency.zero,
                dueInterestForTerm: Currency.zero,
                accruedInterestForPeriod: this.round(accruedInterestForPeriod),
                billedInterestForTerm: billedInterestForTerm,
                billedDeferredInterest: appliedDeferredInterest,
                unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
                unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
                fees: Currency.zero,
                billedDeferredFees: Currency.zero,
                unbilledTotalDeferredFees: Currency.zero,
                periodBillOpenDate: billOpenDate,
                periodBillDueDate: billDueDate,
                billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
                prebillDaysConfiguration: preBillDaysConfiguration,
                interestRoundingError: interestRoundingError,
                balanceModificationAmount: periodStartBalance.modificationAmount,
                balanceModification: periodStartBalance.balanceModification,
                endBalance: endBalance,
                startBalance: startBalance,
                totalPayment: Currency.zero,
                perDiem: perDiem,
                daysInPeriod: daysInPeriod,
                calendar: termCalendar,
                metadata,
              })
            );
            startBalance = endBalance;
            continue;
          }

          // Billable sub-period
          const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(
            termIndex,
            null,
            billedInterestForTerm,
            fixedMonthlyPayment
          );

          let availableForInterestAndPrincipal = fixedMonthlyPayment.subtract(totalFeesBeforePrincipal);
          let dueInterestForTerm: Currency;
          let deferredInterestFromCurrentPeriod: Currency;
          let totalFees: Currency;
          let billedDeferredFees = Currency.zero;
          let principal: Currency;
          let totalPayment: Currency;

          if (availableForInterestAndPrincipal.isNegative()) {
            principal = Currency.zero;
            dueInterestForTerm = Currency.zero;
            const unpaidFees = availableForInterestAndPrincipal.abs();
            metadata.amountAddedToDeferredFees = unpaidFees.toNumber();
            this.unbilledDeferredFees = this.unbilledDeferredFees.add(unpaidFees);

            let paidFeesThisPeriod = totalFeesBeforePrincipal.subtract(unpaidFees);
            totalFees = paidFeesThisPeriod.greaterThan(0) ? paidFeesThisPeriod : Currency.zero;

            deferredInterestFromCurrentPeriod = billedInterestForTerm;
            this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
          } else {
            if (availableForInterestAndPrincipal.greaterThanOrEqualTo(billedInterestForTerm)) {
              dueInterestForTerm = billedInterestForTerm;
              principal = availableForInterestAndPrincipal.subtract(billedInterestForTerm);
              deferredInterestFromCurrentPeriod = Currency.zero;
            } else {
              dueInterestForTerm = availableForInterestAndPrincipal;
              principal = Currency.zero;
              deferredInterestFromCurrentPeriod = billedInterestForTerm.subtract(dueInterestForTerm);
              this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
            }

            let totalFeesAfterPrincipal = Currency.zero;
            if (feesAfterPrincipal.length > 0) {
              let totalPercentage = feesAfterPrincipal.reduce((sum, fee) => sum.add(fee.percentage!), new Decimal(0));
              totalFeesAfterPrincipal = principal.multiply(totalPercentage);
            }

            totalFees = totalFeesBeforePrincipal.add(totalFeesAfterPrincipal);
          }

          totalPayment = dueInterestForTerm.add(principal).add(totalFees);
          if (totalPayment.greaterThan(fixedMonthlyPayment)) {
            principal = principal.subtract(totalPayment.subtract(fixedMonthlyPayment));
            if (principal.isNegative()) {
              principal = Currency.zero;
            }
            totalPayment = fixedMonthlyPayment;
          }

          // balance might be lower than available principal, so we are dealing with excess
          // we will recalculate it then.
          if (principal.greaterThan(startBalance)) {
            principal = startBalance;
            totalPayment = dueInterestForTerm.add(principal).add(totalFees);
            //this.earlyRepayment = true;
          }

          const balanceBeforePayment = startBalance;
          const balanceAfterPayment = startBalance.subtract(principal);

          this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(dueInterestForTerm);
          this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(dueInterestForTerm);

          if (
            dueInterestForTerm.isZero() &&
            interestForPeriod.greaterThan(0) &&
            availableForInterestAndPrincipal.greaterThan(0)
          ) {
            metadata.interestLessThanOneCent = true;
            metadata.actualInterestValue = dueInterestForTerm.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(dueInterestForTerm);
          }

          metadata.amountAddedToDeferredInterest = deferredInterestFromCurrentPeriod.toNumber();

          // For DSI, check if we have payment history that should override the calculated balance
          if (isDSI && this.getDSIPaymentHistory(termIndex)) {
            const paymentHistory = this.getDSIPaymentHistory(termIndex);
            if (paymentHistory && paymentHistory.actualEndBalance) {
              startBalance = paymentHistory.actualEndBalance;
              // Also update the actual DSI balance tracker
              actualDSIBalance = paymentHistory.actualEndBalance;
            } else {
              startBalance = balanceAfterPayment;
            }
          } else {
            startBalance = balanceAfterPayment;
          }

          const entryParams: any = {
            term: termIndex,
            billablePeriod: true,
            billingModel: this._getBillingModelForTerm ? this._getBillingModelForTerm(termIndex + 1) : 'amortized',
            periodStartDate: interestRateForPeriod.startDate,
            periodEndDate: interestRateForPeriod.endDate,
            periodBillOpenDate: billOpenDate,
            periodBillDueDate: billDueDate,
            billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
            prebillDaysConfiguration: preBillDaysConfiguration,
            //   periodInterestRate: interestRateForPeriod.annualInterestRate,
            periodInterestRate: finalPeriodInterestRate,
            principal: principal,
            fees: totalFees,
            billedDeferredFees: billedDeferredFees,
            unbilledTotalDeferredFees: this.unbilledDeferredFees,
            dueInterestForTerm: dueInterestForTerm,
            accruedInterestForPeriod: accruedInterestForPeriod,
            billedDeferredInterest: appliedDeferredInterest,
            billedInterestForTerm: billedInterestForTerm,
            balanceModificationAmount: periodStartBalance.modificationAmount,
            endBalance: balanceAfterPayment,
            startBalance: balanceBeforePayment,
            totalPayment: totalPayment,
            perDiem: perDiem,
            daysInPeriod: daysInPeriod,
            unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
            interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
            calendar: termCalendar,
            metadata,
            dsiInterestDays: isDSI ? dsiInterestDays : undefined,
            dsiPreviousPaymentDate: isDSI ? dsiPreviousPaymentDate : undefined,
          };
          
          // Add DSI balance tracking if this is a DSI term
          if (isDSI) {
            // Check if we have payment history for this term
            const paymentHistory = this.getDSIPaymentHistory(termIndex);
            if (paymentHistory) {
              entryParams.actualDSIStartBalance = paymentHistory.actualStartBalance;
              entryParams.actualDSIEndBalance = paymentHistory.actualEndBalance;
              // Also preserve the payment splits
              if (paymentHistory.actualInterest !== undefined) {
                entryParams.actualDSIInterest = paymentHistory.actualInterest;
              }
              if (paymentHistory.actualPrincipal !== undefined) {
                entryParams.actualDSIPrincipal = paymentHistory.actualPrincipal;
              }
              if (paymentHistory.actualFees !== undefined) {
                entryParams.actualDSIFees = paymentHistory.actualFees;
              }
              // Don't override dsiInterestDays from payment history during amortization calculation
              // The days should be calculated based on payment dates, not stored values
              // if (paymentHistory.dsiInterestDays !== undefined) {
              //   entryParams.dsiInterestDays = paymentHistory.dsiInterestDays;
              // }
              // Don't override dsiPreviousPaymentDate with current term's payment date
              // It should remain as the previous term's payment date for interest calculation
            } else if (termIndex > 0) {
              // Check if previous term has payment history to propagate
              const prevPaymentHistory = this.getDSIPaymentHistory(termIndex - 1);
              if (prevPaymentHistory) {
                entryParams.actualDSIStartBalance = prevPaymentHistory.actualEndBalance;
                // End balance will be set when payment is processed
              }
            }
            // Don't set actualDSIStartBalance on initial calculation - only when payment is processed
          }
          
          schedule.addEntry(new AmortizationEntry(entryParams));

          if (balanceAfterPayment.lessThanOrEqualTo(0) && termIndex < this.actualTerm) {
            this.earlyRepayment = true;
            break;
          }
        }
      }
    }

    schedule.lastEntry.metadata.isFinalEntry = true;

    // Adjust the last payment if needed
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule.lastEntry;

      const termCalendar = lastPayment.calendar;
      if (!lastPayment) {
        console.error(`Last payment is not defined`, schedule);
        throw new Error('Last payment is not defined');
      }
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.accruedInterestForPeriod).add(lastPayment.fees);
      if (lastPayment.totalPayment.isZero() && lastPayment.dueInterestForTerm.greaterThan(0)) {
        lastPayment.totalPayment = lastPayment.totalPayment.add(lastPayment.dueInterestForTerm);
      }
      lastPayment.endBalance = Currency.of(0);
      // const daysInMonthForCalc = termCalendar.daysInMonth(termCalendar.addMonths(this.startDate, this.term));
      const daysInMonthForCalc = lastPayment.daysInPeriod;
      lastPayment.perDiem =
        daysInMonthForCalc > 0 ? lastPayment.accruedInterestForPeriod.divide(daysInMonthForCalc) : Currency.zero;
      lastPayment.metadata.finalAdjustment = true;
    }

    // Apply unbilled interest at the end if configured
    if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_END) {
      if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
        const lastPayment = schedule.lastEntry;
        const adjustedInterest = lastPayment.accruedInterestForPeriod.add(this.unbilledInterestDueToRounding);
        const adjustedInterestRounded = this.round(adjustedInterest);
        if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
          lastPayment.accruedInterestForPeriod = adjustedInterestRounded;
          lastPayment.billedInterestForTerm = this.round(
            lastPayment.billedInterestForTerm.add(this.unbilledInterestDueToRounding)
          );
          lastPayment.dueInterestForTerm = this.round(
            lastPayment.dueInterestForTerm.add(this.unbilledInterestDueToRounding)
          );
          lastPayment.interestRoundingError = adjustedInterestRounded.getRoundingErrorAsCurrency();
          lastPayment.totalPayment = lastPayment.principal
            .add(lastPayment.accruedInterestForPeriod)
            .add(lastPayment.fees);
          lastPayment.metadata.unbilledInterestApplied = true;
          lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber();
        }
      }
    }

    // After main loop, run DSI adjustment loop
    if (this._dsiPayments && this._dsiPayments.length > 0) {
      // Group DSI payments by term, allow multiple payments per term
      const dsiByTerm: Record<number, Array<any>> = {};
      for (const p of this._dsiPayments) {
        if (!dsiByTerm[p.term]) dsiByTerm[p.term] = [];
        dsiByTerm[p.term].push(p);
      }
      for (const entry of schedule.entries) {
        const dsiPayments = dsiByTerm[entry.term];
        if (dsiPayments && dsiPayments.length > 0) {
          // Sum up principal, interest, fees for the term
          const principalPaid = dsiPayments.reduce((sum, p) => sum + (p.principalPaid || 0), 0);
          const interestPaid = dsiPayments.reduce((sum, p) => sum + (p.interestPaid || 0), 0);
          const feesPaid = dsiPayments.reduce((sum, p) => sum + (p.feesPaid || 0), 0);
          entry.actualDSIPrincipal = Currency.of(principalPaid);
          entry.actualDSIInterest = Currency.of(interestPaid);
          entry.actualDSIFees = Currency.of(feesPaid);
          // Calculate savings/penalty
          const projectedInterest = entry.accruedInterestForPeriod.toNumber();
          if (interestPaid < projectedInterest) {
            entry.dsiInterestSavings = projectedInterest - interestPaid;
          } else if (interestPaid > projectedInterest) {
            entry.dsiInterestPenalty = interestPaid - projectedInterest;
          }
          // Attach usage details (one per payment)
          entry.usageDetails = dsiPayments.map((p) => ({
            paymentDate: p.paymentDate,
            principalPaid: p.principalPaid,
            interestPaid: p.interestPaid,
            feesPaid: p.feesPaid,
          }));
        }
      }
    }

    this.repaymentSchedule = schedule;
    this.modifiedSinceLastCalculation = false;
    // this.versionChanged();
    if (hadRealChanges) this.versionChanged();

    return schedule;
  }

  getAccruedInterestByDate(date: LocalDate | Date): Currency {
    date = DateUtil.normalizeDate(date);

    // first we get the period where the date is
    const activePeriod = this.repaymentSchedule.getPeriodByDate(date);

    if (!activePeriod) {
      console.warn('could not find active period for accrued interest');
      return Currency.zero;
    }

    // if active period end date is before passed in date
    // we will just return the accrued interest for the active period
    if (this.accrueInterestAfterEndDate === false && activePeriod.periodEndDate.isBefore(date)) {
      return activePeriod.accruedInterestForPeriod;
    }
    // next we get amortization entries with same period number and end date is same or before active period
    // const amortizationEntries = this.repaymentSchedule.entries.filter((entry) => entry.term === activePeriod.term && entry.periodEndDate.isSameOrBefore(activePeriod.periodStartDate));
    // sum up accrued interest for those entries
    let accruedInterest = Currency.zero;
    // for (let entry of amortizationEntries) {
    //   accruedInterest = accruedInterest.add(entry.accruedInterestForPeriod);
    // }
    // next we calculate interest for the active period
    const daysInPeriod = activePeriod.calendar.daysBetween(activePeriod.periodStartDate, date);
    // console.log("days in period", daysInPeriod, activePeriod.periodStartDate.format("YYYY-MM-DD"), date.format("YYYY-MM-DD"));
    const interestCalculator = new InterestCalculator(
      activePeriod.periodInterestRate,
      activePeriod.calendar.calendarType,
      this.perDiemCalculationType,
      activePeriod.daysInPeriod
    );
    const interestForDays = interestCalculator.calculateInterestForDays(activePeriod.startBalance, daysInPeriod);
    accruedInterest = accruedInterest.add(interestForDays);
    return accruedInterest;
  }

  /**
   * Calculates DSI re-amortization values for all entries
   */
  public calculateDSIReAmortization(schedule?: AmortizationEntries): void {
    // Use provided schedule or existing repayment schedule
    const scheduleToUse = schedule || this.repaymentSchedule;
    if (!scheduleToUse || scheduleToUse.entries.length === 0) return;
    
    // Only calculate re-amortization for DSI loans
    const hasDSI = scheduleToUse.entries.some(entry => entry.billingModel === 'dailySimpleInterest');
    if (!hasDSI) return;

    // Get current date from the amortization (or use today's date)
    const currentDate = this.currentDate || LocalDate.now();
    
    // First, clear all flags
    scheduleToUse.entries.forEach(entry => {
      entry.isCurrentActiveTerm = false;
      entry.isDelinquent = false;
    });
    
    // Identify current active term (only among billable DSI entries)
    let currentActiveTerm = -1;
    let currentActiveBillableTerm = -1;
    let billableIndex = -1;
    
    for (let i = 0; i < scheduleToUse.entries.length; i++) {
      const entry = scheduleToUse.entries[i];
      
      // Track billable DSI entries
      if (entry.billingModel === 'dailySimpleInterest' && entry.billablePeriod) {
        billableIndex++;
        
        // Check if current date falls within this term (inclusive of start, exclusive of end)
        if (currentDate.compareTo(entry.periodStartDate) >= 0 && currentDate.compareTo(entry.periodEndDate) < 0) {
          currentActiveTerm = i;
          currentActiveBillableTerm = billableIndex;
          entry.isCurrentActiveTerm = true;
          break;
        }
      }
    }
    
    // If current date is after all terms, find the last billable DSI term
    if (currentActiveTerm === -1) {
      billableIndex = -1;
      for (let i = scheduleToUse.entries.length - 1; i >= 0; i--) {
        const entry = scheduleToUse.entries[i];
        if (entry.billingModel === 'dailySimpleInterest' && entry.billablePeriod) {
          // Count billable terms up to this point
          billableIndex = 0;
          for (let j = 0; j <= i; j++) {
            if (scheduleToUse.entries[j].billingModel === 'dailySimpleInterest' && 
                scheduleToUse.entries[j].billablePeriod) {
              billableIndex++;
            }
          }
          billableIndex--; // Adjust to 0-based index
          
          if (currentDate.compareTo(entry.periodEndDate) >= 0) {
            currentActiveTerm = i;
            currentActiveBillableTerm = billableIndex;
            entry.isCurrentActiveTerm = true;
            break;
          }
        }
      }
    }

    // Track the last payment date and last paid balance
    let lastPaymentDate: LocalDate | undefined;
    let lastPaidBalance: Currency | undefined;
    let lastPaidTerm = -1;

    // Process each entry
    let billableTermIndex = -1; // Track billable term index separately
    for (let i = 0; i < scheduleToUse.entries.length; i++) {
      const entry = scheduleToUse.entries[i];
      
      // Skip non-DSI entries or non-billable periods
      if (entry.billingModel !== 'dailySimpleInterest' || !entry.billablePeriod) continue;
      
      billableTermIndex++; // Increment billable term counter

      
      // Check if this term has been paid
      // A term is considered paid if it has actual DSI interest and principal values
      // These are only set when a payment is actually applied to the term
      const hasDSIPayment = entry.actualDSIInterest !== undefined && 
        entry.actualDSIPrincipal !== undefined &&
        (!entry.actualDSIInterest.isZero() || !entry.actualDSIPrincipal.isZero());
      
      
      if (hasDSIPayment) {
        // This is a paid term - use actual DSI values
        // Always use the actualDSI fields when available, as they represent the actual payment splits
        
        
        entry.reAmortizedStartBalance = entry.actualDSIStartBalance || entry.startBalance;
        entry.reAmortizedEndBalance = entry.actualDSIEndBalance || entry.endBalance;
        // Use actual DSI values from the payment
        entry.reAmortizedInterest = entry.actualDSIInterest || Currency.zero;
        entry.reAmortizedPrincipal = entry.actualDSIPrincipal || Currency.zero;
        entry.reAmortizedFees = entry.actualDSIFees || Currency.zero;
        entry.reAmortizedTotalPayment = entry.reAmortizedInterest.add(entry.reAmortizedPrincipal).add(entry.reAmortizedFees);
        entry.reAmortizedDsiInterestDays = entry.dsiInterestDays;
        
        // For DSI loans, update accruedInterestForPeriod to match actual DSI interest
        // This ensures the projected interest matches what was actually charged
        if (entry.reAmortizedInterest && !entry.reAmortizedInterest.isZero()) {
          entry.accruedInterestForPeriod = entry.reAmortizedInterest;
        }
        
        // Update tracking variables
        lastPaidBalance = entry.reAmortizedEndBalance;
        // Get payment date from payment history if available, otherwise use dsiPreviousPaymentDate
        const paymentHistory = this.getDSIPaymentHistory(billableTermIndex);
        lastPaymentDate = paymentHistory?.paymentDate || entry.dsiPreviousPaymentDate || entry.periodEndDate;
        lastPaidTerm = billableTermIndex;
        entry.lastPaymentDate = lastPaymentDate;
        
        // Calculate per diem for re-amortized view
        if (entry.reAmortizedDsiInterestDays && entry.reAmortizedDsiInterestDays > 0) {
          entry.reAmortizedPerDiem = entry.reAmortizedInterest.divide(entry.reAmortizedDsiInterestDays);
        }
        
        // Calculate DSI interest savings or penalty
        // Compare actual DSI interest against what would have been charged for the standard period
        if (entry.actualDSIInterest && entry.reAmortizedStartBalance) {
          // For on-time payments, if DSI interest days equals standard days, no savings/penalty
          if (entry.dsiInterestDays === entry.daysInPeriod) {
            entry.dsiInterestSavings = 0;
            entry.dsiInterestPenalty = 0;
          } else {
            // Calculate what the interest would have been for the standard period
            const standardDaysInPeriod = entry.daysInPeriod;
            const interestCalculator = new InterestCalculator(
              entry.periodInterestRate,
              entry.calendar.calendarType,
              this.perDiemCalculationType,
              entry.daysInPeriod
            );
            const standardPeriodInterest = interestCalculator.calculateInterestForDays(
              entry.reAmortizedStartBalance,
              standardDaysInPeriod
            );
          
            if (entry.actualDSIInterest.lessThan(standardPeriodInterest)) {
              entry.dsiInterestSavings = standardPeriodInterest.subtract(entry.actualDSIInterest).toNumber();
              entry.dsiInterestPenalty = 0;
            } else if (entry.actualDSIInterest.greaterThan(standardPeriodInterest)) {
              entry.dsiInterestPenalty = entry.actualDSIInterest.subtract(standardPeriodInterest).toNumber();
              entry.dsiInterestSavings = 0;
            } else {
              entry.dsiInterestSavings = 0;
              entry.dsiInterestPenalty = 0;
            }
          }
        } else {
          // If we don't have the necessary data, set to 0
          entry.dsiInterestSavings = 0;
          entry.dsiInterestPenalty = 0;
        }
      } else if (billableTermIndex < currentActiveBillableTerm || 
                 (billableTermIndex === currentActiveBillableTerm && currentDate.isAfter(entry.periodEndDate))) {
        // This is a delinquent term:
        // - Either it's before the current active term (unpaid past term)
        // - Or it's the current active term but the period has already ended
        entry.isDelinquent = true;
        
        
        // Use last paid balance if available, otherwise use scheduled start balance
        const balanceToUse = lastPaidBalance || entry.startBalance;
        entry.reAmortizedStartBalance = balanceToUse;
        entry.reAmortizedEndBalance = balanceToUse; // No reduction for delinquent terms
        
        // Calculate DSI days for delinquent term
        if (billableTermIndex === lastPaidTerm + 1 && lastPaymentDate) {
          // First unpaid term after a payment
          entry.reAmortizedDsiInterestDays = entry.calendar.daysBetween(lastPaymentDate, entry.periodEndDate);
        } else {
          // Subsequent unpaid terms use standard term days
          entry.reAmortizedDsiInterestDays = entry.daysInPeriod;
        }
        
        // Calculate interest on the unpaid balance
        const interestCalculator = new InterestCalculator(
          entry.periodInterestRate,
          entry.calendar.calendarType,
          this.perDiemCalculationType,
          entry.daysInPeriod
        );
        
        entry.reAmortizedInterest = interestCalculator.calculateInterestForDays(
          balanceToUse,
          entry.reAmortizedDsiInterestDays
        );
        
        // For DSI delinquent terms, update accruedInterestForPeriod to reflect actual balance
        entry.accruedInterestForPeriod = entry.reAmortizedInterest;
        
        // No principal reduction for delinquent terms
        entry.reAmortizedPrincipal = Currency.zero;
        
        entry.reAmortizedFees = entry.fees;
        entry.reAmortizedTotalPayment = entry.reAmortizedInterest.add(entry.reAmortizedPrincipal).add(entry.reAmortizedFees);
        
        // Calculate per diem
        if (entry.reAmortizedDsiInterestDays > 0) {
          entry.reAmortizedPerDiem = entry.reAmortizedInterest.divide(entry.reAmortizedDsiInterestDays);
        }
        
        entry.lastPaymentDate = lastPaymentDate;
        
        // Delinquent terms don't have savings/penalty yet
        entry.dsiInterestSavings = 0;
        entry.dsiInterestPenalty = 0;
      } else if (billableTermIndex === currentActiveBillableTerm && !entry.isDelinquent) {
        // This is the current active term that is NOT strictly delinquent (period hasn't ended)
        // But we need to check if there are prior delinquencies
        
        // Check if there are any truly delinquent terms before this one
        let hasPriorDelinquencies = false;
        for (let j = 0; j < i; j++) {
          const prevEntry = scheduleToUse.entries[j];
          if (prevEntry.billingModel === 'dailySimpleInterest' && 
              prevEntry.billablePeriod && 
              prevEntry.isDelinquent) {
            hasPriorDelinquencies = true;
            break;
          }
        }
        
        if (hasPriorDelinquencies) {
          // If there are prior delinquencies, treat this term like a delinquent term
          // Mark it as delinquent for consistency
          entry.isDelinquent = true;
          
          // Use last paid balance if available, otherwise use scheduled start balance
          const balanceToUse = lastPaidBalance || entry.startBalance;
          entry.reAmortizedStartBalance = balanceToUse;
          entry.reAmortizedEndBalance = balanceToUse; // No reduction
          
          // Calculate DSI days
          if (billableTermIndex === lastPaidTerm + 1 && lastPaymentDate) {
            entry.reAmortizedDsiInterestDays = entry.calendar.daysBetween(lastPaymentDate, entry.periodEndDate);
          } else {
            entry.reAmortizedDsiInterestDays = entry.daysInPeriod;
          }
          
          // Calculate interest on the unpaid balance
          const interestCalculator = new InterestCalculator(
            entry.periodInterestRate,
            entry.calendar.calendarType,
            this.perDiemCalculationType,
            entry.daysInPeriod
          );
          
          entry.reAmortizedInterest = interestCalculator.calculateInterestForDays(
            balanceToUse,
            entry.reAmortizedDsiInterestDays
          );
          
          entry.accruedInterestForPeriod = entry.reAmortizedInterest;
          entry.reAmortizedPrincipal = Currency.zero; // No principal reduction
          entry.reAmortizedFees = entry.fees;
          entry.reAmortizedTotalPayment = entry.reAmortizedInterest.add(entry.reAmortizedFees);
          
          // Calculate per diem
          if (entry.reAmortizedDsiInterestDays > 0) {
            entry.reAmortizedPerDiem = entry.reAmortizedInterest.divide(entry.reAmortizedDsiInterestDays);
          }
        } else {
          // No prior delinquencies - treat as a normal future term
          // Get the balance to re-amortize from
          let balanceToReAmortize: Currency;
          if (lastPaidBalance) {
            balanceToReAmortize = lastPaidBalance;
          } else if (i > 0) {
            const prevEntry = scheduleToUse.entries[i - 1];
            balanceToReAmortize = prevEntry.reAmortizedEndBalance || prevEntry.endBalance;
          } else {
            balanceToReAmortize = entry.startBalance;
          }
          
          // Calculate re-amortized values
          entry.reAmortizedStartBalance = balanceToReAmortize;
          
          // For current term, calculate DSI days from last payment if available
          if (lastPaymentDate) {
            entry.reAmortizedDsiInterestDays = entry.calendar.daysBetween(lastPaymentDate, entry.periodEndDate);
          } else {
            entry.reAmortizedDsiInterestDays = entry.daysInPeriod;
          }
          
          // Calculate interest
          const interestCalculator = new InterestCalculator(
            entry.periodInterestRate,
            entry.calendar.calendarType,
            this.perDiemCalculationType,
            entry.daysInPeriod
          );
          
          entry.reAmortizedInterest = interestCalculator.calculateInterestForDays(
            balanceToReAmortize,
            entry.reAmortizedDsiInterestDays
          );
          
          // For DSI current term, update accruedInterestForPeriod
          entry.accruedInterestForPeriod = entry.reAmortizedInterest;
          
          // Calculate principal (payment - interest - fees)
          const payment = entry.totalPayment;
          const availableForPrincipal = payment.subtract(entry.reAmortizedInterest).subtract(entry.fees);
          
          if (availableForPrincipal.greaterThan(0)) {
            entry.reAmortizedPrincipal = Currency.min(availableForPrincipal, balanceToReAmortize);
          } else {
            entry.reAmortizedPrincipal = Currency.zero;
          }
          
          entry.reAmortizedEndBalance = balanceToReAmortize.subtract(entry.reAmortizedPrincipal);
          entry.reAmortizedFees = entry.fees;
          entry.reAmortizedTotalPayment = entry.reAmortizedInterest.add(entry.reAmortizedPrincipal).add(entry.reAmortizedFees);
          
          // Calculate per diem
          if (entry.reAmortizedDsiInterestDays > 0) {
            entry.reAmortizedPerDiem = entry.reAmortizedInterest.divide(entry.reAmortizedDsiInterestDays);
          }
        }
        
        entry.lastPaymentDate = lastPaymentDate;
        
        // Current term doesn't have savings/penalty yet
        entry.dsiInterestSavings = 0;
        entry.dsiInterestPenalty = 0;
      } else {
        // This is a future term (> current active term)
        // Re-amortize based on actual remaining balance
        
        // Get the balance to re-amortize from
        let balanceToReAmortize: Currency;
        if (i > 0) {
          const prevEntry = scheduleToUse.entries[i - 1];
          balanceToReAmortize = prevEntry.reAmortizedEndBalance || prevEntry.endBalance;
        } else {
          balanceToReAmortize = entry.startBalance;
        }
        
        // Calculate re-amortized values using standard amortization
        entry.reAmortizedStartBalance = balanceToReAmortize;
        
        // For future terms, use standard DSI days calculation
        entry.reAmortizedDsiInterestDays = entry.daysInPeriod;
        
        // Calculate interest
        const interestCalculator = new InterestCalculator(
          entry.periodInterestRate,
          entry.calendar.calendarType,
          this.perDiemCalculationType,
          entry.daysInPeriod
        );
        
        entry.reAmortizedInterest = interestCalculator.calculateInterestForDays(
          balanceToReAmortize,
          entry.reAmortizedDsiInterestDays
        );
        
        // For DSI future terms, update accruedInterestForPeriod to reflect re-amortized balance
        entry.accruedInterestForPeriod = entry.reAmortizedInterest;
        
        // Calculate principal (payment - interest - fees)
        const payment = entry.totalPayment;
        const availableForPrincipal = payment.subtract(entry.reAmortizedInterest).subtract(entry.fees);
        
        if (availableForPrincipal.greaterThan(0)) {
          entry.reAmortizedPrincipal = Currency.min(availableForPrincipal, balanceToReAmortize);
        } else {
          entry.reAmortizedPrincipal = Currency.zero;
        }
        
        entry.reAmortizedEndBalance = balanceToReAmortize.subtract(entry.reAmortizedPrincipal || Currency.zero);
        entry.reAmortizedFees = entry.fees;
        entry.reAmortizedTotalPayment = (entry.reAmortizedInterest || Currency.zero)
          .add(entry.reAmortizedPrincipal || Currency.zero)
          .add(entry.reAmortizedFees || Currency.zero);
        
        // Calculate per diem
        if (entry.reAmortizedDsiInterestDays > 0 && entry.reAmortizedInterest) {
          entry.reAmortizedPerDiem = entry.reAmortizedInterest.divide(entry.reAmortizedDsiInterestDays);
        }
        
        entry.lastPaymentDate = lastPaymentDate;
        
        // Future terms don't have savings/penalty yet
        entry.dsiInterestSavings = 0;
        entry.dsiInterestPenalty = 0;
      }
    }
  }

  /**
   * Calculates the fixed monthly payment for the loan.
   * @returns The fixed monthly payment as a Currency object.
   */
  private calculateFixedMonthlyPayment(principal?: Currency, term?: number): Currency {
    const p = principal ?? this.totalLoanAmount;
    const n = term ?? this.actualTerm;
    if (this.annualInterestRate.isZero()) {
      return this.round(p.divide(n));
    }
    const monthlyRate = this.annualInterestRate.dividedBy(12);
    const numerator = p.multiply(monthlyRate);
    const denominator = Currency.of(1).subtract(Currency.of(1).divide(new Decimal(1).plus(monthlyRate).pow(n)));
    const result = this.round(numerator.divide(denominator));
    return result;
  }

  /**
   * Rounds a Currency value to the specified precision using the specified rounding method.
   * @param value The Currency value to round.
   * @returns The rounded Currency value.
   */
  private round(value: Currency): Currency {
    return value.round(this.roundingPrecision, this.roundingMethod);
  }

  get compactJSON() {
    const toReturn = {
      id: this.id,
      name: this.name,
      description: this.description,
      loanAmount: this.loanAmount.toNumber(),
      originationFee: this.originationFee.toNumber(),
      totalLoanAmount: this.totalLoanAmount.toNumber(),
      annualInterestRate: this.annualInterestRate.toString(),
      term: this.term,
      hasCustomPreBillDays: this.hasCustomPreBillDays,
      preBillDays: this.preBillDays.json,
      hasCustomBillDueDays: this.hasCustomBillDueDays,
      dueBillDays: this.dueBillDays.json,
      defaultPreBillDaysConfiguration: this.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: this.defaultBillDueDaysAfterPeriodEndConfiguration,
      startDate: DateUtil.normalizeDateToJsDate(this.startDate),
      endDate: DateUtil.normalizeDateToJsDate(this.endDate),
      payoffDate: this.payoffDate ? DateUtil.normalizeDateToJsDate(this.payoffDate) : undefined,
      hasCustomEndDate: this.hasCustomEndDate,
      hasCustomFirstPaymentDate: this.hasCustomFirstPaymentDate,
      equitedMonthlyPayment: this.equitedMonthlyPayment.toNumber(),
      hasCustomEquitedMonthlyPayment: this.hasCustomEquitedMonthlyPayment,
      roundingMethod: this.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.flushUnbilledInterestRoundingErrorMethod,
      roundingPrecision: this.roundingPrecision,
      flushThreshold: this.flushThreshold.toNumber(),
      periodsSchedule: this.periodsSchedule.json,
      rateSchedules: this.rateSchedules.json,
      allowRateAbove100: this.allowRateAbove100,
      termPaymentAmountOverride: this.termPaymentAmountOverride.json,
      termInterestAmountOverride: this.termInterestAmountOverride.json,
      termInterestRateOverride: this.termInterestRateOverride.json,
      termPeriodDefinition: this.termPeriodDefinition,
      changePaymentDates: this.changePaymentDates.json,
      balanceModifications: this.balanceModifications.json,
      perDiemCalculationType: this.perDiemCalculationType,
      feesPerTerm: this.feesPerTerm.json,
      feesForAllTerms: this.feesForAllTerms.json,
      repaymentSchedule: this.repaymentSchedule.json,
      calendars: this.calendars.json,
      acceptableRateVariance: this.acceptableRateVariance.toNumber(),
      accrueInterestAfterEndDate: this.accrueInterestAfterEndDate,
      termExtensions: this.termExtensions.json,
    };

    return toReturn;
  }

  get json() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      loanAmount: this.loanAmount.toNumber(),
      originationFee: this.originationFee.toNumber(),
      totalLoanAmount: this.totalLoanAmount.toNumber(),
      annualInterestRate: this.annualInterestRate.toString(),
      term: this.term,
      hasCustomPreBillDays: this.hasCustomPreBillDays,
      preBillDays: this.preBillDays.json,
      hasCustomBillDueDays: this.hasCustomBillDueDays,
      dueBillDays: this.dueBillDays.json,
      defaultPreBillDaysConfiguration: this.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: this.defaultBillDueDaysAfterPeriodEndConfiguration,
      startDate: DateUtil.normalizeDateToJsDate(this.startDate).toISOString(),
      endDate: DateUtil.normalizeDateToJsDate(this.endDate).toISOString(),
      payoffDate: this.payoffDate ? DateUtil.normalizeDateToJsDate(this.payoffDate).toISOString() : undefined,
      hasCustomEndDate: this.hasCustomEndDate,
      hasCustomFirstPaymentDate: this.hasCustomFirstPaymentDate,
      firstPaymentDate: this.firstPaymentDate,
      equitedMonthlyPayment: this.equitedMonthlyPayment.toNumber(),
      hasCustomEquitedMonthlyPayment: this.hasCustomEquitedMonthlyPayment,
      roundingMethod: this.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.flushUnbilledInterestRoundingErrorMethod,
      roundingPrecision: this.roundingPrecision,
      flushThreshold: this.flushThreshold.toNumber(),
      periodsSchedule: this.periodsSchedule.json,
      rateSchedules: this.rateSchedules.json,
      allowRateAbove100: this.allowRateAbove100,
      termPaymentAmountOverride: this.termPaymentAmountOverride.json,
      termInterestAmountOverride: this.termInterestAmountOverride.json,
      termInterestRateOverride: this.termInterestRateOverride.json,
      termPeriodDefinition: this.termPeriodDefinition,
      changePaymentDates: this.changePaymentDates.json,
      balanceModifications: this.balanceModifications.json,
      perDiemCalculationType: this.perDiemCalculationType,
      feesPerTerm: this.feesPerTerm.json,
      feesForAllTerms: this.feesForAllTerms.json,
      repaymentSchedule: this.repaymentSchedule.json,
      calendars: this.calendars.json,
      acceptableRateVariance: this.acceptableRateVariance.toNumber(),
      accrueInterestAfterEndDate: this.accrueInterestAfterEndDate,
      interestAccruesFromDayZero: this.interestAccruesFromDayZero,
      termExtensions: this.termExtensions.json,
      contractualEquitedMonthlyPayment: this._contractualEquitedMonthlyPayment?.toString(),
      contractualTerm: this._contractualTerm,
    };
  }

  /**
   * Serializes the Amortization instance into a JSON object.
   * @returns A JSON-compatible object representing the Amortization instance.
   */
  public toJSON() {
    return this.json;
  }

  /**
   * Computes the interest accrued up to the given date.
   * Uses existing schedule and partial accrual calculations.
   */
  getAccruedInterestToDate(date: LocalDate): Currency {
    // Use existing getAccruedInterestByDate
    // This returns accrued interest for the active period and previous periods.
    return this.getAccruedInterestByDate(date);
  }

  /**
   * Computes the current payoff amount (principal + accrued interest up to a given date).
   * Current payoff = remaining principal + accrued interest to date.
   */
  getCurrentPayoffAmount(date: LocalDate): Currency {
    // Find remaining principal as of date
    // Remaining principal is just last entry's endBalance at date or project the loan forward.
    // For a snapshot date, we can find the period and calculate what principal would be at that date.
    // However, the simplest approach is to find the amortization entry that covers 'date',
    // partially accrue interest, and calculate principal.

    // If date is after the last scheduled payment, payoff = 0
    if (date.isEqual(this.endDate) || date.isAfter(this.endDate)) {
      return Currency.zero;
    }

    // Find the period containing 'date'
    const activePeriod = this.repaymentSchedule.getPeriodByDate(date);
    if (!activePeriod) {
      // If no active period (date is before start?), payoff = totalLoanAmount
      if (date.isEqual(this.startDate) || date.isBefore(this.startDate)) {
        return this.totalLoanAmount;
      } else {
        console.warn('No active period found for date', date);
        return this.totalLoanAmount;
      }
    }

    // The startBalance of the activePeriod gives remaining principal at that period start
    // Add accrued interest for partial period to get current payoff
    const accruedToDate = this.getAccruedInterestToDate(date);
    // To find remaining principal at a snapshot date, we can approximate by using the activePeriod's startBalance
    // and subtract any principal that would have been paid up to that exact date.
    // However, principal is paid at the end of period. If date is mid-period, principal likely hasn't changed from startBalance (assuming interest-first allocation).
    // For a more accurate mid-term calculation, you'd need more granular logic.
    // For simplicity, assume principal changes only at period boundaries:
    const remainingPrincipal = activePeriod.startBalance;
    const payoff = remainingPrincipal.add(accruedToDate);
    return payoff;
  }

  isPeriodEndDate(date: Date | LocalDate | { day: number; month: number; year: number }): boolean {
    let normalizedDate: LocalDate;

    normalizedDate = DateUtil.normalizeDate(date);

    for (const row of this.repaymentSchedule.entries) {
      if (row.periodEndDate.isEqual(normalizedDate)) {
        return true;
      }
    }

    return false;
  }

  get termExtensions(): TermExtensions {
    return this._termExtensions;
  }
  set termExtensions(value: TermExtensions | TermExtension[] | TermExtensionParams[] | undefined | null) {
    if (value instanceof TermExtensions) {
      this._termExtensions = value;
    } else if (Array.isArray(value)) {
      this._termExtensions = new TermExtensions(value);
    } else if (!value) {
      this._termExtensions = new TermExtensions();
    } else {
      throw new Error('Invalid value for termExtensions');
    }
    this._termExtensions.onChange = () => {
      this._emiCache = {};
      this.modifiedSinceLastCalculation = true;
    };
    this.modifiedSinceLastCalculation = true;
    // Clear any cached EMI values
    this._emiCache = {};
  }

  /** Returns the contractual term plus all active extension quantities */
  get actualTerm(): number {
    const contractualTerm = this.term;
    const termExtensions = this.termExtensions?.getTotalActiveExtensionQuantity?.() || 0;
    const result = contractualTerm + termExtensions;
    return result;
  }

  /** ──────────────────────────────  SKIP-A-PAY HELPERS  ────────────────────────────── **/

  /** Returns the term numbers that are actively "skip-a-pay" (paymentAmount === 0). */
  private getSkipTerms(startTerm = 0): number[] {
    return this.termPaymentAmountOverride.active
      .filter((ovr) => ovr.paymentAmount.isZero() && ovr.termNumber >= startTerm)
      .map((ovr) => ovr.termNumber);
  }

  /**
   * How many terms will actually collect an instalment.
   * startTerm ⇒  use this when we need "remaining paying terms from X".
   */
  private getPayingTermCount(startTerm = 0): number {
    const payingTerms = this.actualTerm - startTerm - this.getSkipTerms(startTerm).length;
    /* Guard-rail so we never divide by zero */
    return Math.max(1, payingTerms);
  }

  get contractualEquitedMonthlyPayment(): Currency | undefined {
    return this._contractualEquitedMonthlyPayment;
  }
  get contractualTerm(): number | undefined {
    return this._contractualTerm;
  }

  public setDSIPayments(
    payments: Array<{
      term: number;
      paymentDate: string | Date;
      principalPaid: number;
      interestPaid: number;
      feesPaid: number;
    }>
  ) {
    this._dsiPayments = payments || [];
  }
  
  /**
   * Updates the DSI payment history for a specific term.
   * This is used to track actual balances after payments are processed.
   */
  public updateDSIPaymentHistory(
    termNumber: number, 
    actualStartBalance: Currency, 
    actualEndBalance: Currency, 
    paymentDate?: LocalDate,
    actualInterest?: Currency,
    actualPrincipal?: Currency,
    actualFees?: Currency,
    dsiInterestDays?: number
  ): void {
    this._dsiPaymentHistory.set(termNumber, { 
      actualStartBalance, 
      actualEndBalance, 
      paymentDate,
      actualInterest,
      actualPrincipal,
      actualFees,
      dsiInterestDays
    });
    this.modifiedSinceLastCalculation = true;
  }
  
  /**
   * Gets the DSI payment history for a specific term.
   */
  public getDSIPaymentHistory(termNumber: number): { 
    actualStartBalance: Currency; 
    actualEndBalance: Currency; 
    paymentDate?: LocalDate;
    actualInterest?: Currency;
    actualPrincipal?: Currency;
    actualFees?: Currency;
    dsiInterestDays?: number;
  } | undefined {
    return this._dsiPaymentHistory.get(termNumber);
  }
}

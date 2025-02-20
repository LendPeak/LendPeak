import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator, PerDiemCalculationType } from "./InterestCalculator";
import { BalanceModification } from "./Amortization/BalanceModification";
import { BalanceModifications } from "./Amortization/BalanceModifications";
import { Decimal } from "decimal.js";
import { ChangePaymentDate } from "./ChangePaymentDate";
import { ChangePaymentDates } from "./ChangePaymentDates";
import { AmortizationEntry, AmortizationScheduleMetadata } from "./Amortization/AmortizationEntry";
import { TermInterestAmountOverride } from "./TermInterestAmountOverride";
import { TermInterestAmountOverrides } from "./TermInterestAmountOverrides";
import { TermInterestRateOverride } from "./TermInterestRateOverride";
import { TermInterestRateOverrides } from "./TermInterestRateOverrides";
import { RateSchedule } from "./RateSchedule";
import { RateSchedules } from "./RateSchedules";
import { PeriodSchedule } from "./PeriodSchedule";
import { PeriodSchedules } from "./PeriodSchedules";
import { AmortizationSummary } from "./AmortizationSummary";
import { TILA } from "./TILA";
import { Fee } from "./Fee";
import { Fees } from "./Fees";
import { FeesPerTerm } from "./FeesPerTerm";
import { PreBillDaysConfiguration } from "./PreBillDaysConfiguration";
import { PreBillDaysConfigurations } from "./PreBillDaysConfigurations";
import { BillDueDaysConfiguration } from "./BillDueDaysConfiguration";
import { BillDueDaysConfigurations } from "./BillDueDaysConfigurations";
import { AmortizationExport } from "./AmortizationExport";
import { TermPaymentAmount } from "./TermPaymentAmount";
import { TermPaymentAmounts } from "./TermPaymentAmounts";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

import cloneDeep from "lodash/cloneDeep";
import { AmortizationEntries } from "./Amortization/AmortizationEntries";

/**
 * Enum for flush cumulative rounding error types.
 */
export enum FlushUnbilledInterestDueToRoundingErrorType {
  NONE = "none",
  AT_END = "at_end",
  AT_THRESHOLD = "at_threshold",
}

export interface TermPeriodDefinition {
  unit: "year" | "month" | "week" | "day" | "complex";
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
  startDate: Dayjs | Date;
  hasCustomEndDate?: boolean;
  endDate?: Dayjs | Date;
  calendarType?: CalendarType | string;
  roundingMethod?: RoundingMethod | string;
  flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType | string;
  roundingPrecision?: number;
  flushThreshold?: Currency | number;
  periodsSchedule?: PeriodSchedules;
  ratesSchedule?: RateSchedules;
  allowRateAbove100?: boolean;
  termPaymentAmountOverride?: TermPaymentAmounts;
  equitedMonthlyPayment?: Currency | number | Decimal; // allows one to specify EMI manually instead of calculating it
  firstPaymentDate?: Dayjs | Date | string;
  termPeriodDefinition?: TermPeriodDefinition;
  changePaymentDates?: ChangePaymentDates;
  balanceModifications?: BalanceModifications;
  perDiemCalculationType?: PerDiemCalculationType;
  // staticFeePerBill?: Currency; // A fixed fee amount applied to each bill.
  // customFeesPerTerm?: { termNumber: number; feeAmount: Currency }[]; // An array specifying custom fee amounts for each term.
  // feePercentageOfTotalPayment?: Decimal; // A percentage of the total payment to be applied as a fee.
  // customFeePercentagesPerTerm?: { termNumber: number; feePercentage: Decimal }[]; // An array specifying custom percentages per term.
  feesPerTerm?: FeesPerTerm;
  feesForAllTerms?: Fees;
  billingModel?: BillingModel;
  termInterestAmountOverride?: TermInterestAmountOverrides;
  termInterestRateOverride?: TermInterestRateOverrides;
}

export type BillingModel = "amortized" | "dailySimpleInterest";

/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export class Amortization {
  private static readonly DEFAULT_PRE_BILL_DAYS_CONFIGURATION = 0;
  private static readonly DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION = 0;

  private _id: string = "";
  jsId: string = "";

  private _name: string = "";
  jsName: string = "";

  private _description: string = "";
  jsDescription: string = "";

  private _loanAmount!: Currency;
  jsLoanAmount!: number;

  private _originationFee: Currency = Currency.zero;
  jsOriginationFee!: number;

  private _term: number = 1;
  jsTerm!: number;

  private _startDate!: Dayjs;
  jsStartDate!: Date;

  private _endDate?: Dayjs;
  jsEndDate?: Date;

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

  private _firstPaymentDate?: Dayjs;
  jsFirstPaymentDate!: Date;

  private _hasCustomFirstPaymentDate: boolean = false;
  jshasCustomFirstPaymentDate!: boolean;

  private _earlyRepayment: boolean = false;
  jsEarlyRepayment!: boolean;

  private _equitedMonthlyPayment!: Currency;
  jsEquitedMonthlyPayment!: number;

  private _hasCustomEquitedMonthlyPayment: boolean = false;
  jsHasCustomEquitedMonthlyPayment!: boolean;

  private _hasCustomPreBillDays: boolean = false;
  jsHasCustomPreBillDays!: boolean;

  private _hasCustomBillDueDays: boolean = false;
  jsHasCustomBillDueDays!: boolean;

  private _periodsSchedule: PeriodSchedules = new PeriodSchedules();
  private _preBillDays: PreBillDaysConfigurations = new PreBillDaysConfigurations();
  private _dueBillDays: BillDueDaysConfigurations = new BillDueDaysConfigurations();
  private _termPaymentAmountOverride: TermPaymentAmounts = new TermPaymentAmounts();
  private _balanceModifications: BalanceModifications = new BalanceModifications();

  private _defaultPreBillDaysConfiguration: number = Amortization.DEFAULT_PRE_BILL_DAYS_CONFIGURATION;
  private _defaultBillDueDaysAfterPeriodEndConfiguration: number = Amortization.DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION;
  private _calendar: Calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
  private _roundingMethod: RoundingMethod = RoundingMethod.ROUND_HALF_EVEN;
  private _flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType = FlushUnbilledInterestDueToRoundingErrorType.NONE;
  private _rateSchedules: RateSchedules = new RateSchedules();
  private _hasCustomRateSchedule: boolean = false;
  private _termPeriodDefinition: TermPeriodDefinition = { unit: "month", count: [1] };
  private _changePaymentDates: ChangePaymentDates = new ChangePaymentDates();
  private _repaymentSchedule!: AmortizationEntries;
  private _apr?: Decimal;
  private _perDiemCalculationType: PerDiemCalculationType = "AnnualRateDividedByDaysInYear";
  private _billingModel: BillingModel = "amortized";
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

    if (params.billingModel) {
      this.billingModel = params.billingModel;
    }

    if (params.originationFee) {
      this.originationFee = params.originationFee;
    }

    if (params.balanceModifications) {
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

    if (params.firstPaymentDate) {
      this.firstPaymentDate = params.firstPaymentDate;
    }

    if (params.endDate) {
      this.endDate = params.endDate;
    }

    if (params.termPaymentAmountOverride && params.termPaymentAmountOverride.length > 0) {
      this.termPaymentAmountOverride = params.termPaymentAmountOverride;
    }

    if (params.calendarType) {
      this.calendar = params.calendarType;
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

    if (params.preBillDays && params.preBillDays.length > 0) {
      this.preBillDays = params.preBillDays;
    }

    if (params.defaultBillDueDaysAfterPeriodEndConfiguration !== undefined) {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = params.defaultBillDueDaysAfterPeriodEndConfiguration;
    }

    if (params.dueBillDays && params.dueBillDays.length > 0) {
      this.dueBillDays = params.dueBillDays;
    }

    // validate the schedule periods and rates

    this.generateSchedule();

    this.verifySchedulePeriods();
    // this.validateRatesSchedule();
    this.updateJsValues();
  }

  /**
   * JS values are primarily to assist with Angular bindings
   * to simplify the process of updating the UI when the model changes.
   */
  updateJsValues() {
    this.termPaymentAmountOverride.updateJsValues();
    this.changePaymentDates.updateJsValues();
    this.jsId = this.id;
    this.jsName = this.name;
    this.jsDescription = this.description;
    this.jsLoanAmount = this.loanAmount.toNumber();
    this.jsOriginationFee = this.originationFee.toNumber();
    this.jsTerm = this.term;
    this.jsStartDate = this.startDate.toDate();
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
    this.jsFirstPaymentDate = this.firstPaymentDate.toDate();
    this.jsEarlyRepayment = this.earlyRepayment;
    this.jsEquitedMonthlyPayment = this.equitedMonthlyPayment.toNumber();
    this.jsHasCustomEquitedMonthlyPayment = this.hasCustomEquitedMonthlyPayment;
    this.jsHasCustomPreBillDays = this.hasCustomPreBillDays;
    this.jsHasCustomBillDueDays = this.hasCustomBillDueDays;
    this.jshasCustomFirstPaymentDate = this.hasCustomFirstPaymentDate;
    this.jsHasCustomEndDate = this.hasCustomEndDate;
    this.jsEndDate = this.endDate.toDate();
  }

  updateModelValues() {
    this.id = this.jsId;
    this.name = this.jsName;
    this.description = this.jsDescription;
    this.loanAmount = Currency.of(this.jsLoanAmount);
    this.originationFee = Currency.of(this.jsOriginationFee);
    this.term = this.jsTerm;
    this.startDate = dayjs(this.jsStartDate);

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
    this.hasCustomFirstPaymentDate = this.jshasCustomFirstPaymentDate;
    if (this.hasCustomFirstPaymentDate) {
      this.firstPaymentDate = dayjs(this.jsFirstPaymentDate);
    }
    this.earlyRepayment = this.jsEarlyRepayment;
    if (this.hasCustomEquitedMonthlyPayment) {
      this.equitedMonthlyPayment = Currency.of(this.jsEquitedMonthlyPayment);
    } else {
      this.equitedMonthlyPayment = undefined;
    }
    this.hasCustomEquitedMonthlyPayment = this.jsHasCustomEquitedMonthlyPayment;
    this.hasCustomPreBillDays = this.jsHasCustomPreBillDays;
    this.hasCustomBillDueDays = this.jsHasCustomBillDueDays;

    this.termPaymentAmountOverride.updateModelValues();
    this.changePaymentDates.updateModelValues();
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
    return this._hasCustomPreBillDays;
  }

  set hasCustomPreBillDays(value: boolean) {
    this._hasCustomPreBillDays = value;
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
    this._modifiedSinceLastCalculation = value;
    this._modificationCount++;
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
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this.modifiedSinceLastCalculation = true;

    this._name = value;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this.modifiedSinceLastCalculation = true;

    this._description = value;
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
      throw new Error("Invalid loan amount, must be greater than zero");
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
      throw new Error("Invalid origination fee, value cannot be negative");
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
      throw new Error("Invalid term, must be greater than zero");
    }
    this._term = value;
  }

  get preBillDays(): PreBillDaysConfigurations {
    if (!this._preBillDays || this._preBillDays.length === 0) {
      this._preBillDays = new PreBillDaysConfigurations([
        new PreBillDaysConfiguration({
          preBillDays: this.defaultPreBillDaysConfiguration,
          termNumber: 1,
          type: "default",
        }),
      ]);
      this.generatePreBillDays();
      this.modificationOptimizationTracker = "preBillDays";
    } else {
      if (this.modifiedSinceLastCalculation === true) {
        //  if (this._modificationOptimizationTracker?.preBillDays !== this._modificationCount) {
        if (!this.isUpdatedSinceLastCalculation("preBillDays")) {
          this.generatePreBillDays();
          this.modificationOptimizationTracker = "preBillDays";
        }
      }
    }
    return this._preBillDays;
  }

  set preBillDays(value: PreBillDaysConfigurations) {
    this.modifiedSinceLastCalculation = true;

    if (!value || value.length === 0) {
      this._hasCustomPreBillDays = false;
      this._preBillDays = new PreBillDaysConfigurations();
    } else {
      this._hasCustomBillDueDays = true;
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
    const value = this._preBillDays.all.filter((dueBillDay) => dueBillDay.type !== "generated");

    const completedPreBillDays: PreBillDaysConfigurations = new PreBillDaysConfigurations();
    for (let preBillDay of value) {
      completedPreBillDays.all[preBillDay.termNumber - 1] = preBillDay;
    }

    let lastUserDefinedTerm = value[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedPreBillDays.all[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedPreBillDays.all[i] = new PreBillDaysConfiguration({
            termNumber: i + 1,
            preBillDays: this.defaultPreBillDaysConfiguration,
            type: "generated",
          });
        } else {
          completedPreBillDays.all[i] = new PreBillDaysConfiguration({
            termNumber: i + 1,
            preBillDays: lastUserDefinedTerm.preBillDays,
            type: "generated",
          });
        }
      }
      lastUserDefinedTerm = completedPreBillDays.all[i];
    }
    this._preBillDays = completedPreBillDays;
  }

  private generateDueBillDays(): void {
    // lets remove all generated values and re-generate them
    const value = this._dueBillDays.all.filter((dueBillDay) => dueBillDay.type !== "generated");
    const completedDueDayBillDays: BillDueDaysConfigurations = new BillDueDaysConfigurations();
    for (let dueBillDay of value) {
      completedDueDayBillDays.all[dueBillDay.termNumber - 1] = dueBillDay;
    }

    let lastUserDefinedTerm = value[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedDueDayBillDays.all[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedDueDayBillDays.all[i] = new BillDueDaysConfiguration({
            termNumber: i + 1,
            daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration,
            type: "generated",
          });
        } else {
          completedDueDayBillDays.all[i] = new BillDueDaysConfiguration({
            termNumber: i + 1,
            daysDueAfterPeriodEnd: lastUserDefinedTerm.daysDueAfterPeriodEnd,
            type: "generated",
          });
        }
      }
      lastUserDefinedTerm = completedDueDayBillDays.all[i];
    }

    // console.log("completedDueBillDays", completedDueDayBillDays);

    this._dueBillDays = completedDueDayBillDays;
  }

  get dueBillDays(): BillDueDaysConfigurations {
    if (!this._dueBillDays || this._dueBillDays.length === 0) {
      this._dueBillDays = new BillDueDaysConfigurations([
        new BillDueDaysConfiguration({
          daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration,
          termNumber: 1,
          type: "default",
        }),
      ]);
      this.generateDueBillDays();
      this.modificationOptimizationTracker = "dueBillDays";
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

  set dueBillDays(value: BillDueDaysConfigurations) {
    this.modifiedSinceLastCalculation = true;

    if (!value || value.length === 0) {
      this._hasCustomBillDueDays = false;
      this._dueBillDays = new BillDueDaysConfigurations();
    } else {
      this._hasCustomBillDueDays = true;
      if (value instanceof BillDueDaysConfigurations) {
        this._dueBillDays = value;
      } else {
        this._dueBillDays = new BillDueDaysConfigurations(value);
      }
    }
    this.generateDueBillDays();
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

    this._termInterestRateOverride = new TermInterestRateOverrides();

    for (const override of value.all) {
      if (override.termNumber <= 0 || override.termNumber > this.term) {
        throw new Error(`Invalid termInterestRateOverride: termNumber ${override.termNumber} out of range`);
      }
      if (override.interestRate.isNegative()) {
        throw new Error("Invalid termInterestRateOverride: interestAmount cannot be negative");
      }
      this._termInterestRateOverride.addOverride(override);
    }
  }

  get termInterestAmountOverride(): TermInterestAmountOverrides {
    return this._termInterestAmountOverride;
  }

  set termInterestAmountOverride(value: TermInterestAmountOverrides) {
    this.modifiedSinceLastCalculation = true;

    // it is possible that value at runtime is not an instance of TermInterestAmountOverrides
    // so we will inflate it
    if (!(value instanceof TermInterestAmountOverrides)) {
      value = new TermInterestAmountOverrides(value);
    }

    this._termInterestAmountOverride = new TermInterestAmountOverrides();
    // console.log("setting term amount overide", value);
    for (const override of value.all) {
      if (override.termNumber < 0 && override.date) {
        // this means term was not available so we will resolve term number through date
        let date = dayjs(override.date).startOf("day");
        let term = this.periodsSchedule.periods.findIndex((period) => {
          return date.isBetween(period.startDate, period.endDate, "day", "[)"); // this is start and < end date;
        });
        if (term < 0) {
          throw new Error("Invalid termInterestOverride: date does not fall within any term");
        }

        override.termNumber = term;
      }

      if (override.termNumber < 0 || override.termNumber > this.term) {
        throw new Error(`Invalid termInterestOverride: termNumber ${override.termNumber} out of range`);
      }
      this._termInterestAmountOverride.addOverride(override);
    }
  }

  get feesForAllTerms() {
    return this._feesForAllTerms;
  }

  set feesForAllTerms(value: Fees) {
    this.modifiedSinceLastCalculation = true;

    this._feesForAllTerms = value;
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

  get earlyRepayment() {
    return this._earlyRepayment;
  }

  set earlyRepayment(value: boolean) {
    this.modifiedSinceLastCalculation = true;

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

    if (balanceModifications instanceof BalanceModifications) {
      this._balanceModifications = balanceModifications;
    } else {
      this._balanceModifications = new BalanceModifications(balanceModifications);
    }
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
    if (!this._equitedMonthlyPayment) {
      this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
      this.modificationOptimizationTracker = "equitedMonthlyPayment";
    }
    if (this.hasCustomEquitedMonthlyPayment) {
      return this._equitedMonthlyPayment;
    } else {
      if (this.isUpdatedSinceLastCalculation("equitedMonthlyPayment")) {
        this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
        this.modificationOptimizationTracker = "equitedMonthlyPayment";
      }
      return this._equitedMonthlyPayment;
    }
  }

  set equitedMonthlyPayment(value: Currency | Decimal | number | undefined | null) {
    this.modifiedSinceLastCalculation = true;

    if (value === undefined || value === null) {
      this.hasCustomEquitedMonthlyPayment = false;
      this._equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
      this.modificationOptimizationTracker = "equitedMonthlyPayment";

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
      this.modificationOptimizationTracker = "rateSchedules";
      this._rateSchedules = this.generateRatesSchedule();
    } else {
      if (this._rateSchedules.hasModified) {
        this.modificationOptimizationTracker = "rateSchedules";
        this._rateSchedules.resetModified();
      }
    }

    if (this.isUpdatedSinceLastCalculation("rateSchedules")) {
      // console.log("rate schedules are not updated since last calculation");
      if (this.hasCustomRateSchedule === true) {
        this.rateSchedules = this._rateSchedules;
      } else {
        this._rateSchedules = this.generateRatesSchedule();
      }
      this.modificationOptimizationTracker = "rateSchedules";
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

    if (!this.startDate.isSame(newRateSchedules.first.startDate, "day")) {
      //(`adding rate schedule at the start ${this.startDate.format("YYYY-MM-DD")} and ${newRateSchedules.first.startDate.format("YYYY-MM-DD")}`);
      newRateSchedules.addScheduleAtTheBeginning(
        new RateSchedule({
          annualInterestRate: this.annualInterestRate,
          startDate: this.startDate,
          endDate: newRateSchedules.first.startDate,
          type: "generated",
        })
      );
    }

    for (let i = 0; i < newRateSchedules.length - 1; i++) {
      if (!newRateSchedules.atIndex(i).endDate.isSame(newRateSchedules.atIndex(i + 1).startDate, "day")) {
        //   console.log(`adding rate schedule between ${newRateSchedules.atIndex(i).startDate.format("YYYY-MM-DD")} and ${newRateSchedules.atIndex(i + 1).endDate.format("YYYY-MM-DD")}`);
        this.rateSchedules.all.splice(
          i + 1,
          0,
          new RateSchedule({
            annualInterestRate: this.annualInterestRate,
            startDate: newRateSchedules.atIndex(i).endDate,
            endDate: newRateSchedules.atIndex(i + 1).startDate,
            type: "generated",
          })
        );
      }
    }

    if (!this.endDate.isSame(newRateSchedules.last.endDate, "day")) {
      //  console.log(`adding rate schedule for the end between ${newRateSchedules.last.endDate.format("YYYY-MM-DD")} and ${this.endDate.format("YYYY-MM-DD")}`);
      this.rateSchedules.addSchedule(new RateSchedule({ annualInterestRate: this.annualInterestRate, startDate: newRateSchedules.last.endDate, endDate: this.endDate, type: "generated" }));
    }

    this._rateSchedules = newRateSchedules;

    this.validateRatesSchedule();
  }

  get periodsSchedule(): PeriodSchedules {
    if (!this._periodsSchedule || this._periodsSchedule.length === 0) {
      this._periodsSchedule.periods = this.generatePeriodicSchedule();
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
      throw new Error("Invalid rounding precision, must be greater than or equal to zero, number represents decimal places");
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

    if (typeof value === "string") {
      let flushMethod: FlushUnbilledInterestDueToRoundingErrorType;
      switch (value) {
        case "none":
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.NONE;
          break;
        case "at_end":
          flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_END;
          break;
        case "at_threshold":
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

    this._roundingMethod = typeof value === "string" ? Currency.RoundingMethodFromString(value) : value;
  }

  get calendar(): Calendar {
    return this._calendar;
  }

  set calendar(calendarType: CalendarType | Calendar | string) {
    this.modifiedSinceLastCalculation = true;

    this._calendar = calendarType instanceof Calendar ? calendarType : new Calendar(calendarType);
  }

  get billingModel(): BillingModel {
    return this._billingModel;
  }

  set billingModel(value: BillingModel) {
    this.modifiedSinceLastCalculation = true;

    if (this.billingModel === "dailySimpleInterest") {
      if (this.preBillDays.length > 1) {
        throw new Error("Pre-bill days are not used in Daily Simple Interest billing model");
      }
      if (this.dueBillDays.length > 1) {
        throw new Error("Due-bill days are not used in Daily Simple Interest billing model");
      }
      // now lets make sure that the pre-bill days and due-bill days are set to 0, if not, since user
      // might have passed custom values, we will throw an error
      if (this.preBillDays.first.preBillDays !== 0) {
        throw new Error("Pre-bill days are not used in Daily Simple Interest billing model");
      }

      if (this.dueBillDays.first.daysDueAfterPeriodEnd !== 0) {
        throw new Error("Due-bill days are not used in Daily Simple Interest billing model");
      }

      // while we are at it, just to make sure default values are not passed in
      // we will also throw an error if they are not zero
      if (this.defaultPreBillDaysConfiguration !== 0) {
        throw new Error("Pre-bill days are not used in Daily Simple Interest billing model");
      }

      if (this.defaultBillDueDaysAfterPeriodEndConfiguration !== 0) {
        throw new Error("Due-bill days are not used in Daily Simple Interest billing model");
      }
    }

    this._billingModel = value;
  }

  get annualInterestRate(): Decimal {
    return this._annualInterestRate;
  }

  set annualInterestRate(value: Decimal | number) {
    this.modifiedSinceLastCalculation = true;

    const annualInterestRate = new Decimal(value);

    // validate annual interest rate, it should not be negative or greater than 100%
    if (annualInterestRate.isNegative()) {
      throw new Error("Invalid annual interest rate, value cannot be negative");
    }

    if (annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
      throw new Error("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
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

  get firstPaymentDate(): Dayjs {
    if (!this._firstPaymentDate || (this.modifiedSinceLastCalculation === true && this._hasCustomFirstPaymentDate === false)) {
      const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
      this._firstPaymentDate = this.startDate.add(1 * this.termPeriodDefinition.count[0], termUnit).startOf("day");
    }
    return this._firstPaymentDate;
  }

  set firstPaymentDate(date: Dayjs | Date | string | undefined) {
    this.modifiedSinceLastCalculation = true;

    if (date) {
      this.hasCustomFirstPaymentDate = true;
      this._firstPaymentDate = dayjs(date).startOf("day");
    } else {
      this._hasCustomFirstPaymentDate = false;
      this._firstPaymentDate = undefined;
      return;
    }
  }

  get startDate(): Dayjs {
    // console.trace("returning start date");
    return this._startDate;
  }

  set startDate(startDate: Dayjs | Date | string) {
    this.modifiedSinceLastCalculation = true;

    if (!startDate) {
      throw new Error("Invalid start date, must be a valid date");
    }
    this._startDate = dayjs(startDate).startOf("day");
  }

  get endDate(): Dayjs {
    if (!this._endDate || (this.modifiedSinceLastCalculation === true && this.hasCustomEndDate === false)) {
      const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
      this._endDate = this.startDate.add(this.term * this.termPeriodDefinition.count[0], termUnit);
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

  set endDate(endDate: Dayjs | Date | string | undefined) {
    this.modifiedSinceLastCalculation = true;

    // console.trace("end date is being set", endDate);
    let newEndDate: Dayjs;
    if (endDate) {
      this.hasCustomEndDate = true;
      newEndDate = dayjs(endDate).startOf("day");
    } else {
      this._endDate = undefined;
      return;
    }

    // validate that the end date is after the start date
    if (newEndDate.isBefore(this.startDate)) {
      throw new Error("Invalid end date, must be after the start date");
    }

    this._endDate = newEndDate;
  }

  public getInputParams(): AmortizationParams {
    return cloneDeep(this._inputParams);
  }

  public getRepaymentSchedule(): AmortizationEntries {
    return this.repaymentSchedule;
  }

  private calculateFeesForPeriod(termNumber: number, principal: Currency | null, interest: Currency, totalPayment: Currency): { totalFees: Currency; feesAfterPrincipal: Fee[] } {
    // Retrieve per-term fees
    const termFees = this.feesPerTerm.getFeesForTerm(termNumber);
    // Retrieve fees that apply to all terms
    const allTermFees = this.feesForAllTerms;
    // deffered fees
    const deferredFees: Fee[] = [
      new Fee({
        type: "fixed",
        amount: this.unbilledDeferredFees,
        description: "Deferred fee",
      }),
    ];

    // Combine the fees
    const fees = [...deferredFees, ...allTermFees.all, ...termFees];

    let totalFees = Currency.zero;
    let feesBeforePrincipal: Fee[] = [];
    let feesAfterPrincipal: Fee[] = [];

    for (const fee of fees) {
      if (fee.type === "fixed") {
        feesBeforePrincipal.push(fee);
      } else if (fee.type === "percentage") {
        if (fee.basedOn === "interest" || fee.basedOn === "totalPayment") {
          feesBeforePrincipal.push(fee);
        } else if (fee.basedOn === "principal") {
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
      if (fee.type === "fixed") {
        feeAmount = fee.amount!;
      } else if (fee.type === "percentage") {
        let baseAmount: Currency;
        if (fee.basedOn === "interest") {
          baseAmount = interest;
        } else if (fee.basedOn === "totalPayment") {
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
    return endDate.diff(startDate, "month");
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
          paymentDate: schedule.periodEndDate.toDate(),
        };
        paymentsMap.set(period, payment);
      } else {
        // Accumulate principal and interest
        payment.principal = payment.principal.add(schedule.principal.getValue());
        payment.interest = payment.interest.add(schedule.accruedInterestForPeriod.getValue());
        // Update payment date if the current one is later
        if (schedule.periodEndDate.toDate() > payment.paymentDate) {
          payment.paymentDate = schedule.periodEndDate.toDate();
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
      throw new Error("Invalid schedule rates, at least one rate is required");
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isSame(this.rateSchedules.first.startDate, "day")) {
      throw new Error(`Invalid schedule rates: The start date (${this.startDate.format("YYYY-MM-DD")}) does not match the first rate schedule start date (${this.rateSchedules.first.startDate.format("YYYY-MM-DD")}).`);
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.rateSchedules.last.endDate, "day")) {
      throw new Error(`Invalid schedule rates: The end date (${this.endDate.format("YYYY-MM-DD")}) does not match the last rate schedule end date (${this.rateSchedules.last.endDate.format("YYYY-MM-DD")}).`);
    }

    // verify that rate is not negative
    for (let rate of this.rateSchedules.all) {
      if (rate.annualInterestRate.isNegative()) {
        throw new Error("Invalid annual interest rate, value cannot be negative");
      }
    }

    // verify that rate is not greater than 100% unless explicitly allowed
    for (let rate of this.rateSchedules.all) {
      if (rate.annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
        throw new Error("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
      }
    }
  }

  /**
   * Validate the schedule periods.
   */
  verifySchedulePeriods(): void {
    if (this.periodsSchedule.length !== this.term) {
      throw new Error("Invalid schedule periods, number of periods must match the term");
    }
    // Check if the start date of the first period is the same as the loan start date
    if (!this.startDate.isSame(this.periodsSchedule.firstPeriod.startDate, "day")) {
      throw new Error("Invalid schedule periods, start date does not match the loan start date");
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.periodsSchedule.lastPeriod.endDate, "day")) {
      throw new Error("Invalid schedule periods, end date does not match the loan end date");
    }

    for (let i = 0; i < this.periodsSchedule.length - 1; i++) {
      // Check if the periods are in ascending order
      if (!this.periodsSchedule.periods[i].endDate.isSame(this.periodsSchedule.periods[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are not in ascending order");
      }
      // Check if the periods are non-overlapping
      if (this.periodsSchedule.periods[i].endDate.isAfter(this.periodsSchedule.periods[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are overlapping");
      }
    }
  }

  /**
   * Generate schedule periods based on the term and start date.
   */

  generatePeriodicSchedule(): PeriodSchedule[] {
    const periodsSchedule: PeriodSchedule[] = [];

    let startDate = dayjs(this.startDate);
    for (let currentTerm = 0; currentTerm < this.term; currentTerm++) {
      let endDate: Dayjs;
      const isStartDateLastDayOfMonth = startDate.isSame(startDate.endOf("month"), "day");

      if (currentTerm === 0 && this.firstPaymentDate) {
        endDate = this.firstPaymentDate.startOf("day");
      } else {
        const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
        if (isStartDateLastDayOfMonth && termUnit === "month") {
          endDate = startDate.add(this.termPeriodDefinition.count[0], termUnit).endOf("month").startOf("day");
        } else {
          endDate = startDate.add(this.termPeriodDefinition.count[0], termUnit).startOf("day");
        }
      }

      // Check for change payment date
      if (this.changePaymentDates.length > 0) {
        const changePaymentDate = this.changePaymentDates.all.find((changePaymentDate) => {
          if (changePaymentDate.termNumber < 0 && changePaymentDate.originalDate) {
            // it is false if original date is after the current period
            if (startDate.isSame(changePaymentDate.originalDate)) {
              changePaymentDate.termNumber = currentTerm;
              return true;
            }
          } else {
            return changePaymentDate.termNumber === currentTerm;
          }
        });
        if (changePaymentDate) {
          changePaymentDate.originalEndDate = endDate;
          endDate = changePaymentDate.newDate.startOf("day");
        }
      }
      periodsSchedule.push(
        new PeriodSchedule({
          startDate: startDate,
          endDate: endDate,
          type: "generated",
        })
      );
      startDate = endDate;
    }

    // Ensure the final period ends on the loan's end date
    periodsSchedule[periodsSchedule.length - 1].endDate = this.endDate;
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
        type: "default",
      }),
    ]);
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printShortAmortizationSchedule(): void {
    const amortization = this.generateSchedule();
    console.table(
      amortization.entries.map((row) => {
        return {
          term: row.term,
          periodStartDate: row.periodStartDate.format("YYYY-MM-DD"),
          periodEndDate: row.periodEndDate.format("YYYY-MM-DD"),
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
    const amortization = this.generateSchedule();
    console.table(
      amortization.entries.map((row) => {
        return {
          period: row.term,
          periodStartDate: row.periodStartDate.format("YYYY-MM-DD"),
          periodEndDate: row.periodEndDate.format("YYYY-MM-DD"),
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
  getInterestRatesBetweenDates(startDate: Dayjs, endDate: Dayjs): RateSchedule[] {
    const rates: RateSchedule[] = [];

    for (let rate of this.rateSchedules.all) {
      if (startDate.isBefore(rate.endDate) && endDate.isSameOrAfter(rate.startDate)) {
        const effectiveStartDate = startDate.isAfter(rate.startDate) ? startDate : rate.startDate;
        const effectiveEndDate = endDate.isBefore(rate.endDate) ? endDate : rate.endDate;
        rates.push(new RateSchedule({ annualInterestRate: rate.annualInterestRate, startDate: effectiveStartDate, endDate: effectiveEndDate }));
      }
    }

    // if perDiemCalculationType is set to "AnnualRateDividedByDaysInYear", we dont need to do anything
    // if perDiemCalculationType is set to "MonthlyRateDividedByDaysInMonth", we need to split the schedule
    // into smaller schedules based on the month, so for example 11/15/2024 to 12/15/2024 will be split into
    // 11/15/2024 to 11/30/2024 at 5% and 12/01/2024 to 12/15/2024 at 5%
    // this will allow interest calculator to calculate MonthlyRateDividedByDaysInMonth
    // correctly for terms that spawn multiple months, which is likely most of the time

    if (this.perDiemCalculationType === "AnnualRateDividedByDaysInYear") {
      return rates;
    } else if (this.perDiemCalculationType === "MonthlyRateDividedByDaysInMonth") {
      return rates;
    } else if (this.perDiemCalculationType === "MonthlyRateDividedByDaysInMonthComplex") {
      const splitRates: RateSchedule[] = [];
      // we will split the rates into smaller schedules based on the month
      for (let rate of rates) {
        const startDate = rate.startDate;
        const endDate = rate.endDate;
        let currentDate = startDate;
        while (currentDate.isSameOrBefore(endDate)) {
          const lastDayOfMonth = currentDate.endOf("month");
          const effectiveEndDate = endDate.isBefore(lastDayOfMonth) ? endDate : lastDayOfMonth.add(1, "day");
          splitRates.push(new RateSchedule({ annualInterestRate: rate.annualInterestRate, startDate: currentDate, endDate: effectiveEndDate }));
          currentDate = lastDayOfMonth.add(1, "day");
        }
      }
      return splitRates;
    } else {
      throw new Error(`Invalid per diem calculation type, getInterestRatesBetweenDates is not implemented for ${this.perDiemCalculationType}`);
    }
  }

  getTermPaymentAmount(termNumber: number): Currency {
    return this.termPaymentAmountOverride.getPaymentAmountForTerm(termNumber)?.paymentAmount || this.equitedMonthlyPayment;
  }

  getModifiedBalance(
    startDate: Dayjs,
    endDate: Dayjs,
    balance: Currency
  ): {
    balance: Currency;
    balanceModification?: BalanceModification;
    modificationAmount: Currency;
    startDate: Dayjs;
    endDate: Dayjs;
  }[] {
    // range may contain more than one balance or might not contain any modification,
    // in that case we will return just a single balance with the original balance
    const balances: {
      balance: Currency;
      balanceModification?: BalanceModification;
      modificationAmount: Currency;
      startDate: Dayjs;
      endDate: Dayjs;
    }[] = [];

    let balanceToModify = Currency.of(balance);
    // console.log(
    //   this.balanceModifications,
    //   "balance modifications:",
    //   this.balanceModifications.map((modification) => {
    //     return {
    //       date: modification.date.format("YYYY-MM-DD"),
    //       type: modification.type,
    //       amount: modification.amount.toNumber(),
    //     };
    //   })
    // );
    for (let modification of this.balanceModifications.all) {
      // see if there are any modifications in the range
      // console.log(`Checking modification ${modification.date.format("YYYY-MM-DD")} and comparing it to ${startDate.format("YYYY-MM-DD")} and ${endDate.format("YYYY-MM-DD")}`);

      if (modification.date.isBetween(startDate, endDate, "day", "[]")) {
        // we found a modification, lets get its start date
        let modificationStartDate = balances.length > 0 ? balances[balances.length - 1].endDate : startDate;
        let modificationEndDate = modification.date;
        let modificationAmount: Currency;
        let modifiedBalance: Currency;
        switch (modification.type) {
          case "increase":
            modifiedBalance = balanceToModify.add(modification.amount);
            modificationAmount = modification.amount;
            break;
          case "decrease":
            modifiedBalance = balanceToModify.subtract(modification.amount);
            if (modifiedBalance.isNegative()) {
              const exess = modifiedBalance.abs();
              modifiedBalance = Currency.zero;
              modificationAmount = modification.amount.subtract(exess);
              modification.usedAmount = modificationAmount;
            } else {
              modificationAmount = modification.amount.isZero() ? Currency.zero : modification.amount.negated();
              modification.usedAmount = modificationAmount.negated();
            }

            break;
          default:
            throw new Error("Invalid balance modification type");
        }
        balances.push({
          balance: modifiedBalance,
          balanceModification: modification,
          modificationAmount: modificationAmount,
          startDate: modificationStartDate,
          endDate: modificationEndDate,
        });
      }
    }
    // if we dont have any modifications in the range, we will just return the original balance
    if (balances.length === 0) {
      balances.push({ balance, startDate, endDate, modificationAmount: Currency.zero });
    } else {
      // if we have modifications, we will add the last balance to the end of the range
      balances.push({ balance: balances[balances.length - 1].balance, startDate: balances[balances.length - 1].endDate, endDate, modificationAmount: Currency.zero });

      // console.log(
      //   "Balance Modifications:",
      //   balances.map((balance) => {
      //     return {
      //       startDate: balance.startDate.format("YYYY-MM-DD"),
      //       endDate: balance.endDate.format("YYYY-MM-DD"),
      //       balance: balance.balance.toNumber(),
      //       modificationAmount: balance.modificationAmount.toNumber(),
      //     };
      //   })
      // );
    }

    // console.log(
    //   "Balance Modifications:",
    //   balances.map((balance) => {
    //     return {
    //       startDate: balance.startDate.format("YYYY-MM-DD"),
    //       endDate: balance.endDate.format("YYYY-MM-DD"),
    //       balance: balance.balance.toNumber(),
    //       modificationAmount: balance.modificationAmount.toNumber(),
    //     };
    //   })
    // );

    return balances;
  }

  public jsGenerateSchedule(): AmortizationEntries {
    this.updateModelValues();
    const newSchedule = this.generateSchedule();
    this.updateJsValues();
    return newSchedule;
  }

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  public generateSchedule(): AmortizationEntries {
    this.balanceModifications.resetUsedAmounts();

    this.earlyRepayment = false;
    const schedule: AmortizationEntries = new AmortizationEntries();
    let startBalance = this.totalLoanAmount;
    //let termIndex = 0;

    // for (let term of this.periodsSchedule.periods) {
    for (let termIndex = 0; termIndex < this.periodsSchedule.length; termIndex++) {
      let term = this.periodsSchedule.atIndex(termIndex);
      if (this.earlyRepayment === true) {
        break;
      }
      // termIndex++;

      const periodStartDate = term.startDate;
      const periodEndDate = term.endDate;
      const preBillDaysConfiguration = this.preBillDays.atIndex(termIndex).preBillDays;
      const dueBillDaysConfiguration = this.dueBillDays.atIndex(termIndex).daysDueAfterPeriodEnd;
      const billOpenDate = periodEndDate.subtract(preBillDaysConfiguration, "day");
      const billDueDate = periodEndDate.add(dueBillDaysConfiguration, "day");
      const fixedMonthlyPayment = this.getTermPaymentAmount(termIndex);
      let billedInterestForTerm = Currency.zero;

      // Check if we have a static interest override for this term
      const staticInterestOverride = this.termInterestAmountOverride.all.find((override) => override.termNumber === termIndex)?.interestAmount;

      const loanBalancesInAPeriod = this.getModifiedBalance(periodStartDate, periodEndDate, startBalance);
      const lastBalanceInPeriod = loanBalancesInAPeriod.length;
      let currentBalanceIndex = 0;

      // Handle static interest override scenario
      if (staticInterestOverride) {
        // Use the static interest for the entire term plus any deferred interest
        let appliedDeferredInterest = Currency.of(0);
        if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
          appliedDeferredInterest = this.unbilledDeferredInterest;
          this.unbilledDeferredInterest = Currency.zero;
        }

        const totalTermInterest = staticInterestOverride.add(appliedDeferredInterest);
        const daysInPeriodTotal = this.calendar.daysBetween(periodStartDate, periodEndDate);
        const daysInYear = this.calendar.daysInYear();

        // Calculate equivalent annual rate for metadata
        let annualizedEquivalentRate = new Decimal(0);
        if (startBalance.getValue().greaterThan(0) && daysInPeriodTotal > 0) {
          const fractionOfYear = daysInPeriodTotal / daysInYear;
          const interestDecimal = totalTermInterest.getValue();
          const principalDecimal = startBalance.getValue();
          const annualRate = interestDecimal.div(principalDecimal.mul(fractionOfYear));
          annualizedEquivalentRate = annualRate.lessThanOrEqualTo(1) || this.allowRateAbove100 ? annualRate : new Decimal(1);
        }

        const accruedInterestForPeriod = totalTermInterest;
        const roundedInterest = this.round(totalTermInterest);
        const interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();
        if (!interestRoundingError.isZero()) {
          this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
        }

        // Calculate fees
        const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(termIndex, null, accruedInterestForPeriod, fixedMonthlyPayment);

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
        const balanceAfterPayment = startBalance.subtract(principal);

        this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(dueInterestForTerm);
        this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(dueInterestForTerm);

        const metadata: AmortizationScheduleMetadata = {
          staticInterestOverrideApplied: true,
          actualInterestValue: accruedInterestForPeriod.toNumber(),
          equivalentAnnualRate: annualizedEquivalentRate.toNumber(),
        };

        schedule.addEntry(
          new AmortizationEntry({
            term: termIndex,
            billablePeriod: true,
            periodStartDate: periodStartDate,
            periodEndDate: periodEndDate,
            periodBillOpenDate: billOpenDate,
            periodBillDueDate: billDueDate,
            billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
            prebillDaysConfiguration: preBillDaysConfiguration,
            periodInterestRate: annualizedEquivalentRate, // store the equivalent rate
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
            perDiem: accruedInterestForPeriod.isZero() ? Currency.zero : accruedInterestForPeriod.divide(daysInPeriodTotal),
            daysInPeriod: daysInPeriodTotal,
            unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
            interestRoundingError: interestRoundingError,
            unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
            metadata,
          })
        );

        startBalance = balanceAfterPayment;
        if (balanceAfterPayment.lessThanOrEqualTo(0) && termIndex < this.term) {
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
        const termInterestRateOverride = this.termInterestRateOverride.all.find((override) => override.termNumber === termIndex)?.interestRate;

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

          if (loanBalancesInAPeriod.length > 1) {
            metadata.splitBalancePeriod = true;
          }

          const daysInPeriod = this.calendar.daysBetween(interestRateForPeriod.startDate, interestRateForPeriod.endDate);
          const daysInMonthForCalc = this.calendar.daysInMonth(interestRateForPeriod.startDate);

          const interestCalculator = new InterestCalculator(interestRateForPeriod.annualInterestRate, this.calendar.calendarType, this.perDiemCalculationType, daysInMonthForCalc);

          let interestForPeriod: Currency;
          if (interestRateForPeriod.annualInterestRate.isZero()) {
            interestForPeriod = Currency.zero;
          } else {
            interestForPeriod = interestCalculator.calculateInterestForDays(startBalance, daysInPeriod);
            // interestForPeriod = this.round(interestForPeriod);
          }

          const perDiem = interestForPeriod.isZero() ? Currency.zero : interestCalculator.perDiem;

          // Handle unbilled interest due to rounding error if at threshold
          if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD) {
            if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
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
                metadata,
              })
            );
            startBalance = endBalance;
            continue;
          }

          // Billable sub-period
          const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(termIndex, null, billedInterestForTerm, fixedMonthlyPayment);

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

          const balanceBeforePayment = startBalance;
          const balanceAfterPayment = startBalance.subtract(principal);

          this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(dueInterestForTerm);
          this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(dueInterestForTerm);

          if (dueInterestForTerm.isZero() && interestForPeriod.greaterThan(0) && availableForInterestAndPrincipal.greaterThan(0)) {
            metadata.interestLessThanOneCent = true;
            metadata.actualInterestValue = dueInterestForTerm.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(dueInterestForTerm);
          }

          metadata.amountAddedToDeferredInterest = deferredInterestFromCurrentPeriod.toNumber();

          startBalance = balanceAfterPayment;

          schedule.addEntry(
            new AmortizationEntry({
              term: termIndex,
              billablePeriod: true,
              periodStartDate: interestRateForPeriod.startDate,
              periodEndDate: interestRateForPeriod.endDate,
              periodBillOpenDate: billOpenDate,
              periodBillDueDate: billDueDate,
              billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
              prebillDaysConfiguration: preBillDaysConfiguration,
              periodInterestRate: interestRateForPeriod.annualInterestRate,
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
              metadata,
            })
          );

          if (balanceAfterPayment.lessThanOrEqualTo(0) && termIndex < this.term) {
            this.earlyRepayment = true;
            break;
          }
        }
      }
    }

    // Adjust the last payment if needed
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule.lastEntry;
      if (!lastPayment) {
        console.error(`Last payment is not defined`, schedule);
        throw new Error("Last payment is not defined");
      }
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.accruedInterestForPeriod).add(lastPayment.fees);
      if (lastPayment.totalPayment.isZero() && lastPayment.dueInterestForTerm.greaterThan(0)) {
        lastPayment.totalPayment = lastPayment.totalPayment.add(lastPayment.dueInterestForTerm);
      }
      lastPayment.endBalance = Currency.of(0);
      const daysInMonthForCalc = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
      lastPayment.perDiem = daysInMonthForCalc > 0 ? lastPayment.accruedInterestForPeriod.divide(daysInMonthForCalc) : Currency.zero;
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
          lastPayment.billedInterestForTerm = this.round(lastPayment.billedInterestForTerm.add(this.unbilledInterestDueToRounding));
          lastPayment.dueInterestForTerm = this.round(lastPayment.dueInterestForTerm.add(this.unbilledInterestDueToRounding));
          lastPayment.interestRoundingError = adjustedInterestRounded.getRoundingErrorAsCurrency();
          lastPayment.totalPayment = lastPayment.principal.add(lastPayment.accruedInterestForPeriod).add(lastPayment.fees);
          lastPayment.metadata.unbilledInterestApplied = true;
          lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber();
        }
      }
    }

    this.repaymentSchedule = schedule;
    this.modifiedSinceLastCalculation = false;
    return schedule;
  }

  getAccruedInterestByDate(date: Dayjs | Date): Currency {
    if (date instanceof Date) {
      date = dayjs(date);
    }
    date = date.startOf("day");

    // first we get the period where the date is
    const activePeriod = this.repaymentSchedule.getPeriodByDate(date);

    if (!activePeriod) {
      return Currency.zero;
    }
    // next we get amortization entries with same period number and end date is same or before active period
    const amortizationEntries = this.repaymentSchedule.entries.filter((entry) => entry.term === activePeriod.term && entry.periodEndDate.isSameOrBefore(activePeriod.periodStartDate));
    // sum up accrued interest for those entries
    let accruedInterest = Currency.zero;
    for (let entry of amortizationEntries) {
      accruedInterest = accruedInterest.add(entry.accruedInterestForPeriod);
    }
    // next we calculate interest for the active period
    const daysInPeriod = this.calendar.daysBetween(activePeriod.periodStartDate, date);
    const interestCalculator = new InterestCalculator(activePeriod.periodInterestRate, this.calendar.calendarType, this.perDiemCalculationType, daysInPeriod);
    const interestForDays = interestCalculator.calculateInterestForDays(activePeriod.startBalance, daysInPeriod);
    accruedInterest = accruedInterest.add(interestForDays);
    return accruedInterest;
  }

  /**
   * Calculates the fixed monthly payment for the loan.
   * @returns The fixed monthly payment as a Currency object.
   */
  private calculateFixedMonthlyPayment(): Currency {
    if (this.annualInterestRate.isZero()) {
      return this.round(this.totalLoanAmount.divide(this.term));
    }
    const monthlyRate = this.annualInterestRate.dividedBy(12);
    const numerator = this.totalLoanAmount.multiply(monthlyRate);
    const denominator = Currency.of(1).subtract(Currency.of(1).divide(new Decimal(1).plus(monthlyRate).pow(this.term)));
    return this.round(numerator.divide(denominator));
  }

  /**
   * Rounds a Currency value to the specified precision using the specified rounding method.
   * @param value The Currency value to round.
   * @returns The rounded Currency value.
   */
  private round(value: Currency): Currency {
    return value.round(this.roundingPrecision, this.roundingMethod);
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
      preBillDays: this.preBillDays,
      dueBillDays: this.dueBillDays,
      defaultPreBillDaysConfiguration: this.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: this.defaultBillDueDaysAfterPeriodEndConfiguration,
      startDate: this.startDate.toDate(),
      endDate: this.endDate.toDate(),
      hasCustomEndDate: this.hasCustomEndDate,
      equitedMonthlyPayment: this.equitedMonthlyPayment.toNumber(),
      hasCustomEquitedMonthlyPayment: this.hasCustomEquitedMonthlyPayment,
      calendarType: this.calendar.calendarType,
      roundingMethod: this.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.flushUnbilledInterestRoundingErrorMethod,
      roundingPrecision: this.roundingPrecision,
      flushThreshold: this.flushThreshold.toNumber(),
      periodsSchedule: this.periodsSchedule.json,
      rateSchedules: this.rateSchedules.json,
      allowRateAbove100: this.allowRateAbove100,
      termPaymentAmountOverride: this.termPaymentAmountOverride.json,
      termInterestAmountOverride: this.termInterestAmountOverride.json,
      termPeriodDefinition: this.termPeriodDefinition,
      changePaymentDates: this.changePaymentDates.json,
      balanceModifications: this.balanceModifications.json,
      perDiemCalculationType: this.perDiemCalculationType,
      billingModel: this.billingModel,
      feesPerTerm: this.feesPerTerm.json,
      feesForAllTerms: this.feesForAllTerms,
      repaymentSchedule: this.repaymentSchedule.json,
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
  getAccruedInterestToDate(date: Dayjs): Currency {
    // Use existing getAccruedInterestByDate
    // This returns accrued interest for the active period and previous periods.
    return this.getAccruedInterestByDate(date);
  }

  /**
   * Computes the current payoff amount (principal + accrued interest up to a given date).
   * Current payoff = remaining principal + accrued interest to date.
   */
  getCurrentPayoffAmount(date: Dayjs): Currency {
    // Find remaining principal as of date
    // Remaining principal is just last entry's endBalance at date or project the loan forward.
    // For a snapshot date, we can find the period and calculate what principal would be at that date.
    // However, the simplest approach is to find the amortization entry that covers 'date',
    // partially accrue interest, and calculate principal.

    // If date is after the last scheduled payment, payoff = 0
    if (date.isSameOrAfter(this.endDate, "day")) {
      return Currency.zero;
    }

    // Find the period containing 'date'
    const activePeriod = this.repaymentSchedule.getPeriodByDate(date);
    if (!activePeriod) {
      // If no active period (date is before start?), payoff = totalLoanAmount
      if (date.isSameOrBefore(this.startDate)) {
        return this.totalLoanAmount;
      } else {
        console.warn("No active period found for date", date);
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
}

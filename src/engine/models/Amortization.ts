import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator, PerDiemCalculationType } from "./InterestCalculator";
import { BalanceModification } from "./Amortization/BalanceModification";
import Decimal from "decimal.js";

import { AmortizationEntry, AmortizationScheduleMetadata } from "./Amortization/AmortizationEntry";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

import cloneDeep from "lodash/cloneDeep";

/**
 * Interface representing each entry in the payment schedule.
 */
export interface PaymentScheduleEntry {
  paymentNumber: number;
  paymentDate: Dayjs;
  paymentAmount: Currency;
  principal: Currency;
  interest: Currency;
  balance: Currency;
}

/**
 * Interface representing the TILA disclosures.
 */
export interface TILADisclosures {
  amountFinanced: Currency;
  financeCharge: Currency;
  totalOfPayments: Currency;
  annualPercentageRate: Decimal;
  paymentSchedule: PaymentScheduleEntry[];
}

export interface PeriodSchedule {
  startDate: Dayjs;
  endDate: Dayjs;
}

export interface RateSchedule {
  annualInterestRate: Decimal;
  startDate: Dayjs;
  endDate: Dayjs;
}

export interface Fee {
  type: "fixed" | "percentage";
  amount?: Currency; // For fixed amount fees
  percentage?: Decimal; // For percentage-based fees
  basedOn?: "interest" | "principal" | "totalPayment"; // What the percentage is applied to
  description?: string;
  metadata?: any;
}

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

export interface TermPaymentAmount {
  termNumber: number;
  paymentAmount: Currency;
}

export interface ChangePaymentDate {
  termNumber: number;
  newDate: Dayjs;
  oneTimeChange?: boolean;
}

export interface PreBillDaysConfiguration {
  termNumber: number;
  preBillDays: number;
}

export interface BillDueDaysConfiguration {
  termNumber: number;
  daysDueAfterPeriodEnd: number;
}

export interface AmortizationParams {
  loanAmount: Currency;
  originationFee?: Currency;
  annualInterestRate: Decimal;
  term: number;
  preBillDays?: PreBillDaysConfiguration[];
  dueBillDays?: BillDueDaysConfiguration[];
  billDueDaysAfterPeriodEnd?: BillDueDaysConfiguration[];
  defaultPreBillDaysConfiguration?: number;
  defaultBillDueDaysAfterPeriodEndConfiguration?: number;
  startDate: Dayjs;
  endDate?: Dayjs;
  calendarType?: CalendarType;
  roundingMethod?: RoundingMethod;
  flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType;
  roundingPrecision?: number;
  flushThreshold?: Currency;
  periodsSchedule?: PeriodSchedule[];
  ratesSchedule?: RateSchedule[];
  allowRateAbove100?: boolean;
  termPaymentAmountOverride?: TermPaymentAmount[];
  termPaymentAmount?: Currency; // allows one to specify EMI manually instead of calculating it
  firstPaymentDate?: Dayjs;
  termPeriodDefinition?: TermPeriodDefinition;
  changePaymentDates?: ChangePaymentDate[];
  balanceModifications?: BalanceModification[];
  perDiemCalculationType?: PerDiemCalculationType;
  // staticFeePerBill?: Currency; // A fixed fee amount applied to each bill.
  // customFeesPerTerm?: { termNumber: number; feeAmount: Currency }[]; // An array specifying custom fee amounts for each term.
  // feePercentageOfTotalPayment?: Decimal; // A percentage of the total payment to be applied as a fee.
  // customFeePercentagesPerTerm?: { termNumber: number; feePercentage: Decimal }[]; // An array specifying custom percentages per term.
  feesPerTerm?: { termNumber: number; fees: Fee[] }[];
  feesForAllTerms?: Fee[];
  billingModel?: BillingModel;
}

export type BillingModel = "amortized" | "dailySimpleInterest";

const DEFAULT_PRE_BILL_DAYS_CONFIGURATION = 0;
const DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION = 0;

/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export class Amortization {
  loanAmount: Currency;
  originationFee: Currency;
  totalLoanAmount: Currency;
  annualInterestRate: Decimal;
  term: number;
  preBillDays: PreBillDaysConfiguration[];
  dueBillDays: BillDueDaysConfiguration[];
  defaultPreBillDaysConfiguration: number;
  defaultBillDueDaysAfterPeriodEndConfiguration: number;
  startDate: Dayjs;
  endDate: Dayjs;
  calendar: Calendar;
  roundingMethod: RoundingMethod;
  flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType; // Updated property
  totalChargedInterestRounded: Currency; // tracks total charged interest (rounded)
  totalChargedInterestUnrounded: Currency; // racks total charged interest (unrounded)
  unbilledInterestDueToRounding: Currency; // racks unbilled interest due to rounding
  unbilledDeferredInterest: Currency; // tracks deferred interest
  unbilledDeferredFees: Currency; // tracks deferred interest
  roundingPrecision: number; // tracks precision for rounding
  flushThreshold: Currency; // property to track the threshold for flushing cumulative rounding error
  periodsSchedule: PeriodSchedule[] = [];
  rateSchedules: RateSchedule[] = [];
  allowRateAbove100: boolean = false;
  termPaymentAmountOverride: TermPaymentAmount[] = [];
  equitedMonthlyPayment: Currency;
  firstPaymentDate?: Dayjs;
  termPeriodDefinition: TermPeriodDefinition;
  changePaymentDates: ChangePaymentDate[] = [];
  repaymentSchedule: AmortizationEntry[];
  balanceModifications: BalanceModification[] = [];
  _apr?: Decimal;
  earlyRepayment: boolean = false;
  perDiemCalculationType: PerDiemCalculationType = "AnnualRateDividedByDaysInYear";
  billingModel: BillingModel = "amortized";
  // Fee configurations
  // private staticFeePerBill: Currency;
  // private customFeesPerTerm: Map<number, Currency>;
  // private feePercentageOfTotalPayment: Decimal;
  // private customFeePercentagesPerTerm: Map<number, Decimal>;
  private feesPerTerm: Map<number, Fee[]>;
  private feesForAllTerms: Fee[]; // New property for global fees

  private _inputParams: AmortizationParams;

  constructor(params: AmortizationParams) {
    this._inputParams = cloneDeep(params);

    // validate that loan amount is greater than zero
    if (params.loanAmount.getValue().isZero() || params.loanAmount.getValue().isNegative()) {
      throw new Error("Invalid loan amount, must be greater than zero");
    }
    this.loanAmount = params.loanAmount;

    if (params.billingModel) {
      this.billingModel = params.billingModel;
    }

    if (params.originationFee) {
      if (params.originationFee.getValue().isNegative()) {
        throw new Error("Invalid origination fee, value cannot be negative");
      }
      this.originationFee = params.originationFee;
    } else {
      this.originationFee = Currency.of(0);
    }

    if (params.balanceModifications) {
      this.balanceModifications = params.balanceModifications;

      // sort balance modifications by date
      this.balanceModifications = this.balanceModifications.sort((a, b) => {
        return a.date.diff(b.date);
      });
    }

    this.totalLoanAmount = this.loanAmount.add(this.originationFee);

    if (params.perDiemCalculationType) {
      this.perDiemCalculationType = params.perDiemCalculationType;
    }

    // Initialize feesPerTerm
    this.feesPerTerm = new Map();
    if (params.feesPerTerm) {
      for (const feeConfig of params.feesPerTerm) {
        this.feesPerTerm.set(feeConfig.termNumber, feeConfig.fees);
      }
    }

    // Initialize feesForAllTerms
    this.feesForAllTerms = params.feesForAllTerms || [];

    if (params.termPeriodDefinition) {
      this.termPeriodDefinition = params.termPeriodDefinition;
    } else {
      this.termPeriodDefinition = { unit: "month", count: [1] };
    }

    if (params.changePaymentDates) {
      this.changePaymentDates = params.changePaymentDates;
      this.changePaymentDates = this.changePaymentDates.map((changePaymentDate) => {
        return { termNumber: changePaymentDate.termNumber, newDate: changePaymentDate.newDate.startOf("day") };
      });
    }

    if (params.allowRateAbove100 !== undefined) {
      this.allowRateAbove100 = params.allowRateAbove100;
    }

    if (params.firstPaymentDate) {
      this.firstPaymentDate = params.firstPaymentDate;
    } else {
      this.firstPaymentDate = params.startDate.add(1, "month");
    }

    // validate annual interest rate, it should not be negative or greater than 100%
    if (params.annualInterestRate.isNegative()) {
      throw new Error("Invalid annual interest rate, value cannot be negative");
    }

    if (params.annualInterestRate.greaterThan(1) && !this.allowRateAbove100) {
      throw new Error("Invalid annual interest rate, value cannot be greater than or equal to 100%, unless explicitly allowed by setting allowRateAbove100 to true");
    }
    this.annualInterestRate = params.annualInterestRate;

    // validate term, it should be greater than zero
    if (params.term <= 0) {
      throw new Error("Invalid term, must be greater than zero");
    }
    this.term = params.term;
    this.startDate = dayjs(params.startDate).startOf("day");

    if (params.endDate) {
      this.endDate = dayjs(params.endDate).startOf("day");
    } else {
      const termUnit = this.termPeriodDefinition.unit === "complex" ? "day" : this.termPeriodDefinition.unit;
      this.endDate = params.endDate ? dayjs(params.endDate).startOf("day") : this.startDate.add(this.term * this.termPeriodDefinition.count[0], termUnit);
    }

    // validate that the end date is after the start date
    if (this.endDate.isBefore(this.startDate)) {
      throw new Error("Invalid end date, must be after the start date");
    }

    if (params.termPaymentAmountOverride) {
      this.termPaymentAmountOverride = params.termPaymentAmountOverride;
    }

    this.calendar = new Calendar(params.calendarType || CalendarType.ACTUAL_ACTUAL);
    this.roundingMethod = params.roundingMethod || RoundingMethod.ROUND_HALF_UP;
    this.flushUnbilledInterestRoundingErrorMethod = params.flushUnbilledInterestRoundingErrorMethod || FlushUnbilledInterestDueToRoundingErrorType.NONE;
    this.totalChargedInterestRounded = Currency.of(0);
    this.totalChargedInterestUnrounded = Currency.of(0);
    this.unbilledInterestDueToRounding = Currency.of(0);
    this.roundingPrecision = params.roundingPrecision || 2;
    // validate that the rounding precision is greater than or equal to zero
    if (this.roundingPrecision < 0) {
      throw new Error("Invalid rounding precision, must be greater than or equal to zero, number represents decimal places");
    }
    this.flushThreshold = params.flushThreshold || Currency.of(0.01); // Default threshold is 1 cent

    // Initialize the schedule periods and rates
    if (!params.periodsSchedule) {
      this.generatePeriodicSchedule();
    } else {
      this.periodsSchedule = params.periodsSchedule;

      for (let period of this.periodsSchedule) {
        period.startDate = period.startDate.startOf("day");
        period.endDate = period.endDate.startOf("day");
      }
    }

    if (!params.ratesSchedule) {
      this.generateRatesSchedule();
    } else {
      this.rateSchedules = params.ratesSchedule;

      // all start and end dates must be at the start of the day, we dont want to count hours
      // at least not just yet... maybe in the future
      for (let rate of this.rateSchedules) {
        rate.startDate = rate.startDate.startOf("day");
        rate.endDate = rate.endDate.startOf("day");
      }

      // rate schedule might be partial and not necesserily aligns with billing periods
      // if first period is not equal to start date, we need to backfill
      // original start date and rate to the first period
      // same goes for in-between periods, if first period end date is not equal to next period start date
      // we need to backfill the rate and start date to the next period
      // finally same goes for the last period, if end date is not equal to the end date of the term
      // we need to backfill the rate and end date to the last period

      if (!this.startDate.isSame(this.rateSchedules[0].startDate, "day")) {
        console.log(`adding rate schedule at the start ${this.startDate.format("YYYY-MM-DD")} and ${this.rateSchedules[0].startDate.format("YYYY-MM-DD")}`);
        this.rateSchedules.unshift({ annualInterestRate: this.annualInterestRate, startDate: this.startDate, endDate: this.rateSchedules[0].startDate });
      }

      for (let i = 0; i < this.rateSchedules.length - 1; i++) {
        if (!this.rateSchedules[i].endDate.isSame(this.rateSchedules[i + 1].startDate, "day")) {
          console.log(`adding rate schedule between ${this.rateSchedules[i].startDate.format("YYYY-MM-DD")} and ${this.rateSchedules[i + 1].endDate.format("YYYY-MM-DD")}`);
          this.rateSchedules.splice(i + 1, 0, { annualInterestRate: this.annualInterestRate, startDate: this.rateSchedules[i].endDate, endDate: this.rateSchedules[i + 1].startDate });
        }
      }

      if (!this.endDate.isSame(this.rateSchedules[this.rateSchedules.length - 1].endDate, "day")) {
        console.log(`adding rate schedule for the end between ${this.rateSchedules[this.rateSchedules.length - 1].endDate.format("YYYY-MM-DD")} and ${this.endDate.format("YYYY-MM-DD")}`);
        this.rateSchedules.push({ annualInterestRate: this.annualInterestRate, startDate: this.rateSchedules[this.rateSchedules.length - 1].endDate, endDate: this.endDate });
      }
    }

    if (params.termPaymentAmount !== undefined) {
      this.equitedMonthlyPayment = params.termPaymentAmount;
    } else {
      this.equitedMonthlyPayment = this.calculateFixedMonthlyPayment();
    }

    if (params.defaultPreBillDaysConfiguration !== undefined) {
      this.defaultPreBillDaysConfiguration = params.defaultPreBillDaysConfiguration;
    } else {
      this.defaultPreBillDaysConfiguration = DEFAULT_PRE_BILL_DAYS_CONFIGURATION;
    }

    if (params.preBillDays && params.preBillDays.length > 0) {
      this.preBillDays = params.preBillDays;
    } else {
      this.preBillDays = [{ preBillDays: this.defaultPreBillDaysConfiguration, termNumber: 1 }];
    }

    if (params.defaultBillDueDaysAfterPeriodEndConfiguration !== undefined) {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = params.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      this.defaultBillDueDaysAfterPeriodEndConfiguration = DEFAULT_BILL_DUE_DAYS_AFTER_PERIO_END_CONFIGURATION;
    }

    if (params.dueBillDays && params.dueBillDays.length > 0) {
      this.dueBillDays = params.dueBillDays;
    } else {
      this.dueBillDays = [{ daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration, termNumber: 1 }];
    }

    // when using DSI there is no concept of a bill so perBillDays and dueBillDays are not used
    // so lets throw an error if they are used
    if (this.billingModel === "dailySimpleInterest") {
      if (this.preBillDays.length > 1) {
        throw new Error("Pre-bill days are not used in Daily Simple Interest billing model");
      }
      if (this.dueBillDays.length > 1) {
        throw new Error("Due-bill days are not used in Daily Simple Interest billing model");
      }
      // now lets make sure that the pre-bill days and due-bill days are set to 0, if not, since user
      // might have passed custom values, we will throw an error
      if (this.preBillDays[0].preBillDays !== 0) {
        throw new Error("Pre-bill days are not used in Daily Simple Interest billing model");
      }

      if (this.dueBillDays[0].daysDueAfterPeriodEnd !== 0) {
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

    this.generatePreBillDaysForAllTerms();
    this.generateDueBillDaysForAllTerms();

    this.unbilledDeferredInterest = Currency.of(0);
    this.unbilledDeferredFees = Currency.of(0);

    // validate the schedule periods and rates
    this.verifySchedulePeriods();
    this.validateRatesSchedule();

    this.repaymentSchedule = this.generateSchedule();
  }

  private calculateFeesForPeriod(termNumber: number, principal: Currency | null, interest: Currency, totalPayment: Currency): { totalFees: Currency; feesAfterPrincipal: Fee[] } {
    // Retrieve per-term fees
    const termFees = this.feesPerTerm.get(termNumber) || [];
    // Retrieve fees that apply to all terms
    const allTermFees = this.feesForAllTerms;
    // deffered fees
    const deferredFees: Fee[] = [
      {
        type: "fixed",
        amount: this.unbilledDeferredFees,
        description: "Deferred fee",
      },
    ];

    // Combine the fees
    const fees = [...deferredFees, ...allTermFees, ...termFees];

    let totalFees = Currency.Zero();
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
      let feeAmount: Currency = Currency.Zero();
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
    this.unbilledDeferredFees = Currency.Zero();
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

  generatePreBillDaysForAllTerms(): void {
    // we need to fill the gaps between the periods with pre-bill days
    // anything that is defined before first term will use default pre-bill days
    // any gaps between terms will use previously defined pre-bill days

    const completedPreBillDays: PreBillDaysConfiguration[] = [];
    for (let preBillDay of this.preBillDays) {
      completedPreBillDays[preBillDay.termNumber - 1] = preBillDay;
    }

    let lastUserDefinedTerm = this.preBillDays[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedPreBillDays[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedPreBillDays[i] = { termNumber: i + 1, preBillDays: this.defaultPreBillDaysConfiguration };
        } else {
          completedPreBillDays[i] = { termNumber: i + 1, preBillDays: lastUserDefinedTerm.preBillDays };
        }
      }
      lastUserDefinedTerm = completedPreBillDays[i];
    }

    //console.log("completedPreBillDays", completedPreBillDays);

    this.preBillDays = completedPreBillDays;
  }

  generateDueBillDaysForAllTerms(): void {
    // we need to fill the gaps between the periods with due-bill days
    // anything that is defined before first term will use default due-bill days
    // any gaps between terms will use previously defined due-bill days

    const completedDueDayBillDays: BillDueDaysConfiguration[] = [];
    for (let dueBillDay of this.dueBillDays) {
      completedDueDayBillDays[dueBillDay.termNumber - 1] = dueBillDay;
    }

    let lastUserDefinedTerm = this.dueBillDays[0];
    for (let i = 0; i < this.term; i++) {
      if (!completedDueDayBillDays[i]) {
        if (lastUserDefinedTerm.termNumber - 1 > i) {
          completedDueDayBillDays[i] = { termNumber: i + 1, daysDueAfterPeriodEnd: this.defaultBillDueDaysAfterPeriodEndConfiguration };
        } else {
          completedDueDayBillDays[i] = { termNumber: i + 1, daysDueAfterPeriodEnd: lastUserDefinedTerm.daysDueAfterPeriodEnd };
        }
      }
      lastUserDefinedTerm = completedDueDayBillDays[i];
    }

    // console.log("completedDueBillDays", completedDueDayBillDays);

    this.dueBillDays = completedDueDayBillDays;
  }

  calculateAPR(): Decimal {
    // Group repayments by period number, summing up principal and interest
    const paymentsMap = new Map<number, { principal: Decimal; interest: Decimal; paymentDate: Date }>();

    for (const schedule of this.repaymentSchedule) {
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
    if (!this.startDate.isSame(this.rateSchedules[0].startDate, "day")) {
      throw new Error(`Invalid schedule rates: The start date (${this.startDate.format("YYYY-MM-DD")}) does not match the first rate schedule start date (${this.rateSchedules[0].startDate.format("YYYY-MM-DD")}).`);
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.rateSchedules[this.rateSchedules.length - 1].endDate, "day")) {
      throw new Error(
        `Invalid schedule rates: The end date (${this.endDate.format("YYYY-MM-DD")}) does not match the last rate schedule end date (${this.rateSchedules[this.rateSchedules.length - 1].endDate.format("YYYY-MM-DD")}).`
      );
    }

    // verify that rate is not negative
    for (let rate of this.rateSchedules) {
      if (rate.annualInterestRate.isNegative()) {
        throw new Error("Invalid annual interest rate, value cannot be negative");
      }
    }

    // verify that rate is not greater than 100% unless explicitly allowed
    for (let rate of this.rateSchedules) {
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
    if (!this.startDate.isSame(this.periodsSchedule[0].startDate, "day")) {
      throw new Error("Invalid schedule periods, start date does not match the loan start date");
    }

    // Check if the end date of the last period is the same as the loan end date
    if (!this.endDate.isSame(this.periodsSchedule[this.periodsSchedule.length - 1].endDate, "day")) {
      throw new Error("Invalid schedule periods, end date does not match the loan end date");
    }

    for (let i = 0; i < this.periodsSchedule.length - 1; i++) {
      // Check if the periods are in ascending order
      if (!this.periodsSchedule[i].endDate.isSame(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are not in ascending order");
      }
      // Check if the periods are non-overlapping
      if (this.periodsSchedule[i].endDate.isAfter(this.periodsSchedule[i + 1].startDate, "day")) {
        throw new Error("Invalid schedule periods, periods are overlapping");
      }
    }
  }

  /**
   * Generate schedule periods based on the term and start date.
   */

  generatePeriodicSchedule(): void {
    let startDate = this.startDate;
    for (let i = 0; i < this.term; i++) {
      let endDate: Dayjs;
      const isStartDateLastDayOfMonth = startDate.isSame(startDate.endOf("month"), "day");

      if (i === 0 && this.firstPaymentDate) {
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
        const changePaymentDate = this.changePaymentDates.find((changePaymentDate) => changePaymentDate.termNumber === i + 1);
        if (changePaymentDate) {
          endDate = changePaymentDate.newDate.startOf("day");
        }
      }
      this.periodsSchedule.push({ startDate, endDate });
      startDate = endDate;
    }

    // Ensure the final period ends on the loan's end date
    this.periodsSchedule[this.periodsSchedule.length - 1].endDate = this.endDate;
  }

  /**
   * Generate schedule rates based on the term and start date.
   */

  generateRatesSchedule(): void {
    let startDate = this.startDate;
    const endDate = this.endDate;
    this.rateSchedules.push({ annualInterestRate: this.annualInterestRate, startDate, endDate });
  }

  /**
   * Prints the amortization schedule to the console.
   */
  printShortAmortizationSchedule(): void {
    const amortization = this.generateSchedule();
    console.table(
      amortization.map((row) => {
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
      amortization.map((row) => {
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

    for (let rate of this.rateSchedules) {
      if (startDate.isBefore(rate.endDate) && endDate.isSameOrAfter(rate.startDate)) {
        const effectiveStartDate = startDate.isAfter(rate.startDate) ? startDate : rate.startDate;
        const effectiveEndDate = endDate.isBefore(rate.endDate) ? endDate : rate.endDate;
        rates.push({ annualInterestRate: rate.annualInterestRate, startDate: effectiveStartDate, endDate: effectiveEndDate });
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
      const splitRates: RateSchedule[] = [];
      // we will split the rates into smaller schedules based on the month
      for (let rate of rates) {
        const startDate = rate.startDate;
        const endDate = rate.endDate;
        let currentDate = startDate;
        while (currentDate.isSameOrBefore(endDate)) {
          const lastDayOfMonth = currentDate.endOf("month");
          const effectiveEndDate = endDate.isBefore(lastDayOfMonth) ? endDate : lastDayOfMonth.add(1, "day");
          splitRates.push({ annualInterestRate: rate.annualInterestRate, startDate: currentDate.startOf("day"), endDate: effectiveEndDate.startOf("day") });
          currentDate = lastDayOfMonth.add(1, "day");
        }
      }
      return splitRates;
    } else {
      throw new Error(`Invalid per diem calculation type, getInterestRatesBetweenDates is not implemented for ${this.perDiemCalculationType}`);
    }
  }

  getTermPaymentAmount(termNumber: number): Currency {
    if (this.termPaymentAmountOverride.length > 0) {
      const term = this.termPaymentAmountOverride.find((term) => term.termNumber === termNumber);
      if (term) {
        return term.paymentAmount;
      }
    }
    return this.equitedMonthlyPayment;
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
    for (let modification of this.balanceModifications) {
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
              modifiedBalance = Currency.Zero();
              modificationAmount = modification.amount.subtract(exess);
              modification.usedAmount = modificationAmount;
            } else {
              modificationAmount = modification.amount.isZero() ? Currency.Zero() : modification.amount.negated();
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
      balances.push({ balance, startDate, endDate, modificationAmount: Currency.Zero() });
    } else {
      // if we have modifications, we will add the last balance to the end of the range
      balances.push({ balance: balances[balances.length - 1].balance, startDate: balances[balances.length - 1].endDate, endDate, modificationAmount: Currency.Zero() });

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

  /**
   * Generates the amortization schedule.
   * @returns An array of AmortizationSchedule entries.
   */
  generateSchedule(): AmortizationEntry[] {
    this.balanceModifications.forEach((modification) => {
      modification.resetUsedAmount();
    });

    this.earlyRepayment = false;
    const schedule: AmortizationEntry[] = [];
    let startBalance = this.totalLoanAmount;
    let termIndex = 0;
    for (let term of this.periodsSchedule) {
      if (this.earlyRepayment === true) {
        break;
      }
      termIndex++;

      const periodStartDate = term.startDate;
      const periodEndDate = term.endDate;
      const preBillDaysConfiguration = this.preBillDays[termIndex - 1].preBillDays;
      const dueBillDaysConfiguration = this.dueBillDays[termIndex - 1].daysDueAfterPeriodEnd;
      const billOpenDate = periodEndDate.subtract(preBillDaysConfiguration, "day");
      const billDueDate = periodEndDate.add(dueBillDaysConfiguration, "day");
      const fixedMonthlyPayment = this.getTermPaymentAmount(termIndex);
      let billedInterestForTerm = Currency.Zero();

      const loanBalancesInAPeriod = this.getModifiedBalance(periodStartDate, periodEndDate, startBalance);
      const lastBalanceInPeriod = loanBalancesInAPeriod.length;
      let currentBalanceIndex = 0;
      //console.log(`Term ${termIndex} has ${loanBalancesInAPeriod.length} balances, lastBalanceInPeriod: ${lastBalanceInPeriod}`);
      for (let periodStartBalance of loanBalancesInAPeriod) {
        if (this.earlyRepayment === true) {
          break;
        }
        currentBalanceIndex++;
        // console.log(`Term: ${termIndex} currentBalanceIndex: ${currentBalanceIndex}, lastBalanceInPeriod: ${lastBalanceInPeriod}`);

        const periodRates = this.getInterestRatesBetweenDates(periodStartBalance.startDate, periodStartBalance.endDate);
        //console.log(`PeriodRates: termIndex: ${termIndex}`, periodRates);
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

          // if (daysInPeriod === 0) {
          //   continue;
          // }

          const interestCalculator = new InterestCalculator(interestRateForPeriod.annualInterestRate, this.calendar.calendarType, this.perDiemCalculationType, interestRateForPeriod.startDate.daysInMonth());

          let interestForPeriod: Currency;
          if (interestRateForPeriod.annualInterestRate.isZero()) {
            interestForPeriod = Currency.Zero();
          } else {
            interestForPeriod = interestCalculator.calculateInterestForDays(startBalance, daysInPeriod);
          }

          // Handle unbilled interest due to rounding error if applicable
          if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD) {
            if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
              interestForPeriod = interestForPeriod.add(this.unbilledInterestDueToRounding);
              metadata.unbilledInterestApplied = true;
              metadata.unbilledInterestAppliedAmount = this.unbilledInterestDueToRounding.toNumber();
              this.unbilledInterestDueToRounding = Currency.Zero();
            }
          }

          const accruedInterestForPeriod = interestForPeriod;
          const roundedAccruedInterestForPeriod = this.round(accruedInterestForPeriod);

          let appliedDeferredInterest = Currency.of(0);
          if (this.unbilledDeferredInterest.getValue().greaterThan(0)) {
            interestForPeriod = interestForPeriod.add(this.unbilledDeferredInterest);

            metadata.deferredInterestAppliedAmount = this.unbilledDeferredInterest.toNumber();
            appliedDeferredInterest = this.unbilledDeferredInterest;
            this.unbilledDeferredInterest = Currency.Zero();
          }

          let roundedInterest = this.round(interestForPeriod);

          let interestRoundingError = roundedInterest.getRoundingErrorAsCurrency();

          if (!interestRoundingError.getValue().isZero()) {
            metadata.unbilledInterestAmount = interestRoundingError.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(interestRoundingError);
          }

          billedInterestForTerm = billedInterestForTerm.add(interestForPeriod);

          //console.log(`Term: ${termIndex} CurrentBalanceIndex: ${currentBalanceIndex}, LastBalanceInPeriod: ${lastBalanceInPeriod} and CurrentRate: ${currentRate}, LastRateInPeriod: ${lastRateInPeriod}`);
          if (currentRate !== lastRateInPeriod || currentBalanceIndex !== lastBalanceInPeriod) {
            //console.log(`adding split period for term ${termIndex}`);
            // Handle split periods (non-billable periods)
            const endBalance = periodStartBalance.balance;
            schedule.push(
              new AmortizationEntry({
                term: termIndex,
                billablePeriod: false,
                periodStartDate: interestRateForPeriod.startDate,
                periodEndDate: interestRateForPeriod.endDate,
                periodInterestRate: interestRateForPeriod.annualInterestRate,
                principal: Currency.of(0),
                // interest values
                dueInterestForTerm: Currency.of(0),
                accruedInterestForPeriod: roundedAccruedInterestForPeriod,
                billedInterestForTerm: billedInterestForTerm,
                billedDeferredInterest: appliedDeferredInterest,
                unbilledTotalDeferredInterest: this.unbilledDeferredInterest,
                unbilledInterestDueToRounding: this.unbilledInterestDueToRounding,
                // fees
                fees: Currency.of(0),
                billedDeferredFees: Currency.of(0),
                unbilledTotalDeferredFees: Currency.of(0),
                // dates
                periodBillOpenDate: billOpenDate,
                periodBillDueDate: billDueDate,
                billDueDaysAfterPeriodEndConfiguration: dueBillDaysConfiguration,
                prebillDaysConfiguration: preBillDaysConfiguration,
                interestRoundingError: roundedInterest.getRoundingErrorAsCurrency(),
                balanceModificationAmount: periodStartBalance.modificationAmount,
                balanceModification: periodStartBalance.balanceModification,
                endBalance: Currency.of(endBalance),
                startBalance: Currency.of(startBalance),
                totalPayment: Currency.of(0),
                perDiem: accruedInterestForPeriod.divide(daysInPeriod || 1),
                daysInPeriod: daysInPeriod,
                metadata,
              })
            );
            startBalance = endBalance;
            continue;
          }

          // Calculate fees
          const { totalFees: totalFeesBeforePrincipal, feesAfterPrincipal } = this.calculateFeesForPeriod(
            termIndex,
            null, // We don't have principal yet
            billedInterestForTerm,
            fixedMonthlyPayment
          );

          // Corrected code starts here

          // Calculate available amount for interest and principal
          let availableForInterestAndPrincipal = fixedMonthlyPayment.subtract(totalFeesBeforePrincipal);

          let dueInterestForTerm: Currency;
          let deferredInterestFromCurrentPeriod: Currency;
          let totalFeesAfterPrincipal: Currency;
          let billedDeferredFees: Currency = Currency.Zero();
          let principal: Currency;
          let totalFees: Currency;
          let totalPayment: Currency;

          // Handle cases where fees exceed the payment
          if (availableForInterestAndPrincipal.getValue().isNegative()) {
            principal = Currency.Zero();
            dueInterestForTerm = Currency.Zero();
            const unpaidFees = availableForInterestAndPrincipal.abs();
            metadata.amountAddedToDeferredFees = unpaidFees.toNumber();
            this.unbilledDeferredFees = this.unbilledDeferredFees.add(unpaidFees);

            let paidFeesThisPeriod = totalFeesBeforePrincipal.subtract(unpaidFees);
            // it is possible that some part of the fees is deferred
            // we will check if total fees minus unpaid fees is greater than zero
            // if it is, we will set total fees to that value
            // otherwise we will set it to zero
            if (paidFeesThisPeriod.greaterThan(0)) {
              totalFees = paidFeesThisPeriod;
            } else {
              totalFees = Currency.Zero();
            }

            deferredInterestFromCurrentPeriod = roundedAccruedInterestForPeriod;
            this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
          } else {
            if (availableForInterestAndPrincipal.greaterThanOrEqualTo(billedInterestForTerm)) {
              // Can pay all interest
              dueInterestForTerm = billedInterestForTerm;
              principal = availableForInterestAndPrincipal.subtract(billedInterestForTerm);
              deferredInterestFromCurrentPeriod = Currency.Zero();
            } else {
              // Cannot pay all interest
              dueInterestForTerm = availableForInterestAndPrincipal;
              principal = Currency.Zero();
              deferredInterestFromCurrentPeriod = billedInterestForTerm.subtract(dueInterestForTerm);
              this.unbilledDeferredInterest = this.unbilledDeferredInterest.add(deferredInterestFromCurrentPeriod);
            }

            // Calculate fees after principal if any
            if (feesAfterPrincipal.length > 0) {
              let totalPercentage = feesAfterPrincipal.reduce((sum, fee) => sum.add(fee.percentage!), new Decimal(0));
              totalFeesAfterPrincipal = principal.multiply(totalPercentage);
            } else {
              totalFeesAfterPrincipal = Currency.Zero();
            }

            totalFees = totalFeesBeforePrincipal.add(totalFeesAfterPrincipal);
          }

          // Ensure total payment does not exceed fixed monthly payment
          totalPayment = dueInterestForTerm.add(principal).add(totalFees);
          if (totalPayment.greaterThan(fixedMonthlyPayment)) {
            // Adjust principal
            principal = principal.subtract(totalPayment.subtract(fixedMonthlyPayment));
            if (principal.getValue().isNegative()) {
              principal = Currency.Zero();
            }
            totalPayment = fixedMonthlyPayment;
          }

          // Corrected code ends here

          const balanceBeforePayment = Currency.of(startBalance);
          const balanceAfterPayment = startBalance.subtract(principal);

          // Update cumulative interest
          this.totalChargedInterestRounded = this.totalChargedInterestRounded.add(dueInterestForTerm);
          this.totalChargedInterestUnrounded = this.totalChargedInterestUnrounded.add(dueInterestForTerm);

          if (dueInterestForTerm.getValue().isZero() && interestForPeriod.getValue().greaterThan(0) && availableForInterestAndPrincipal.getValue().greaterThan(0)) {
            metadata.interestLessThanOneCent = true;
            metadata.actualInterestValue = dueInterestForTerm.toNumber();
            this.unbilledInterestDueToRounding = this.unbilledInterestDueToRounding.add(dueInterestForTerm);
          }

          metadata.amountAddedToDeferredInterest = deferredInterestFromCurrentPeriod.toNumber();

          startBalance = balanceAfterPayment;

          schedule.push(
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
              // fees
              fees: totalFees,
              billedDeferredFees: billedDeferredFees,
              unbilledTotalDeferredFees: this.unbilledDeferredFees,
              // interest values
              dueInterestForTerm: dueInterestForTerm,
              accruedInterestForPeriod: accruedInterestForPeriod,
              billedDeferredInterest: appliedDeferredInterest,
              billedInterestForTerm: billedInterestForTerm,
              balanceModificationAmount: periodStartBalance.modificationAmount,
              endBalance: balanceAfterPayment,
              startBalance: balanceBeforePayment,
              totalPayment: totalPayment,
              perDiem: accruedInterestForPeriod.divide(daysInPeriod),
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

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      if (!lastPayment) {
        console.error(`Last payment is not defined`, schedule);
        throw new Error("Last payment is not defined");
      }
      lastPayment.principal = lastPayment.principal.add(startBalance);
      lastPayment.totalPayment = lastPayment.principal.add(lastPayment.accruedInterestForPeriod).add(lastPayment.fees);
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = lastPayment.accruedInterestForPeriod.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term)));
      lastPayment.metadata.finalAdjustment = true;
    }

    // Apply unbilled interest due to rounding at the end if applicable
    if (this.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_END) {
      if (this.unbilledInterestDueToRounding.getValue().abs().greaterThanOrEqualTo(this.flushThreshold.getValue())) {
        const lastPayment = schedule[schedule.length - 1];
        const adjustedInterest = lastPayment.accruedInterestForPeriod.add(this.unbilledInterestDueToRounding);
        const adjustedInterestRounded = this.round(adjustedInterest);
        if (adjustedInterest.getValue().greaterThanOrEqualTo(0)) {
          lastPayment.accruedInterestForPeriod = adjustedInterestRounded;
          //   lastPayment.unroundedInterestForPeriod = adjustedInterest;
          lastPayment.interestRoundingError = adjustedInterestRounded.getRoundingErrorAsCurrency();
          lastPayment.totalPayment = lastPayment.principal.add(lastPayment.accruedInterestForPeriod).add(lastPayment.fees);
          lastPayment.metadata.unbilledInterestApplied = true;
          lastPayment.metadata.unbilledInterestAmount = this.unbilledInterestDueToRounding.toNumber();
        }
      }
    }

    this.repaymentSchedule = schedule;
    return schedule;
  }

  getPeriodByDate(date: Dayjs): AmortizationEntry {
    // find period where passed date is between period start and end date
    return this.repaymentSchedule.find((period) => date.isBetween(period.periodStartDate, period.periodEndDate, null, "[]"))!;
  }

  getAccruedInterestByDate(date: Dayjs | Date): Currency {
    if (date instanceof Date) {
      date = dayjs(date);
    }
    date = date.startOf("day");

    // first we get the period where the date is
    const activePeriod = this.getPeriodByDate(date);

    if (!activePeriod) {
      return Currency.Zero();
    }
    // next we get amortization entries with same period number and end date is same or before active period
    const amortizationEntries = this.repaymentSchedule.filter((entry) => entry.term === activePeriod.term && entry.periodEndDate.isSameOrBefore(activePeriod.periodStartDate));
    // sum up accrued interest for those entries
    let accruedInterest = Currency.Zero();
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

  /**
   * Generates the TILA disclosures for the loan.
   * @returns An object containing all the TILA-required fields.
   */
  generateTILADisclosures(): TILADisclosures {
    // Ensure the amortization schedule is generated
    const schedule = this.repaymentSchedule;

    if (schedule.length === 0) {
      throw new Error("Amortization schedule is empty. Please generate the amortization schedule before generating TILA disclosures.");
    }

    // Amount Financed: The net amount of credit provided to the borrower
    const amountFinanced = this.loanAmount.subtract(this.originationFee);

    // Total of Payments: The total amount the borrower will have paid after making all scheduled payments
    const totalOfPayments = schedule.reduce((sum, payment) => {
      if (payment.billablePeriod) {
        return sum.add(payment.totalPayment);
      }
      return sum;
    }, Currency.Zero());

    // Finance Charge: The total cost of credit as a dollar amount
    // Finance Charge = Total of Payments - Amount Financed
    const financeCharge = totalOfPayments.subtract(amountFinanced);

    // Annual Percentage Rate (APR): Already calculated in the class
    const annualPercentageRate = this.apr;

    // Payment Schedule: Details of each payment
    const paymentSchedule: PaymentScheduleEntry[] = schedule
      .filter((payment) => payment.billablePeriod)
      .map((payment) => ({
        paymentNumber: payment.term,
        paymentDate: payment.periodEndDate,
        paymentAmount: payment.totalPayment,
        principal: payment.principal,
        interest: payment.accruedInterestForPeriod,
        balance: payment.endBalance,
      }));

    return {
      amountFinanced,
      financeCharge,
      totalOfPayments,
      annualPercentageRate,
      paymentSchedule,
    };
  }

  /**
   * Generates a formatted TILA disclosure document as a string.
   * @returns A string containing the formatted TILA disclosure document.
   */
  printTILADocument(): string {
    const tilaDisclosures = this.generateTILADisclosures();

    // Format numbers and dates
    const formatCurrency = (value: Currency): string => `$${value.toCurrencyString()}`;
    const formatPercentage = (value: Decimal): string => `${value.toFixed(2)}%`;
    const formatDate = (date: Dayjs): string => date.format("MM/DD/YYYY");

    // Build the document string
    let document = "";
    document += "TRUTH IN LENDING DISCLOSURE STATEMENT\n";
    document += "-------------------------------------\n\n";

    document += `ANNUAL PERCENTAGE RATE (APR): ${formatPercentage(tilaDisclosures.annualPercentageRate)}\n`;
    document += `Finance Charge: ${formatCurrency(tilaDisclosures.financeCharge)}\n`;
    document += `Amount Financed: ${formatCurrency(tilaDisclosures.amountFinanced)}\n`;
    document += `Total of Payments: ${formatCurrency(tilaDisclosures.totalOfPayments)}\n\n`;

    document += "PAYMENT SCHEDULE:\n";
    document += "-----------------------------------------------------------\n";
    document += "Payment No. | Payment Date | Payment Amount | Principal | Interest | Balance\n";
    document += "------------|--------------|----------------|-----------|----------|----------\n";

    tilaDisclosures.paymentSchedule.forEach((payment) => {
      document += `${payment.paymentNumber.toString().padStart(11)} | `;
      document += `${formatDate(payment.paymentDate).padEnd(12)} | `;
      document += `${formatCurrency(payment.paymentAmount).padStart(14)} | `;
      document += `${formatCurrency(payment.principal).padStart(9)} | `;
      document += `${formatCurrency(payment.interest).padStart(8)} | `;
      document += `${formatCurrency(payment.balance).padStart(8)}\n`;
    });

    document += "-----------------------------------------------------------\n";

    return document;
  }

  public exportRepaymentScheduleToCSV(): string {
    // Step 1: Collect all unique metadata keys
    const metadataKeys = new Set<string>();
    this.repaymentSchedule.forEach((entry) => {
      Object.keys(entry.metadata).forEach((key) => {
        metadataKeys.add(key);
      });
    });

    // Convert the Set to an Array for easier handling
    const metadataKeysArray = Array.from(metadataKeys);

    // Step 2: Define the fields array, including metadata fields
    const fields = [
      {
        header: "Term",
        value: (entry: AmortizationEntry) => entry.term,
      },
      {
        header: "Period Start Date",
        value: (entry: AmortizationEntry) => entry.periodStartDate.format("YYYY-MM-DD"),
      },
      {
        header: "Period End Date",
        value: (entry: AmortizationEntry) => entry.periodEndDate.format("YYYY-MM-DD"),
      },
      {
        header: "Bill Open Date",
        value: (entry: AmortizationEntry) => entry.periodBillOpenDate.format("YYYY-MM-DD"),
      },
      {
        header: "Bill Due Date",
        value: (entry: AmortizationEntry) => entry.periodBillDueDate.format("YYYY-MM-DD"),
      },
      {
        header: "Period Interest Rate",
        value: (entry: AmortizationEntry) => entry.periodInterestRate.toString(),
      },
      {
        header: "Principal",
        value: (entry: AmortizationEntry) => entry.principal.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Fees",
        value: (entry: AmortizationEntry) => entry.fees.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Billed Deferred Fees",
        value: (entry: AmortizationEntry) => entry.billedDeferredFees.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Unbilled Total Deferred Fees",
        value: (entry: AmortizationEntry) => entry.unbilledTotalDeferredFees.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Due Interest For Term",
        value: (entry: AmortizationEntry) => entry.dueInterestForTerm.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Accrued Interest For Period",
        value: (entry: AmortizationEntry) => entry.accruedInterestForPeriod.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Billed Deferred Interest",
        value: (entry: AmortizationEntry) => entry.billedDeferredInterest.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Billed Interest For Term",
        value: (entry: AmortizationEntry) => entry.billedInterestForTerm.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Balance Modification Amount",
        value: (entry: AmortizationEntry) => entry.balanceModificationAmount.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "End Balance",
        value: (entry: AmortizationEntry) => entry.endBalance.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Start Balance",
        value: (entry: AmortizationEntry) => entry.startBalance.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Total Payment",
        value: (entry: AmortizationEntry) => entry.totalPayment.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Per Diem",
        value: (entry: AmortizationEntry) => entry.perDiem.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Days In Period",
        value: (entry: AmortizationEntry) => entry.daysInPeriod,
      },
      {
        header: "Unbilled Total Deferred Interest",
        value: (entry: AmortizationEntry) => entry.unbilledTotalDeferredInterest.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Interest Rounding Error",
        value: (entry: AmortizationEntry) => entry.interestRoundingError.getRoundedValue(this.roundingPrecision),
      },
      {
        header: "Unbilled Interest Due To Rounding",
        value: (entry: AmortizationEntry) => entry.unbilledInterestDueToRounding.getRoundedValue(this.roundingPrecision),
      },
      // Step 3: Add metadata fields dynamically
      ...metadataKeysArray.map((key) => ({
        header: `Metadata.${key}`,
        value: (entry: AmortizationEntry) => {
          const value = entry.metadata[key as keyof AmortizationScheduleMetadata];
          // Handle different types of metadata values
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
          }
          return value !== undefined ? value : "";
        },
      })),
    ];

    // Helper function to escape CSV fields
    const escapeCSVField = (field: any): string => {
      let str = String(field);
      if (str.includes('"')) {
        str = str.replace(/"/g, '""');
      }
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    // Generate the header row
    const headerRow = fields.map((field) => field.header).join(",");

    // Generate the data rows
    const dataRows = this.repaymentSchedule.map((entry) => {
      const row = fields.map((field) => escapeCSVField(field.value(entry)));
      return row.join(",");
    });

    // Combine the header and data rows
    const csvContent = [headerRow, ...dataRows].join("\n");

    return csvContent;
  }

  /**
   * Generates TypeScript code to recreate this Amortization instance.
   * @returns A string containing the TypeScript code.
   */
  public toCode(): string {
    // Helper functions to serialize special types
    const serializeCurrency = (currency: Currency | number): string => {
      if (currency instanceof Currency) {
        return `Currency.of(${currency.toNumber()})`;
      } else {
        return `Currency.of(${currency})`;
      }
    };

    const serializeDecimal = (decimal: Decimal | number): string => {
      if (decimal instanceof Decimal) {
        return `new Decimal(${decimal.toString()})`;
      } else {
        return `new Decimal(${decimal})`;
      }
    };

    const serializeDayjs = (date: dayjs.Dayjs | Date | string): string => {
      const dateStr = dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : dayjs(date).format("YYYY-MM-DD");
      return `dayjs('${dateStr}')`;
    };

    const serializeAny = (value: any): string => {
      return JSON.stringify(value);
    };

    // Serialize arrays of special types
    const serializeArray = <T>(arr: T[], serializer: (item: T) => string): string => {
      return `[${arr.map(serializer).join(", ")}]`;
    };

    // Serialize the input parameters
    const serializeParams = (params: AmortizationParams): string => {
      const lines = [];

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue; // Skip undefined or null values
        }

        let serializedValue: string;

        switch (key) {
          case "loanAmount":
          case "originationFee":
          case "flushThreshold":
            serializedValue = serializeCurrency(value as Currency | number);
            break;

          case "annualInterestRate":
            serializedValue = serializeDecimal(value as Decimal | number);
            break;

          case "startDate":
          case "endDate":
          case "firstPaymentDate":
            serializedValue = serializeDayjs(value as Date | string);
            break;

          case "calendarType":
            serializedValue = `CalendarType.${value as CalendarType}`;
            break;

          case "roundingMethod":
            serializedValue = `RoundingMethod.${value as RoundingMethod}`;
            break;

          case "termPeriodDefinition":
            serializedValue = `{
    unit: '${(value as TermPeriodDefinition).unit}',
    count: ${serializeArray((value as TermPeriodDefinition).count, (item) => item.toString())}
  }`;
            break;

          case "balanceModifications":
            serializedValue = serializeArray(value as BalanceModification[], (mod) => mod.toCode());
            break;

          // Handle other complex types as needed
          default:
            serializedValue = serializeAny(value);
        }

        lines.push(`  ${key}: ${serializedValue},`);
      }

      return lines.join("\n");
    };

    // Build the complete code string
    const code = `import { Amortization, AmortizationParams, CalendarType, RoundingMethod, Fee, TermPeriodDefinition } from './Amortization';
import { BalanceModification } from './BalanceModification';
import { Currency } from '../utils/Currency';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';

// Define the parameters for the loan
const params: AmortizationParams = {
${serializeParams(this._inputParams)}
};

// Create the Amortization instance
const amortization = new Amortization(params);
`;

    return code.trim();
  }

  public toTestCode(): string {
    return `
describe('Amortization Class', () => {
  let amortization: Amortization;

  beforeEach(() => {
    ${this.toCode()}
  });

  it('should initialize with correct parameters', () => {
    expect(amortization.loanAmount).toBeDefined();
    expect(amortization.annualInterestRate).toBeDefined();
    expect(amortization.term).toBeGreaterThan(0);
  });

  it('should calculate APR correctly', () => {
    const apr = amortization.apr;
    expect(apr).toBeInstanceOf(Decimal);
    expect(apr.greaterThan(0)).toBe(true);
  });

  it('should generate an amortization schedule', () => {
    const schedule = amortization.generateSchedule();
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[0].principal).toBeDefined();
    expect(schedule[0].interestRoundingError).toBeDefined();
  });
});
  `.trim();
  }

  /**
   * Serializes the Amortization instance into a JSON object.
   * @returns A JSON-compatible object representing the Amortization instance.
   */
  public toJSON(): any {
    return {
      loanAmount: this.loanAmount.toNumber(),
      originationFee: this.originationFee.toNumber(),
      totalLoanAmount: this.totalLoanAmount.toNumber(),
      annualInterestRate: this.annualInterestRate.toString(),
      term: this.term,
      preBillDays: this.preBillDays,
      dueBillDays: this.dueBillDays,
      defaultPreBillDaysConfiguration: this.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: this.defaultBillDueDaysAfterPeriodEndConfiguration,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      calendarType: this.calendar.calendarType,
      roundingMethod: this.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.flushUnbilledInterestRoundingErrorMethod,
      roundingPrecision: this.roundingPrecision,
      flushThreshold: this.flushThreshold.toNumber(),
      periodsSchedule: this.periodsSchedule.map((period) => ({
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
      })),
      rateSchedules: this.rateSchedules.map((rate) => ({
        annualInterestRate: rate.annualInterestRate.toString(),
        startDate: rate.startDate.toISOString(),
        endDate: rate.endDate.toISOString(),
      })),
      allowRateAbove100: this.allowRateAbove100,
      termPaymentAmountOverride: this.termPaymentAmountOverride,
      termPeriodDefinition: this.termPeriodDefinition,
      changePaymentDates: this.changePaymentDates,
      balanceModifications: this.balanceModifications.map((mod) => mod.toJSON()), // Assuming BalanceModification has a toJSON method
      perDiemCalculationType: this.perDiemCalculationType,
      billingModel: this.billingModel,
      feesPerTerm: Array.from(this.feesPerTerm.entries()),
      feesForAllTerms: this.feesForAllTerms,
      repaymentSchedule: this.repaymentSchedule.map((entry) => entry.toJSON()), // Assuming AmortizationEntry has a toJSON method
    };
  }

  /**
   * Recreates an Amortization instance from a JSON object.
   * @param json The JSON object representing an Amortization instance.
   * @returns A new Amortization instance.
   */
  public static fromJSON(json: any): Amortization {
    const params: AmortizationParams = {
      loanAmount: Currency.of(json.loanAmount),
      originationFee: json.originationFee ? Currency.of(json.originationFee) : undefined,
      annualInterestRate: new Decimal(json.annualInterestRate),
      term: json.term,
      preBillDays: json.preBillDays,
      dueBillDays: json.dueBillDays,
      defaultPreBillDaysConfiguration: json.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: json.defaultBillDueDaysAfterPeriodEndConfiguration,
      startDate: dayjs(json.startDate),
      endDate: json.endDate ? dayjs(json.endDate) : undefined,
      calendarType: json.calendarType,
      roundingMethod: json.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: json.flushUnbilledInterestRoundingErrorMethod,
      roundingPrecision: json.roundingPrecision,
      flushThreshold: Currency.of(json.flushThreshold),
      periodsSchedule: json.periodsSchedule.map((period: any) => ({
        startDate: dayjs(period.startDate),
        endDate: dayjs(period.endDate),
      })),
      ratesSchedule: json.rateSchedules.map((rate: any) => ({
        annualInterestRate: new Decimal(rate.annualInterestRate),
        startDate: dayjs(rate.startDate),
        endDate: dayjs(rate.endDate),
      })),
      allowRateAbove100: json.allowRateAbove100,
      termPaymentAmountOverride: json.termPaymentAmountOverride,
      termPeriodDefinition: json.termPeriodDefinition,
      changePaymentDates: json.changePaymentDates,
      balanceModifications: json.balanceModifications.map((mod: any) => BalanceModification.fromJSON(mod)),
      perDiemCalculationType: json.perDiemCalculationType,
      billingModel: json.billingModel,
      feesPerTerm: json.feesPerTerm,
      feesForAllTerms: json.feesForAllTerms,
    };

    const amortization = new Amortization(params);

    return amortization;
  }
}

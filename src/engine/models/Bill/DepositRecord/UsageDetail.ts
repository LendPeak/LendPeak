import { LocalDate } from '@js-joda/core';
import { Currency } from '../../../utils/Currency';
import { BalanceModification } from '../../Amortization/BalanceModification';
import { DateUtil } from '../../../utils/DateUtil';

export interface UsageDetailParams {
  billId: string;
  period: number;
  billDueDate: LocalDate | Date | string;
  allocatedPrincipal: Currency | number;
  allocatedInterest: Currency | number;
  allocatedFees: Currency | number;
  date: LocalDate | Date | string;
  daysLate?: number;
  daysEarly?: number;
  billFullySatisfiedDate?: LocalDate | Date | string;
  balanceModification?: BalanceModification;
  dsiInterestSavings?: number;
  dsiInterestPenalty?: number;
}

export class UsageDetail {
  billId: string;
  period: number;

  _billDueDate!: LocalDate;
  jsBillDueDate!: Date;

  _allocatedPrincipal!: Currency;
  jsAllocatedPrincipal!: number;

  _allocatedInterest!: Currency;
  jsAllocatedInterest!: number;

  _allocatedFees!: Currency;
  jsAllocatedFees!: number;

  _date!: LocalDate;
  jsDate!: Date;

  daysLate?: number;
  daysEarly?: number;

  _balanceModification?: BalanceModification;

  private _billFullySatisfiedDate?: LocalDate;
  jsBillFullySatisfiedDate?: Date;

  dsiInterestSavings?: number;
  dsiInterestPenalty?: number;

  constructor(params: UsageDetailParams) {
    this.billId = params.billId;
    this.period = params.period;
    this.billDueDate = params.billDueDate;
    this.allocatedPrincipal = Currency.of(params.allocatedPrincipal);
    this.allocatedInterest = Currency.of(params.allocatedInterest);
    this.allocatedFees = Currency.of(params.allocatedFees);
    this.date = params.date;
    this.daysLate = params.daysLate;
    this.daysEarly = params.daysEarly;

    if (params.billFullySatisfiedDate) {
      this.billFullySatisfiedDate = params.billFullySatisfiedDate;
    }

    if (params.balanceModification) {
      this.balanceModification = params.balanceModification;
    }

    this.dsiInterestSavings = params.dsiInterestSavings;
    this.dsiInterestPenalty = params.dsiInterestPenalty;
  }

  get balanceModification(): BalanceModification | undefined {
    return this._balanceModification;
  }

  set balanceModification(value: BalanceModification | undefined) {
    if (value && this._balanceModification) {
      if (value.id !== this._balanceModification.id) {
        throw new Error('Balance modification is already set and cannot be changed');
      }
    }
    if (value) {
      this._balanceModification = value instanceof BalanceModification ? value : new BalanceModification(value);
    } else {
      this._balanceModification = undefined;
    }
  }

  static rehydrateFromJSON(json: any): UsageDetail {
    return new UsageDetail({
      billId: json.billId,
      period: json.period,
      billDueDate: DateUtil.normalizeDate(json.billDueDate),
      allocatedPrincipal: json.allocatedPrincipal ? Currency.fromJSON(json.allocatedPrincipal) : Currency.Zero(),
      allocatedInterest: json.allocatedInterest ? Currency.fromJSON(json.allocatedInterest) : Currency.Zero(),
      allocatedFees: json.allocatedFees ? Currency.fromJSON(json.allocatedFees) : Currency.Zero(),
      date: DateUtil.normalizeDate(json.date),
      daysLate: json.daysLate,
      daysEarly: json.daysEarly,
      billFullySatisfiedDate: json.billFullySatisfiedDate
        ? DateUtil.normalizeDate(json.billFullySatisfiedDate)
        : undefined,
      dsiInterestSavings: json.dsiInterestSavings,
      dsiInterestPenalty: json.dsiInterestPenalty,
    });
  }

  get billDueDate(): LocalDate {
    return this._billDueDate;
  }

  set billDueDate(date: LocalDate | Date | string) {
    this._billDueDate = DateUtil.normalizeDate(date);
    this.jsBillDueDate = DateUtil.normalizeDateToJsDate(this._billDueDate);
  }

  get allocatedPrincipal(): Currency {
    return this._allocatedPrincipal;
  }

  set allocatedPrincipal(amount: Currency | number) {
    this._allocatedPrincipal = Currency.of(amount);
    this.jsAllocatedPrincipal = this._allocatedPrincipal.toNumber();
  }

  get allocatedInterest(): Currency {
    return this._allocatedInterest;
  }

  set allocatedInterest(amount: Currency | number) {
    this._allocatedInterest = Currency.of(amount);
    this.jsAllocatedInterest = this._allocatedInterest.toNumber();
  }

  get allocatedFees(): Currency {
    return this._allocatedFees;
  }

  set allocatedFees(amount: Currency | number) {
    this._allocatedFees = Currency.of(amount);
    this.jsAllocatedFees = this._allocatedFees.toNumber();
  }

  get date(): LocalDate {
    return this._date;
  }

  set date(date: LocalDate | Date | string) {
    this._date = DateUtil.normalizeDate(date);
    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
  }

  syncJSPropertiesFromValues(): void {
    this.jsBillDueDate = DateUtil.normalizeDateToJsDate(this.billDueDate);
    this.jsAllocatedPrincipal = this.allocatedPrincipal.toNumber();
    this.jsAllocatedInterest = this.allocatedInterest.toNumber();
    this.jsAllocatedFees = this.allocatedFees.toNumber();
    this.jsDate = DateUtil.normalizeDateToJsDate(this.date);

    if (this.billFullySatisfiedDate) {
      this.jsBillFullySatisfiedDate = DateUtil.normalizeDateToJsDate(this.billFullySatisfiedDate);
    }
  }

  syncValuesFromJSProperties(): void {
    this.billDueDate = this.jsBillDueDate;
    this.allocatedPrincipal = Currency.of(this.jsAllocatedPrincipal);
    this.allocatedInterest = Currency.of(this.jsAllocatedInterest);
    this.allocatedFees = Currency.of(this.jsAllocatedFees);
    this.date = this.jsDate;

    if (this.jsBillFullySatisfiedDate) {
      this.billFullySatisfiedDate = this.jsBillFullySatisfiedDate;
    }
  }

  get billFullySatisfiedDate(): LocalDate | undefined {
    return this._billFullySatisfiedDate;
  }

  set billFullySatisfiedDate(date: LocalDate | Date | string | undefined) {
    if (date) {
      this._billFullySatisfiedDate = DateUtil.normalizeDate(date);
      this.jsBillFullySatisfiedDate = DateUtil.normalizeDateToJsDate(this._billFullySatisfiedDate);
    } else {
      this._billFullySatisfiedDate = undefined;
      this.jsBillFullySatisfiedDate = undefined;
    }
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return {
      billId: this.billId,
      period: this.period,
      billDueDate: this.jsBillDueDate,
      allocatedPrincipal: this.jsAllocatedPrincipal,
      allocatedInterest: this.jsAllocatedInterest,
      allocatedFees: this.jsAllocatedFees,
      date: this.jsDate,
      daysLate: this.daysLate,
      daysEarly: this.daysEarly,
      billFullySatisfiedDate: this.jsBillFullySatisfiedDate,
      dsiInterestSavings: this.dsiInterestSavings,
      dsiInterestPenalty: this.dsiInterestPenalty,
    };
  }
}

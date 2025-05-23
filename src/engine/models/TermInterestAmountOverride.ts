import { Currency } from "../utils/Currency";
import { DateUtil } from "../utils/DateUtil";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { LocalDate, ChronoUnit } from "@js-joda/core";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export interface TermInterestAmountOverrideParams {
  termNumber: number;
  interestAmount: Currency | number;
  acceptableRateVariance?: number;
  date?: LocalDate | Date | string;
  active?: boolean;
}

export class TermInterestAmountOverride {
  private _termNumber!: number;
  jsTermNumber!: number;

  private _interestAmount!: Currency;
  jsInterestAmount!: number;

  private _active = true;
  jsActive: boolean = true;

  private _acceptableRateVariance = 0.01; // 1%
  jsAcceptableRateVariance = 0.01; // 1%

  _date?: LocalDate;
  jsDate?: Date;

  constructor(params: TermInterestAmountOverrideParams) {
    this.termNumber = params.termNumber;
    this.interestAmount = params.interestAmount;
    this.date = params.date;
    if (params.active !== undefined) {
      this.active = params.active;
    }

    if (params.acceptableRateVariance) {
      this.acceptableRateVariance = params.acceptableRateVariance;
    }
  }

  get acceptableRateVariance(): number {
    return this._acceptableRateVariance;
  }

  set acceptableRateVariance(value: number) {
    this._acceptableRateVariance = value;
    this.jsAcceptableRateVariance = value;
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
    this.jsActive = value;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
    this.jsTermNumber = value;
  }

  get date(): LocalDate | undefined {
    return this._date;
  }

  set date(value: LocalDate | Date | string | undefined) {
    if (value) {
      this._date = DateUtil.normalizeDate(value);
      this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
    } else {
      this._date = undefined;
      this.jsDate = undefined;
    }
  }

  get interestAmount(): Currency {
    return this._interestAmount;
  }

  set interestAmount(value: Currency | number) {
    this._interestAmount = new Currency(value);
    this.jsInterestAmount = this._interestAmount.toNumber();
  }

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.interestAmount = this.jsInterestAmount;
    this.date = this.jsDate;
    this.active = this.jsActive;
    this.acceptableRateVariance = this.jsAcceptableRateVariance;
  }

  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsInterestAmount = this.interestAmount.toNumber();
    if (this.date) {
      this.jsDate = DateUtil.normalizeDateToJsDate(this.date);
    } else {
      this.jsDate = undefined;
    }
    this.jsActive = this.active;
    this.jsAcceptableRateVariance = this.acceptableRateVariance;
  }

  get json(): TermInterestAmountOverrideParams {
    return {
      termNumber: this.termNumber,
      interestAmount: this.interestAmount.toNumber(),
      acceptableRateVariance: this.acceptableRateVariance,
      date: this.date?.toString(),
      active: this.active,
    };
  }
}

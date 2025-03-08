import { Currency } from "../utils/Currency";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export interface TermInterestAmountOverrideParams {
  termNumber: number;
  interestAmount: Currency | number;
  date?: Dayjs | Date;
  active?: boolean;
}

export class TermInterestAmountOverride {
  private _termNumber!: number;
  private _interestAmount!: Currency;
  private _active = true;
  jsTermNumber!: number;
  jsInterestAmount!: number;
  jsActive!: boolean;
  _date?: Dayjs;
  jsDate?: Date;

  constructor(params: TermInterestAmountOverrideParams) {
    this.termNumber = params.termNumber;
    this.interestAmount = params.interestAmount;
    this.date = params.date;
    if (params.active !== undefined) {
      this.active = params.active;
    }
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

  get date(): Dayjs | undefined {
    return this._date;
  }

  set date(value: Dayjs | Date | string | undefined) {
    if (value) {
      this._date = dayjs(value).startOf("day");
      this.jsDate = this._date.toDate();
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
  }

  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsInterestAmount = this.interestAmount.toNumber();
    this.jsDate = this.date?.toDate();
    this.jsActive = this.active;
  }

  get json(): TermInterestAmountOverrideParams {
    return {
      termNumber: this.termNumber,
      interestAmount: this.interestAmount.toNumber(),
      date: this.date?.toDate(),
      active: this.active,
    };
  }
}

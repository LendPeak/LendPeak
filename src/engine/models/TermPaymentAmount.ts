import { Currency, RoundingMethod } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { LargeNumberLike } from "crypto";
import Decimal from "decimal.js";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export interface TermPaymentAmountParams {
  termNumber: number;
  paymentAmount: Currency | number | Decimal | string;
}

export class TermPaymentAmount {
  private _termNumber!: number;
  jsTermNumber!: number;
  private _paymentAmount!: Currency;
  jsPaymentAmount!: number;
  private _modified?: boolean = false;

  constructor(params: TermPaymentAmountParams) {
    this.termNumber = params.termNumber;
    this.paymentAmount = params.paymentAmount;
    this.updateJsValues();
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsPaymentAmount = this.paymentAmount.toNumber();
  }

  updateModelValues() {
    // console.log("updateModelValues", this.jsTermNumber, this.jsPaymentAmount);
    this.termNumber = this.jsTermNumber;
    this.paymentAmount = Currency.of(this.jsPaymentAmount);
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this.modified = true;
    this._termNumber = value;
  }

  get paymentAmount(): Currency {
    return this._paymentAmount;
  }

  set paymentAmount(value: Currency | number | Decimal | string) {
    this.modified = true;
    // check type and inflate if necessary
    if (value instanceof Currency) {
      this._paymentAmount = value;
    } else {
      this._paymentAmount = new Currency(value);
    }
  }

  get json() {
    return {
      termNumber: this.termNumber,
      paymentAmount: this.paymentAmount.toNumber(),
    };
  }

  toJSON() {
    return this.json;
  }
}

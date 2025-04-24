/* TermPaymentAmount.ts */
import { Currency } from "../utils/Currency";
import { DateUtil } from "../utils/DateUtil";
import Decimal from "decimal.js";

export interface TermPaymentAmountParams {
  termNumber: number;
  paymentAmount: Currency | number | Decimal | string;
  /** optional – defaults to true */
  active?: boolean;
}

export class TermPaymentAmount {
  /* — model props — */
  private _termNumber!: number;
  private _paymentAmount!: Currency;
  private _active: boolean = true;

  /* — JS / binding props — */
  jsTermNumber!: number;
  jsPaymentAmount!: number;
  jsActive!: boolean;

  /* — misc — */
  private _modified = false;
  get modified(): boolean {
    return this._modified;
  }
  set modified(v: boolean) {
    this._modified = v;
  }

  /* ─────────────────────────────────────────── */
  constructor(params: TermPaymentAmountParams) {
    this.termNumber = params.termNumber;
    this.paymentAmount = params.paymentAmount;
    this.active = params.active ?? true;
    this.updateJsValues();
  }

  /* ===== active ===== */
  get active(): boolean {
    return this._active;
  }
  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
    this.modified = true;
  }

  /* ===== termNumber ===== */
  get termNumber(): number {
    return this._termNumber;
  }
  set termNumber(v: number) {
    this._termNumber = v;
    this.jsTermNumber = v;
    this.modified = true;
  }

  /* ===== paymentAmount ===== */
  get paymentAmount(): Currency {
    return this._paymentAmount;
  }
  set paymentAmount(v: Currency | number | Decimal | string) {
    this._paymentAmount = v instanceof Currency ? v : new Currency(v);
    this.jsPaymentAmount = this._paymentAmount.toNumber();
    this.modified = true;
  }

  /* ===== helpers ===== */
  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsPaymentAmount = this.paymentAmount.toNumber();
    this.jsActive = this.active;
  }

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.paymentAmount = this.jsPaymentAmount;
    this.active = this.jsActive;
  }

  /* ===== serialization ===== */
  get json(): TermPaymentAmountParams {
    return {
      termNumber: this.termNumber,
      paymentAmount: this.paymentAmount.toNumber(),
      active: this.active,
    };
  }
  toJSON() {
    return this.json;
  }
}

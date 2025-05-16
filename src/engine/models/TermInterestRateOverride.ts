import { Decimal } from "decimal.js";

export interface TermInterestRateOverrideParams {
  termNumber: number;
  interestRate: Decimal | number;
  active?: boolean;
}

export class TermInterestRateOverride {
  private _termNumber!: number;
  jsTermNumber!: number;

  private _interestRate!: Decimal;
  jsInterestRate!: number;

  private _active = true;
  jsActive = true;

  constructor(params: TermInterestRateOverrideParams) {
    this.termNumber = params.termNumber;
    this.interestRate = params.interestRate;
    if (params.active !== undefined) this.active = params.active;
  }

  /* ── active flag ─────────────────────────────────────────────── */

  get active(): boolean {
    return this._active;
  }
  set active(val: boolean) {
    this._active = val;
    this.jsActive = val;
  }

  /* ── term # ──────────────────────────────────────────────────── */

  get termNumber(): number {
    return this._termNumber;
  }
  set termNumber(val: number) {
    this._termNumber = val;
    this.jsTermNumber = val;
  }

  /* ── rate ────────────────────────────────────────────────────── */

  get interestRate(): Decimal {
    return this._interestRate;
  }

  set interestRate(val: Decimal | number) {
    if (!(val instanceof Decimal)) {
      val = new Decimal(val);
    }
    this._interestRate = val;
    this.jsInterestRate = val.toNumber();
  }

  /* ── sync helpers for Angular forms ─────────────────────────── */

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.interestRate = new Decimal(this.jsInterestRate);
    this.active = this.jsActive;
  }

  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsInterestRate = this.interestRate.toNumber();
    this.jsActive = this.active;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      interestRate: this.interestRate.toNumber(),
      active: this.active,
    };
  }
}

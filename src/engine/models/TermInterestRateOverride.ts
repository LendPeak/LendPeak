import { Decimal } from "decimal.js";

export class TermInterestRateOverride {
  _termNumber!: number;
  _interestRate!: Decimal;

  constructor(params: { termNumber: number; interestRate: Decimal }) {
    this.termNumber = params.termNumber;
    this.interestRate = params.interestRate;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
  }

  get interestRate(): Decimal {
    return this._interestRate;
  }

  set interestRate(value: Decimal) {
    this._interestRate = value;
  }
}

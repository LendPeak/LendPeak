import { Decimal } from "decimal.js";

export class TermInterestRateOverride {
  _termNumber!: number;
  _interestRate!: Decimal;
  jsTermNumber!: number;
  jsInterestRate!: number;

  constructor(params: { termNumber: number; interestRate: Decimal }) {
    this.termNumber = params.termNumber;
    this.interestRate = params.interestRate;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
    this.jsTermNumber = value;
  }

  get interestRate(): Decimal {
    return this._interestRate;
  }

  set interestRate(value: Decimal) {
    this._interestRate = value;
    this.jsInterestRate = this._interestRate.toNumber();
  }

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.interestRate = new Decimal(this.jsInterestRate);
  }

  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsInterestRate = this.interestRate.toNumber();
  }

  get json() {
    return {
      termNumber: this.termNumber,
      interestRate: this.interestRate.toNumber(),
    };
  }
}

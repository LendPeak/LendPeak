import { TermFees, FlatTermFees } from "./TermFees";

export interface FeesPerTermParams {
  termFees: TermFees[];
}

export class FeesPerTerm {
  private _termFees!: TermFees[];

  constructor(params: FeesPerTermParams) {
    this.termFees = params.termFees;
  }

  static empty() {
    return new FeesPerTerm({ termFees: [] });
  }

  get termFees(): TermFees[] {
    return this._termFees;
  }

  get all() {
    return this.termFees;
  }

  set termFees(value: TermFees[]) {
    if (!value || value.length === 0) {
      this._termFees = [];
      return;
    }
    // check type and inflate
    this._termFees = value.map((c) => {
      if (c instanceof TermFees) {
        return c;
      }
      return new TermFees(c);
    });
  }

  get json() {
    return this.termFees.map((termFee) => termFee.json);
  }

  get length() {
    return this.termFees.length;
  }

  getFeesForTerm(termNumber: number) {
    return this.termFees.find((termFee) => termFee.termNumber === termNumber)?.fees || [];
  }

  addFee(termFee: TermFees) {
    const termFees = this.termFees.find((termFee) => termFee.termNumber === termFee.termNumber);
    if (termFees) {
      termFee.fees.forEach((fee) => termFees.addFee(fee));
    } else {
      this.termFees.push(termFee);
    }
  }

  removeFeeById(feeId: string) {
    this.termFees.forEach((termFee) => termFee.removeFeeById(feeId));
  }

  removeAllFeesForTerm(termNumber: number) {
    this.termFees = this.termFees.filter((termFee) => termFee.termNumber !== termNumber);
  }

  get flatFeesPerTerm(): FlatTermFees[] {
    return this.termFees.flatMap((termFee) => termFee.flatTermFees);
  }
}

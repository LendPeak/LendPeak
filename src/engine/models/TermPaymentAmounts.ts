import { TermPaymentAmount } from "./TermPaymentAmount";

export class TermPaymentAmounts {
  private _paymentAmounts: TermPaymentAmount[] = [];
  private _modified: boolean = false;

  constructor(paymentAmounts: TermPaymentAmount[] = []) {
    this.paymentAmounts = paymentAmounts;
    this.updateJsValues();
  }
  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  get hasModified(): boolean {
    return this.modified || this._paymentAmounts.some((bm) => bm.modified);
  }

  resetModified() {
    this.modified = false;
    this._paymentAmounts.forEach((bm) => (bm.modified = false));
  }

  updateModelValues() {
    this._paymentAmounts.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._paymentAmounts.forEach((bm) => bm.updateJsValues());
  }

  get paymentAmounts(): TermPaymentAmount[] {
    return this._paymentAmounts;
  }

  set paymentAmounts(value: TermPaymentAmount[]) {
    this.modified = true;
    this._paymentAmounts = value.map((c) => {
      if (c instanceof TermPaymentAmount) {
        return c;
      }
      return new TermPaymentAmount(c);
    });
  }

  get all(): TermPaymentAmount[] {
    return this._paymentAmounts;
  }

  addPaymentAmount(paymentAmount: TermPaymentAmount) {
    this.modified = true;
    this._paymentAmounts.push(paymentAmount);
  }

  removePaymentAmountAtIndex(index: number) {
    this.modified = true;
    this._paymentAmounts.splice(index, 1);
  }

  get length(): number {
    return this._paymentAmounts.length;
  }

  atIndex(index: number): TermPaymentAmount {
    return this._paymentAmounts[index];
  }

  get first(): TermPaymentAmount {
    return this._paymentAmounts[0];
  }

  get last(): TermPaymentAmount {
    return this._paymentAmounts[this._paymentAmounts.length - 1];
  }

  getPaymentAmountForTerm(termNumber: number): TermPaymentAmount | undefined {
    return this._paymentAmounts.find((override) => override.termNumber === termNumber);
  }

  get json() {
    return this._paymentAmounts.map((override) => override.json);
  }

  toJSON() {
    return this.json;
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    return this._paymentAmounts.filter((val) => val.termNumber === termNumber).length > 1;
  }

  reSort() {
    this._paymentAmounts = this._paymentAmounts.sort((a, b) => {
      return a.termNumber < b.termNumber ? -1 : 1;
    });
  }
}

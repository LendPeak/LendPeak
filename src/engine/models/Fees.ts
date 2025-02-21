import Decimal from "decimal.js";
import { Fee } from "./Fee";

export class Fees {
  private _fees: Fee[] = [];

  constructor(fees: Fee[] = []) {
    this.fees = fees;
    this.updateJsValues();
  }

  updateModelValues() {
    this._fees.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._fees.forEach((bm) => bm.updateJsValues());
  }

  get fees(): Fee[] {
    return this._fees;
  }

  set fees(value: Fee[]) {
    // check type and inflate if necessary
    this._fees = value.map((c) => {
      if (c instanceof Fee) {
        return c;
      }
      return new Fee(c);
    });
  }

  get all(): Fee[] {
    return this._fees;
  }

  addFee(fee: Fee) {
    // check if fee is of correct type otherwise inflate
    if (!(fee instanceof Fee)) {
      fee = new Fee(fee);
    }
    this._fees.push(fee);
  }

  removeFeeAtIndex(index: number) {
    this._fees.splice(index, 1);
  }

  get length(): number {
    return this._fees.length;
  }

  atIndex(index: number): Fee {
    return this._fees[index];
  }

  get first(): Fee {
    return this._fees[0];
  }

  get last(): Fee {
    return this._fees[this._fees.length - 1];
  }

  get json() {
    return this._fees.map((bm) => bm.json);
  }
}

import Decimal from "decimal.js";
import { Currency } from "../utils/Currency";
import { Fee } from "./Fee";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type FeeType = "fixed" | "percentage";
export type FeeBasedOn = "interest" | "principal" | "totalPayment";

export interface FlatTermFees {
  termNumber: number;
  fee: Fee;
}

export interface TermFeesParams {
  termNumber: number;
  fees: Fee[];
}

export class TermFees {
  private _termNumber!: number;
  private _humanTermNumber!: number;
  jsTermNumber!: number;
  jsHumanTermNumber!: number;
  _fees!: Fee[];

  constructor(params: TermFeesParams) {
    this.termNumber = params.termNumber;
    this.fees = params.fees;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
    this.jsTermNumber = value;

    this._humanTermNumber = value + 1;
    this.jsHumanTermNumber = this._humanTermNumber;
  }

  set humanTermNumber(value: number) {
    this._termNumber = value - 1;
    this.jsTermNumber = this._termNumber;

    this._humanTermNumber = value;
    this.jsHumanTermNumber = this._humanTermNumber;
  }

  get humanTermNumber(): number {
    return this._humanTermNumber;
  }

  get fees(): Fee[] {
    return this.fees;
  }

  set fees(value: Fee[]) {
    this._fees = value;
  }

  get json() {
    return {
      termNumber: this.jsTermNumber,
      humanTermNumber: this.humanTermNumber,
      fees: this.fees.map((fee) => fee.json),
    };
  }

  addFee(fee: Fee) {
    this.fees.push(fee);
  }

  removeFeeById(id: string) {
    this.fees = this.fees.filter((fee) => fee.id !== id);
  }

  getFeeById(id: string) {
    return this.fees.find((fee) => fee.id === id);
  }

  syncJsToValues() {
    this.humanTermNumber = this.jsHumanTermNumber;
  }

  // returns flatten array of term fees
  get flatTermFees(): FlatTermFees[] {
    return this.fees.map((fee) => {
      return {
        termNumber: this.termNumber,
        fee: fee,
      };
    });
  }
}

import { Currency } from "../utils/Currency";
import { TermInterestAmountOverride } from "./TermInterestAmountOverride";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class TermInterestAmountOverrides {
  private _overrides: TermInterestAmountOverride[] = [];

  constructor(overrides: TermInterestAmountOverride[] = []) {
    this.overrides = overrides;
    this.updateJsValues();
  }

  updateModelValues() {
    this._overrides.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._overrides.forEach((bm) => bm.updateJsValues());
  }

  get overrides(): TermInterestAmountOverride[] {
    return this._overrides;
  }

  set overrides(value: TermInterestAmountOverride[]) {
    // check type and inflate if necessary
    this._overrides = value.map((c) => {
      if (c instanceof TermInterestAmountOverride) {
        return c;
      }
      return new TermInterestAmountOverride(c);
    });
  }

  get all(): TermInterestAmountOverride[] {
    return this._overrides;
  }

  get active(): TermInterestAmountOverride[] {
    return this._overrides.filter((bm) => bm.active);
  }

  deactivateAll() {
    this._overrides.forEach((bm) => (bm.active = false));
  }

  activateAll() {
    this._overrides.forEach((bm) => (bm.active = true));
  }

  addOverride(override: TermInterestAmountOverride) {
    this._overrides.push(override);
  }

  removeOverrideAtIndex(index: number) {
    this._overrides.splice(index, 1);
  }

  removeAllOverrides() {
    this._overrides = [];
  }

  get length(): number {
    return this._overrides.length;
  }

  atIndex(index: number): TermInterestAmountOverride {
    return this._overrides[index];
  }

  get first(): TermInterestAmountOverride {
    return this._overrides[0];
  }

  get last(): TermInterestAmountOverride {
    return this._overrides[this._overrides.length - 1];
  }

  get json() {
    return this._overrides.map((bm) => bm.json);
  }

  toJSON() {
    return this.json;
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    // detect if there are more than one override for the same term number
    return this._overrides.filter((bm) => bm.termNumber === termNumber).length > 1;
  }

  reSort() {
    this.updateModelValues();
    this._overrides = this._overrides.sort((a, b) => {
      return a.termNumber - b.termNumber;
    });
    this.updateJsValues();
  }
}

import { Decimal } from "decimal.js";
import { TermInterestRateOverride, TermInterestRateOverrideParams } from "./TermInterestRateOverride";

export class TermInterestRateOverrides {
  private _overrides: TermInterestRateOverride[] = [];

  constructor(overrides: (TermInterestRateOverride | TermInterestRateOverrideParams)[] = []) {
    this.overrides = overrides as TermInterestRateOverride[];
    this.updateJsValues();
  }

  updateModelValues() {
    this._overrides.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._overrides.forEach((bm) => bm.updateJsValues());
  }

  get overrides(): TermInterestRateOverride[] {
    return this._overrides || [];
  }

  set overrides(value: TermInterestRateOverride[]) {
    // check type and inflate if necessary
    this._overrides = value
      .map((c) => {
        if (c instanceof TermInterestRateOverride) {
          return c;
        }
        return new TermInterestRateOverride(c);
      })
      .sort((a, b) => a.termNumber - b.termNumber);
  }

  get all(): TermInterestRateOverride[] {
    return this._overrides;
  }
  get active(): TermInterestRateOverride[] {
    return this._overrides.filter((o) => o.active);
  }

  /* ── bulk toggles (UI header switch uses these) ─────────────── */

  deactivateAll() {
    this._overrides.forEach((o) => (o.active = false));
  }
  activateAll() {
    this._overrides.forEach((o) => (o.active = true));
  }

  addOverride(override: TermInterestRateOverride) {
    // check if override is of correct type oterhwise inflate
    if (!(override instanceof TermInterestRateOverride)) {
      override = new TermInterestRateOverride(override);
    }
    this._overrides.push(override);
    this.reSort();
  }

  removeOverrideAtIndex(index: number) {
    this._overrides.splice(index, 1);
    this.reSort();
  }

  get length(): number {
    return this._overrides.length;
  }

  atIndex(index: number): TermInterestRateOverride {
    return this._overrides[index];
  }

  get first(): TermInterestRateOverride {
    return this._overrides[0];
  }

  get last(): TermInterestRateOverride {
    return this._overrides[this._overrides.length - 1];
  }

  get json() {
    return this._overrides.map((override) => override.json);
  }

  toJSON() {
    return this.json;
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    return this._overrides.filter((override) => override.termNumber === termNumber).length > 1;
  }

  reSort() {
    this._overrides = this._overrides.sort((a, b) => a.termNumber - b.termNumber);
  }
}

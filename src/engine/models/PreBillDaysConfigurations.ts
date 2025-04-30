/* PreBillDaysConfigurations.ts */
import { PreBillDaysConfiguration } from "./PreBillDaysConfiguration";

export class PreBillDaysConfigurations {
  private _configurations: PreBillDaysConfiguration[] = [];

  constructor(configurations: PreBillDaysConfiguration[] = []) {
    this.configurations = configurations;
    this.updateJsValues();
  }

  /* model/UI helpers */
  updateModelValues() {
    this._configurations.forEach((c) => c.updateModelValues());
  }
  updateJsValues() {
    this._configurations.forEach((c) => c.updateJsValues());
  }

  /* collections */
  get configurations() {
    return this._configurations;
  }
  set configurations(v: PreBillDaysConfiguration[]) {
    this._configurations = v.map((c) => (c instanceof PreBillDaysConfiguration ? c : new PreBillDaysConfiguration(c)));
  }

  /** every entry, active or not */
  get all(): PreBillDaysConfiguration[] {
    return this._configurations;
  }

  /** custom **and** active */
  get allCustom(): PreBillDaysConfiguration[] {
    return this._configurations.filter((c) => c.type === "custom");
  }

  /** at least one *active* custom row? */
  get hasCustom(): boolean {
    return this._configurations.some((c) => c.type === "custom" && c.active);
  }

  /** every row that is flagged active, regardless of type */
  get allActive(): PreBillDaysConfiguration[] {
    return this._configurations.filter((c) => c.active);
  }

  /** only rows that are BOTH custom *and* active */
  get allCustomActive(): PreBillDaysConfiguration[] {
    return this._configurations.filter((c) => c.type === "custom" && c.active);
  }

  removeAllCustom() {
    this._configurations = this._configurations.filter((c) => c.type !== "custom");
  }

  /* activate / deactivate helpers */
  activateAll() {
    this._configurations.forEach((c) => (c.active = true));
  }
  deactivateAll() {
    this._configurations.forEach((c) => (c.active = false));
  }

  /* CRUD */
  addConfiguration(c: PreBillDaysConfiguration) {
    this._configurations.push(c);
  }
  removeConfigurationAtIndex(i: number) {
    this._configurations.splice(i, 1);
  }

  /* misc helpers */
  get length() {
    return this._configurations.length;
  }
  atIndex(i: number) {
    return i < 0 ? this.first : this._configurations[i];
  }
  get first() {
    return this._configurations[0];
  }
  get last() {
    return this._configurations[this._configurations.length - 1];
  }

  reSort(): void {
    this.all.sort((a, b) => a.termNumber - b.termNumber);
  }

  /* serialisation */
  get json() {
    return this.allCustom.map((c) => c.json);
  }
  toJSON() {
    return this.json;
  }
}

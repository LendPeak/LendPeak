import { BillDueDaysConfiguration } from "./BillDueDaysConfiguration";

export class BillDueDaysConfigurations {
  private _configurations: BillDueDaysConfiguration[] = [];

  constructor(configurations: BillDueDaysConfiguration[] = []) {
    this.configurations = configurations;
    this.updateJsValues();
  }

  updateModelValues() {
    this._configurations.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._configurations.forEach((bm) => bm.updateJsValues());
  }

  get configurations(): BillDueDaysConfiguration[] {
    return this._configurations;
  }

  set configurations(value: BillDueDaysConfiguration[]) {
    if (!value || value.length === 0) {
      this._configurations = [];
      return;
    }
    // check type and inflate
    this._configurations = value.map((c) => {
      if (c instanceof BillDueDaysConfiguration) {
        return c;
      }
      return new BillDueDaysConfiguration(c);
    });
  }

  get all(): BillDueDaysConfiguration[] {
    return this._configurations;
  }

  get allCustom(): BillDueDaysConfiguration[] {
    return this._configurations.filter((c) => c.type === "custom");
  }

  get hasCustom(): boolean {
    return this.allCustom.length > 0;
  }

  get hasActiveCustom(): boolean {
    return this._configurations.some((c) => c.type === "custom" && c.active);
  }

  /** only rows that are active */
  get allActive(): BillDueDaysConfiguration[] {
    return this._configurations.filter((c) => c.active);
  }

  /** rows that are BOTH custom and active */
  get allCustomActive(): BillDueDaysConfiguration[] {
    return this._configurations.filter((c) => c.type === "custom" && c.active);
  }

  /* activate / deactivate helpers */
  activateAll() {
    this._configurations.forEach((c) => (c.active = true));
  }
  deactivateAll() {
    this._configurations.forEach((c) => (c.active = false));
  }

  /** true when more than one row (active OR inactive) shares the same term # */
  isDuplicateTermNumber(termNumber: number): boolean {
    return this._configurations.filter((c) => c.termNumber === termNumber).length > 1;
  }

  /** sort in-place by termNumber ascending, preserving UI / model sync */
  reSort(): void {
    this.updateModelValues(); // commit any JS edits
    this._configurations.sort((a, b) => a.termNumber - b.termNumber);
    this.updateJsValues(); // refresh JS mirrors
  }

  addConfiguration(configuration: BillDueDaysConfiguration) {
    this._configurations.push(configuration);
  }

  removeConfigurationAtIndex(index: number) {
    this._configurations.splice(index, 1);
  }

  get length(): number {
    return this._configurations.length;
  }

  atIndex(index: number): BillDueDaysConfiguration {
    if (index < 0) {
      return this.first;
    }
    return this._configurations[index];
  }

  get first(): BillDueDaysConfiguration {
    return this._configurations[0];
  }

  get last(): BillDueDaysConfiguration {
    return this._configurations[this._configurations.length - 1];
  }

  get json() {
    return this._configurations.map((c) => c.json);
  }

  toJSON() {
    return this.json;
  }
}

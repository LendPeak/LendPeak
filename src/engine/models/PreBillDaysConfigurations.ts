import { PreBillDaysConfiguration } from "./PreBillDaysConfiguration";

export class PreBillDaysConfigurations {
  private _configurations: PreBillDaysConfiguration[] = [];

  constructor(configurations: PreBillDaysConfiguration[] = []) {
    this.configurations = configurations;
    this.updateJsValues();
  }

  updateModelValues() {
    this._configurations.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._configurations.forEach((bm) => bm.updateJsValues());
  }

  get allCustom(): PreBillDaysConfiguration[] {
    return this._configurations.filter((c) => c.type === "custom");
  }

  get hasCustom(): boolean {
    return this.allCustom.length > 0;
  }

  get configurations(): PreBillDaysConfiguration[] {
    return this._configurations;
  }

  set configurations(value: PreBillDaysConfiguration[]) {
    // check type and inflate
    this._configurations = value.map((c) => {
      if (c instanceof PreBillDaysConfiguration) {
        return c;
      }
      return new PreBillDaysConfiguration(c);
    });
  }

  get all(): PreBillDaysConfiguration[] {
    return this._configurations;
  }

  addConfiguration(configuration: PreBillDaysConfiguration) {
    this._configurations.push(configuration);
  }

  removeConfigurationAtIndex(index: number) {
    this._configurations.splice(index, 1);
  }

  get length(): number {
    return this._configurations.length;
  }

  atIndex(index: number): PreBillDaysConfiguration {
    if (index < 0) {
      return this.first;
    }
    return this._configurations[index];
  }

  get first(): PreBillDaysConfiguration {
    return this._configurations[0];
  }

  get last(): PreBillDaysConfiguration {
    return this._configurations[this._configurations.length - 1];
  }

  get json() {
    return this._configurations.map((r) => r.json);
  }

  toJSON() {
    return this.json;
  }
}

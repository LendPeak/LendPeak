export interface PreBillDaysConfigurationParams {
  termNumber: number;
  preBillDays: number;
  type?: PreBillDaysConfigurationType;
}

export type PreBillDaysConfigurationType = "custom" | "generated" | "default";

export class PreBillDaysConfiguration {
  private _termNumber!: number;
  jsTermNumber!: number;

  private _preBillDays!: number;
  jsPreBillDays!: number;

  private _type: PreBillDaysConfigurationType = "custom";

  constructor(params: PreBillDaysConfigurationParams) {
    this.termNumber = params.termNumber;
    this.preBillDays = params.preBillDays;

    if (params.type) {
      this.type = params.type;
    }

    this.updateJsValues();
  }

  get type(): PreBillDaysConfigurationType {
    return this._type;
  }

  set type(value: PreBillDaysConfigurationType) {
    this._type = value;
  }

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsPreBillDays = this.preBillDays;
  }

  updateModelValues() {
    this.termNumber = this.jsTermNumber;
    this.preBillDays = this.jsPreBillDays;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
  }

  get preBillDays(): number {
    return this._preBillDays;
  }

  set preBillDays(value: number) {
    this._preBillDays = value;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      preBillDays: this.preBillDays,
      type: this.type,
    };
  }

  toJSON() {
    return this.json;
  }
}

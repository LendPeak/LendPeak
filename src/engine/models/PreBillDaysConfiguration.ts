export interface PreBillDaysConfigurationParams {
  termNumber: number;
  preBillDays: number;
  type?: PreBillDaysConfigurationType;
  active?: boolean;
}

export type PreBillDaysConfigurationType = "custom" | "generated" | "default";

export class PreBillDaysConfiguration {
  private _termNumber!: number;
  jsTermNumber!: number;

  private _preBillDays!: number;
  jsPreBillDays!: number;

  private _type: PreBillDaysConfigurationType = "custom";

  private _active = true;
  jsActive = true;

  constructor(params: PreBillDaysConfigurationParams) {
    this.termNumber = params.termNumber;
    this.preBillDays = params.preBillDays;

    if (params.type) {
      this.type = params.type;
    }

    if (params.active !== undefined) this.active = params.active;

    this.updateJsValues();
  }

  get active(): boolean {
    return this._active;
  }

  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
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
    this.jsActive = this.active;
  }

  updateModelValues() {
    this.termNumber = this.jsTermNumber;
    this.preBillDays = this.jsPreBillDays;
    this.active = this.jsActive;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
    this.jsTermNumber = value;
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
      active: this.active,
    };
  }

  toJSON() {
    return this.json;
  }
}

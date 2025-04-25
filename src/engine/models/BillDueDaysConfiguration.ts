export interface BillDueDaysConfigurationParams {
  termNumber: number;
  daysDueAfterPeriodEnd: number;
  type?: BillDueDaysConfigurationType;
  active?: boolean;
}

export type BillDueDaysConfigurationType = "custom" | "generated" | "default";

export class BillDueDaysConfiguration {
  private _termNumber: number = 0;
  jsTermNumber: number = 0;
  private _daysDueAfterPeriodEnd: number = 0;
  jsDaysDueAfterPeriodEnd: number = 0;
  private _type: BillDueDaysConfigurationType = "custom";

  private _active = true;
  jsActive = true;

  constructor(params: BillDueDaysConfigurationParams) {
    this.termNumber = params.termNumber;
    this.daysDueAfterPeriodEnd = params.daysDueAfterPeriodEnd;
    if (params.type) {
      this.type = params.type;
    }
    if (params.active !== undefined) this.active = params.active;

    this.updateJsValues();
  }

  get active() {
    return this._active;
  }

  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
  } 

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsDaysDueAfterPeriodEnd = this.daysDueAfterPeriodEnd;
    this.jsActive = this.active; 
    // console.trace("js values updated for BillDueDaysConfiguration");
  }

  updateModelValues() {
    this.termNumber = this.jsTermNumber;
    this.daysDueAfterPeriodEnd = this.jsDaysDueAfterPeriodEnd;
    this.active = this.jsActive;
  }

  get type(): BillDueDaysConfigurationType {
    return this._type;
  }

  set type(value: BillDueDaysConfigurationType) {
    this._type = value;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    // console.trace("term number set to: ", value);
    this._termNumber = value;
  }

  get daysDueAfterPeriodEnd(): number {
    return this._daysDueAfterPeriodEnd;
  }

  set daysDueAfterPeriodEnd(value: number) {
    //console.log("days due after period end set to: ", value);
    this._daysDueAfterPeriodEnd = value;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      daysDueAfterPeriodEnd: this.daysDueAfterPeriodEnd,
      type: this.type,
      active: this.active,
    };
  }

  toJSON() {
    return this.json;
  }
}

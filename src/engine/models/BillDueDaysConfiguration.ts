export interface BillDueDaysConfigurationParams {
  termNumber: number;
  daysDueAfterPeriodEnd: number;
  type?: BillDueDaysConfigurationType;
}

export type BillDueDaysConfigurationType = "custom" | "generated" | "default";

export class BillDueDaysConfiguration {
  private _termNumber: number = 0;
  jsTermNumber: number = 0;
  private _daysDueAfterPeriodEnd: number = 0;
  jsDaysDueAfterPeriodEnd: number = 0;
  private _type: BillDueDaysConfigurationType = "custom";

  constructor(params: BillDueDaysConfigurationParams) {
    this.termNumber = params.termNumber;
    this.daysDueAfterPeriodEnd = params.daysDueAfterPeriodEnd;
    if (params.type) {
      this.type = params.type;
    }
    this.updateJsValues();
  }

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsDaysDueAfterPeriodEnd = this.daysDueAfterPeriodEnd;
    // console.trace("js values updated for BillDueDaysConfiguration");
  }

  updateModelValues() {
    this.termNumber = this.jsTermNumber;
    this.daysDueAfterPeriodEnd = this.jsDaysDueAfterPeriodEnd;
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
    };
  }

  toJSON() {
    return this.json;
  }
}

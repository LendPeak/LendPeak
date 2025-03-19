import Decimal from "decimal.js";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type RateScheduleType = "custom" | "generated" | "default";

export interface RateScheduleParams {
  annualInterestRate: Decimal | number;
  startDate: Dayjs | Date | string;
  endDate: Dayjs | Date | string;
  type?: RateScheduleType;
}

export class RateSchedule {
  private _annualInterestRate!: Decimal;
  private _startDate!: Dayjs;
  private _endDate!: Dayjs;
  private _modified?: boolean = false;

  type: RateScheduleType = "custom";
  jsAnnualInterestRate!: number;
  jsStartDate!: Date;
  jsEndDate!: Date;

  constructor(params: RateScheduleParams) {
    this.annualInterestRate = params.annualInterestRate;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    if (params.type) {
      this.type = params.type;
    }
    this.updateJsValues();
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  get annualInterestRate(): Decimal {
    return this._annualInterestRate;
  }

  set annualInterestRate(value: Decimal | number) {
    this.modified = true;
    this._annualInterestRate = new Decimal(value);
  }

  get startDate(): Dayjs {
    return this._startDate;
  }

  set startDate(value: Dayjs | Date | string) {
    this.modified = true;

    this._startDate = dayjs(value).startOf("day");
  }

  get endDate(): Dayjs {
    return this._endDate;
  }

  set endDate(value: Dayjs | Date | string) {
    this.modified = true;

    this._endDate = dayjs(value).startOf("day");
  }

  get json() {
    return {
      annualInterestRate: this.annualInterestRate.toNumber(),
      startDate: this.startDate.toDate(),
      endDate: this.endDate.toDate(),
      type: this.type,
    };
  }

  updateModelValues() {
    this.annualInterestRate = new Decimal(this.jsAnnualInterestRate);
    this.startDate = this.jsStartDate;
    this.endDate = this.jsEndDate;
  }

  updateJsValues() {
    this.jsAnnualInterestRate = this.annualInterestRate.toNumber();
    this.jsStartDate = this.startDate.toDate();
    this.jsEndDate = this.endDate.toDate();
  }
}

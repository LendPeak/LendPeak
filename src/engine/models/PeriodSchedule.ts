import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type PeriodSchedulesType = "custom" | "generated" | "default";

export interface ParamsPeriodSchedule {
  startDate: Dayjs | Date | string;
  endDate: Dayjs | Date | string;
  type?: PeriodSchedulesType;
}

export class PeriodSchedule {
  private _startDate!: Dayjs;
  jsStartDate!: Date;

  private _endDate!: Dayjs;
  jsEndDate!: Date;

  private _type: PeriodSchedulesType = "custom";

  constructor(params: ParamsPeriodSchedule) {
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    if (params.type) {
      this.type = params.type;
    }
    this.updateJsValues();
  }

  updateJsValues() {
    this.jsStartDate = this.startDate.toDate();
    this.jsEndDate = this.endDate.toDate();
  }

  updateModelValues() {
    this.startDate = this.jsStartDate;
    this.endDate = this.jsEndDate;
  }

  get type(): PeriodSchedulesType {
    return this._type;
  }

  set type(value: PeriodSchedulesType) {
    this._type = value;
  }

  get startDate(): Dayjs {
    return this._startDate;
  }

  set startDate(value: Dayjs | Date | string) {
    this._startDate = dayjs(value).startOf("day");
  }

  get endDate(): Dayjs {
    return this._endDate;
  }

  set endDate(value: Dayjs | Date | string) {
    this._endDate = dayjs(value).startOf("day");
  }

  get json() {
    this.updateJsValues();
    return {
      startDate: this.jsStartDate,
      endDate: this.jsEndDate,
      type: this.type,
    };
  }

  toJSON() {
    return this.json;
  }
}

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { LocalDate, ZoneId } from "@js-joda/core";
import { DateUtil } from "../utils/DateUtil";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type PeriodSchedulesType = "custom" | "generated" | "default";

export interface ParamsPeriodSchedule {
  startDate: LocalDate | Date | string;
  endDate: LocalDate | Date | string;
  type?: PeriodSchedulesType;
}

export class PeriodSchedule {
  private _startDate!: LocalDate;
  jsStartDate!: Date;

  private _endDate!: LocalDate;
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
    this.jsStartDate = DateUtil.normalizeDateToJsDate(this.startDate);
    this.jsEndDate = DateUtil.normalizeDateToJsDate(this.endDate);
  }

  updateModelValues() {
    this.startDate = DateUtil.normalizeDate(this.jsStartDate);
    this.endDate = DateUtil.normalizeDate(this.jsEndDate);
  }

  get type(): PeriodSchedulesType {
    return this._type;
  }

  set type(value: PeriodSchedulesType) {
    this._type = value;
  }

  get startDate(): LocalDate {
    return this._startDate;
  }

  set startDate(value: LocalDate | Date | string) {
    this._startDate = DateUtil.normalizeDate(value);
  }

  get endDate(): LocalDate {
    return this._endDate;
  }

  set endDate(value: LocalDate | Date | string) {
    this._endDate = DateUtil.normalizeDate(value);
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

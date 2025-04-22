import dayjs, { Dayjs } from "dayjs";
import { DateUtil } from "../utils/DateUtil";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export interface ChangePaymentDateParams {
  termNumber?: number;
  newDate: LocalDate | Date | string;
  originalDate?: LocalDate | Date | string;
  originalEndDate?: LocalDate | Date | string;
}

export class ChangePaymentDate {
  _termNumber!: number;
  jsTermNumber!: number;

  _humanTermNumber!: number;
  jsHumanTermNumber!: number;

  _newDate!: LocalDate;
  jsNewDate!: Date;

  _originalDate?: LocalDate;
  jsOriginalDate?: Date;

  _originalEndDate?: LocalDate;
  jsOriginalEndDate?: Date;

  constructor(params: ChangePaymentDateParams) {
    this.termNumber = params.termNumber ?? -1;

    this.newDate = params.newDate;
    if (params.originalDate) {
      this.originalDate = params.originalDate;
    }
  }

  set originalEndDate(originalEndDate: LocalDate | Date | string) {
    this._originalEndDate = DateUtil.normalizeDate(originalEndDate);
    this.jsOriginalEndDate = DateUtil.normalizeDateToJsDate(this._originalEndDate);
  }

  get originalEndDate(): LocalDate | undefined {
    return this._originalEndDate;
  }

  set termNumber(termNumber: number) {
    // make sure termNumber is set to a number
    if (typeof termNumber !== "number") {
      throw new Error("termNumber must be a number");
    }
    this._termNumber = termNumber;
    this._humanTermNumber = termNumber + 1;
    this.jsTermNumber = termNumber;
    this.jsHumanTermNumber = termNumber + 1;
  }

  get termNumber(): number {
    return this._termNumber;
  }

  get humanTermNumber(): number {
    return this._humanTermNumber;
  }

  set newDate(newDate: LocalDate | Date | string) {
    this._newDate = DateUtil.normalizeDate(newDate);
    this.jsNewDate = DateUtil.normalizeDateToJsDate(this._newDate);
  }

  get newDate(): LocalDate {
    return this._newDate;
  }

  set originalDate(originalDate: LocalDate | Date | string) {
    // console.trace("setting original date", originalDate);
    this._originalDate = DateUtil.normalizeDate(originalDate);
    this.jsOriginalDate = DateUtil.normalizeDateToJsDate(this._originalDate);
  }

  get originalDate(): LocalDate | undefined {
    return this._originalDate;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      humanTermNumber: this.humanTermNumber,
      newDate: this.newDate.toString(),
      originalEndDate: this.originalEndDate?.toString(),
      originalDate: this.originalDate?.toString(),
    };
  }

  toJSON() {
    return this.json;
  }

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsHumanTermNumber = this.humanTermNumber;
    this.jsNewDate = DateUtil.normalizeDateToJsDate(this.newDate);
    if (this.originalDate) {
      this.jsOriginalDate = DateUtil.normalizeDateToJsDate(this.originalDate);
    }
  }

  updateModelValues() {
    this.termNumber = this.jsTermNumber;
    this.newDate = this.jsNewDate;
    if (this.jsOriginalDate) {
      this.originalDate = this.jsOriginalDate;
    }
  }
}

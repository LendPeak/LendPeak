import dayjs, { Dayjs } from "dayjs";
import { DateUtil } from "../utils/DateUtil";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export interface ChangePaymentDateParams {
  termNumber?: number;
  newDate: Dayjs | Date | string;
  originalDate?: Dayjs | Date | string;
  originalEndDate?: Dayjs | Date | string;
}

export class ChangePaymentDate {
  _termNumber!: number;
  jsTermNumber!: number;

  _humanTermNumber!: number;
  jsHumanTermNumber!: number;

  _newDate!: Dayjs;
  jsNewDate!: Date;

  _originalDate?: Dayjs;
  jsOriginalDate?: Date;

  _originalEndDate?: Dayjs;
  jsOriginalEndDate?: Date;

  constructor(params: ChangePaymentDateParams) {
    this.termNumber = params.termNumber ?? -1;

    this.newDate = params.newDate;
    if (params.originalDate) {
      this.originalDate = params.originalDate;
    }
  }

  set originalEndDate(originalEndDate: Dayjs | Date | string) {
    this._originalEndDate = DateUtil.normalizeDate(originalEndDate);
    this.jsOriginalEndDate = this._originalEndDate.toDate();
  }

  get originalEndDate(): Dayjs | undefined {
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

  set newDate(newDate: Dayjs | Date | string) {
    this._newDate = DateUtil.normalizeDate(newDate);
    this.jsNewDate = this._newDate.toDate();
  }

  get newDate(): Dayjs {
    return this._newDate;
  }

  set originalDate(originalDate: Dayjs | Date | string) {
    // console.trace("setting original date", originalDate);
    this._originalDate = DateUtil.normalizeDate(originalDate);
    this.jsOriginalDate = this._originalDate.toDate();
  }

  get originalDate(): Dayjs | undefined {
    return this._originalDate;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      humanTermNumber: this.humanTermNumber,
      newDate: this.newDate.toDate(),
      originalEndDate: this.originalEndDate?.toDate(),
      originalDate: this.originalDate?.toDate(),
    };
  }

  toJSON() {
    return this.json;
  }

  updateJsValues() {
    this.jsTermNumber = this.termNumber;
    this.jsHumanTermNumber = this.humanTermNumber;
    this.jsNewDate = this.newDate.toDate();
    if (this.originalDate) {
      this.jsOriginalDate = this.originalDate.toDate();
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

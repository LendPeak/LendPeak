import Decimal from "decimal.js";

import { DateUtil } from "../utils/DateUtil";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { LocalDate, ZoneId } from "@js-joda/core";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type RateScheduleType = "custom" | "generated" | "default";

export interface RateScheduleParams {
  id?: string;
  annualInterestRate: Decimal | number;
  startDate: LocalDate | Date | string;
  endDate: LocalDate | Date | string;
  type?: RateScheduleType;
}

export class RateSchedule {
  private _annualInterestRate!: Decimal;
  private _startDate!: LocalDate;
  private _endDate!: LocalDate;
  private _modified: boolean = false;
  private _id: string = "";

  type: RateScheduleType = "custom";
  jsAnnualInterestRate!: number;
  jsStartDate!: Date;
  jsEndDate!: Date;

  constructor(params: RateScheduleParams) {
    this.annualInterestRate = params.annualInterestRate;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    
    // Validate date range
    this.validateDateRange();
    
    if (params.type) {
      this.type = params.type;
    }

    if (params.id) {
      this.id = params.id;
    } else {
      this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    this._modified = false;
    this.updateJsValues();
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified;
  }

  get annualInterestRate(): Decimal {
    return this._annualInterestRate;
  }

  set annualInterestRate(value: Decimal | number) {
    this.modified = true;
    this._annualInterestRate = new Decimal(value);
  }

  get startDate(): LocalDate {
    return this._startDate;
  }

  set startDate(value: LocalDate | Date | string) {
    this.modified = true;
    this._startDate = DateUtil.normalizeDate(value);
    
    // Validate that start date is not after end date
    if (this._endDate && this._startDate.isAfter(this._endDate)) {
      throw new Error("Start date must be on or before end date");
    }
  }

  get endDate(): LocalDate {
    return this._endDate;
  }

  set endDate(value: LocalDate | Date | string) {
    this.modified = true;
    this._endDate = DateUtil.normalizeDate(value);
    
    // Validate that end date is not before start date
    if (this._startDate && this._endDate.isBefore(this._startDate)) {
      throw new Error("End date must be on or after start date");
    }
  }

  get json() {
    return {
      id: this.id,
      annualInterestRate: this.annualInterestRate.toNumber(),
      // startDate: this.startDate.toISOString(),
      // endDate: this.endDate.toISOString(),
      startDate: this.startDate.toString(),
      endDate: this.endDate.toString(),
      type: this.type,
    };
  }

  updateModelValues() {
    this.annualInterestRate = new Decimal(this.jsAnnualInterestRate);
    
    // Temporarily store the normalized dates
    const newStartDate = DateUtil.normalizeDate(this.jsStartDate);
    const newEndDate = DateUtil.normalizeDate(this.jsEndDate);
    
    // Check if we need to update in a specific order to avoid validation errors
    if (newStartDate.isAfter(this._endDate)) {
      // New start date is after current end date, so update end date first
      this.endDate = this.jsEndDate;
      this.startDate = this.jsStartDate;
    } else if (newEndDate.isBefore(this._startDate)) {
      // New end date is before current start date, so update start date first
      this.startDate = this.jsStartDate;
      this.endDate = this.jsEndDate;
    } else {
      // Normal case - order doesn't matter
      this.startDate = this.jsStartDate;
      this.endDate = this.jsEndDate;
    }
  }

  updateJsValues() {
    this.jsAnnualInterestRate = this.annualInterestRate.toNumber();
    this.jsStartDate = DateUtil.normalizeDateToJsDate(this.startDate);
    this.jsEndDate = DateUtil.normalizeDateToJsDate(this.endDate);
  }

  private validateDateRange(): void {
    if (this._startDate && this._endDate && this._endDate.isBefore(this._startDate)) {
      throw new Error("End date must be on or after start date");
    }
  }
}

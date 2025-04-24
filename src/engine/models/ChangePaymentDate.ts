/* ChangePaymentDate.ts */
import { DateUtil } from "../utils/DateUtil";
import { LocalDate } from "@js-joda/core";

export interface ChangePaymentDateParams {
  /** `termNumber < 0` means “date-based” override */
  termNumber?: number;
  newDate: LocalDate | Date | string;
  originalDate?: LocalDate | Date | string;
  originalEndDate?: LocalDate | Date | string;
  /** optional – defaults to true */
  active?: boolean;
}

export class ChangePaymentDate {
  /* ────────────────────────── model props ────────────────────────── */
  private _termNumber!: number;
  private _humanTermNumber!: number;
  private _newDate!: LocalDate;
  private _originalDate?: LocalDate;
  private _originalEndDate?: LocalDate;
  private _active: boolean = true;

  /* ────────────────────────── JS / binding ───────────────────────── */
  jsTermNumber!: number;
  jsHumanTermNumber!: number;
  jsNewDate!: Date;
  jsOriginalDate?: Date;
  jsOriginalEndDate?: Date;
  jsActive!: boolean;

  /* ───────────────────────────────────────────────────────────────── */
  constructor(params: ChangePaymentDateParams) {
    this.termNumber = params.termNumber ?? -1;
    this.newDate = params.newDate;
    if (params.originalDate) this.originalDate = params.originalDate;
    if (params.originalEndDate) this.originalEndDate = params.originalEndDate;
    this.active = params.active ?? true;
  }

  /* ===== enable / disable ===== */
  get active(): boolean {
    return this._active;
  }
  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
  }

  /* ===== term ===== */
  get termNumber(): number {
    return this._termNumber;
  }
  set termNumber(v: number) {
    if (typeof v !== "number") throw new Error("termNumber must be a number");
    this._termNumber = v;
    this._humanTermNumber = v + 1;
    this.jsTermNumber = v;
    this.jsHumanTermNumber = v + 1;
  }
  get humanTermNumber(): number {
    return this._humanTermNumber;
  }

  /* ===== dates ===== */
  set newDate(v: LocalDate | Date | string) {
    this._newDate = DateUtil.normalizeDate(v);
    this.jsNewDate = DateUtil.normalizeDateToJsDate(this._newDate);
  }
  get newDate(): LocalDate {
    return this._newDate;
  }

  set originalDate(v: LocalDate | Date | string | undefined) {
    if (v === undefined) {
      this._originalDate = undefined;
      this.jsOriginalDate = undefined;
      return;
    }
    this._originalDate = DateUtil.normalizeDate(v);
    this.jsOriginalDate = DateUtil.normalizeDateToJsDate(this._originalDate);
  }
  get originalDate(): LocalDate | undefined {
    return this._originalDate;
  }

  set originalEndDate(v: LocalDate | Date | string | undefined) {
    if (v === undefined) {
      this._originalEndDate = undefined;
      this.jsOriginalEndDate = undefined;
      return;
    }
    this._originalEndDate = DateUtil.normalizeDate(v);
    this.jsOriginalEndDate = DateUtil.normalizeDateToJsDate(this._originalEndDate);
  }
  get originalEndDate(): LocalDate | undefined {
    return this._originalEndDate;
  }

  /* ===== binding helpers ===== */
  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
    this.jsHumanTermNumber = this.humanTermNumber;
    this.jsNewDate = DateUtil.normalizeDateToJsDate(this.newDate);
    this.jsOriginalDate = this.originalDate ? DateUtil.normalizeDateToJsDate(this.originalDate) : undefined;
    this.jsOriginalEndDate = this.originalEndDate ? DateUtil.normalizeDateToJsDate(this.originalEndDate) : undefined;
    this.jsActive = this.active;
  }
  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.newDate = this.jsNewDate;
    if (this.jsOriginalDate) this.originalDate = this.jsOriginalDate;
    if (this.jsOriginalEndDate) this.originalEndDate = this.jsOriginalEndDate;
    this.active = this.jsActive;
  }

  /* ===== serialization ===== */
  get json(): ChangePaymentDateParams {
    return {
      termNumber: this.termNumber,
      newDate: this.newDate.toString(),
      originalDate: this.originalDate?.toString(),
      originalEndDate: this.originalEndDate?.toString(),
      active: this.active,
    };
  }
  toJSON() {
    return this.json;
  }
}

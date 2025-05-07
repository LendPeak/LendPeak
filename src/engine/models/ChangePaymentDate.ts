/* ChangePaymentDate.ts */
import { DateUtil } from "../utils/DateUtil";
import { LocalDate } from "@js-joda/core";

/** ──────────── NEW ──────────── */
export enum CPDType {
  REGULAR = "regular", // manual CPD / borrower request
  DSI_SYSTEM = "dsi", // auto-generated for DSI rollover
}

export interface ChangePaymentDateParams {
  /** `termNumber < 0` means “date-based” override */
  termNumber?: number;
  newDate: LocalDate | Date | string;
  originalDate?: LocalDate | Date | string;
  originalEndDate?: LocalDate | Date | string;
  /** optional – defaults to true */
  active?: boolean;
  /** NEW — defaults to CPDType.REGULAR */
  type?: CPDType;
}

export class ChangePaymentDate {
  /* ────────────────────────── model props ────────────────────────── */
  private _termNumber!: number;
  private _humanTermNumber!: number;
  private _newDate!: LocalDate;
  private _originalDate?: LocalDate;
  private _originalEndDate?: LocalDate;
  private _active: boolean = true;
  private _type: CPDType = CPDType.REGULAR; // NEW

  /* ────────────────────────── JS / binding ───────────────────────── */
  jsTermNumber!: number;
  jsHumanTermNumber!: number;
  jsNewDate!: Date;
  jsOriginalDate?: Date;
  jsOriginalEndDate?: Date;
  jsActive!: boolean;
  jsType!: CPDType; // NEW

  /* ───────────────────────────────────────────────────────────────── */
  constructor(params: ChangePaymentDateParams) {
    this.termNumber = params.termNumber ?? -1;
    this.newDate = params.newDate;
    if (params.originalDate) this.originalDate = params.originalDate;
    if (params.originalEndDate) this.originalEndDate = params.originalEndDate;
    this.active = params.active ?? true;
    this.type = params.type ?? CPDType.REGULAR; // NEW
  }

  /* ===== enable / disable ===== */
  get active(): boolean {
    return this._active;
  }
  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
  }

  /* ===== type ===== */ // NEW
  get type(): CPDType {
    return this._type;
  }
  set type(v: CPDType) {
    this._type = v;
    this.jsType = v;
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
      this._originalDate = this.jsOriginalDate = undefined;
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
      this._originalEndDate = this.jsOriginalEndDate = undefined;
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
    this.jsType = this.type; // NEW
  }

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
    this.newDate = this.jsNewDate;
    if (this.jsOriginalDate) this.originalDate = this.jsOriginalDate;
    if (this.jsOriginalEndDate) this.originalEndDate = this.jsOriginalEndDate;
    this.active = this.jsActive;
    this.type = this.jsType; // NEW
  }

  /* ===== serialization ===== */
  get json(): ChangePaymentDateParams {
    return {
      termNumber: this.termNumber,
      newDate: this.newDate.toString(),
      originalDate: this.originalDate?.toString(),
      originalEndDate: this.originalEndDate?.toString(),
      active: this.active,
      type: this.type, // NEW
    };
  }
  toJSON() {
    return this.json;
  }
}

import { LocalDate } from '@js-joda/core';
import { DateUtil } from '../utils/DateUtil';

export interface TermExtensionParams {
  termChange: number;
  date?: LocalDate | Date | string;
  active?: boolean;
}

export class TermExtension {
  private _termChange!: number;
  jsTermChange!: number;

  private _date!: LocalDate;
  jsDate!: Date;

  private _active = true;
  jsActive = true;

  constructor(params: TermExtensionParams) {
    this.termChange = params.termChange;
    this.date = params.date ?? LocalDate.now();
    if (params.active !== undefined) this.active = params.active;
  }

  get termChange(): number {
    return this._termChange;
  }
  set termChange(v: number) {
    this._termChange = v;
    this.jsTermChange = v;
  }

  get date(): LocalDate {
    return this._date;
  }
  set date(v: LocalDate | Date | string) {
    this._date = DateUtil.normalizeDate(v);
    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
  }

  get active(): boolean {
    return this._active;
  }
  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
  }

  updateModelValues(): void {
    this.termChange = this.jsTermChange;
    this.date = this.jsDate;
    this.active = this.jsActive;
  }

  updateJsValues(): void {
    this.jsTermChange = this.termChange;
    this.jsDate = DateUtil.normalizeDateToJsDate(this.date);
    this.jsActive = this.active;
  }

  get json(): TermExtensionParams {
    return {
      termChange: this.termChange,
      date: this.date.toString(),
      active: this.active,
    };
  }

  toJSON() {
    return this.json;
  }
}

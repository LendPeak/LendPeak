import { LocalDate } from '@js-joda/core';
import { DateUtil } from '../utils/DateUtil';

export interface TermExtensionParams {
  date: LocalDate | Date | string;
  termsModified: number;
  active?: boolean;
}

export class TermExtension {
  private _date: LocalDate;
  private _termsModified: number;
  private _active: boolean;

  jsDate: Date;
  jsTermsModified: number;
  jsActive: boolean;

  constructor(params: TermExtensionParams) {
    this._termsModified = Number(params.termsModified);
    this._date = DateUtil.normalizeDate(params.date);
    this._active = params.active === undefined ? true : params.active;

    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
    this.jsTermsModified = this._termsModified;
    this.jsActive = this._active;
  }

  updateJsValues(): void {
    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
    this.jsTermsModified = this._termsModified;
    this.jsActive = this._active;
  }

  updateModelValues(): void {
    this._date = DateUtil.normalizeDate(this.jsDate);
    this._termsModified = Number(this.jsTermsModified);
    this._active = this.jsActive;
  }

  get json(): TermExtensionParams {
    return {
      date: this._date.toString(),
      termsModified: this._termsModified,
      active: this._active,
    };
  }

  toJSON(): TermExtensionParams {
    return this.json;
  }

  // Getter for sorting purposes in TermExtensions
  get date(): LocalDate {
    return this._date;
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
    this.updateJsValues();
  }
}

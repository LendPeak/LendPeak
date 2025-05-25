import { LocalDate } from '@js-joda/core';
import { DateUtil } from '../utils/DateUtil';

export interface TermExtensionParams {
  quantity: number;
  date: LocalDate | Date | string;
  description?: string;
  active?: boolean;
  id?: string;
  emiRecalculationMode?: 'none' | 'fromStart' | 'fromTerm';
  emiRecalculationTerm?: number;
}

export class TermExtension {
  private _quantity!: number;
  private _date!: LocalDate;
  private _description?: string;
  private _active: boolean = true;
  private _id?: string;
  private _emiRecalculationMode: 'none' | 'fromStart' | 'fromTerm' = 'none';
  private _emiRecalculationTerm?: number;

  jsQuantity!: number;
  jsDate!: Date;
  jsDescription?: string;
  jsActive!: boolean;
  jsId?: string;
  jsEmiRecalculationMode!: 'none' | 'fromStart' | 'fromTerm';
  jsEmiRecalculationTerm?: number;

  private _modified = false;
  get modified(): boolean {
    return this._modified;
  }
  set modified(v: boolean) {
    this._modified = v;
  }

  constructor(params: TermExtensionParams) {
    this.quantity = params.quantity;
    this.date = params.date;
    this.description = params.description;
    this.active = params.active ?? true;
    this.id = params.id;
    this.emiRecalculationMode = params.emiRecalculationMode ?? 'none';
    this.emiRecalculationTerm = params.emiRecalculationTerm;
    this.updateJsValues();
  }

  get quantity() {
    return this._quantity;
  }
  set quantity(v: number) {
    this._quantity = v;
    this.jsQuantity = v;
    this.modified = true;
  }

  get date(): LocalDate {
    return this._date;
  }
  set date(v: LocalDate | Date | string) {
    this._date = DateUtil.normalizeDate(v);
    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
    this.modified = true;
  }

  get description() {
    return this._description;
  }
  set description(v: string | undefined) {
    this._description = v;
    this.jsDescription = v;
    this.modified = true;
  }

  get active() {
    return this._active;
  }
  set active(v: boolean) {
    this._active = v;
    this.jsActive = v;
    this.modified = true;
  }

  get id() {
    return this._id;
  }
  set id(v: string | undefined) {
    this._id = v;
    this.jsId = v;
    this.modified = true;
  }

  get emiRecalculationMode() {
    return this._emiRecalculationMode;
  }
  set emiRecalculationMode(v: 'none' | 'fromStart' | 'fromTerm') {
    this._emiRecalculationMode = v;
    this.jsEmiRecalculationMode = v;
    this.modified = true;
  }

  get emiRecalculationTerm() {
    return this._emiRecalculationTerm;
  }
  set emiRecalculationTerm(v: number | undefined) {
    this._emiRecalculationTerm = v;
    this.jsEmiRecalculationTerm = v;
    this.modified = true;
  }

  updateJsValues(): void {
    this.jsQuantity = this.quantity;
    this.jsDate = DateUtil.normalizeDateToJsDate(this.date);
    this.jsDescription = this.description;
    this.jsActive = this.active;
    this.jsId = this.id;
    this.jsEmiRecalculationMode = this.emiRecalculationMode;
    this.jsEmiRecalculationTerm = this.emiRecalculationTerm;
  }

  updateModelValues(): void {
    this.quantity = this.jsQuantity;
    this.date = this.jsDate;
    this.description = this.jsDescription;
    this.active = this.jsActive;
    this.id = this.jsId;
    this.emiRecalculationMode = this.jsEmiRecalculationMode;
    this.emiRecalculationTerm = this.jsEmiRecalculationTerm;
  }

  get json(): TermExtensionParams {
    return {
      quantity: this.quantity,
      date: this.date.toString(),
      description: this.description,
      active: this.active,
      id: this.id,
      emiRecalculationMode: this.emiRecalculationMode,
      emiRecalculationTerm: this.emiRecalculationTerm,
    };
  }
  toJSON() {
    return this.json;
  }
}

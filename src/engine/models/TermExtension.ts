import { LocalDate } from '@js-joda/core';

export interface TermExtensionParams {
  quantity: number;
  date: LocalDate | Date | string;
  description?: string;
  active?: boolean;
  id?: string;
}

export class TermExtension {
  private _quantity!: number;
  private _date!: LocalDate;
  private _description?: string;
  private _active: boolean = true;
  private _id?: string;

  jsQuantity!: number;
  jsDate!: Date;
  jsDescription?: string;
  jsActive!: boolean;
  jsId?: string;

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

  get date() {
    return this._date;
  }
  set date(v: LocalDate | Date | string) {
    this._date = v instanceof LocalDate ? v : LocalDate.parse(v instanceof Date ? v.toISOString().slice(0, 10) : v);
    this.jsDate = new Date(this._date.toString());
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

  updateJsValues(): void {
    this.jsQuantity = this.quantity;
    this.jsDate = new Date(this.date.toString());
    this.jsDescription = this.description;
    this.jsActive = this.active;
    this.jsId = this.id;
  }

  updateModelValues(): void {
    this.quantity = this.jsQuantity;
    this.date = this.jsDate;
    this.description = this.jsDescription;
    this.active = this.jsActive;
    this.id = this.jsId;
  }

  get json(): TermExtensionParams {
    return {
      quantity: this.quantity,
      date: this.date.toString(),
      description: this.description,
      active: this.active,
      id: this.id,
    };
  }
  toJSON() {
    return this.json;
  }
}

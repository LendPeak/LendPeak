import { ChangePaymentDate } from "./ChangePaymentDate";

export class ChangePaymentDates {
  private _changePaymentDates: ChangePaymentDate[] = [];

  constructor(changePaymentDates: ChangePaymentDate[] = []) {
    this.changePaymentDates = changePaymentDates;
  }

  updateModelValues() {
    this.changePaymentDates.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this.changePaymentDates.forEach((bm) => bm.updateJsValues());
  }

  get all(): ChangePaymentDate[] {
    return this.changePaymentDates;
  }

  get changePaymentDates(): ChangePaymentDate[] {
    return this._changePaymentDates;
  }

  set changePaymentDates(value: ChangePaymentDate[]) {
    if (!value || value.length === 0) {
      this._changePaymentDates = [];
      return;
    }
    // check type and inflate
    this._changePaymentDates = value.map((c) => {
      if (c instanceof ChangePaymentDate) {
        return c;
      }
      return new ChangePaymentDate(c);
    });
  }

  addChangePaymentDate(changePaymentDate: ChangePaymentDate) {
    this.changePaymentDates.push(changePaymentDate);
  }

  removeChangePaymentDate(changePaymentDate: ChangePaymentDate) {
    this.changePaymentDates = this.changePaymentDates.filter((cpd) => cpd.termNumber !== changePaymentDate.termNumber);
  }

  getChangePaymentDate(termNumber: number): ChangePaymentDate | undefined {
    return this.changePaymentDates.find((cpd) => cpd.termNumber === termNumber);
  }

  getChangePaymentDateIndex(termNumber: number): number {
    return this.changePaymentDates.findIndex((cpd) => cpd.termNumber === termNumber);
  }

  removeConfigurationAtIndex(index: number) {
    this.changePaymentDates.splice(index, 1);
  }

  get length(): number {
    return this.changePaymentDates.length;
  }

  atIndex(index: number): ChangePaymentDate {
    return this.changePaymentDates[index];
  }

  get first(): ChangePaymentDate {
    return this.changePaymentDates[0];
  }

  get last(): ChangePaymentDate {
    return this.changePaymentDates[this.changePaymentDates.length - 1];
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return this.changePaymentDates.map((cpd) => cpd.json);
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    // detect if there are more than one override for the same term number
    return this._changePaymentDates.filter((bm) => bm.termNumber === termNumber).length > 1;
  }

  reSort() {
    this.changePaymentDates = this.changePaymentDates.sort((a, b) => {
      return a.termNumber < b.termNumber ? -1 : 1;
    });
  }
}

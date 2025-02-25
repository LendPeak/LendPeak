import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { DepositRecord } from "./Deposit";

export class DepositRecords {
  private _records: DepositRecord[] = [];
  private _modified: boolean = false;

  constructor(records: DepositRecord[] = []) {
    this.records = records;
    this.updateJsValues();
    this.modified = false;
  }

  // resetModified() {
  //   this.modified = false;
  //   this._records.forEach((bm) => (bm.modified = false));
  // }

  clearHistory() {
    this.all.forEach((deposit) => {
      deposit.clearHistory();
    });
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  // get hasModified(): boolean {
  //   return this.modified || this._records.some((bm) => bm.modified);
  // }

  get hasModified(): boolean {
    return this.modified;
  }

  updateModelValues() {
    this._records.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._records.forEach((bm) => bm.updateJsValues());
  }

  get records(): DepositRecord[] {
    return this._records;
  }

  set records(value: DepositRecord[]) {
    this.modified = true;
    // check type and inflate
    this._records = value
      .map((c) => {
        if (c instanceof DepositRecord) {
          return c;
        }
        return new DepositRecord(c);
      })
      .sort((a, b) => {
        return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
      });
  }

  get first(): DepositRecord | undefined {
    return this._records[0];
  }

  get last(): DepositRecord | undefined {
    return this._records[this._records.length - 1];
  }

  get length(): number {
    return this._records.length;
  }

  atIndex(index: number): DepositRecord {
    return this._records[index];
  }

  addRecord(record: DepositRecord) {
    this.modified = true;
    this._records.push(record);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  removeRecordAtIndex(index: number) {
    this.modified = true;
    this._records.splice(index, 1);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  removeRecordById(id: string) {
    this.modified = true;
    this._records = this._records.filter((record) => record.id !== id);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  get allSorted(): DepositRecord[] {
    return this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  sortByEffectiveDate() {
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  get all(): DepositRecord[] {
    return this._records;
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return this._records.map((r) => r.json);
  }
}

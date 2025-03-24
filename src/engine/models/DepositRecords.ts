import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";

import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { DepositRecord } from "./DepositRecord";
import { Currency } from "../utils/Currency";

export class DepositRecords {
  private _records: DepositRecord[] = [];
  private _modified: boolean = false;
  private _versionId: string = uuidv4();
  private _dateChanged: Dayjs = dayjs();

  constructor(records: DepositRecord[] = []) {
    this.records = records;
    this.sortByEffectiveDate();
    this.updateJsValues();
    this.modified = false;
  }

  // resetModified() {
  //   this.modified = false;
  //   this._records.forEach((bm) => (bm.modified = false));
  // }
  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): Dayjs {
    return this._dateChanged;
  }

  versionChanged() {
    this._dateChanged = dayjs();
    this._versionId = uuidv4();
  }

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
          c.depositRecords = this;
          return c;
        }
        const record = new DepositRecord(c);
        record.depositRecords = this;
        return record;
      })
      .sort((a, b) => {
        return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
      });
    this.versionChanged();
  }

  get first(): DepositRecord | undefined {
    return this.allSorted[0];
  }

  get last(): DepositRecord | undefined {
    return this.allSorted[this.length - 1];
  }

  get length(): number {
    return this._records.length;
  }

  getById(id: string): DepositRecord | undefined {
    return this._records.find((record) => record.id === id);
  }

  atIndex(index: number): DepositRecord {
    return this._records[index];
  }

  addRecord(record: DepositRecord) {
    this.modified = true;
    record.depositRecords = this;
    this._records.push(record);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
    this.versionChanged();
  }

  removeRecordAtIndex(index: number) {
    this.modified = true;
    this._records.splice(index, 1);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
    this.versionChanged();
  }

  removeRecordById(id: string) {
    this.modified = true;
    this._records = this._records.filter((record) => record.id !== id);
    this._records = this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
    this.versionChanged();
  }

  get allSorted(): DepositRecord[] {
    return this._records.sort((a, b) => {
      return dayjs(a.effectiveDate).isBefore(dayjs(b.effectiveDate)) ? -1 : 1;
    });
  }

  get allActiveSorted(): DepositRecord[] {
    return this.active.sort((a, b) => {
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

  get active(): DepositRecord[] {
    return this._records.filter((r) => r.active === true);
  }

  get lastActive(): DepositRecord | undefined {
    return this.allActiveSorted[this.active.length - 1];
  }

  get summary() {
    let total = Currency.of(0);
    let totalInterest = Currency.of(0);
    let totalFees = Currency.of(0);
    let totalPrincipal = Currency.of(0);
    let totalUnused = Currency.of(0);

    this.active.forEach((record) => {
      const recordSummary = record.summary;
      total = total.add(recordSummary.total);
      totalInterest = totalInterest.add(recordSummary.totalInterest);
      totalFees = totalFees.add(recordSummary.totalFees);
      totalPrincipal = totalPrincipal.add(recordSummary.totalPrincipal);
    });

    return {
      total: total,
      totalInterest: totalInterest,
      totalFees: totalFees,
      totalPrincipal: totalPrincipal,
      totalUnused: totalUnused,
    };
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return this._records.map((r) => r.json);
  }
}

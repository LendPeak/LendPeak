/* ChangePaymentDates.ts */
import { ChangePaymentDate, ChangePaymentDateParams } from "./ChangePaymentDate";

export class ChangePaymentDates {
  private _changePaymentDates: ChangePaymentDate[] = [];
  private _modified = false; // simple dirty tracker

  /* ───────────────────────── constructor ───────────────────────── */
  constructor(changePaymentDates: ChangePaymentDate[] | ChangePaymentDateParams[] = []) {
    this.changePaymentDates = changePaymentDates as any;
  }

  /* ─────────────────────── model/UI helpers ─────────────────────── */
  updateModelValues(): void {
    this.changePaymentDates.forEach((c) => c.updateModelValues());
  }
  updateJsValues(): void {
    this.changePaymentDates.forEach((c) => c.updateJsValues());
  }

  /* ──────────────────────── collections ──────────────────────── */
  /** original “all” — returns every entry, active or not */
  get all(): ChangePaymentDate[] {
    return this.changePaymentDates;
  }

  /** convenience — only active entries */
  get active(): ChangePaymentDate[] {
    return this._changePaymentDates.filter((c) => c.active);
  }

  get changePaymentDates(): ChangePaymentDate[] {
    return this._changePaymentDates;
  }
  set changePaymentDates(val: ChangePaymentDate[] | ChangePaymentDateParams[]) {
    if (!val || val.length === 0) {
      this._changePaymentDates = [];
      return;
    }

    /* ① normalise */
    const entries = val.map((v) => (v instanceof ChangePaymentDate ? v : new ChangePaymentDate(v)));

    /* ② split */
    const dateBased = entries.filter((c) => c.termNumber < 0);
    const normal = entries.filter((c) => c.termNumber >= 0);

    if (dateBased.length === 0) {
      this._changePaymentDates = entries;
    } else {
      /* ③ sort by originalDate asc */
      dateBased.sort((a, b) => {
        if (!a.originalDate && !b.originalDate) return 0;
        if (!a.originalDate) return -1;
        if (!b.originalDate) return 1;
        return a.originalDate.isAfter(b.originalDate) ? 1 : -1;
      });

      /* ④ merge overlapping/touching */
      const merged: ChangePaymentDate[] = [];
      let current = dateBased[0];
      for (let i = 1; i < dateBased.length; i++) {
        const next = dateBased[i];
        if (!current.originalDate || !next.originalDate) {
          merged.push(current);
          current = next;
          continue;
        }

        /* treat newDate as “end” per original comment */
        const curEnd = current.newDate;
        if (next.originalDate.isBefore(curEnd) || next.originalDate.isEqual(curEnd)) {
          if (next.newDate.isAfter(curEnd)) current.newDate = next.newDate;
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);

      /* ⑤ combine & sort by newDate */
      this._changePaymentDates = [...normal, ...merged].sort((a, b) => (a.newDate.isBefore(b.newDate) ? -1 : 1));
    }

    this._modified = true;
  }

  /* ───────────────────── activation helpers ───────────────────── */
  activateAll(): void {
    this._changePaymentDates.forEach((c) => (c.active = true));
    this._modified = true;
  }
  deactivateAll(): void {
    this._changePaymentDates.forEach((c) => (c.active = false));
    this._modified = true;
  }

  /* ───────────────────────── CRUD helpers ───────────────────────── */
  addChangePaymentDate(cpd: ChangePaymentDate): void {
    this.changePaymentDates.push(cpd);
  }

  removeChangePaymentDate(cpd: ChangePaymentDate): void {
    this.changePaymentDates = this.changePaymentDates.filter((entry) => entry.termNumber !== cpd.termNumber);
  }

  removeConfigurationAtIndex(index: number): void {
    this.changePaymentDates.splice(index, 1);
  }

  /* ───────────────────────── look-ups ───────────────────────── */
  /** returns first *active* entry for term */
  getChangePaymentDate(termNumber: number): ChangePaymentDate | undefined {
    return this.changePaymentDates.find((cpd) => cpd.active && cpd.termNumber === termNumber);
  }

  getChangePaymentDateIndex(termNumber: number): number {
    return this.changePaymentDates.findIndex((cpd) => cpd.termNumber === termNumber);
  }

  /* ───────────────────────── misc helpers ───────────────────────── */
  get length(): number {
    return this.changePaymentDates.length;
  }
  atIndex(i: number): ChangePaymentDate {
    return this.changePaymentDates[i];
  }
  get first(): ChangePaymentDate {
    return this.changePaymentDates[0];
  }
  get last(): ChangePaymentDate {
    return this.changePaymentDates[this.changePaymentDates.length - 1];
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    return this._changePaymentDates.filter((cpd) => cpd.termNumber === termNumber).length > 1;
  }

  reSort(): void {
    this.changePaymentDates = this.changePaymentDates.sort((a, b) => (a.termNumber < b.termNumber ? -1 : 1));
  }

  /* ───────────────────────── serialization ───────────────────────── */
  get json() {
    return this.changePaymentDates.map((cpd) => cpd.json);
  }
  toJSON() {
    return this.json;
  }
}

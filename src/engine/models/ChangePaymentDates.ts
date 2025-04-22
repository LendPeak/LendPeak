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

    // 1) Normalize into ChangePaymentDate instances
    const allEntries = value.map((c) => (c instanceof ChangePaymentDate ? c : new ChangePaymentDate(c)));

    // 2) Split negative-term (date-based) from normal
    const dateBased = allEntries.filter((cpd) => cpd.termNumber < 0);
    const normal = allEntries.filter((cpd) => cpd.termNumber >= 0);

    // If no date-based entries, we’re done
    if (dateBased.length === 0) {
      this._changePaymentDates = allEntries;
      return;
    }

    // 3) Sort date-based by originalDate ascending
    const sorted = dateBased.sort((a, b) => {
      if (!a.originalDate && !b.originalDate) return 0;
      if (!a.originalDate) return -1;
      if (!b.originalDate) return 1;
      return a.originalDate.isAfter(b.originalDate) ? 1 : -1;
    });

    // 4) Merge overlapping or touching
    const merged: ChangePaymentDate[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // If either is missing start/end, handle per your biz rules.
      // For simplicity, assume they both have originalDate (start).
      if (!current.originalDate || !next.originalDate) {
        // Just treat as separate intervals
        merged.push(current);
        current = next;
        continue;
      }

      // Decide the "end" if you are using newDate as "end" or originalEndDate as "end".
      // For demonstration, I'll assume `newDate` is effectively the "end" of the interval.
      // If you actually use `originalEndDate` for the end, replace references below.

      // The “start” is current.originalDate
      // The “end” is current.newDate
      const currentStart = current.originalDate;
      const currentEnd = current.newDate; // if you treat newDate as an end

      const nextStart = next.originalDate;
      const nextEnd = next.newDate;

      // Overlap if nextStart <= currentEnd
      // or “touch” if nextStart == currentEnd
      if (nextStart.isEqual(currentEnd) || nextStart.isBefore(currentEnd)) {
        // Merge intervals => extend current “end” if nextEnd is later
        if (nextEnd.isAfter(currentEnd)) {
          current.newDate = nextEnd; // the new "end"
        }
        // Do not push yet; we’re still merging into `current`
      } else {
        // No overlap => push current, move on
        merged.push(current);
        current = next;
      }
    }

    // push the final
    merged.push(current);

    // 5) Re-combine with normal entries
    this._changePaymentDates = [...normal, ...merged];

    // sort by newDate from oldest to newest
    this._changePaymentDates = this._changePaymentDates.sort((a, b) => {
      return a.newDate.isBefore(b.newDate) ? -1 : 1;
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

import { PeriodSchedule } from "./PeriodSchedule";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class PeriodSchedules {
  private _periods: PeriodSchedule[] = [];

  constructor(periods: PeriodSchedule[] = []) {
    this.periods = periods;
  }

  updateModelValues() {
    this._periods.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._periods.forEach((bm) => bm.updateJsValues());
  }

  get all(): PeriodSchedule[] {
    return this._periods;
  }

  get hasCustomPeriods(): boolean {
    return this._periods.some((period) => period.type === "custom");
  }

  get allCustomPeriods(): PeriodSchedule[] {
    return this._periods.filter((period) => period.type === "custom");
  }

  get periods() {
    return this._periods;
  }

  set periods(value) {
    const periods: PeriodSchedule[] = [];
    value.forEach((period) => {
      if (!(period instanceof PeriodSchedule)) {
        periods.push(new PeriodSchedule(period));
      } else {
        periods.push(period);
      }
    });
    this._periods = periods;
  }

  reset() {
    this._periods = [];
  }

  // proxy forEach method that is a proxy to the periods array
  forEach(callbackfn: (value: PeriodSchedule, index: number, array: PeriodSchedule[]) => void) {
    this._periods.forEach(callbackfn);
  }

  addPeriod(period: PeriodSchedule) {
    this.periods.push(period);
  }
  removePeriod(index: number) {
    this.periods.splice(index, 1);
  }

  atIndex(index: number): PeriodSchedule {
    // index must must be 0 or greater,
    // if it is not, return the first period
    if (index < 0) {
      return this.firstPeriod;
    }
    return this.periods[index];
  }

  get length(): number {
    return this.periods.length;
  }

  get lastPeriod(): PeriodSchedule {
    return this.periods[this.length - 1];
  }

  get firstPeriod(): PeriodSchedule {
    return this.periods[0];
  }

  get json() {
    return this._periods.map((r) => r.json);
  }

  toJSON() {
    return this.json;
  }
}

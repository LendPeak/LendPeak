import { RateSchedule } from "./RateSchedule";

export class RateSchedules {
  private _schedules: RateSchedule[] = [];
  private _modified: boolean = false;

  constructor(schedules: RateSchedule[] = []) {
    this.schedules = schedules;
    this.updateJsValues();
    this.modified = false;
  }

  resetModified() {
    this.modified = false;
    this._schedules.forEach((bm) => (bm.modified = false));
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  get hasModified(): boolean {
    return this.modified || this._schedules.some((bm) => bm.modified);
  }

  updateModelValues() {
    this._schedules.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._schedules.forEach((bm) => bm.updateJsValues());
  }

  get schedules(): RateSchedule[] {
    return this._schedules;
  }

  set schedules(value: RateSchedule[]) {
    // check type and inflate if necessary

    this._schedules = value.map((c) => {
      if (c instanceof RateSchedule) {
        return c;
      }
      return new RateSchedule(c);
    });

    this.modified = true;
  }

  get all(): RateSchedule[] {
    return this._schedules;
  }

  get allCustom(): RateSchedule[] {
    return this._schedules.filter((c) => c.type === "custom");
  }

  get allCustomAsObject(): RateSchedules {
    return new RateSchedules(this._schedules.filter((c) => c.type === "custom"));
  }

  get hasCustom(): boolean {
    return this.allCustom.length > 0;
  }

  addSchedule(schedule: RateSchedule) {
    this.modified = true;

    this._schedules.push(schedule);
  }

  addScheduleAtTheBeginning(schedule: RateSchedule) {
    this.modified = true;

    this._schedules.unshift(schedule);
  }

  removeScheduleById(id: string) {
    this.modified = true;

    const index = this._schedules.findIndex((c) => c.id === id);
    if (index > -1) {
      this._schedules.splice(index, 1);
    }
  }

  removeScheduleAtIndex(index: number) {
    this.modified = true;

    this._schedules.splice(index, 1);
  }

  get length(): number {
    return this._schedules.length;
  }

  atIndex(index: number): RateSchedule {
    return this._schedules[index];
  }

  get first(): RateSchedule {
    return this._schedules[0];
  }

  get last(): RateSchedule {
    return this._schedules[this._schedules.length - 1];
  }

  get json() {
    const json = this._schedules.map((s) => s.json);
    return json;
  }
}

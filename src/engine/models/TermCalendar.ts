import { Decimal } from "decimal.js";
import { Calendar } from "./Calendar";

export class TermCalendar {
  _termNumber!: number;
  _calendar!: Calendar;
  active: boolean = true;
  jsTermNumber!: number;

  constructor(params: { termNumber: number; calendar: Calendar; active?: boolean }) {
    this.termNumber = params.termNumber;
    this.calendar = params.calendar;
    if (params.active !== undefined) {
      this.active = params.active;
    }
  }

  get termNumber(): number {
    return this._termNumber;
  }

  set termNumber(value: number) {
    this._termNumber = value;
    this.jsTermNumber = value;
  }

  get calendar(): Calendar {
    return this._calendar;
  }

  set calendar(value: Calendar) {
    if (value instanceof Calendar) {
      this._calendar = value;
    } else {
      this._calendar = new Calendar(value);
    }
  }

  updateModelValues(): void {
    this.termNumber = this.jsTermNumber;
  }

  updateJsValues(): void {
    this.jsTermNumber = this.termNumber;
  }

  get json() {
    return {
      termNumber: this.termNumber,
      calendar: this.calendar.calendarType,
    };
  }
}

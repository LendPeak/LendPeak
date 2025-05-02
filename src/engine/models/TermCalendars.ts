import { Calendar, CalendarType } from "./Calendar";
import { TermCalendar } from "./TermCalendar";

export class TermCalendars {
  private _calendars: TermCalendar[] = [];
  private _primary!: Calendar;

  constructor(params: { primary: Calendar | CalendarType ; calendars?: TermCalendar[] }) {
    if (params.calendars) {
      this.calendars = params.calendars;
    }

    this.primary = params.primary;
    this.updateJsValues();
  }

  set primary(value: Calendar | CalendarType ) {
    if (value instanceof Calendar) {
      this._primary = value;
      return;
    }
    this._primary = new Calendar(value);
  }

  get primary(): Calendar {
    return this._primary;
  }

  updateModelValues() {
    this._calendars.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._calendars.forEach((bm) => bm.updateJsValues());
  }

  get calendars(): TermCalendar[] {
    return this._calendars;
  }

  get hasCustomCalendars(): boolean{
    return this._calendars.length > 0;
  }

  getCalendarForTerm(term: number, includeInactive = false): Calendar {
    const calendar = this._calendars.find((c) => c.termNumber === term && (c.active === true || includeInactive));
    if (calendar) {
      return calendar.calendar;
    }
    return this.primary;
  }

  hasCalendarForTerm(term: number): boolean {
    return this._calendars.some((c) => c.termNumber === term);
  }

  isDuplicateTermNumber(termNumber: number): boolean {
    return this._calendars.filter((val) => val.termNumber === termNumber).length > 1;
  }

  deactivateAll() {
    this._calendars.forEach((bm) => (bm.active = false));
  }

  activateAll() {
    this._calendars.forEach((bm) => (bm.active = true));
  }

  set calendars(value: TermCalendar[]) {
    this._calendars = value.map((c) => {
      if (c instanceof TermCalendar) {
        return c;
      }
      return new TermCalendar(c);
    });
  }

  get all(): TermCalendar[] {
    return this._calendars;
  }

  get active(): TermCalendar[] {
    return this._calendars.filter((bm) => bm.active === true);
  }

  reSort() {
    this.updateModelValues();
    this._calendars = this._calendars.sort((a, b) => {
      return a.termNumber - b.termNumber;
    });
    this.updateJsValues();
  }

  addCalendar(schedule: TermCalendar) {
    this._calendars.push(schedule);
  }

  removeCalendarAtIndex(index: number) {
    this._calendars.splice(index, 1);
  }

  removeAllCalendars() {
    this._calendars = [];
  }

  get length(): number {
    return this._calendars.length;
  }

  atIndex(index: number): TermCalendar {
    return this._calendars[index];
  }

  get first(): TermCalendar {
    return this._calendars[0];
  }

  get last(): TermCalendar {
    return this._calendars[this._calendars.length - 1];
  }

  get json() {
    const json = this._calendars.map((s) => s.json);
    const valueToReturn = {
      calendars: json,
      primary: this.primary.calendarType,
    };
    return valueToReturn;
  }
}

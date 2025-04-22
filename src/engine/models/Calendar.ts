import { LocalDate, TemporalAdjusters, ChronoUnit } from "@js-joda/core";
import { DateUtil } from "../utils/DateUtil";

/**
 * Enum representing different calendar types.
 *
 * - `ACTUAL_ACTUAL`: Uses actual days between two dates.
 * - `ACTUAL_360`: Scales the actual number of days to a 360-day year.
 * - `ACTUAL_365`: Uses actual days between two dates, assuming a 365-day year.
 * - `THIRTY_360`: Assumes 30 days per month and 360 days per year.
 * - `THIRTY_ACTUAL`: Uses 30 days per month when over 30 days, otherwise actual days.
 */
export enum CalendarType {
  ACTUAL_ACTUAL = 0,
  ACTUAL_360 = 1,
  ACTUAL_365 = 2,
  THIRTY_360 = 3,
  THIRTY_ACTUAL = 4,
}

/**
 * Calendar class for performing date arithmetic according to different calendar conventions.
 *
 * Uses js-joda's LocalDate for date manipulations and calculates days according to various calendar types.
 */
export class Calendar {
  calendarType: CalendarType;
  private _date!: LocalDate;

  constructor(calendarType?: CalendarType | string, date?: LocalDate) {
    if (calendarType === undefined || calendarType === null) {
      console.debug("CalendarType is undefined, defaulting to ACTUAL_ACTUAL");
      calendarType = CalendarType.ACTUAL_ACTUAL;
    }

    if (date === undefined || date === null) {
      // console.debug("Date is undefined, defaulting to today");
      date = DateUtil.today();
    }

    if (typeof calendarType === "string") {
      switch (calendarType) {
        case "ACTUAL_ACTUAL":
          calendarType = CalendarType.ACTUAL_ACTUAL;
          break;
        case "ACTUAL_360":
          calendarType = CalendarType.ACTUAL_360;
          break;
        case "ACTUAL_365":
          calendarType = CalendarType.ACTUAL_365;
          break;
        case "THIRTY_360":
          calendarType = CalendarType.THIRTY_360;
          break;
        case "THIRTY_ACTUAL":
          calendarType = CalendarType.THIRTY_ACTUAL;
          break;
        default:
          calendarType = CalendarType.THIRTY_360;
      }
    }
    this.calendarType = calendarType;
    this.date = date;
  }

  set date(date: LocalDate | string | number | Date | null | undefined) {
    this._date = DateUtil.normalizeDate(date);
  }

  get date(): LocalDate {
    return this._date;
  }

  get userFriendlyName(): string {
    switch (this.calendarType) {
      case CalendarType.ACTUAL_ACTUAL:
        return "Actual/Actual";
      case CalendarType.ACTUAL_360:
        return "Actual/360";
      case CalendarType.ACTUAL_365:
        return "Actual/365";
      case CalendarType.THIRTY_360:
        return "30/360";
      case CalendarType.THIRTY_ACTUAL:
        return "30/Actual";
      default:
        return "Unknown";
    }
  }

  setCalendarType(type: CalendarType) {
    this.calendarType = type;
  }

  getCalendarType(): CalendarType {
    return this.calendarType;
  }

  daysBetween(date1: LocalDate, date2: LocalDate): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
        return this.daysBetween30_360_European(date1, date2);
      case CalendarType.THIRTY_ACTUAL:
        return this.daysBetween30_Actual(date1, date2);
      case CalendarType.ACTUAL_360:
      case CalendarType.ACTUAL_ACTUAL:
        return this.daysBetweenActual(date1, date2);
      case CalendarType.ACTUAL_365:
        return this.daysBetweenActual365(date1, date2);
      default:
        throw new Error("Invalid calendar type");
    }
  }

  monthsBetween(date1: LocalDate, date2: LocalDate): number {
    return this.daysBetween(date1, date2) / 30;
  }

  addMonths(date: LocalDate, months: number): LocalDate {
    if (this.calendarType === CalendarType.THIRTY_360 || this.calendarType === CalendarType.THIRTY_ACTUAL) {
      let newDate = date.plusMonths(months);
      if (date.dayOfMonth() === 31 || this.isLastDayOfFebruary(date)) {
        newDate = newDate.withDayOfMonth(30);
      }
      return newDate;
    }
    return date.plusMonths(months);
  }

  daysInMonth(date: LocalDate): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.THIRTY_ACTUAL:
        return 30;
      default:
        return date.lengthOfMonth();
    }
  }

  daysInYear(date?: LocalDate): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.ACTUAL_360:
        return 360;
      case CalendarType.ACTUAL_365:
        return 365;
      case CalendarType.ACTUAL_ACTUAL:
      case CalendarType.THIRTY_ACTUAL:
        if (!date) {
          date = this.date;
        }
        return date.isLeapYear() ? 366 : 365;
      default:
        throw new Error("Invalid calendar type");
    }
  }

  private daysBetweenActual(date1: LocalDate, date2: LocalDate): number {
    return ChronoUnit.DAYS.between(date1, date2);
  }

  private daysBetweenActual365(date1: LocalDate, date2: LocalDate): number {
    let days = 0;
    const isReverse = date1.isAfter(date2);
    let start = isReverse ? date2 : date1;
    let end = isReverse ? date1 : date2;

    while (start.isBefore(end)) {
      if (!(start.monthValue() === 2 && start.dayOfMonth() === 29)) {
        days++;
      }
      start = start.plusDays(1);
    }

    return isReverse ? -days : days;
  }

  private daysBetween30_360_European(startDate: LocalDate, endDate: LocalDate): number {
    let d1 = startDate.dayOfMonth() === 31 ? 30 : startDate.dayOfMonth();
    let d2 = endDate.dayOfMonth() === 31 ? 30 : endDate.dayOfMonth();
    return 360 * (endDate.year() - startDate.year()) + 30 * (endDate.monthValue() - startDate.monthValue()) + (d2 - d1);
  }

  private daysBetween30_Actual(startDate: LocalDate, endDate: LocalDate): number {
    return this.daysBetween30_360_European(startDate, endDate);
  }

  private isLastDayOfFebruary(date: LocalDate): boolean {
    return date.monthValue() === 2 && date.dayOfMonth() === date.lengthOfMonth();
  }

  isDateBetween(date: LocalDate, startDate: LocalDate, endDate: LocalDate): boolean {
    return date.isEqual(startDate) || (date.isAfter(startDate) && date.isBefore(endDate));
  }
}

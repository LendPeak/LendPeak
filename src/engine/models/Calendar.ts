import dayjs, { Dayjs } from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isLeapYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
  ACTUAL_ACTUAL,
  ACTUAL_360,
  ACTUAL_365,
  THIRTY_360,
  THIRTY_ACTUAL,
}

/**
 * Calendar class for performing date arithmetic according to different calendar conventions.
 *
 * This class uses dayjs for date manipulations and can calculate the number of days between two dates
 * according to various calendar types like 30/360, 30/Actual, etc.
 */
export class Calendar {
  calendarType: CalendarType;

  /**
   * Creates an instance of the Calendar class with a specified calendar type.
   *
   * @param calendarType - The type of calendar convention to use. Defaults to `ACTUAL_ACTUAL`.
   */
  constructor(calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL) {
    this.calendarType = calendarType;
  }

  /**
   * Sets the calendar type for the instance.
   *
   * @param type - The calendar type to set.
   */
  setCalendarType(type: CalendarType) {
    this.calendarType = type;
  }

  /**
   * Gets the current calendar type of the instance.
   *
   * @returns {CalendarType} - The current calendar type.
   */
  getCalendarType(): CalendarType {
    return this.calendarType;
  }

  /**
   * Calculates the number of days between two dates according to the current calendar type.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The number of days between the two dates based on the calendar type.
   */
  daysBetween(date1: Dayjs, date2: Dayjs): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
        return this.daysBetween30_360(date1, date2);
      case CalendarType.THIRTY_ACTUAL:
        return this.daysBetween30_Actual(date1, date2);
      case CalendarType.ACTUAL_360:
        return this.daysBetweenActual_360(date1, date2);
      case CalendarType.ACTUAL_365:
        return this.daysBetweenActual_365(date1, date2);
      case CalendarType.ACTUAL_ACTUAL:
      default:
        return this.daysBetweenActual_Actual(date1, date2);
    }
  }

  /**
   * Adds a specified number of months to a date.
   *
   * @param date - The date to add months to.
   * @param months - The number of months to add.
   * @returns {Dayjs} - The new date with the added months.
   */
  addMonths(date: Dayjs, months: number): Dayjs {
    return date.add(months, "month");
  }

  /**
   * Gets the number of days in the month of a given date according to the current calendar type.
   *
   * @param date - The date to get the number of days in its month.
   * @returns {number} - The number of days in the month based on the calendar type.
   */
  daysInMonth(date: Dayjs): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.THIRTY_ACTUAL:
        return 30;
      case CalendarType.ACTUAL_360:
      case CalendarType.ACTUAL_365:
      case CalendarType.ACTUAL_ACTUAL:
      default:
        return date.daysInMonth();
    }
  }

  /**
   * Gets the number of days in a year according to the current calendar type.
   *
   * @returns {number} - The number of days in the year based on the calendar type.
   */
  daysInYear(): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.ACTUAL_360:
        return 360;
      case CalendarType.ACTUAL_365:
      case CalendarType.ACTUAL_ACTUAL:
      case CalendarType.THIRTY_ACTUAL:
        return 365;
      default: // This should never happen
        throw new Error("Invalid calendar type");
    }
  }

  /**
   * Calculates the number of days between two dates using the Actual/Actual convention.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The actual number of days between the two dates.
   */
  private daysBetweenActual_Actual(date1: Dayjs, date2: Dayjs): number {
    return date2.diff(date1, "day");
  }

  /**
   * Calculates the number of days between two dates using the Actual/360 convention.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The number of days, scaled to a 360-day year.
   */
  private daysBetweenActual_360(date1: Dayjs, date2: Dayjs): number {
    const actualDays = date2.diff(date1, "day");
    return Math.floor(actualDays * (360 / 365));
  }

  /**
   * Calculates the number of days between two dates using the Actual/365 convention.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The actual number of days between the two dates, assuming a 365-day year.
   */
  private daysBetweenActual_365(date1: Dayjs, date2: Dayjs): number {
    return date2.diff(date1, "day");
  }

  /**
   * Calculates the number of days between two dates using the 30/360 convention.
   * Assumes 30 days per month and 360 days per year.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The number of days based on 30/360 convention.
   */
  private daysBetween30_360(date1: Dayjs, date2: Dayjs): number {
    const d1 = this.adjustDate30_360(date1);
    const d2 = this.adjustDate30_360(date2);
    return (d2.year() - d1.year()) * 360 + (d2.month() - d1.month()) * 30 + (d2.date() - d1.date());
  }

  /**
   * Calculates the number of days between two dates using the 30/Actual convention.
   * Uses 30 days per month when over 30 days, otherwise actual days.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The number of days based on 30/Actual convention.
   */
  private daysBetween30_Actual(date1: Dayjs, date2: Dayjs): number {
    const days30_360 = this.daysBetween30_360(date1, date2);
    const actualDays = date2.diff(date1, "day");
    return actualDays < 30 ? actualDays : days30_360;
  }

  /**
   * Adjusts a date for the 30/360 convention by changing the day of the month to 30 if it is 31.
   *
   * @param date - The date to adjust.
   * @returns {Dayjs} - The adjusted date.
   */
  private adjustDate30_360(date: Dayjs): Dayjs {
    const day = date.date() === 31 ? 30 : date.date();
    return date.date(day);
  }

  /**
   * Checks if a date is between two other dates.
   *
   * @param date - The date to check.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns {boolean} - `true` if the date is between the two dates, `false` otherwise.
   */
  isDateBetween(date: Dayjs, startDate: Dayjs, endDate: Dayjs): boolean {
    return date.isSameOrAfter(startDate) && date.isSameOrBefore(endDate);
  }
}

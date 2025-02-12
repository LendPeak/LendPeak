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
  ACTUAL_ACTUAL = 0,
  ACTUAL_360 = 1,
  ACTUAL_365 = 2,
  THIRTY_360 = 3,
  THIRTY_ACTUAL = 4,
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
  constructor(calendarType: CalendarType | string = CalendarType.ACTUAL_ACTUAL) {
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
      case CalendarType.ACTUAL_360:
        return this.daysBetween30_360_European(date1, date2);
      case CalendarType.THIRTY_ACTUAL:
        return this.daysBetween30_Actual(date1, date2);
      // case CalendarType.ACTUAL_360:
      //   return this.daysBetweenActual_360(date1, date2);
      case CalendarType.ACTUAL_365:
        return this.daysBetweenActual_365(date1, date2);
      case CalendarType.ACTUAL_ACTUAL:
      default:
        return this.daysBetweenActual_Actual(date1, date2);
    }
  }

  monthsBetween(date1: Dayjs, date2: Dayjs): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.ACTUAL_360:
        return this.daysBetween30_360_European(date1, date2) / 30;
      case CalendarType.THIRTY_ACTUAL:
        return this.daysBetween30_Actual(date1, date2) / 30;
      // case CalendarType.ACTUAL_360:
      //   return this.daysBetweenActual_360(date1, date2) / 30;
      case CalendarType.ACTUAL_365:
        return this.daysBetweenActual_365(date1, date2) / 30;
      case CalendarType.ACTUAL_ACTUAL:
      default:
        return this.daysBetweenActual_Actual(date1, date2) / 30;
    }
  }

  /**
   * Adds a specified number of months to a date according to the current calendar type.
   *
   * @param date - The date to add months to.
   * @param months - The number of months to add.
   * @returns {Dayjs} - The new date with the added months.
   */
  addMonths(date: Dayjs, months: number): Dayjs {
    // Handle 30/360 specific adjustments if needed
    if (this.calendarType === CalendarType.THIRTY_360 || this.calendarType === CalendarType.THIRTY_ACTUAL) {
      const newDate = date.add(months, "month");
      // If the original date was on the 31st or last day of February, adjust to 30
      if (date.date() === 31 || this.isLastDayOfFebruary(date)) {
        return newDate.date(30);
      }
      return newDate;
    } else {
      // For actual calendars, simply add months
      return date.add(months, "month");
    }
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

    // Avoid negative or zero actual days
    if (actualDays <= 0) {
      return actualDays;
    }

    // Calculate scaled days using the scaling factor
    const scalingFactor = 360 / 365;

    if (actualDays === 1) {
      return 1;
    } else {
      return Math.floor(actualDays * scalingFactor);
    }
  }

  /**
   * Calculates the number of days between two dates using the Actual/365 convention.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The actual number of days between the two dates, assuming a 365-day year.
   */
  private daysBetweenActual_365(startDate: Dayjs, endDate: Dayjs): number {
    startDate = startDate.startOf("day");
    endDate = endDate.startOf("day");
    // Calculate total number of days between the two dates
    const totalDaysDiff = endDate.diff(startDate, "day");

    // Count leap days (Feb 29) between start and end dates
    let leapDays = 0;
    for (let year = startDate.year(); year <= endDate.year(); year++) {
      if (dayjs(`${year}`).isLeapYear()) {
        // Check if Feb 29 is between the start and end date
        const leapDay = dayjs(`${year}-02-29`).startOf("day");
        if (leapDay.isAfter(startDate) && leapDay.isBefore(endDate)) {
          leapDays += 1;
        }
      }
    }

    // Subtract leap days to ignore them in Actual/365 convention
    const adjustedDaysDiff = totalDaysDiff - leapDays;

    return adjustedDaysDiff;
  }

  /**
   * Calculates the number of days between two dates using the 30/360 convention.
   * Assumes 30 days per month and 360 days per year.
   *
   * @param date1 - The start date.
   * @param date2 - The end date.
   * @returns {number} - The number of days based on 30/360 convention.
   */
  private daysBetween30_360(startDate: Dayjs, endDate: Dayjs): number {
    // Extract date components
    let Y1 = startDate.year();
    let M1 = startDate.month() + 1; // dayjs months are 0-indexed
    let D1 = startDate.date();
    let Y2 = endDate.year();
    let M2 = endDate.month() + 1;
    let D2 = endDate.date();

    // Adjust day values according to the 30/360 convention
    if (D1 === 31 || this.isLastDayOfFebruary(startDate)) {
      D1 = 30;
    }

    if (D2 === 31 && D1 === 30) {
      D2 = 30;
    }

    // Calculate days between
    const days = 360 * (Y2 - Y1) + 30 * (M2 - M1) + (D2 - D1);
    return days;
  }

  private daysBetween30_360_European(startDate: Dayjs, endDate: Dayjs): number {
    // Extract date components
    let Y1 = startDate.year();
    let M1 = startDate.month() + 1; // dayjs months are 0-indexed
    let D1 = startDate.date();
    let Y2 = endDate.year();
    let M2 = endDate.month() + 1;
    let D2 = endDate.date();

    // Adjust day values according to the 30E/360 convention
    if (D1 === 31) {
      D1 = 30;
    }

    if (D2 === 31) {
      D2 = 30;
    }

    // Calculate days between
    const days = 360 * (Y2 - Y1) + 30 * (M2 - M1) + (D2 - D1);
    return days;
  }

  /**
   * Checks if the given date is the last day of February.
   *
   * @param date - The date to check.
   * @returns {boolean} - True if the date is the last day of February, false otherwise.
   */
  private isLastDayOfFebruary(date: Dayjs): boolean {
    return date.month() === 1 && date.date() === date.daysInMonth();
  }

  /**
   * Calculates the number of days between two dates using the 30/Actual convention.
   * Uses 30 days per month but actual days per year.
   *
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns {number} - The number of days based on the 30/Actual convention.
   */
  private daysBetween30_Actual(startDate: Dayjs, endDate: Dayjs): number {
    // Use the 30/360 day count for days between
    return this.daysBetween30_360_European(startDate, endDate);
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

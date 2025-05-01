import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { LocalDate, ZoneId, LocalDateTime, Instant, ZoneOffset } from "@js-joda/core";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type DateUtilNormalizeDateParams = LocalDate | Date | string | number | null | undefined | { day: number; month: number; year: number };

export class DateUtil {
  static now(): LocalDate {
    return LocalDate.now();
  }
  static today(): LocalDate {
    return LocalDate.now();
  }
  static tomorrow(): LocalDate {
    return LocalDate.now().plusDays(1);
  }
  static yesterday(): LocalDate {
    return LocalDate.now().minusDays(1);
  }
  static startOfMonth(): LocalDate {
    return LocalDate.now().withDayOfMonth(1);
  }
  static endOfMonth(): LocalDate {
    return LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
  }

  static normalizeDate(date: DateUtilNormalizeDateParams): LocalDate {
    if (date === null || date === undefined || date === "") {
      console.error("DateUtil received null or undefined date");
      throw new Error("DateUtil received null or undefined date");
    }

    try {
      if (date instanceof LocalDate) {
        return date;
      }

      if (date instanceof Date) {
        return LocalDate.of(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      }

      if (typeof date === "number") {
        const jsDate = new Date(date);
        return LocalDate.of(jsDate.getUTCFullYear(), jsDate.getUTCMonth() + 1, jsDate.getUTCDate());
      }

      if (typeof date === "string") {
        // ensure only YYYY-MM-DD is taken
        return LocalDate.parse(date.substring(0, 10));
      }

      if (typeof date === "object" && date !== null && "day" in date && "month" in date && "year" in date) {
        return LocalDate.of(date.year, date.month + 1, date.day);
      }
    } catch (e) {
      console.error("Error normalizing date, passed date:", date, "error:", e);
      throw new Error("Invalid date format");
    }

    console.error("DateUtil received unknown type for date normalization", date);
    throw new Error("Invalid date format");
  }

  static toIsoDateString(date: Date | LocalDate | string | undefined | null): string {
    if (!date) return "";

    if (date instanceof LocalDate) {
      return date.toString(); // Already YYYY-MM-DD
    }

    if (date instanceof Date) {
      return LocalDate.of(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()).toString();
    }

    if (typeof date === "string") {
      return date.substring(0, 10); // Extract YYYY-MM-DD
    }

    return "";
  }

  // function returns Date object but discards the time part and timezone
  // ensuring that that the date is the same in all timezones.
  // this helps in UI to display the same date in all timezones
  // and it returns regular javascript Date
  static normalizeDateToJsDate(date: LocalDate): Date {
    // if (dayjs.isDayjs(date)) {
    //   return new Date(date.year(), date.month(), date.date());
    // } else {
    try {
      const jsDate = new Date(date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli());
      return jsDate;
    } catch (e) {
      console.error("Error normalizing date to JS Date", e);
      throw new Error("Invalid date format");
    }

    // }
  }

  // equivalent to dayjs date.isBetween(period.startDate, period.endDate, "day", "[)")
  static isBetweenHalfOpen(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
    return (date.isEqual(start) || date.isAfter(start)) && date.isBefore(end);
  }

  // equivalent this.payoffDate.isBetween(startDate, endDate, "day", "[]")

  static isBetweenInclusive(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
    return (date.isEqual(start) || date.isAfter(start)) && (date.isEqual(end) || date.isBefore(end));
  }

  static isSameOrAfter(date: LocalDate, other: LocalDate): boolean {
    return date.isEqual(other) || date.isAfter(other);
  }
  static isSameOrBefore(date: LocalDate, other: LocalDate): boolean {
    return date.isEqual(other) || date.isBefore(other);
  }

  /**
   * Parses LoanPro date string (/Date(1234567890)/) into a LocalDate.
   * This method completely discards timezone and time, keeping only the date.
   */
  static parseLoanProDateToLocalDate(dateString: string): LocalDate {
    try {
      const timestamp = parseInt(dateString.replace("/Date(", "").replace(")/", ""), 10);
      return LocalDate.ofInstant(Instant.ofEpochSecond(timestamp), ZoneOffset.UTC);
    } catch (e) {
      console.error("Error parsing LoanPro date", e);
      throw new Error("Invalid LoanPro date format");
    }
  }

  /**
   * Parses LoanPro date string (/Date(1234567890)/) into a LocalDateTime.
   * This method keeps date and time, but completely discards the timezone.
   */
  static parseLoanProDateToLocalDateTime(dateString: string): LocalDateTime {
    const timestamp = parseInt(dateString.replace("/Date(", "").replace(")/", ""), 10);
    return LocalDateTime.ofInstant(Instant.ofEpochSecond(timestamp), ZoneOffset.UTC);
  }

  static monthsBetween(date1: LocalDate, date2: LocalDate): number {
    // Ensure date1 is the earlier date for calculation simplicity
    let start = date1;
    let end = date2;
    let sign = 1; // 1 if date2 >= date1, -1 if date2 < date1

    // If date1 is actually after date2, swap them and flip the sign
    if (date1.isAfter(date2)) {
      start = date2;
      end = date1;
      sign = -1;
    }

    const yearDiff = end.year() - start.year();
    const monthDiff = end.monthValue() - start.monthValue();

    // Calculate the preliminary total months difference
    let totalMonths = yearDiff * 12 + monthDiff;

    // Adjustment: If the end day is earlier than the start day,
    // the last month hasn't fully passed relative to the start day.
    if (end.dayOfMonth() < start.dayOfMonth()) {
      totalMonths--;
    }

    // Apply the sign based on the original order
    return sign * totalMonths;
  }
}

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
export type DateUtilNormalizeDateTimeParams = LocalDateTime | Date | string | number | null | undefined | { day: number; month: number; year: number };

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

    // Check string length before entering try block
    if (typeof date === "string" && date.length < 10) {
      throw new Error("Date string too short, expected format YYYY-MM-DD");
    }

    try {
      if (date instanceof LocalDate) {
        return date;
      }

      if (date instanceof Date) {
        // Use local date components to ensure timezone-agnostic behavior
        // This ensures the date selected in UI is the date stored, like a birthday
        return LocalDate.of(date.getFullYear(), date.getMonth() + 1, date.getDate());
      }

      if (typeof date === "number") {
        const jsDate = new Date(date);
        // Use local date components to ensure timezone-agnostic behavior
        return LocalDate.of(jsDate.getFullYear(), jsDate.getMonth() + 1, jsDate.getDate());
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

  static normalizeDateTime(date: DateUtilNormalizeDateTimeParams): LocalDateTime {
    if (date === null || date === undefined || date === "") {
      console.error("DateUtil received null or undefined date");
      throw new Error("DateUtil received null or undefined date");
    }

    // Check string length before entering try block
    if (typeof date === "string" && date.length < 10) {
      throw new Error("Date string too short, expected format YYYY-MM-DD");
    }

    try {
      if (date instanceof LocalDateTime) {
        return date;
      }

      if (date instanceof Date) {
        // Use local date/time components for consistency with date handling
        return LocalDateTime.of(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
      }

      if (typeof date === "number") {
        const jsDate = new Date(date);
        // Use local date/time components for consistency with date handling
        return LocalDateTime.of(jsDate.getFullYear(), jsDate.getMonth() + 1, jsDate.getDate(), jsDate.getHours(), jsDate.getMinutes(), jsDate.getSeconds());
      }

      if (typeof date === "string") {
        // Try parsing as ISO string with time, fallback to date only
        try {
          return LocalDateTime.parse(date);
        } catch {
          // fallback to date only, set time to 00:00:00
          const localDate = LocalDate.parse(date.substring(0, 10));
          return localDate.atTime(0, 0, 0);
        }
      }

      if (typeof date === "object" && date !== null && "day" in date && "month" in date && "year" in date) {
        // Optionally support hour/minute/second fields
        const hour = "hour" in date ? date.hour : 0;
        const minute = "minute" in date ? date.minute : 0;
        const second = "second" in date ? date.second : 0;
        return LocalDateTime.of(date.year, date.month + 1, date.day, hour as number, minute as number, second as number);
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
      // Use local date components to ensure timezone-agnostic behavior
      // This ensures the displayed date matches what was selected
      return LocalDate.of(date.getFullYear(), date.getMonth() + 1, date.getDate()).toString();
    }

    if (typeof date === "string") {
      // For toIsoDateString, we'll return the string as-is if it's too short
      // This method is more lenient as it's used for display purposes
      return date.length >= 10 ? date.substring(0, 10) : date;
    }

    return "";
  }

  // function returns Date object but discards the time part and timezone
  // ensuring that that the date is the same in all timezones.
  // this helps in UI to display the same date in all timezones
  // and it returns regular javascript Date
  static normalizeDateToJsDate(date: LocalDate): Date {
    try {
      // Create a Date using the local date components at noon to avoid DST issues
      // Using noon (12:00) ensures we're far from midnight where DST transitions occur
      // This makes the date timezone-agnostic - like a birthday that doesn't change
      const jsDate = new Date(date.year(), date.monthValue() - 1, date.dayOfMonth(), 12, 0, 0, 0);
      return jsDate;
    } catch (e) {
      console.error("Error normalizing date to JS Date", e);
      throw new Error("Invalid date format");
    }
  }

  static normalizeDateTimeToJsDate(date: LocalDateTime): Date {
    try {
      return new Date(date.atZone(ZoneOffset.UTC).toInstant().toEpochMilli());
    } catch (e) {
      console.error("Error normalizing date time to JS Date", e);
      throw new Error("Invalid date format");
    }
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
      const raw = parseInt(
        dateString.replace("/Date(", "").replace(")/", ""),
        10,
      );
      if (isNaN(raw)) {
        throw new Error("Invalid LoanPro date format");
      }
      const timestamp = raw < 1e12 ? raw * 1000 : raw;
      return LocalDate.ofInstant(Instant.ofEpochMilli(timestamp), ZoneOffset.UTC);
    } catch (e) {
      console.error("Error parsing LoanPro date", e);
      throw new Error("Invalid LoanPro date format");
    }
  }

  static todayWithTime(): LocalDateTime {
    return LocalDateTime.now(ZoneOffset.UTC);
  }

  /**
   * Parses LoanPro date string (/Date(1234567890)/) into a LocalDateTime.
   * This method keeps date and time, but completely discards the timezone.
   */
  static parseLoanProDateToLocalDateTime(dateString: string): LocalDateTime {
    const raw = parseInt(
      dateString.replace("/Date(", "").replace(")/", ""),
      10,
    );
    if (isNaN(raw)) {
      throw new Error("Invalid LoanPro date format");
    }
    const timestamp = raw < 1e12 ? raw * 1000 : raw;
    return LocalDateTime.ofInstant(
      Instant.ofEpochMilli(timestamp),
      ZoneOffset.UTC,
    );
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
    const result = sign * totalMonths;
    // Avoid returning negative zero
    return result === 0 ? 0 : result;
  }
}

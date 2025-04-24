import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { DateUtil } from "../utils/DateUtil";

/**
 * Day-count conventions supported by LendPeak.
 *
 * ─ ACTUAL types use the real day gap in the numerator.
 * ─ 30/360  (European) adjusts both dates (31 → 30).
 * ─ 30/360U (US/NASD) has an extra rule for the end-day.
 */
export enum CalendarType {
  ACTUAL_ACTUAL = 0, // ISDA – denom 365 / 366
  ACTUAL_360 = 1, // Fixed 360
  ACTUAL_365 = 2, // Fixed 365 – keeps leap day
  ACTUAL_365_NL = 3, // Fixed 365 – **No-Leap** (skips 29 Feb)
  THIRTY_360 = 4, // 30E/360 – European
  THIRTY_ACTUAL = 5, // 30/Actual hybrid
  THIRTY_360_US = 6, // 30U/360 – U.S. / NASD
}

export class Calendar {
  /* ────────────────────────────────────────────────────────── */
  /*  ctor & basic accessors                                    */
  /* ────────────────────────────────────────────────────────── */

  private _date!: LocalDate;

  constructor(public calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL, date: LocalDate | string | number | Date = DateUtil.today()) {
    this.date = date;
  }

  set date(d: LocalDate | string | number | Date | null | undefined) {
    this._date = DateUtil.normalizeDate(d);
  }
  get date(): LocalDate {
    return this._date;
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Human-readable label                                      */
  /* ────────────────────────────────────────────────────────── */

  get userFriendlyName(): string {
    switch (this.calendarType) {
      case CalendarType.ACTUAL_ACTUAL:
        return "Actual/Actual";
      case CalendarType.ACTUAL_360:
        return "Actual/360";
      case CalendarType.ACTUAL_365:
        return "Actual/365 (Fixed)";
      case CalendarType.ACTUAL_365_NL:
        return "Actual/365 (No-Leap)";
      case CalendarType.THIRTY_360:
        return "30/360 (European)";
      case CalendarType.THIRTY_ACTUAL:
        return "30/Actual";
      case CalendarType.THIRTY_360_US:
        return "30/360 (U.S.)";
      default:
        return "Unknown";
    }
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Public API                                                */
  /* ────────────────────────────────────────────────────────── */

  /** Signed day-count between two dates. */
  daysBetween(d1: LocalDate, d2: LocalDate): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
        return this.daysBetween30_360_EU(d1, d2);
      case CalendarType.THIRTY_360_US:
        return this.daysBetween30_360_US(d1, d2);
      case CalendarType.THIRTY_ACTUAL:
        return this.daysBetween30_Actual(d1, d2);
      case CalendarType.ACTUAL_365_NL:
        return this.daysBetweenActual365NoLeap(d1, d2);
      case CalendarType.ACTUAL_360:
      /* fall-through */
      case CalendarType.ACTUAL_365:
      /* fall-through */
      case CalendarType.ACTUAL_ACTUAL:
        return ChronoUnit.DAYS.between(d1, d2);
      default:
        throw new Error("Invalid calendar type");
    }
  }

  /** Whole-month difference (signed). */
  monthsBetween(d1: LocalDate, d2: LocalDate): number {
    return ChronoUnit.MONTHS.between(d1, d2);
  }

  /** Add _n_ months, preserving “end-of-month” intent. */
  addMonths(date: LocalDate, months: number): LocalDate {
    const cand = date.plusMonths(months);
    const lastSrc = date.with(TemporalAdjusters.lastDayOfMonth());
    const lastTgt = cand.with(TemporalAdjusters.lastDayOfMonth());
    return date.dayOfMonth() === lastSrc.dayOfMonth() ? lastTgt : cand;
  }

  /** Days in month for the current convention. */
  daysInMonth(date: LocalDate): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.THIRTY_360_US:
      case CalendarType.THIRTY_ACTUAL:
        return 30;
      default:
        return date.lengthOfMonth();
    }
  }

  /** Days in year for the current convention. */
  daysInYear(date: LocalDate = this.date): number {
    switch (this.calendarType) {
      case CalendarType.THIRTY_360:
      case CalendarType.THIRTY_360_US:
      case CalendarType.ACTUAL_360:
        return 360;
      case CalendarType.ACTUAL_365:
      /* fall-through */
      case CalendarType.ACTUAL_365_NL:
        return 365;
      case CalendarType.THIRTY_ACTUAL:
        return 360;
      case CalendarType.ACTUAL_ACTUAL:
        return date.isLeapYear() ? 366 : 365;
      default:
        throw new Error("Invalid calendar type");
    }
  }

  /** Inclusive start, exclusive end. */
  isDateBetween(d: LocalDate, start: LocalDate, end: LocalDate): boolean {
    return !d.isBefore(start) && d.isBefore(end);
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Private helpers                                           */
  /* ────────────────────────────────────────────────────────── */

  /** 30E/360 (European): 31 ▶ 30 on **both** dates. */
  private daysBetween30_360_EU(s: LocalDate, e: LocalDate): number {
    let [d1, d2] = [s.dayOfMonth(), e.dayOfMonth()].map((d) => (d === 31 ? 30 : d));
    return 360 * (e.year() - s.year()) + 30 * (e.monthValue() - s.monthValue()) + (d2 - d1);
  }

  /** 30U/360 (NASD). */
  private daysBetween30_360_US(s: LocalDate, e: LocalDate): number {
    let d1 = s.dayOfMonth();
    let d2 = e.dayOfMonth();
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 >= 30) d2 = 30;
    return 360 * (e.year() - s.year()) + 30 * (e.monthValue() - s.monthValue()) + (d2 - d1);
  }

  /** 30/Actual –
   *  Same-month  ⇒  actual days
   *  Cross-month ⇒  30E/360 rule
   */
  private daysBetween30_Actual(s: LocalDate, e: LocalDate): number {
    if (s.year() === e.year() && s.monthValue() === e.monthValue()) {
      return ChronoUnit.DAYS.between(s, e); // stay inside the month
    }
    return this.daysBetween30_360_EU(s, e); // cross-month ⇒ 30E/360
  }

  /** ACT/365 No-Leap – skips 29 Feb. */
  private daysBetweenActual365NoLeap(s: LocalDate, e: LocalDate): number {
    const sign = s.isAfter(e) ? -1 : 1;
    let start = sign === 1 ? s : e;
    const end = sign === 1 ? e : s;
    let days = 0;

    while (start.isBefore(end)) {
      if (!(start.monthValue() === 2 && start.dayOfMonth() === 29)) {
        days++;
      }
      start = start.plusDays(1);
    }
    return sign * days;
  }
}

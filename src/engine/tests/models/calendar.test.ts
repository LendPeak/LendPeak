import { LocalDate, ChronoUnit } from "@js-joda/core";
import { Calendar, CalendarType } from "@models/Calendar";
import { DateUtil } from "../../utils/DateUtil";

describe("Calendar Class", () => {
  const date1 = DateUtil.normalizeDate("2024-01-01");
  const date2 = DateUtil.normalizeDate("2024-02-01");

  const sameDate = DateUtil.normalizeDate("2024-01-01");
  const oneDayLater = DateUtil.normalizeDate("2024-01-02");
  const leapYearStart = DateUtil.normalizeDate("2024-02-28");
  const leapYearEnd = DateUtil.normalizeDate("2024-03-01"); // includes Feb 29
  const nonLeapYearStart = DateUtil.normalizeDate("2023-02-28");
  const nonLeapYearEnd = DateUtil.normalizeDate("2023-03-01");
  const endOfMonth30 = DateUtil.normalizeDate("2024-04-30");
  const startOfNextMonth = DateUtil.normalizeDate("2024-05-01");
  const longRangeStart = DateUtil.normalizeDate("2024-01-01");
  const longRangeEnd = DateUtil.normalizeDate("2025-01-01");
  const partialMonthStart = DateUtil.normalizeDate("2024-01-15");
  const partialMonthEnd = DateUtil.normalizeDate("2024-02-15");

  it("should calculate days between using 30/360", () => {
    const calendar = new Calendar(CalendarType.THIRTY_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30);
  });

  it("should calculate days between using Actual/Actual", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31);
  });

  it(`should calculate days between 2024-01-01 and 2024-02-01 using Actual/360`, () => {
    const calendar = new Calendar(CalendarType.ACTUAL_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31);
  });

  it("should calculate days between using Actual/365", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31);
  });

  it("should calculate days between partial months using Actual/365", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(partialMonthStart, partialMonthEnd);
    expect(days).toBe(31);
  });

  describe("Same Start and End Date", () => {
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((v) => typeof v === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should return 0 days for ${CalendarType[type]}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(sameDate, sameDate);
        expect(days).toBe(0);
      });
    });
  });

  describe("One-Day Difference", () => {
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((v) => typeof v === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should calculate one-day difference for ${CalendarType[type]}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(sameDate, oneDayLater);
        expect(days).toBe(1);
      });
    });
  });

  describe("Across Leap Day (Leap Year)", () => {
    const leapYearStart = LocalDate.parse("2024-02-28");
    const leapYearEnd = LocalDate.parse("2024-03-01");

    it("should calculate days including leap day for ACTUAL_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(2); // Actual days: Feb 28 -> Feb 29 (1 day), Feb 29 -> Mar 1 (2 days)
    });

    it("should calculate days including leap day for ACTUAL_365_NL", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365_NL);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(1); // Should not count leap day for ACTUAL_365_NL
    });

    it("should calculate days including leap day for ACTUAL_365", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(2);
    });

    it("should calculate days including leap day for THIRTY_360", () => {
      const calendar = new Calendar(CalendarType.THIRTY_360);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(3); // Adjusted for 30-day months: counts Feb 28, 29, and 30
    });

    it("should calculate days including leap day for THIRTY_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(3); // Follows similar rules as 30/360
    });

    it("should calculate days including leap day for ACTUAL_360", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_360);
      const days = calendar.daysBetween(leapYearStart, leapYearEnd);
      expect(days).toBe(2); // Actual calendar days: 2 days, scaled later for interest calculation
    });
  });

  describe("Non-Leap Year End of February", () => {
    const nonLeapYearStart = LocalDate.parse("2023-02-28");
    const nonLeapYearEnd = LocalDate.parse("2023-03-01");

    it("should calculate days across end of February for ACTUAL_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
      const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);
      expect(days).toBe(1); // Actual calendar days: exactly 1 day
    });

    it("should calculate days across end of February for ACTUAL_365", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365);
      const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);
      expect(days).toBe(1); // Actual days counted normally: 1 day
    });

    it("should calculate days across end of February for THIRTY_360", () => {
      const calendar = new Calendar(CalendarType.THIRTY_360);
      const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);
      expect(days).toBe(3); // Counts adjusted as February has 30 days: Feb 28, 29, 30
    });

    it("should calculate days across end of February for THIRTY_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
      const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);
      expect(days).toBe(3); // Follows similar logic as THIRTY_360 for February
    });

    it("should calculate days across end of February for ACTUAL_360", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_360);
      const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);
      expect(days).toBe(1); // Actual days are counted normally, later scaled to 360 for interest calculation
    });
  });

  describe("End of Month Variations", () => {
    const endOfMonth30 = LocalDate.parse("2024-04-30");
    const startOfNextMonth = LocalDate.parse("2024-05-01");

    it("should calculate end-of-month days for ACTUAL_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
      const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);
      expect(days).toBe(1); // Exactly 1 actual calendar day
    });

    it("should calculate end-of-month days for ACTUAL_365", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365);
      const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);
      expect(days).toBe(1); // Actual days counted normally
    });

    it("should calculate end-of-month days for ACTUAL_360", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_360);
      const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);
      expect(days).toBe(1); // Actual days counted normally, later scaled for interest calculation
    });

    it("should calculate end-of-month days for THIRTY_360", () => {
      const calendar = new Calendar(CalendarType.THIRTY_360);
      const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);
      expect(days).toBe(1); // Adjusted date calculation, still yields 1 day (30th to 1st)
    });

    it("should calculate end-of-month days for THIRTY_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
      const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);
      expect(days).toBe(1); // Same logic as THIRTY_360 here (end of month logic applies)
    });
  });

  describe("Long Date Ranges Over One Year", () => {
    const longRangeStart = LocalDate.parse("2024-01-01");
    const longRangeEnd = LocalDate.parse("2025-01-01");

    it("should calculate 366 days for ACTUAL_ACTUAL (leap year)", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(366); // 2024 is a leap year, so actual days counted are 366
    });

    it("counts the real number of days for ACTUAL_365 (Fixed)", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(366); // includes 29-Feb
    });

    it("drops the leap-day for ACTUAL_365_NL (No-Leap)", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_365_NL);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(365); // 29-Feb excluded
    });

    it("should calculate 366 days for ACTUAL_360 (actual days before scaling)", () => {
      const calendar = new Calendar(CalendarType.ACTUAL_360);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(366); // Actual days counted first, scaling to 360 days handled elsewhere
    });

    it("should calculate 360 days for THIRTY_360", () => {
      const calendar = new Calendar(CalendarType.THIRTY_360);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(360); // Exactly 12 months × 30 days
    });

    it("should calculate 360 days for THIRTY_ACTUAL", () => {
      const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
      const days = calendar.daysBetween(longRangeStart, longRangeEnd);
      expect(days).toBe(360); // Same as THIRTY_360 for full year intervals
    });
  });

  it("should correctly calculate partial months using 30/360 and 30/Actual", () => {
    const calendar30_360 = new Calendar(CalendarType.THIRTY_360);
    const calendar30_Actual = new Calendar(CalendarType.THIRTY_ACTUAL);
    expect(calendar30_360.daysBetween(partialMonthStart, partialMonthEnd)).toBe(30);
    expect(calendar30_Actual.daysBetween(partialMonthStart, partialMonthEnd)).toBe(30);
  });

  it("should return negative days when start date is after end date", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
    expect(calendar.daysBetween(date2, date1)).toBe(-31);
  });
});

describe("Calendar day-count conventions", () => {
  it("distinguishes European vs U.S. 30/360", () => {
    const s = LocalDate.parse("2025-02-28");
    const e = LocalDate.parse("2025-03-31");

    const eu = new Calendar(CalendarType.THIRTY_360); // European
    const us = new Calendar(CalendarType.THIRTY_360_US); // U.S./NASD

    expect(eu.daysBetween(s, e)).toBe(32); // 30E/360
    expect(us.daysBetween(s, e)).toBe(33); // 30U/360
  });

  it("counts Feb-29 in the numerator for ACTUAL/365 (Fixed)", () => {
    const s = LocalDate.parse("2024-02-28");
    const e = LocalDate.parse("2024-03-01"); // leap year
    const cal365 = new Calendar(CalendarType.ACTUAL_365);
    const cal360 = new Calendar(CalendarType.ACTUAL_360);

    expect(cal365.daysBetween(s, e)).toBe(2); // 28-Feb → 1-Mar = 2 calendar days
    expect(cal360.daysBetween(s, e)).toBe(2); // same numerator …
    expect(cal365.daysInYear()).toBe(365); // … but denominator is fixed 365
    expect(cal360.daysInYear()).toBe(360);
  });
});

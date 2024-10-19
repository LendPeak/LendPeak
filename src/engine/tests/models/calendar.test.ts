import dayjs from "dayjs";
import { Calendar, CalendarType } from "@models/Calendar";

describe("Calendar Class", () => {
  const date1 = dayjs("2024-01-01").startOf("day");
  const date2 = dayjs("2024-02-01").startOf("day");

  const sameDate = dayjs("2024-01-01").startOf("day");
  const oneDayLater = dayjs("2024-01-02").startOf("day");
  const leapYearStart = dayjs("2024-02-28").startOf("day");
  const leapYearEnd = dayjs("2024-03-01").startOf("day"); // Includes Feb 29
  const nonLeapYearStart = dayjs("2023-02-28").startOf("day");
  const nonLeapYearEnd = dayjs("2023-03-01").startOf("day");
  const endOfMonth30 = dayjs("2024-04-30").startOf("day");
  const startOfNextMonth = dayjs("2024-05-01").startOf("day");
  const longRangeStart = dayjs("2024-01-01").startOf("day");
  const longRangeEnd = dayjs("2025-01-01").startOf("day");
  const partialMonthStart = dayjs("2024-01-15").startOf("day");
  const partialMonthEnd = dayjs("2024-02-15").startOf("day");

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

  it(`should calculate days between ${date1.format("YYYY-MM-DD")} and ${date2.format("YYYY-MM-DD")} using Actual/360`, () => {
    const calendar = new Calendar(CalendarType.ACTUAL_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // 31 actual days scaled to 360-day year
  });

  it("should calculate days between using Actual/365", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-01-15").startOf("day");
    const endDate = dayjs("2024-02-15").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(31);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-04-15").startOf("day");
    const endDate = dayjs("2024-05-15").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(30);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-07-26").startOf("day");
    const endDate = dayjs("2024-08-01").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(6);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-08-01").startOf("day");
    const endDate = dayjs("2024-08-26").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(25);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-08-26").startOf("day");
    const endDate = dayjs("2024-09-01").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(6);
  });

  it("should calculate days between using Actual/365", () => {
    const startDate = dayjs("2024-02-15").startOf("day");
    const endDate = dayjs("2024-03-15").startOf("day");
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(startDate, endDate);
    expect(days).toBe(28);
  });

  it("should calculate days between using 30/Actual", () => {
    const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // 30/Actual behaves like 30/360 for periods over 30 days
  });

  // 1. Testing Same Start and End Date
  describe("Same Start and End Date", () => {
    const sameDate = dayjs("2024-01-01");
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should return 0 days for ${CalendarType[type]} when start and end dates are the same`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(sameDate, sameDate);
        expect(days).toBe(0);
      });
    });
  });

  // 2. Testing One-Day Difference
  describe(`One-Day Difference`, () => {
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];
    calendarTypes.forEach((type) => {
      it(`should correctly calculate one-day difference for ${CalendarType[type]} between ${sameDate.format("YYYY-MM-DD")} and ${oneDayLater.format("YYYY-MM-DD")}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(sameDate, oneDayLater);
        expect(days).toBe(1);
      });
    });
  });

  // 3. Testing Across Leap Day (Leap Year)
  describe("Across Leap Day (Leap Year)", () => {
    const leapYearStart = dayjs("2024-02-28");
    const leapYearEnd = dayjs("2024-03-01"); // Includes Feb 29
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];
    calendarTypes.forEach((type) => {
      it(`should correctly calculate days including leap day for ${CalendarType[type]} between ${leapYearStart.format("YYYY-MM-DD")} and ${leapYearEnd.format("YYYY-MM-DD")}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(leapYearStart, leapYearEnd);
        if (type === CalendarType.ACTUAL_ACTUAL) {
          expect(days).toBe(2); // 2024 is a leap year
        } else if (type === CalendarType.ACTUAL_365) {
          expect(days).toBe(1);
        } else if (type === CalendarType.ACTUAL_360) {
          expect(days).toBe(1);
        } else if (type === CalendarType.THIRTY_360 || type === CalendarType.THIRTY_ACTUAL) {
          expect(days).toBe(3);
        } else {
          throw new Error("Invalid calendar type");
        }
      });
    });
  });

  // 4. Testing Non-Leap Year
  describe("Non-Leap Year End of February", () => {
    const nonLeapYearStart = dayjs("2023-02-28");
    const nonLeapYearEnd = dayjs("2023-03-01");
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should correctly calculate days across end of February in a non-leap year for ${CalendarType[type]} between ${nonLeapYearStart.format("YYYY-MM-DD")} and ${nonLeapYearEnd.format("YYYY-MM-DD")}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(nonLeapYearStart, nonLeapYearEnd);

        let expectedDays: number;
        if (type === CalendarType.ACTUAL_ACTUAL || type === CalendarType.ACTUAL_365 || type === CalendarType.ACTUAL_360) {
          expectedDays = 1;
        } else if (type === CalendarType.THIRTY_360 || type === CalendarType.THIRTY_ACTUAL) {
          expectedDays = 3; // Adjusted for 30-day months
        } else {
          throw new Error("Invalid calendar type");
        }

        expect(days).toBe(expectedDays);
      });
    });
  });

  // 5. Testing End of Month Variations
  describe("End of Month Variations", () => {
    const endOfMonth30 = dayjs("2024-04-30");
    const startOfNextMonth = dayjs("2024-05-01");
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should correctly calculate days between end of a 30-day month and start of next month for ${CalendarType[type]} between ${endOfMonth30.format("YYYY-MM-DD")} and ${startOfNextMonth.format(
        "YYYY-MM-DD"
      )}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(endOfMonth30, startOfNextMonth);

        let expectedDays: number;
        if (type === CalendarType.ACTUAL_ACTUAL || type === CalendarType.ACTUAL_360 || type === CalendarType.ACTUAL_365) {
          expectedDays = 1;
        } else if (type === CalendarType.THIRTY_360 || type === CalendarType.THIRTY_ACTUAL) {
          expectedDays = 1; // Due to date adjustments in 30/360 conventions
        } else {
          throw new Error("Invalid calendar type");
        }

        expect(days).toBe(expectedDays);
      });
    });
  });

  // 6. Testing Long Date Ranges
  describe("Long Date Ranges Over One Year", () => {
    const longRangeStart = dayjs("2024-01-01");
    const longRangeEnd = dayjs("2025-01-01");
    const calendarTypes: CalendarType[] = Object.values(CalendarType).filter((value) => typeof value === "number") as CalendarType[];

    calendarTypes.forEach((type) => {
      it(`should correctly calculate days over a one-year period for ${CalendarType[type]}`, () => {
        const calendar = new Calendar(type);
        const days = calendar.daysBetween(longRangeStart, longRangeEnd);

        if (type === CalendarType.ACTUAL_ACTUAL) {
          expect(days).toBe(366); // 2024 is a leap year
        } else if (type === CalendarType.ACTUAL_365) {
          expect(days).toBe(365);
        } else if (type === CalendarType.ACTUAL_360) {
          expect(days).toBeCloseTo(366 * (360 / 366), 0); // Adjusted for 360-day year
        } else if (type === CalendarType.THIRTY_360 || type === CalendarType.THIRTY_ACTUAL) {
          expect(days).toBe(360);
        }
      });
    });
  });

  // 7. Testing Actual/360 and Actual/365 Scaling
  it("should correctly scale actual days for Actual/360 and Actual/365", () => {
    const calendar360 = new Calendar(CalendarType.ACTUAL_360);
    const calendar365 = new Calendar(CalendarType.ACTUAL_365);
    const daysActual = longRangeEnd.diff(longRangeStart, "day");
    const days360 = calendar360.daysBetween(longRangeStart, longRangeEnd);
    const days365 = calendar365.daysBetween(longRangeStart, longRangeEnd);

    expect(days360).toBeCloseTo((daysActual / 366) * 360); // Scaled days
    expect(days365).toBe(365); // 2024 is a leap year
  });

  // 8. Testing Partial Months for 30/360 and 30/Actual
  it("should correctly calculate days for partial months using 30/360 and 30/Actual", () => {
    const calendar30_360 = new Calendar(CalendarType.THIRTY_360);
    const calendar30_Actual = new Calendar(CalendarType.THIRTY_ACTUAL);

    const days30_360 = calendar30_360.daysBetween(partialMonthStart, partialMonthEnd);
    const days30_Actual = calendar30_Actual.daysBetween(partialMonthStart, partialMonthEnd);

    expect(days30_360).toBe(30); // Each month is considered 30 days
    expect(days30_Actual).toBe(30);
  });

  // 9. Testing Month Ends with Different Days
  it("should correctly calculate days over months with different lengths", () => {
    const startDate = dayjs("2024-01-31");
    const endDate = dayjs("2024-02-28");

    const calendarActualActual = new Calendar(CalendarType.ACTUAL_ACTUAL);
    const daysActualActual = calendarActualActual.daysBetween(startDate, endDate);
    expect(daysActualActual).toBe(28);

    const calendar30_360 = new Calendar(CalendarType.THIRTY_360);
    const days30_360 = calendar30_360.daysBetween(startDate, endDate);
    expect(days30_360).toBe(28); // Adjusted for 30-day months

    const calendarActual360 = new Calendar(CalendarType.ACTUAL_360);
    const daysActual360 = calendarActual360.daysBetween(startDate, endDate);
    expect(daysActual360).toBeCloseTo(27);
  });

  // 10. Start Date After End Date
  it("should return negative days when start date is after end date", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
    const days = calendar.daysBetween(date2, date1);
    expect(days).toBe(-31); // Negative interval
  });
});

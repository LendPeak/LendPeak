import dayjs from "dayjs";
import { Calendar, CalendarType } from "@models/Calendar";

describe("Calendar Class", () => {
  const date1 = dayjs("2024-01-01");
  const date2 = dayjs("2024-02-01");

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

  it("should calculate days between using Actual/360", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // 31 actual days scaled to 360-day year
  });

  it("should calculate days between using Actual/365", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31);
  });

  it("should calculate days between using 30/Actual", () => {
    const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // 30/Actual behaves like 30/360 for periods over 30 days
  });
});

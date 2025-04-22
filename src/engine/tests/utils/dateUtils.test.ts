import { DateUtil } from "../../utils/DateUtil";
import { LocalDate, ZoneId } from "@js-joda/core";

describe("DateUtil", () => {
  describe("normalizeDate", () => {
    it("should normalize a date with time and timezone to UTC with time set to 00:00:00", () => {
      const inputDate = LocalDate.parse("2023-10-26");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toString()).toBe("2023-10-26");
    });

    it("should normalize a date with a different timezone to UTC with time set to 00:00:00", () => {
      const inputDate = LocalDate.parse("2024-03-15");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toString()).toBe("2024-03-15");
    });

    it("should normalize a date string to UTC with time set to 00:00:00", () => {
      const inputDate = "2025-01-01";
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toString()).toBe("2025-01-01");
    });

    it("should normalize a numeric timestamp to UTC date correctly", () => {
      const inputTimestamp = Date.parse("2026-06-10"); // UTC timestamp at midnight
      const normalizedDate = DateUtil.normalizeDate(inputTimestamp);

      expect(normalizedDate.toString()).toBe("2026-06-10"); 
    });

    it("should handle a number input (timestamp) correctly", () => {
      const timestamp = new Date("2027-09-21").getTime();
      const normalizedDate = DateUtil.normalizeDate(timestamp);
      expect(normalizedDate.toString()).toBe("2027-09-21");
    });

    it("should normalize a Date object with timezone to UTC with time set to 00:00:00", () => {
      const inputDate = new Date("2028-04-18T10:00:00-07:00");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toString()).toBe("2028-04-18");
    });
  });
});

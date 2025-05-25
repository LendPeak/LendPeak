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

    describe("String parsing edge cases", () => {
      it("should throw an error for empty string", () => {
        expect(() => DateUtil.normalizeDate("")).toThrow("DateUtil received null or undefined date");
      });

      it("should throw an error for short date strings", () => {
        expect(() => DateUtil.normalizeDate("2023")).toThrow("Date string too short, expected format YYYY-MM-DD");
        expect(() => DateUtil.normalizeDate("2023-1")).toThrow("Date string too short, expected format YYYY-MM-DD");
        expect(() => DateUtil.normalizeDate("2023-1-1")).toThrow("Date string too short, expected format YYYY-MM-DD");
        expect(() => DateUtil.normalizeDate("23-01-01")).toThrow("Date string too short, expected format YYYY-MM-DD");
      });

      it("should handle date strings with extra content after YYYY-MM-DD", () => {
        const normalizedDate = DateUtil.normalizeDate("2023-10-26T10:00:00Z");
        expect(normalizedDate.toString()).toBe("2023-10-26");
      });

      it("should throw an error for invalid date format even with 10+ characters", () => {
        expect(() => DateUtil.normalizeDate("not-a-date")).toThrow("Invalid date format");
        expect(() => DateUtil.normalizeDate("2023/10/26")).toThrow("Invalid date format");
        expect(() => DateUtil.normalizeDate("26-10-2023")).toThrow("Invalid date format");
      });
    });
  });

  describe("toIsoDateString", () => {
    it("should handle short strings without throwing", () => {
      expect(() => DateUtil.toIsoDateString("2023")).not.toThrow();
      expect(DateUtil.toIsoDateString("2023")).toBe("2023");
    });

    it("should extract YYYY-MM-DD from longer strings", () => {
      expect(DateUtil.toIsoDateString("2023-10-26T10:00:00Z")).toBe("2023-10-26");
    });
  });

  describe("normalizeDateTime", () => {
    it("should handle short date strings by throwing appropriate error", () => {
      expect(() => DateUtil.normalizeDateTime("2023")).toThrow("Date string too short, expected format YYYY-MM-DD");
      expect(() => DateUtil.normalizeDateTime("2023-1")).toThrow("Date string too short, expected format YYYY-MM-DD");
    });
  });

  describe("parseLoanProDateToLocalDate", () => {
    it("should correctly parse milliseconds timestamp", () => {
      const input = "/Date(1698278400000)/"; // 2023-10-26 UTC
      const result = DateUtil.parseLoanProDateToLocalDate(input);
      expect(result.toString()).toBe("2023-10-26");
    });

    it("should correctly parse seconds timestamp", () => {
      const input = "/Date(1698278400)/"; // 2023-10-26 UTC in seconds
      const result = DateUtil.parseLoanProDateToLocalDate(input);
      expect(result.toString()).toBe("2023-10-26");
    });

    it("should throw on invalid input", () => {
      expect(() => DateUtil.parseLoanProDateToLocalDate("/Date(foo)/")).toThrow("Invalid LoanPro date format");
    });
  });

  describe("parseLoanProDateToLocalDateTime", () => {
    it("should correctly parse milliseconds timestamp", () => {
      const input = "/Date(1698278400000)/"; // 2023-10-26T00:00:00Z
      const result = DateUtil.parseLoanProDateToLocalDateTime(input);
      expect(result.toString()).toBe("2023-10-26T00:00");
    });

    it("should correctly parse seconds timestamp", () => {
      const input = "/Date(1698278400)/"; // 2023-10-26T00:00:00Z in seconds
      const result = DateUtil.parseLoanProDateToLocalDateTime(input);
      expect(result.toString()).toBe("2023-10-26T00:00");
    });
  });

  describe("monthsBetween", () => {
    it("should never return negative zero", () => {
      const a = LocalDate.parse("2023-04-30");
      const b = LocalDate.parse("2023-03-31");
      const diff = DateUtil.monthsBetween(a, b);
      expect(Object.is(diff, -0)).toBe(false);
      expect(diff).toBe(0);
    });
  });
});

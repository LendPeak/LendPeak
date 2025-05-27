import { DateUtil } from "../../utils/DateUtil";
import { LocalDate, LocalDateTime } from "@js-joda/core";

describe("DateUtil timezone-agnostic behavior", () => {
  describe("normalizeDateToJsDate", () => {
    it("should preserve the date regardless of timezone", () => {
      const localDate = LocalDate.of(2024, 1, 15);
      const jsDate = DateUtil.normalizeDateToJsDate(localDate);
      
      // The date components should match exactly
      expect(jsDate.getFullYear()).toBe(2024);
      expect(jsDate.getMonth()).toBe(0); // January is 0 in JS
      expect(jsDate.getDate()).toBe(15);
    });

    it("should handle dates at year boundaries", () => {
      const newYearsEve = LocalDate.of(2023, 12, 31);
      const jsDate = DateUtil.normalizeDateToJsDate(newYearsEve);
      
      expect(jsDate.getFullYear()).toBe(2023);
      expect(jsDate.getMonth()).toBe(11); // December
      expect(jsDate.getDate()).toBe(31);
    });
  });

  describe("normalizeDate", () => {
    it("should correctly convert JS Date to LocalDate using local components", () => {
      // Create a date using local time
      const jsDate = new Date(2024, 0, 15); // January 15, 2024
      const localDate = DateUtil.normalizeDate(jsDate);
      
      expect(localDate.year()).toBe(2024);
      expect(localDate.monthValue()).toBe(1);
      expect(localDate.dayOfMonth()).toBe(15);
    });

    it("should handle dates created at different times of day", () => {
      const morning = new Date(2024, 0, 15, 1, 0, 0);
      const evening = new Date(2024, 0, 15, 23, 59, 59);
      
      const morningLocal = DateUtil.normalizeDate(morning);
      const eveningLocal = DateUtil.normalizeDate(evening);
      
      // Both should result in the same date
      expect(morningLocal.equals(eveningLocal)).toBe(true);
      expect(morningLocal.toString()).toBe("2024-01-15");
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve dates through round-trip conversion", () => {
      const originalDate = LocalDate.of(2024, 1, 15);
      const jsDate = DateUtil.normalizeDateToJsDate(originalDate);
      const backToLocal = DateUtil.normalizeDate(jsDate);
      
      expect(originalDate.equals(backToLocal)).toBe(true);
    });

    it("should handle all months correctly", () => {
      for (let month = 1; month <= 12; month++) {
        const originalDate = LocalDate.of(2024, month, 15);
        const jsDate = DateUtil.normalizeDateToJsDate(originalDate);
        const backToLocal = DateUtil.normalizeDate(jsDate);
        
        expect(originalDate.equals(backToLocal)).toBe(true);
      }
    });
  });

  describe("normalizeDateTime", () => {
    it("should preserve date and time components", () => {
      const jsDateTime = new Date(2024, 0, 15, 14, 30, 45); // 2:30:45 PM
      const localDateTime = DateUtil.normalizeDateTime(jsDateTime);
      
      expect(localDateTime.year()).toBe(2024);
      expect(localDateTime.monthValue()).toBe(1);
      expect(localDateTime.dayOfMonth()).toBe(15);
      expect(localDateTime.hour()).toBe(14);
      expect(localDateTime.minute()).toBe(30);
      expect(localDateTime.second()).toBe(45);
    });
  });

  describe("toIsoDateString", () => {
    it("should use local date components for Date objects", () => {
      const jsDate = new Date(2024, 0, 15);
      const isoString = DateUtil.toIsoDateString(jsDate);
      
      expect(isoString).toBe("2024-01-15");
    });
  });
});
import dayjs from "dayjs";
import { DateUtil } from "../../utils/DateUtil";

describe("DateUtil", () => {
  describe("normalizeDate", () => {
    it("should normalize a date with time and timezone to UTC with time set to 00:00:00", () => {
      const inputDate = dayjs("2023-10-26T15:30:00+05:00");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toISOString()).toBe("2023-10-26T00:00:00.000Z");
    });

    it("should normalize a date with a different timezone to UTC with time set to 00:00:00", () => {
      const inputDate = dayjs("2024-03-15T08:00:00-08:00");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toISOString()).toBe("2024-03-15T00:00:00.000Z");
    });

    it("should normalize a date string to UTC with time set to 00:00:00", () => {
      const inputDate = "2025-01-01";
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should normalize a Date object to UTC with time set to 00:00:00", () => {
      const inputDate = new Date("2026-06-10T12:00:00");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    });

    it("should handle null or undefined input and return current UTC date at 00:00:00", () => {
      const nullDate = DateUtil.normalizeDate(null);
      const undefinedDate = DateUtil.normalizeDate(undefined);

      const now = dayjs.utc().startOf("day").toISOString();

      expect(nullDate.toISOString()).toBe(now);
      expect(undefinedDate.toISOString()).toBe(now);
    });

    it("should handle a number input (timestamp) correctly", () => {
      const timestamp = new Date("2027-09-21T10:30:00Z").getTime();
      const normalizedDate = DateUtil.normalizeDate(timestamp);
      expect(normalizedDate.toISOString()).toBe("2027-09-21T00:00:00.000Z");
    });

    it("should normalize a Date object with timezone to UTC with time set to 00:00:00", () => {
      const inputDate = new Date("2028-04-18T10:00:00-07:00");
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      expect(normalizedDate.toISOString()).toBe("2028-04-18T00:00:00.000Z");
    });

    it("should normalize a Date object with no explicit timezone to UTC with time set to 00:00:00", () => {
      const inputDate = new Date("2029-07-22T14:00:00"); // No timezone specified
      const normalizedDate = DateUtil.normalizeDate(inputDate);

      // The behavior depends on the environment's timezone, but it must be normalized to UTC
      const expectedUTC = dayjs.utc(inputDate).startOf("day").toISOString();
      expect(normalizedDate.toISOString()).toBe(expectedUTC);
    });
  });
});

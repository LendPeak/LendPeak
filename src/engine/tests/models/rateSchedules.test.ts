import dayjs from "dayjs";
import { describe, test, expect } from "@jest/globals";
import { LocalDate, ZoneId } from "@js-joda/core";

import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import Decimal from "decimal.js";
import { RateSchedule, RateScheduleParams } from "../../models/RateSchedule";
import { RateSchedules } from "../../models/RateSchedules";
import { LendPeak } from "../../models/LendPeak";
import { DateUtil } from "../../utils/DateUtil";

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const today = LocalDate.now();

describe("Rate Schedule", () => {
  it("Should have only default rate schedule", () => {
    const lendPeak = LendPeak.demoObject();

    expect(lendPeak.amortization.rateSchedules.length).toEqual(1);
    expect(lendPeak.amortization.rateSchedules.last.id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.last.annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.last.type).toEqual("default");
    expect(lendPeak.amortization.rateSchedules.last.modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.last.startDate).toEqual(lendPeak.amortization.startDate);
    expect(lendPeak.amortization.rateSchedules.last.endDate).toEqual(lendPeak.amortization.endDate);
  });

  it("one custom rate in the middle", () => {
    const lendPeak = LendPeak.demoObject();
    lendPeak.amortization.rateSchedules.addSchedule(
      new RateSchedule({
        startDate: today,
        endDate: today.plusMonths(1),
        annualInterestRate: 0.3,
        type: "custom",
      })
    );
    expect(lendPeak.amortization.rateSchedules.length).toEqual(3);
    expect(lendPeak.amortization.rateSchedules.all.length).toEqual(3);
    expect(lendPeak.amortization.rateSchedules.allCustom.length).toEqual(1);

    expect(lendPeak.amortization.rateSchedules.all[0].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[0].annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.all[0].type).toEqual("generated");
    expect(lendPeak.amortization.rateSchedules.all[0].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[0].startDate).toEqual(lendPeak.amortization.startDate);
    expect(lendPeak.amortization.rateSchedules.all[0].endDate).toEqual(today);

    expect(lendPeak.amortization.rateSchedules.all[1].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[1].annualInterestRate).toEqual(new Decimal(0.3));
    expect(lendPeak.amortization.rateSchedules.all[1].type).toEqual("custom");
    expect(lendPeak.amortization.rateSchedules.all[1].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[1].startDate).toEqual(today);
    expect(lendPeak.amortization.rateSchedules.all[1].endDate).toEqual(today.plusMonths(1));

    expect(lendPeak.amortization.rateSchedules.all[2].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[2].annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.all[2].type).toEqual("generated");
    expect(lendPeak.amortization.rateSchedules.all[2].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[2].startDate).toEqual(today.plusMonths(1));
    expect(lendPeak.amortization.rateSchedules.all[2].endDate).toEqual(lendPeak.amortization.endDate);
  });

  it("custom rate at the beginning", () => {
    const lendPeak = LendPeak.demoObject();
    lendPeak.amortization.rateSchedules.addSchedule(
      new RateSchedule({
        startDate: lendPeak.amortization.startDate,
        endDate: today,
        annualInterestRate: 0.3,
        type: "custom",
      })
    );
    expect(lendPeak.amortization.rateSchedules.length).toEqual(2);
    expect(lendPeak.amortization.rateSchedules.all.length).toEqual(2);
    expect(lendPeak.amortization.rateSchedules.allCustom.length).toEqual(1);

    expect(lendPeak.amortization.rateSchedules.all[0].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[0].annualInterestRate).toEqual(new Decimal(0.3));
    expect(lendPeak.amortization.rateSchedules.all[0].type).toEqual("custom");
    expect(lendPeak.amortization.rateSchedules.all[0].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[0].startDate).toEqual(lendPeak.amortization.startDate);
    expect(lendPeak.amortization.rateSchedules.all[0].endDate).toEqual(today);

    expect(lendPeak.amortization.rateSchedules.all[1].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[1].annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.all[1].type).toEqual("generated");
    expect(lendPeak.amortization.rateSchedules.all[1].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[1].startDate).toEqual(today);
    expect(lendPeak.amortization.rateSchedules.all[1].endDate).toEqual(lendPeak.amortization.endDate);
  });

  it("custom rate at the end", () => {
    const lendPeak = LendPeak.demoObject();

    const customRateEndDate = lendPeak.amortization.endDate.minusDays(45);
    lendPeak.amortization.rateSchedules.addSchedule(
      new RateSchedule({
        startDate: customRateEndDate,
        endDate: lendPeak.amortization.endDate,
        annualInterestRate: 0.3,
        type: "custom",
      })
    );
    expect(lendPeak.amortization.rateSchedules.length).toEqual(2);
    expect(lendPeak.amortization.rateSchedules.all.length).toEqual(2);
    expect(lendPeak.amortization.rateSchedules.allCustom.length).toEqual(1);

    expect(lendPeak.amortization.rateSchedules.all[0].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[0].annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.all[0].type).toEqual("generated");
    expect(lendPeak.amortization.rateSchedules.all[0].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[0].startDate).toEqual(lendPeak.amortization.startDate);
    expect(lendPeak.amortization.rateSchedules.all[0].endDate).toEqual(customRateEndDate);

    expect(lendPeak.amortization.rateSchedules.all[1].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[1].annualInterestRate).toEqual(new Decimal(0.3));
    expect(lendPeak.amortization.rateSchedules.all[1].type).toEqual("custom");
    expect(lendPeak.amortization.rateSchedules.all[1].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[1].startDate).toEqual(customRateEndDate);
    expect(lendPeak.amortization.rateSchedules.all[1].endDate).toEqual(lendPeak.amortization.endDate);
  });

  it("remove custom rate", () => {
    const lendPeak = LendPeak.demoObject();
    lendPeak.amortization.rateSchedules.addSchedule(
      new RateSchedule({
        startDate: today,
        endDate: today.plusMonths(1),
        annualInterestRate: 0.3,
        type: "custom",
      })
    );
    expect(lendPeak.amortization.rateSchedules.length).toEqual(3);
    expect(lendPeak.amortization.rateSchedules.all.length).toEqual(3);
    expect(lendPeak.amortization.rateSchedules.allCustom.length).toEqual(1);

    lendPeak.amortization.rateSchedules.removeScheduleAtIndex(1);

    expect(lendPeak.amortization.rateSchedules.length).toEqual(1);
    expect(lendPeak.amortization.rateSchedules.all.length).toEqual(1);
    expect(lendPeak.amortization.rateSchedules.allCustom.length).toEqual(0);
  });
});

describe("RateSchedules Class", () => {
  test("Constructor defaults to empty schedules", () => {
    const rsCollection = new RateSchedules();
    expect(rsCollection.schedules).toEqual([]);
    expect(rsCollection.length).toBe(0);
    expect(rsCollection.modified).toBe(false);
    expect(rsCollection.hasModified).toBe(false);
    expect(rsCollection.hasCustom).toBe(false);
  });

  test("Constructor accepts array of RateSchedule instances", () => {
    const schedule1 = new RateSchedule({
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      type: "custom",
    });
    const schedule2 = new RateSchedule({
      annualInterestRate: 7,
      startDate: "2025-07-01",
      endDate: "2025-12-31",
      type: "default",
    });

    const rsCollection = new RateSchedules([schedule1, schedule2]);
    expect(rsCollection.length).toBe(2);
    expect(rsCollection.allCustom.length).toBe(1);
    expect(rsCollection.modified).toBe(false); // constructor sets it to false after assignment
    expect(rsCollection.hasCustom).toBe(true);
  });

  test("Setting schedules with plain objects inflates them into RateSchedule instances", () => {
    const plainObjects = [
      {
        annualInterestRate: 8,
        startDate: DateUtil.normalizeDate("2026-01-01"),
        endDate: DateUtil.normalizeDate("2026-12-31"),
        type: "generated",
      },
    ];

    const rsCollection = new RateSchedules();
    expect(rsCollection.length).toBe(0);

    rsCollection.schedules = plainObjects as any; // force type for test
    expect(rsCollection.length).toBe(1);
    expect(rsCollection.all[0]).toBeInstanceOf(RateSchedule);

    // Should have set modified to true
    expect(rsCollection.modified).toBe(true);
    expect(rsCollection.hasModified).toBe(true);
  });

  test("resetModified() resets the modified flags of collection and children", () => {
    const rs = new RateSchedule({
      annualInterestRate: 10,
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    rs.modified = true;

    const rsCollection = new RateSchedules([rs]);
    rsCollection.modified = true;
    expect(rsCollection.hasModified).toBe(true);

    rsCollection.resetModified();
    expect(rsCollection.modified).toBe(false);
    expect(rsCollection.hasModified).toBe(false);
    expect(rsCollection.schedules[0].modified).toBe(false);
  });

  test("addSchedule() appends a new schedule, and addScheduleAtTheBeginning() unshifts a schedule", () => {
    const rsCollection = new RateSchedules();

    const scheduleA = new RateSchedule({
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-06-30",
    });

    const scheduleB = new RateSchedule({
      annualInterestRate: 6,
      startDate: "2025-07-01",
      endDate: "2025-12-31",
    });

    rsCollection.addSchedule(scheduleA);
    expect(rsCollection.length).toBe(1);
    expect(rsCollection.all[0].annualInterestRate.toNumber()).toBe(5);

    rsCollection.addScheduleAtTheBeginning(scheduleB);
    expect(rsCollection.length).toBe(2);
    expect(rsCollection.all[0].annualInterestRate.toNumber()).toBe(6);
    expect(rsCollection.all[1].annualInterestRate.toNumber()).toBe(5);

    // Should be marked as modified
    expect(rsCollection.modified).toBe(true);
  });

  test("removeScheduleById() removes the correct schedule", () => {
    const schedule1 = new RateSchedule({
      id: "sch-1",
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-06-30",
    });
    const schedule2 = new RateSchedule({
      id: "sch-2",
      annualInterestRate: 6,
      startDate: "2025-07-01",
      endDate: "2025-12-31",
    });
    const rsCollection = new RateSchedules([schedule1, schedule2]);
    expect(rsCollection.length).toBe(2);

    rsCollection.removeScheduleById("sch-1");
    expect(rsCollection.length).toBe(1);
    expect(rsCollection.all[0].id).toBe("sch-2");
    expect(rsCollection.modified).toBe(true);
  });

  test("removeScheduleAtIndex() removes schedule at correct index", () => {
    const schedule1 = new RateSchedule({
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    const schedule2 = new RateSchedule({
      annualInterestRate: 6,
      startDate: "2025-02-01",
      endDate: "2025-02-28",
    });
    const schedule3 = new RateSchedule({
      annualInterestRate: 7,
      startDate: "2025-03-01",
      endDate: "2025-03-31",
    });
    const rsCollection = new RateSchedules([schedule1, schedule2, schedule3]);
    expect(rsCollection.length).toBe(3);

    rsCollection.removeScheduleAtIndex(1);
    expect(rsCollection.length).toBe(2);
    expect(rsCollection.all[0].annualInterestRate.toNumber()).toBe(5);
    expect(rsCollection.all[1].annualInterestRate.toNumber()).toBe(7);
    expect(rsCollection.modified).toBe(true);
  });

  test("Accessors: length, first, last, all", () => {
    const schedule1 = new RateSchedule({
      annualInterestRate: 2,
      startDate: "2025-01-01",
      endDate: "2025-01-15",
    });
    const schedule2 = new RateSchedule({
      annualInterestRate: 3,
      startDate: "2025-01-16",
      endDate: "2025-01-31",
    });

    const rsCollection = new RateSchedules([schedule1, schedule2]);
    expect(rsCollection.length).toBe(2);
    expect(rsCollection.first.annualInterestRate.toNumber()).toBe(2);
    expect(rsCollection.last.annualInterestRate.toNumber()).toBe(3);
    expect(rsCollection.all).toHaveLength(2);
  });

  test("allCustom, hasCustom, and allCustomAsObject", () => {
    const customSchedule = new RateSchedule({
      type: "custom",
      annualInterestRate: 10,
      startDate: "2025-05-01",
      endDate: "2025-05-31",
    });
    const defaultSchedule = new RateSchedule({
      type: "default",
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-04-30",
    });
    const rsCollection = new RateSchedules([defaultSchedule, customSchedule]);

    expect(rsCollection.hasCustom).toBe(true);
    expect(rsCollection.allCustom.length).toBe(1);
    expect(rsCollection.allCustom[0]).toBe(customSchedule);

    const customOnlyObj = rsCollection.allCustomAsObject;
    expect(customOnlyObj).toBeInstanceOf(RateSchedules);
    expect(customOnlyObj.length).toBe(1);
    expect(customOnlyObj.all[0]).toBe(customSchedule);
  });

  test("json getter returns array of child JSON objects", () => {
    const schedule1 = new RateSchedule({
      id: "id-1",
      type: "custom",
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-01-15",
    });
    const schedule2 = new RateSchedule({
      id: "id-2",
      type: "default",
      annualInterestRate: 6,
      startDate: "2025-01-16",
      endDate: "2025-01-31",
    });

    const rsCollection = new RateSchedules([schedule1, schedule2]);
    const jsonResult = rsCollection.json;

    expect(jsonResult).toHaveLength(2);
    expect(jsonResult[0]).toEqual({
      id: "id-1",
      type: "custom",
      annualInterestRate: 5,
      startDate: schedule1.startDate.toString(),
      endDate: schedule1.endDate.toString(),
    });
    expect(jsonResult[1]).toEqual({
      id: "id-2",
      type: "default",
      annualInterestRate: 6,
      startDate: schedule2.startDate.toString(),
      endDate: schedule2.endDate.toString(),
    });
  });

  test("updateModelValues() and updateJsValues() call these on each schedule", () => {
    const schedule1 = new RateSchedule({
      annualInterestRate: 3,
      startDate: "2025-03-01",
      endDate: "2025-03-10",
    });
    const schedule2 = new RateSchedule({
      annualInterestRate: 4,
      startDate: "2025-04-01",
      endDate: "2025-04-10",
    });

    const rsCollection = new RateSchedules([schedule1, schedule2]);
    // Setting a spy or verifying no errors is enough here.
    // We'll just ensure the method is callable and doesn't throw an error.
    expect(() => rsCollection.updateJsValues()).not.toThrow();
    expect(() => rsCollection.updateModelValues()).not.toThrow();
  });
});

describe("RateSchedule Class", () => {
  test("Constructor sets default values correctly and auto-generates an ID", () => {
    const params: RateScheduleParams = {
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    };
    const rs = new RateSchedule(params);

    // Check type
    expect(rs.type).toBe("custom"); // default type if not provided

    // Check ID is generated
    expect(rs.id).toBeDefined();
    expect(rs.id).not.toBe("");

    // Check annual interest rate is a Decimal
    expect(rs.annualInterestRate).toBeInstanceOf(Decimal);
    expect(rs.annualInterestRate.toNumber()).toBe(5);

    // Check Dayjs fields for startDate and endDate
    expect(rs.startDate.toString()).toBe("2025-01-01");
    expect(rs.endDate.toString()).toBe("2025-12-31");

    // Check that modified defaults to false
    expect(rs.modified).toBe(false);
  });

  test("Constructor sets given ID, type, and properly handles Date objects", () => {
    const customId = "abc123";
    const params: RateScheduleParams = {
      id: customId,
      type: "generated",
      annualInterestRate: 7.25,
      startDate: LocalDate.parse("2025-02-01"),
      endDate: LocalDate.parse("2026-01-31"),
    };
    const rs = new RateSchedule(params);

    // Provided type
    expect(rs.type).toBe("generated");

    // Provided ID
    expect(rs.id).toBe(customId);

    // Check date conversions
    expect(rs.startDate.toString()).toBe("2025-02-01");
    expect(rs.endDate.toString()).toBe("2026-01-31");

    // Check interest rate
    expect(rs.annualInterestRate.toNumber()).toBe(7.25);

    // Modified should be false after constructor
    expect(rs.modified).toBe(false);
  });

  test("Setting annualInterestRate updates Decimal value and flags modified", () => {
    const rs = new RateSchedule({
      annualInterestRate: 2,
      startDate: LocalDate.parse("2025-01-01"),
      endDate: LocalDate.parse("2025-01-10"),
    });
    expect(rs.modified).toBe(false);

    rs.annualInterestRate = 3.5;
    expect(rs.modified).toBe(true);
    expect(rs.annualInterestRate.toNumber()).toBe(3.5);

    // Setting again should keep modified = true (it won't revert to false)
    rs.annualInterestRate = new Decimal(3.75);
    expect(rs.annualInterestRate.toNumber()).toBe(3.75);
    expect(rs.modified).toBe(true);
  });

  test("Setting startDate and endDate ensures day start and sets modified", () => {
    const rs = new RateSchedule({
      annualInterestRate: 5,
      startDate: "2025-01-01",
      endDate: "2025-02-01",
    });
    expect(rs.modified).toBe(false);

    rs.startDate = "2025-03-15T14:30:00";
    expect(rs.modified).toBe(true);
    expect(rs.startDate.toString()).toBe("2025-03-15");

    rs.endDate = new Date("2025-04-20T23:59:59Z");
    expect(rs.endDate.toString()).toBe("2025-04-20");
  });

  test("updateJsValues and updateModelValues keep JS and model in sync", () => {
    const rs = new RateSchedule({
      annualInterestRate: 10,
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });

    // check initial JS values
    expect(rs.jsAnnualInterestRate).toBe(10);
    expect(DateUtil.toIsoDateString(rs.jsStartDate)).toBe("2025-01-01");
    expect(DateUtil.toIsoDateString(rs.jsEndDate)).toBe("2025-01-31");

    // change the model
    rs.annualInterestRate = 12;
    rs.startDate = "2025-03-10";
    rs.endDate = "2025-03-15";

    // update JS from model
    rs.updateJsValues();
    expect(rs.jsAnnualInterestRate).toBe(12);
    expect(DateUtil.toIsoDateString(rs.jsStartDate)).toBe("2025-03-10");
    expect(DateUtil.toIsoDateString(rs.jsEndDate)).toBe("2025-03-15");

    // now let's change the JS values
    rs.jsAnnualInterestRate = 15;
    rs.jsStartDate = new Date("2025-04-01");
    rs.jsEndDate = new Date("2025-04-05");

    // and update the model from JS
    rs.updateModelValues();
    expect(rs.annualInterestRate.toNumber()).toBe(15);
    expect(rs.startDate.toString()).toBe("2025-04-01");
    expect(rs.endDate.toString()).toBe("2025-04-05");
  });

  test("json getter returns expected structure", () => {
    const rs = new RateSchedule({
      id: "test-id-123",
      annualInterestRate: 6.5,
      startDate: "2025-06-01",
      endDate: "2025-06-15",
      type: "custom",
    });

    const json = rs.json;
    expect(json).toEqual({
      id: "test-id-123",
      annualInterestRate: 6.5,
      startDate: rs.startDate.toString(),
      endDate: rs.endDate.toString(),
      type: "custom",
    });
  });
});

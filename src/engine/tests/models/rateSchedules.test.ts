import dayjs from "dayjs";
import { Currency, RoundingMethod } from "@utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "@models/Amortization";
import { ChangePaymentDate } from "@models/ChangePaymentDate";
import { ChangePaymentDates } from "@models/ChangePaymentDates";
import { CalendarType } from "@models/Calendar";
import { TermCalendars } from "@models/TermCalendars";
import Decimal from "decimal.js";
import { RateSchedule } from "../../models/RateSchedule";
import { RateSchedules } from "../../models/RateSchedules";
import { LendPeak } from "../../models/LendPeak";

const today = dayjs().startOf("day");

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
        endDate: today.add(1, "month"),
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
    expect(lendPeak.amortization.rateSchedules.all[1].endDate).toEqual(today.add(1, "month"));

    expect(lendPeak.amortization.rateSchedules.all[2].id).toBeDefined();
    expect(lendPeak.amortization.rateSchedules.all[2].annualInterestRate).toEqual(lendPeak.amortization.annualInterestRate);
    expect(lendPeak.amortization.rateSchedules.all[2].type).toEqual("generated");
    expect(lendPeak.amortization.rateSchedules.all[2].modified).toEqual(false);
    expect(lendPeak.amortization.rateSchedules.all[2].startDate).toEqual(today.add(1, "month"));
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

    const customRateEndDate = lendPeak.amortization.endDate.subtract(45, "days");
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
        endDate: today.add(1, "month"),
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

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class DateUtil {
  static normalizeDate(date: dayjs.ConfigType): dayjs.Dayjs {
    if (date === null || date === undefined) {
      return dayjs.utc().startOf("day");
    }

    try {
      const utcDate = dayjs.utc(date);
      return utcDate.startOf("day");
    } catch (error) {
      return dayjs.utc().startOf("day");
    }
  }

  // function returns Date object but discards the time part and timezone
  // ensuring that that the date is the same in all timezones.
  // this helps in UI to display the same date in all timezones
  // and it returns regular javascript Date
  static normalizeDateToJsDate(date: dayjs.Dayjs): Date {
    return new Date(date.year(), date.month(), date.date());
  }
}

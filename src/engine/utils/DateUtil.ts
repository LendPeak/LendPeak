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
}

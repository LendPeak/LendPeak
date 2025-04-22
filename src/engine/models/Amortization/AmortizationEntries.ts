import { AmortizationEntry } from "./AmortizationEntry";
import { Currency } from "../../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { DateUtil } from "../../utils/DateUtil";
import { LocalDate, ZoneId, ChronoUnit } from "@js-joda/core";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class AmortizationEntries {
  private _entries: AmortizationEntry[] = [];
  jsEntries: AmortizationEntry[] = [];

  constructor(entries: AmortizationEntry[] = []) {
    this.entries = entries;
    this.updateJsValues();
  }

  updateModelValues() {
    this._entries.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._entries.forEach((bm) => bm.updateJsValues());
  }

  get entries() {
    return this._entries;
  }

  set entries(value) {
    this._entries = value;
  }

  // proxy forEach method that is a proxy to the entries array
  forEach(callbackfn: (value: AmortizationEntry, index: number, array: AmortizationEntry[]) => void) {
    this._entries.forEach(callbackfn);
  }

  addEntry(entry: AmortizationEntry) {
    this.entries.push(entry);
  }
  removeEntry(index: number) {
    this.entries.splice(index, 1);
  }

  get length(): number {
    return this.entries.length;
  }

  get lastEntry(): AmortizationEntry {
    return this.entries[this.length - 1];
  }

  get firstEntry(): AmortizationEntry {
    return this.entries[0];
  }

  getEntryByTerm(term: number): AmortizationEntry | undefined {
    return this.entries.find((entry) => entry.term === term);
  }

  get cumulativeInterest(): Currency {
    return this._entries.reduce((acc, entry) => {
      return acc.add(entry.dueInterestForTerm.getRoundedValue());
    }, Currency.zero);
  }

  get cumulativeInterestNotRounded(): Currency {
    return this._entries.reduce((acc, entry) => {
      return acc.add(entry.dueInterestForTerm);
    }, Currency.zero);
  }

  getPeriodByDate(date: LocalDate): AmortizationEntry {
    const activePeriod = this._entries.find((period) => DateUtil.isBetweenInclusive(date, period.periodStartDate, period.periodEndDate));

    return activePeriod || this.lastEntry;
  }

  getPerDiemForPeriodByDate(date: LocalDate | Date): Currency {
    date = DateUtil.normalizeDate(date);

    // first we get the period where the date is
    const activePeriod = this.getPeriodByDate(date);

    if (!activePeriod) {
      return Currency.zero;
    }

    return activePeriod.perDiem;
  }

  /**
   * Returns the number of days left until the next billable term's due date,
   * starting from the provided date (defaults to today).
   *
   * If there are no upcoming terms left (all are passed), it returns 0.
   *
   * @param now The reference date (defaults to today's date).
   * @returns The number of days until the next billable period's due date.
   */
  getDaysLeftInTerm(now: LocalDate | Date = LocalDate.now()): number {
    now = DateUtil.normalizeDate(now);

    // Find the next upcoming billable period whose due date is after 'now'
    const upcomingEntry = this._entries.find((entry) => entry.billablePeriod && entry.periodBillDueDate.isAfter(now));

    if (!upcomingEntry) {
      // No future billable terms remain, so 0 days left
      return 0;
    }

    // Calculate and return the difference in whole days
    // return upcomingEntry.periodBillDueDate.diff(now, "day");
    return ChronoUnit.DAYS.between(now, upcomingEntry.periodBillDueDate);
  }

  /**
   * Computes the projected future interest if the loan runs to full maturity.
   * This considers the given `date` as a reference point, finds the next upcoming
   * repayment entry that starts after `date`, and sums all accruedInterestForPeriod
   * from that entry forward until the end of the loan.
   *
   * @param date The reference date from which to consider future interest.
   * @returns The projected future interest as a Currency object.
   */
  getProjectedFutureInterest(date: LocalDate): Currency {
    let projectedFutureInterest = Currency.zero;

    for (const entry of this._entries) {
      // Consider only billable periods that start after the given date
      if (entry.billablePeriod && entry.periodStartDate.isAfter(date)) {
        projectedFutureInterest = projectedFutureInterest.add(entry.accruedInterestForPeriod);
      }
    }

    return projectedFutureInterest;
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return this.entries.map((entry) => entry.json);
  }
}

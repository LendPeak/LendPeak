import { AmortizationEntries } from "./Amortization/AmortizationEntries"; // Adjust the import path as needed
import { Bill } from "./Bill";
import { Bills } from "./Bills";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { Currency } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { LocalDate, ZoneId, Instant, ChronoUnit } from "@js-joda/core";

dayjs.extend(isBetween);

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export class BillGenerator {
  static generateBills(params: { amortizationSchedule: AmortizationEntries; currentDate: LocalDate }): Bills {
    const currentDate = params.currentDate;

    const bills: Bills = new Bills({
      currentDate: currentDate,
    });

    let billIdSequence = 0;
    for (const entry of params.amortizationSchedule.entries) {
      if (!entry.billablePeriod) {
        continue; // Skip non-billable periods
      }

      const totalDue = entry.totalPayment;
      const id = BillGenerator.generateId(billIdSequence++);

      const bill: Bill = new Bill({
        id: id,
        period: entry.term,
        dueDate: entry.periodBillDueDate,
        openDate: entry.periodBillOpenDate,
        principalDue: entry.principal,
        interestDue: entry.dueInterestForTerm,
        feesDue: entry.fees,
        totalDue: totalDue,
        amortizationEntry: entry,
      });

      bills.addBill(bill);
    }

    bills.sortBills();

    return bills;
  }

  static generateId(sequence?: number): string {
    //    return uuidv4();
    const sequencePrefix = sequence ? `${sequence}-` : "";
    return "BILL-" + sequencePrefix + Math.random().toString(36).substr(2, 9);
  }
}

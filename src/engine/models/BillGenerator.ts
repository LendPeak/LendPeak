import { AmortizationEntries } from "./Amortization/AmortizationEntries"; // Adjust the import path as needed
import { Bill } from "./Bill";
import { Bills } from "./Bills";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { Currency } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export class BillGenerator {
  static generateBills(params: { amortizationSchedule: AmortizationEntries; currentDate?: Dayjs | Date }): Bills {
    const bills: Bills = new Bills();
    if (!params.currentDate) {
      params.currentDate = dayjs();
    }
    if (params.currentDate instanceof Date) {
      params.currentDate = dayjs(params.currentDate);
    }

    let billIdSequence = 1;
    for (const entry of params.amortizationSchedule.entries) {
      if (!entry.billablePeriod) {
        // Skip non-billable periods
        continue;
      }

      const totalDue = entry.totalPayment;
      const id = BillGenerator.generateId(billIdSequence++);
      const isPaid = totalDue.getValue().isZero() ? true : false;
      const isDue = entry.periodBillDueDate.isSameOrBefore(params.currentDate);
      const isOpen = entry.periodBillOpenDate.isSameOrBefore(params.currentDate);
      const bill: Bill = new Bill({
        id: id,
        period: entry.term,
        dueDate: entry.periodBillDueDate,
        openDate: entry.periodBillOpenDate,
        principalDue: entry.principal,
        interestDue: entry.dueInterestForTerm,
        feesDue: entry.fees,
        totalDue: totalDue,
        isPaid: isPaid,
        isOpen: isOpen,
        isDue: isDue,
        isPastDue: isPaid === false && entry.periodBillDueDate.isSameOrBefore(params.currentDate),
        daysPastDue: dayjs(params.currentDate).diff(entry.periodBillDueDate, "day"),
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

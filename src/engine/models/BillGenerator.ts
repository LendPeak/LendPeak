import { AmortizationEntry } from "./Amortization/AmortizationEntry"; // Adjust the import path as needed
import { Bill } from "./Bill";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { Currency } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export class BillGenerator {
  static generateBills(amortizationSchedule: AmortizationEntry[], currentDate: Dayjs | Date = dayjs()): Bill[] {
    const bills: Bill[] = [];
    if (currentDate instanceof Date) {
      currentDate = dayjs(currentDate);
    }

    let billIdSequence = 1;
    for (const entry of amortizationSchedule) {
      if (!entry.billablePeriod) {
        // Skip non-billable periods
        continue;
      }

      const totalDue = entry.totalPayment;
      const id = BillGenerator.generateId(billIdSequence++);
      const isPaid = totalDue.getValue().isZero() ? true : false;
      const isDue = entry.periodBillDueDate.isSameOrBefore(currentDate);
      const isOpen = entry.periodBillOpenDate.isSameOrBefore(currentDate);
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
        isPastDue: isPaid === false && entry.periodBillDueDate.isSameOrBefore(currentDate),
        daysPastDue: dayjs(currentDate).diff(entry.periodBillDueDate, "day"),
        amortizationEntry: entry,
      });

      bills.push(bill);
    }

    return bills;
  }

  static generateId(sequence?: number): string {
    //    return uuidv4();
    const sequencePrefix = sequence ? `${sequence}-` : "";
    return "BILL-" + sequencePrefix + Math.random().toString(36).substr(2, 9);
  }
}

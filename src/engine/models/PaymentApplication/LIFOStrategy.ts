import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bills } from "../Bills";
import dayjs, { Dayjs } from "dayjs";
import { AllocationStrategy } from "./AllocationStrategy";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
import { PaymentAllocation } from "./PaymentAllocation";
import { AllocationHelper } from "./AllocationHelper";
/*
LIFO Strategy (Last-In, First-Out)
The LIFO Strategy applies payments to the most recent bills first. This is useful when you want to prioritize clearing the newest debts.

Explanation:
- Bill Sorting: Bill[] are sorted in descending order of due date, so the most recent bills are prioritized.
- Allocation Logic: The allocation sequence is interest, then fees, then principal, similar to the FIFO strategy.
- Bill Status Update: Marks bills as paid if all components are fully allocated.
*/
export class LIFOStrategy implements AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount;
    const allocations: PaymentAllocation[] = [];

    // Sort bills by due date descending (most recent first)
    let sortedBills = bills.all.filter((bill) => bill.isOpen === true && !bill.isPaid).sort((a, b) => b.dueDate.diff(a.dueDate));

    if (deposit.applyExcessToPrincipal) {
      const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;
      sortedBills = sortedBills.filter((bill) => bill.openDate.isSameOrBefore(excessAppliedDate));
    }

    for (const bill of sortedBills) {
      if (remainingAmount.round().isZero()) break;

      const { allocation, remainingAmount: newRemainingAmount } = AllocationHelper.allocateToBill(deposit, bill, remainingAmount, paymentPriority);

      allocations.push(allocation);
      remainingAmount = newRemainingAmount;
    }

    const totalAllocated = deposit.amount.subtract(remainingAmount);

    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount: remainingAmount,
      excessAmount: Currency.Zero(), // Handle excess according to business rules
    };
  }
}

import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bill } from "../Bill";
import { Bills } from "../Bills";
import { LocalDate } from "@js-joda/core";
import { AllocationStrategy } from "./AllocationStrategy";
import { PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
import { PaymentAllocation } from "./PaymentAllocation";
import { AllocationHelper } from "./AllocationHelper";
import { DateUtil } from "../../utils/DateUtil";

/*
Custom Order Strategy
The CustomOrderStrategy allows you to define a custom order for bill allocation based on specific criteria.

Explanation:
- Custom Ordering: Define any sorting logic based on business needs.
- Flexible Allocation: Allocation logic remains consistent; only the bill processing order is customizable.
*/
export class CustomOrderStrategy implements AllocationStrategy {
  private compareFunction: (a: Bill, b: Bill) => number;

  constructor(compareFunction: (a: Bill, b: Bill) => number) {
    this.compareFunction = compareFunction;
  }

  apply(currentDate: LocalDate, deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount.clone();
    const allocations: PaymentAllocation[] = [];

    let sortedBills = bills.all.filter((bill) => bill.isOpen(currentDate) && !bill.isPaid()).sort(this.compareFunction);

    if (deposit.applyExcessToPrincipal) {
      const excessAppliedDate = DateUtil.normalizeDate(deposit.excessAppliedDate || deposit.effectiveDate);
      sortedBills = sortedBills.filter((bill) => bill.openDate.isBefore(excessAppliedDate) || bill.openDate.isEqual(excessAppliedDate));
    }

    for (const bill of sortedBills) {
      if (remainingAmount.round().isZero()) break;

      const { allocation, remainingAmount: newRemainingAmount } = AllocationHelper.allocateToBill(deposit, bill, remainingAmount, paymentPriority);

      allocations.push(allocation);
      remainingAmount = newRemainingAmount;
    }

    const totalAllocated = deposit.amount.subtract(remainingAmount);

    return {
      effectiveDate: DateUtil.normalizeDate(deposit.effectiveDate),
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount: remainingAmount,
      excessAmount: Currency.Zero(), // Adjust excess handling as needed
    };
  }
}

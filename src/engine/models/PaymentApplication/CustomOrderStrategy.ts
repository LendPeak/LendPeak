import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bill } from "../Bill";
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
Custom Order Strategy
The CustomOrderStrategy allows you to define a custom order for bill allocation based on specific criteria, such as priority levels or custom attributes.

Explanation:
- Custom Ordering: Allows you to define any sorting logic based on your business needs.
- Flexible Allocation: The allocation logic remains consistent, but the order in which bills are processed is customizable.
*/
export class CustomOrderStrategy implements AllocationStrategy {
  private compareFunction: (a: Bill, b: Bill) => number;

  constructor(compareFunction: (a: Bill, b: Bill) => number) {
    this.compareFunction = compareFunction;
  }

  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount;
    const allocations: PaymentAllocation[] = [];

    // Sort bills using the custom compare function
    let sortedBills = bills.all.filter((bill) => bill.isOpen === true && !bill.isPaid).sort(this.compareFunction);

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

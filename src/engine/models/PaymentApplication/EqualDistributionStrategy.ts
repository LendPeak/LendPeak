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
Equal Distribution Strategy
The Equal Distribution Strategy allocates payments equally across all outstanding bills.

Explanation:
- Equal Share Calculation: The deposit amount is divided equally among all unpaid bills.
- Allocation Logic: The allocation within each bill follows the standard sequence.
- Handling Remainders: Any unallocated amount due to rounding is captured and can be handled per your business rules.
*/
export class EqualDistributionStrategy implements AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    const remainingAmount = deposit.amount;
    const allocations: PaymentAllocation[] = [];

    // Filter unpaid bills
    let unpaidBills = bills.all.filter((bill) => bill.isOpen === true && !bill.isPaid);

    if (deposit.applyExcessToPrincipal) {
      const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;
      unpaidBills = unpaidBills.filter((bill) => bill.openDate.isSameOrBefore(excessAppliedDate));
    }

    const numOfBills = unpaidBills.length;

    if (numOfBills === 0) {
      // No unpaid bills; entire deposit is excess
      return {
        depositId: deposit.id,
        totalAllocated: Currency.Zero(),
        allocations: [],
        unallocatedAmount: deposit.amount,
        excessAmount: deposit.amount,
      };
    }

    // Calculate equal share per bill
    const sharePerBill = deposit.amount.divide(numOfBills).round(2);

    let totalAllocated = Currency.Zero();

    for (const bill of unpaidBills) {
      const { allocation, remainingAmount: unusedAmount } = AllocationHelper.allocateToBill(deposit, bill, remainingAmount, paymentPriority);
      allocations.push(allocation);
      totalAllocated = totalAllocated.add(allocation.allocatedPrincipal.add(allocation.allocatedInterest).add(allocation.allocatedFees));
    }

    const unallocatedAmount = deposit.amount.subtract(totalAllocated);

    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount,
      excessAmount: Currency.Zero(),
    };
  }
}

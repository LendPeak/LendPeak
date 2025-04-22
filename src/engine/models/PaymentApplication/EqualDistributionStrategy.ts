import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bills } from "../Bills";
import { AllocationStrategy } from "./AllocationStrategy";
import { PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
import { PaymentAllocation } from "./PaymentAllocation";
import { AllocationHelper } from "./AllocationHelper";
import { DateUtil } from "../../utils/DateUtil";
import { LocalDate } from "@js-joda/core";
/**
 * Equal Distribution Strategy
 *
 * The Equal Distribution Strategy allocates payments equally across all outstanding bills.
 *
 * Explanation:
 * - Equal Share Calculation: The deposit amount is divided equally among all unpaid bills.
 * - Allocation Logic: The allocation within each bill follows the standard sequence.
 * - Handling Remainders: Any unallocated amount due to rounding is captured as unallocatedAmount.
 */
export class EqualDistributionStrategy implements AllocationStrategy {
  apply(currentDate: LocalDate, deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    const allocations: PaymentAllocation[] = [];

    // Filter unpaid bills
    let unpaidBills = bills.all.filter((bill) => bill.isOpen(currentDate) && !bill.isPaid());

    if (deposit.applyExcessToPrincipal) {
      const excessAppliedDate = deposit.excessAppliedDate ? DateUtil.normalizeDate(deposit.excessAppliedDate) : DateUtil.normalizeDate(deposit.effectiveDate);
      unpaidBills = unpaidBills.filter((bill) => !DateUtil.normalizeDate(bill.openDate).isAfter(excessAppliedDate));
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
        effectiveDate: deposit.effectiveDate,
      };
    }

    // Calculate equal share per bill, rounded to 2 decimals
    const sharePerBill = deposit.amount.divide(numOfBills).round(2);

    let totalAllocated = Currency.Zero();

    for (const bill of unpaidBills) {
      // Allocate exactly the sharePerBill amount to each bill
      const { allocation } = AllocationHelper.allocateToBill(deposit, bill, sharePerBill, paymentPriority);
      allocations.push(allocation);
      totalAllocated = totalAllocated.add(allocation.allocatedPrincipal).add(allocation.allocatedInterest).add(allocation.allocatedFees);
    }

    // Capture any remainder due to rounding differences
    const unallocatedAmount = deposit.amount.subtract(totalAllocated);

    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount,
      excessAmount: Currency.Zero(),
      effectiveDate: deposit.effectiveDate,
    };
  }
}

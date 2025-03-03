import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bills } from "../Bills";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import { AllocationStrategy } from "./AllocationStrategy";
import { PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
import { PaymentAllocation } from "./PaymentAllocation";
import { AllocationHelper } from "./AllocationHelper";
import { BalanceModification } from "../Amortization/BalanceModification";
import { v4 as uuidv4 } from "uuid";
import { UsageDetail } from "../Bill/DepositRecord/UsageDetail";

/**
 * Helper function for static-allocations only.
 * Splits the deposit into interest portion, fees portion, principal portion
 * in FIFO order across open, unpaid Bills.
 */
function allocateSingleComponentFIFO(
  bills: Bills,
  component: "interest" | "fees" | "principal",
  amountToAllocate: Currency,
  deposit: DepositRecord,
  existingAllocations: PaymentAllocation[]
): { totalAllocatedToComponent: Currency; leftover: Currency } {
  let leftover = amountToAllocate.clone();
  let totalAllocatedToComponent = Currency.Zero();

  // Sort open unpaid bills by due date ascending
  const openBills = bills.all.filter((bill) => bill.isOpen && !bill.isPaid).sort((a, b) => a.dueDate.diff(b.dueDate));

  for (const bill of openBills) {
    if (leftover.isZero()) break;

    let amountDue = component === "interest" ? bill.interestDue : component === "fees" ? bill.feesDue : bill.principalDue;

    if (amountDue.isZero()) continue;

    // Allocate as much as possible
    const allocated = Currency.min(leftover, amountDue);
    leftover = leftover.subtract(allocated);
    totalAllocatedToComponent = totalAllocatedToComponent.add(allocated);

    // Deduct from Bill
    if (component === "interest") {
      bill.interestDue = bill.interestDue.subtract(allocated);
    } else if (component === "fees") {
      bill.feesDue = bill.feesDue.subtract(allocated);
    } else {
      bill.principalDue = bill.principalDue.subtract(allocated);
    }

    // Update the PaymentAllocation array (no usage detail here!)
    let billAllocation = existingAllocations.find((a) => a.billId === bill.id);
    if (!billAllocation) {
      billAllocation = {
        billId: bill.id,
        allocatedPrincipal: Currency.Zero(),
        allocatedInterest: Currency.Zero(),
        allocatedFees: Currency.Zero(),
      };
      existingAllocations.push(billAllocation);
    }

    if (component === "interest") {
      billAllocation.allocatedInterest = billAllocation.allocatedInterest.add(allocated);
    } else if (component === "fees") {
      billAllocation.allocatedFees = billAllocation.allocatedFees.add(allocated);
    } else {
      billAllocation.allocatedPrincipal = billAllocation.allocatedPrincipal.add(allocated);
    }

    // Mark paid if all due amounts are zero
    if (bill.principalDue.isZero() && bill.interestDue.isZero() && bill.feesDue.isZero()) {
      bill.isPaid = true;
    }

    // Ensure deposit ID is in bill’s paymentMetadata
    if (!bill.paymentMetadata) {
      bill.paymentMetadata = { depositIds: [] };
    }
    if (!bill.paymentMetadata.depositIds) {
      bill.paymentMetadata.depositIds = [];
    }
    if (!bill.paymentMetadata.depositIds.includes(deposit.id)) {
      bill.paymentMetadata.depositIds.push(deposit.id);
    }
  }

  return {
    totalAllocatedToComponent,
    leftover,
  };
}

/**
 * FIFO Strategy (First-In, First-Out).
 * We do *no* extra usage detail for final payoff.
 * We track daysLate/daysEarly on the Bill if it's newly paid.
 */
export class FIFOStrategy implements AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    // If deposit has staticAllocation, do that path
    if (deposit.staticAllocation) {
      return this.applyStaticAllocation(deposit, bills);
    }
    // Otherwise do normal FIFO with PaymentPriority
    return this.applyNormalFifoWithPriority(deposit, bills, paymentPriority);
  }

  /**
   * Normal FIFO approach:
   *  1) Sort bills by earliest due date
   *  2) For each Bill, call AllocationHelper.allocateToBill() which
   *     accumulates principal + interest + fees in a single usage detail
   *     if something was allocated to that bill.
   *  3) We set Bill.isPaid if everything is zero.
   *  4) If the Bill just got fully paid, track daysLate/daysEarly
   *     on the Bill object. (No new usage detail.)
   */
  private applyNormalFifoWithPriority(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount.clone();
    const allocations: PaymentAllocation[] = [];

    // Sort bills by due date ascending
    let sortedBills = bills.all.filter((b) => b.isOpen && !b.isPaid).sort((a, b) => a.dueDate.diff(b.dueDate));

    // If applyExcessToPrincipal, optionally filter by deposit date
    if (deposit.applyExcessToPrincipal) {
      const cutoff = deposit.excessAppliedDate || deposit.effectiveDate;
      sortedBills = sortedBills.filter((bill) => bill.openDate.isSameOrBefore(cutoff));
    }

    for (const bill of sortedBills) {
      if (remainingAmount.isZero()) break;

      const wasPaid = bill.isPaid;

      // Single aggregated usage detail in allocateToBill
      const { allocation, remainingAmount: newRemaining } = AllocationHelper.allocateToBill(deposit, bill, remainingAmount, paymentPriority);

      allocations.push(allocation);
      remainingAmount = newRemaining;

      // If the Bill just got fully paid, track daysLate/daysEarly
      if (!wasPaid && bill.isPaid) {
        bill.dateFullySatisfied = deposit.effectiveDate;
        const diffInDays = deposit.effectiveDate.diff(bill.dueDate, "day");
        if (diffInDays > 0) {
          bill.daysLate = diffInDays;
          bill.daysEarly = 0;
        } else if (diffInDays < 0) {
          bill.daysLate = 0;
          bill.daysEarly = Math.abs(diffInDays);
        } else {
          bill.daysLate = 0;
          bill.daysEarly = 0;
        }
      }
    }

    const totalAllocated = deposit.amount.subtract(remainingAmount);
    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount: remainingAmount,
      excessAmount: Currency.Zero(),
    };
  }

  /**
   * Static allocation path:
   *   - interest portion in FIFO
   *   - fees portion in FIFO
   *   - principal portion in FIFO
   *   - optional direct prepayment (BalanceModification)
   * We do *not* create final usage details at payoff
   * to avoid duplicates.
   */
  private applyStaticAllocation(deposit: DepositRecord, bills: Bills): PaymentApplicationResult {
    if (!deposit.staticAllocation) {
      throw new Error("applyStaticAllocation called but deposit.staticAllocation is undefined!");
    }

    // STEP 1: Track which bills were already paid
    const wasPaidMap = new Map<string, boolean>();
    for (const b of bills.all) {
      wasPaidMap.set(b.id, b.isPaid);
    }

    const { principal, interest, fees, prepayment } = deposit.staticAllocation;
    const allocations: PaymentAllocation[] = [];
    let unallocatedAmount = deposit.amount.clone();

    // STEP 2: Do the 3-part allocation, capturing into 'allocations'
    const { totalAllocatedToComponent: interestAllocated } = allocateSingleComponentFIFO(bills, "interest", interest, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(interestAllocated);

    const { totalAllocatedToComponent: feesAllocated } = allocateSingleComponentFIFO(bills, "fees", fees, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(feesAllocated);

    const { totalAllocatedToComponent: principalAllocated } = allocateSingleComponentFIFO(bills, "principal", principal, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(principalAllocated);

    // STEP 2a: Optional separate "prepayment" chunk
    let balanceModification: BalanceModification | undefined;
    if (prepayment && prepayment.greaterThan(0)) {
      unallocatedAmount = unallocatedAmount.subtract(prepayment);

      balanceModification = new BalanceModification({
        id: uuidv4(),
        amount: prepayment.toNumber(),
        date: deposit.effectiveDate,
        isSystemModification: true,
        type: "decrease",
        description: `Static Prepayment from deposit ${deposit.id}`,
        metadata: { depositId: deposit.id },
      });

      // Single usage detail for the prepayment chunk
      deposit.addUsageDetail({
        billId: "Principal Prepayment",
        period: 0,
        billDueDate: deposit.effectiveDate,
        allocatedPrincipal: prepayment,
        allocatedInterest: Currency.Zero(),
        allocatedFees: Currency.Zero(),
        date: deposit.effectiveDate,
      } as any);
    }

    // STEP 3: Merge allocations -> single usage detail per Bill
    const usageMap = new Map<string, PaymentAllocation>();
    for (const alloc of allocations) {
      if (!usageMap.has(alloc.billId)) {
        usageMap.set(alloc.billId, {
          billId: alloc.billId,
          allocatedPrincipal: Currency.Zero(),
          allocatedInterest: Currency.Zero(),
          allocatedFees: Currency.Zero(),
        });
      }
      const merged = usageMap.get(alloc.billId)!;
      merged.allocatedPrincipal = merged.allocatedPrincipal.add(alloc.allocatedPrincipal);
      merged.allocatedInterest = merged.allocatedInterest.add(alloc.allocatedInterest);
      merged.allocatedFees = merged.allocatedFees.add(alloc.allocatedFees);
    }

    for (const merged of usageMap.values()) {
      const totalAllocated = merged.allocatedPrincipal.add(merged.allocatedInterest).add(merged.allocatedFees);
      if (!totalAllocated.isZero()) {
        const bill = bills.all.find((b) => b.id === merged.billId);
        if (!bill) continue;
        deposit.addUsageDetail({
          billId: bill.id,
          period: bill.period,
          billDueDate: bill.dueDate,
          allocatedPrincipal: merged.allocatedPrincipal,
          allocatedInterest: merged.allocatedInterest,
          allocatedFees: merged.allocatedFees,
          date: deposit.effectiveDate,
        } as any);
      }
    }

    // STEP 4: Mark newly paid bills' daysLate/daysEarly
    for (const bill of bills.all) {
      const wasPaid = wasPaidMap.get(bill.id) ?? false;
      if (!wasPaid && bill.isPaid) {
        bill.dateFullySatisfied = deposit.effectiveDate;
        const diffInDays = deposit.effectiveDate.diff(bill.dueDate, "day");
        if (diffInDays > 0) {
          bill.daysLate = diffInDays;
          bill.daysEarly = 0;
        } else if (diffInDays < 0) {
          bill.daysLate = 0;
          bill.daysEarly = Math.abs(diffInDays);
        } else {
          bill.daysLate = 0;
          bill.daysEarly = 0;
        }
      }
    }

    const totalAllocated = deposit.amount.subtract(unallocatedAmount);
    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount,
      excessAmount: Currency.Zero(),
      balanceModification,
    };
  }
}

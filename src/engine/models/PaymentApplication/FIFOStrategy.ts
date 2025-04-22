import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { Bills } from "../Bills";
import { LocalDate, ChronoUnit } from "@js-joda/core";
import { AllocationStrategy } from "./AllocationStrategy";
import { PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
import { PaymentAllocation } from "./PaymentAllocation";
import { AllocationHelper } from "./AllocationHelper";
import { UsageDetail } from "../Bill/DepositRecord/UsageDetail";
import { BillPaymentDetail } from "../Bill/BillPaymentDetail";
import { DateUtil } from "../../utils/DateUtil";

/**
 * FIFO Strategy (First-In, First-Out).
 * No extra usage detail for final payoff.
 * Track daysLate/daysEarly on the Bill when fully paid.
 */
export class FIFOStrategy implements AllocationStrategy {
  apply(currentDate: LocalDate, deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    if (deposit.staticAllocation) {
      return this.applyStaticAllocation(currentDate, deposit, bills);
    }
    return this.applyNormalFifoWithPriority(currentDate, deposit, bills, paymentPriority);
  }

  private applyNormalFifoWithPriority(currentDate: LocalDate, deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount.clone();
    const allocations: PaymentAllocation[] = [];

    // Sort bills by due date ascending
    let sortedBills = bills.all.filter((b) => b.isOpen(currentDate) && !b.isPaid()).sort((a, b) => a.period - b.period);

    if (deposit.applyExcessToPrincipal) {
      const cutoff = DateUtil.normalizeDate(deposit.excessAppliedDate || deposit.effectiveDate);
      sortedBills = sortedBills.filter((bill) => bill.openDate.isBefore(cutoff) || bill.openDate.isEqual(cutoff));
    }

    for (const bill of sortedBills) {
      if (remainingAmount.isZero()) break;

      const wasPaid = bill.isPaid();
      const { allocation, remainingAmount: newRemaining } = AllocationHelper.allocateToBill(deposit, bill, remainingAmount, paymentPriority);

      allocations.push(allocation);
      remainingAmount = newRemaining;

      if (!wasPaid && bill.isPaid()) {
        bill.dateFullySatisfied = DateUtil.normalizeDate(deposit.effectiveDate);
        const diffInDays = ChronoUnit.DAYS.between(bill.dueDate, deposit.effectiveDate);
        bill.daysLate = diffInDays > 0 ? diffInDays : 0;
        bill.daysEarly = diffInDays < 0 ? Math.abs(diffInDays) : 0;
      }
    }

    return {
      depositId: deposit.id,
      totalAllocated: deposit.amount.subtract(remainingAmount),
      allocations,
      unallocatedAmount: remainingAmount,
      excessAmount: Currency.Zero(),
      effectiveDate: DateUtil.normalizeDate(deposit.effectiveDate),
    };
  }

  private applyStaticAllocation(currentDate: LocalDate, deposit: DepositRecord, bills: Bills): PaymentApplicationResult {
    if (!deposit.staticAllocation) {
      throw new Error("Static allocation required but undefined.");
    }

    const wasPaidMap = new Map(bills.all.map((b) => [b.id, b.isPaid()]));
    const { principal, interest, fees } = deposit.staticAllocation;
    const allocations: PaymentAllocation[] = [];
    let unallocatedAmount = deposit.amount.clone();

    const interestResult = allocateSingleComponentFIFO(currentDate, bills, "interest", interest, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(interestResult.totalAllocatedToComponent);

    const feesResult = allocateSingleComponentFIFO(currentDate, bills, "fees", fees, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(feesResult.totalAllocatedToComponent);

    const principalResult = allocateSingleComponentFIFO(currentDate, bills, "principal", principal, deposit, allocations);
    unallocatedAmount = unallocatedAmount.subtract(principalResult.totalAllocatedToComponent);

    const usageMap = new Map<string, PaymentAllocation>();
    allocations.forEach((alloc) => {
      const merged = usageMap.get(alloc.billId) || {
        billId: alloc.billId,
        allocatedPrincipal: Currency.Zero(),
        allocatedInterest: Currency.Zero(),
        allocatedFees: Currency.Zero(),
      };
      merged.allocatedPrincipal = merged.allocatedPrincipal.add(alloc.allocatedPrincipal);
      merged.allocatedInterest = merged.allocatedInterest.add(alloc.allocatedInterest);
      merged.allocatedFees = merged.allocatedFees.add(alloc.allocatedFees);
      usageMap.set(alloc.billId, merged);
    });

    usageMap.forEach((merged) => {
      const totalAllocated = merged.allocatedPrincipal.add(merged.allocatedInterest).add(merged.allocatedFees);
      if (!totalAllocated.isZero()) {
        const bill = bills.all.find((b) => b.id === merged.billId);
        if (!bill) return;

        deposit.addUsageDetail(
          new UsageDetail({
            billId: bill.id,
            period: bill.period,
            billDueDate: bill.dueDate,
            allocatedPrincipal: merged.allocatedPrincipal,
            allocatedInterest: merged.allocatedInterest,
            allocatedFees: merged.allocatedFees,
            date: deposit.effectiveDate,
          })
        );

        bill.paymentDetails.push(
          new BillPaymentDetail({
            depositId: deposit.id,
            allocatedPrincipal: merged.allocatedPrincipal,
            allocatedInterest: merged.allocatedInterest,
            allocatedFees: merged.allocatedFees,
            date: deposit.effectiveDate,
          })
        );
      }
    });

    bills.all.forEach((bill) => {
      if (!wasPaidMap.get(bill.id) && bill.isPaid()) {
        bill.dateFullySatisfied = DateUtil.normalizeDate(deposit.effectiveDate);
        const diffInDays = ChronoUnit.DAYS.between(bill.dueDate, deposit.effectiveDate);
        bill.daysLate = diffInDays > 0 ? diffInDays : 0;
        bill.daysEarly = diffInDays < 0 ? Math.abs(diffInDays) : 0;
      }
    });

    return {
      depositId: deposit.id,
      totalAllocated: deposit.amount.subtract(unallocatedAmount),
      allocations,
      unallocatedAmount,
      excessAmount: Currency.Zero(),
      effectiveDate: DateUtil.normalizeDate(deposit.effectiveDate),
    };
  }
}

function allocateSingleComponentFIFO(
  currentDate: LocalDate,
  bills: Bills,
  component: "interest" | "fees" | "principal",
  amountToAllocate: Currency,
  deposit: DepositRecord,
  allocations: PaymentAllocation[]
): { totalAllocatedToComponent: Currency; leftover: Currency } {
  let leftover = amountToAllocate.clone();
  let totalAllocated = Currency.Zero();

  const openBills = bills.all.filter((b) => b.isOpen(currentDate) && !b.isPaid()).sort((a, b) => ChronoUnit.DAYS.between(a.dueDate, b.dueDate));

  for (const bill of openBills) {
    if (leftover.isZero()) break;
    const amountDue = component === "interest" ? bill.interestDue : component === "fees" ? bill.feesDue : bill.principalDue;
    if (amountDue.isZero()) continue;

    const allocated = Currency.min(leftover, amountDue);
    leftover = leftover.subtract(allocated);
    totalAllocated = totalAllocated.add(allocated);

    if (component === "interest") bill.interestDue = bill.interestDue.subtract(allocated);
    else if (component === "fees") bill.feesDue = bill.feesDue.subtract(allocated);
    else bill.principalDue = bill.principalDue.subtract(allocated);

    let billAllocation = allocations.find((a) => a.billId === bill.id);
    if (!billAllocation) {
      billAllocation = { billId: bill.id, allocatedPrincipal: Currency.Zero(), allocatedInterest: Currency.Zero(), allocatedFees: Currency.Zero() };
      allocations.push(billAllocation);
    }

    if (component === "interest") billAllocation.allocatedInterest = billAllocation.allocatedInterest.add(allocated);
    else if (component === "fees") billAllocation.allocatedFees = billAllocation.allocatedFees.add(allocated);
    else billAllocation.allocatedPrincipal = billAllocation.allocatedPrincipal.add(allocated);

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

  return { totalAllocatedToComponent: totalAllocated, leftover };
}

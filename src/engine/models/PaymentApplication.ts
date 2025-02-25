import { Currency } from "../utils/Currency";
import { DepositRecord } from "./Deposit";
import { DepositRecords } from "./DepositRecords";
import Decimal from "decimal.js";
import { Bill } from "./Bill";
import { Bills } from "./Bills";
import { BalanceModification } from "./Amortization/BalanceModification";
import { UsageDetail } from "./Bill/Deposit/UsageDetail";
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid"; // Import UUID
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

// Payment components
export type PaymentComponent = "interest" | "fees" | "principal";
export type PaymentAllocationStrategyName = "FIFO" | "LIFO" | "EqualDistribution" | "Proportional";

// Payment priority configuration
export type PaymentPriority = PaymentComponent[];

// Payment Allocation to a Bill
export interface PaymentAllocation {
  billId: string;
  allocatedPrincipal: Currency;
  allocatedInterest: Currency;
  allocatedFees: Currency;
}

// Payment Application Result
export interface PaymentApplicationResult {
  depositId: string;
  totalAllocated: Currency;
  allocations: PaymentAllocation[];
  unallocatedAmount: Currency;
  excessAmount: Currency;
  balanceModification?: BalanceModification;
}

// Payment Application Module
export class PaymentApplication {
  bills: Bills;
  private deposits: DepositRecords;
  private allocationStrategy: AllocationStrategy;
  private paymentPriority: PaymentPriority;

  constructor(bills: Bills, deposits: DepositRecords, options?: { allocationStrategy?: AllocationStrategy; paymentPriority?: PaymentPriority }) {
    this.bills = bills;
    this.bills.sortBills();
    this.deposits = deposits;
    this.deposits.sortByEffectiveDate();

    // Default to LIFO strategy if not provided
    options = options || {};
    this.allocationStrategy = options.allocationStrategy || new FIFOStrategy();

    if (!options.paymentPriority) {
      options.paymentPriority = ["interest", "fees", "principal"];
    } else {
      options.paymentPriority = options.paymentPriority;
      // Ensure all components are included
      const components: PaymentPriority = ["interest", "fees", "principal"];
      for (const component of components) {
        if (!options.paymentPriority.includes(component)) {
          throw new Error(`Missing payment component in priority list: ${component}`);
        }
      }
    }
    this.paymentPriority = options.paymentPriority;
  }

  static getAllocationStrategyFromName(strategyName: PaymentAllocationStrategyName): AllocationStrategy {
    // Build the allocation strategy based on user selection
    let allocationStrategy: AllocationStrategy;
    switch (strategyName) {
      case "FIFO":
        allocationStrategy = new FIFOStrategy();
        break;
      case "LIFO":
        allocationStrategy = new LIFOStrategy();
        break;
      case "EqualDistribution":
        allocationStrategy = new EqualDistributionStrategy();
        break;
      case "Proportional":
        allocationStrategy = new ProportionalStrategy();
        break;
      default:
        throw new Error(`Unknown allocation strategy: ${strategyName}`);
    }
    return allocationStrategy;
  }

  processDeposits(currentDate: Dayjs | Date | string = dayjs()): PaymentApplicationResult[] {
    if (currentDate instanceof Date || typeof currentDate === "string") {
      currentDate = dayjs(currentDate);
    }
    currentDate = currentDate.startOf("day");
    const results: PaymentApplicationResult[] = [];

    for (const deposit of this.deposits.all) {
      if (deposit.active !== true) {
        // console.debug(`Skipping deposit ${deposit.id} because it is not active`);
        continue;
      }
      // if effective date is after the current date, skip the deposit
      if (dayjs(deposit.effectiveDate).isAfter(currentDate)) {
        // console.debug(`Skipping deposit ${deposit.id} because its effective date is after the current date`);
        continue;
      }
      const result = this.applyDeposit(deposit, {
        allocationStrategy: this.allocationStrategy,
        paymentPriority: this.paymentPriority,
      });
      results.push(result);
    }

    return results;
  }

  applyDeposit(
    deposit: DepositRecord,
    options?: {
      allocationStrategy?: AllocationStrategy;
      paymentPriority?: PaymentPriority;
    }
  ): PaymentApplicationResult {
    options = options || {};
    options.allocationStrategy = options.allocationStrategy || this.allocationStrategy;
    options.paymentPriority = options.paymentPriority || this.paymentPriority;

    const result = options.allocationStrategy.apply(deposit, this.bills, options.paymentPriority);

    if (deposit.applyExcessToPrincipal && result.unallocatedAmount.getValue().greaterThan(0)) {
      const excessAmount = result.unallocatedAmount;

      const dateToApply = this.determineBalanceModificationDate(deposit);

      const balanceModification = new BalanceModification({
        id: this.generateUniqueId(),
        amount: excessAmount.toNumber(),
        date: dateToApply,
        isSystemModification: true,
        type: "decrease",
        description: `Excess funds applied to principal from deposit ${deposit.id}`,
        metadata: {
          depositId: deposit.id,
        },
      });

      result.balanceModification = balanceModification;

      const usageDetail = new UsageDetail({
        billId: "Principal Prepayment",
        period: 0,
        billDueDate: dateToApply,
        allocatedPrincipal: excessAmount.toNumber(),
        allocatedInterest: 0,
        allocatedFees: 0,
        date: dateToApply,
      });

      deposit.addUsageDetail(usageDetail);
    }

    return result;
  }

  private determineBalanceModificationDate(deposit: DepositRecord): Dayjs {
    const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;

    if (!excessAppliedDate) {
      throw new Error(`Deposit ${deposit.id} has no effective date or excess applied date.`);
    }

    const depositEffectiveDayjs = dayjs(deposit.effectiveDate);
    const openBillsAtDepositDate = this.bills.all.filter((bill) => !bill.isPaid && bill.isOpen && bill.dueDate.isSameOrAfter(depositEffectiveDayjs));

    let balanceModificationDate: Dayjs;

    if (openBillsAtDepositDate.length > 0) {
      const latestBill = openBillsAtDepositDate.reduce((latest, bill) => (bill.dueDate.isAfter(latest.dueDate) ? bill : latest));
      const nextTermStartDate = latestBill.amortizationEntry.periodEndDate;

      balanceModificationDate = nextTermStartDate.isAfter(excessAppliedDate) ? nextTermStartDate : dayjs(excessAppliedDate).startOf("day");
    } else {
      balanceModificationDate = depositEffectiveDayjs.isAfter(excessAppliedDate) ? depositEffectiveDayjs : dayjs(excessAppliedDate).startOf("day");
    }

    return balanceModificationDate;
  }

  private generateUniqueId(): string {
    return uuidv4();
  }
}

// Allocation Strategy Interface
export interface AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult;
}

// Allocation Strategies

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

      const { allocation, remainingAmount: newRemainingAmount } = AllocationHelper.allocateToBill(
        bill,
        remainingAmount,
        paymentPriority,
        deposit.id // Pass depositId here
      );

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
// FIFO Strategy (First-In, First-Out)
export class FIFOStrategy implements AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    let remainingAmount = deposit.amount;
    const allocations: PaymentAllocation[] = [];

    // Sort bills by due date ascending
    let sortedBills = bills.all.filter((bill) => bill.isOpen && !bill.isPaid).sort((a, b) => a.dueDate.diff(b.dueDate));
    //console.log("sorted bills", sortedBills);

    // If applying excess to principal, further filter by deposit date
    if (deposit.applyExcessToPrincipal) {
      const excessDate = deposit.excessAppliedDate || deposit.effectiveDate;
      sortedBills = sortedBills.filter((bill) => bill.openDate.isSameOrBefore(excessDate));
    }

    for (const bill of sortedBills) {
      if (remainingAmount.round().isZero()) break;

      // Track whether bill was already paid (unlikely, but let's be explicit)
      const wasPaid = bill.isPaid;

      // Allocate to the bill
      const { allocation, remainingAmount: newRemaining } = AllocationHelper.allocateToBill(bill, remainingAmount, paymentPriority, deposit.id);

      allocations.push(allocation);
      remainingAmount = newRemaining;

      // Check if the bill *just now* got fully paid
      if (!wasPaid && bill.isPaid) {
        bill.dateFullySatisfied = deposit.effectiveDate;

        // Bill moved from unpaid -> paid by this deposit
        const diffInDays = deposit.effectiveDate.diff(bill.dueDate, "day");
        let daysLate = 0;
        let daysEarly = 0;
        if (diffInDays > 0) {
          daysLate = diffInDays; // Bill is fully paid X days after due date
          bill.daysLate = diffInDays;
          bill.daysEarly = 0;
        } else if (diffInDays < 0) {
          daysEarly = Math.abs(diffInDays); // Bill is fully paid X days before due date
          bill.daysEarly = Math.abs(diffInDays);
          bill.daysLate = 0;
        } else {
          bill.daysLate = 0;
          bill.daysEarly = 0;
        }

        // Create usage detail only if you want to record the payoff event
        const usageDetail = new UsageDetail({
          billId: bill.id,
          period: bill.period,
          billDueDate: bill.dueDate,
          allocatedPrincipal: allocation.allocatedPrincipal,
          allocatedInterest: allocation.allocatedInterest,
          allocatedFees: allocation.allocatedFees,
          date: deposit.effectiveDate,
          daysLate,
          daysEarly,
          billFullySatisfiedDate: deposit.effectiveDate,
        });

        // Attach usage detail to the deposit
        deposit.addUsageDetail(usageDetail);
      }
    }

    // Calculate total allocated
    const totalAllocated = deposit.amount.subtract(remainingAmount);

    // Return normal allocation result
    return {
      depositId: deposit.id,
      totalAllocated,
      allocations,
      unallocatedAmount: remainingAmount,
      excessAmount: Currency.Zero(),
    };
  }
}

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
      const { allocation, remainingAmount: unusedAmount } = AllocationHelper.allocateToBill(bill, sharePerBill, paymentPriority, deposit.id);
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

      const { allocation, remainingAmount: newRemainingAmount } = AllocationHelper.allocateToBill(bill, remainingAmount, paymentPriority, deposit.id);

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

// Proportional Strategy
// The Proportional Strategy allocates the payment proportionally across all outstanding bills based on the total amount due for each bill.
export class ProportionalStrategy implements AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult {
    const allocations: PaymentAllocation[] = [];

    // Filter unpaid bills
    let unpaidBills = bills.all.filter((bill) => bill.isOpen === true && !bill.isPaid);

    if (deposit.applyExcessToPrincipal) {
      const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;
      unpaidBills = unpaidBills.filter((bill) => bill.openDate.isSameOrBefore(excessAppliedDate));
    }

    // Calculate the total amount due across all unpaid bills
    const totalDue = unpaidBills.reduce((sum, bill) => sum.add(bill.totalDue), Currency.Zero());

    if (totalDue.getValue().isZero()) {
      // No outstanding amounts; entire deposit is excess
      return {
        depositId: deposit.id,
        totalAllocated: Currency.Zero(),
        allocations: [],
        unallocatedAmount: deposit.amount,
        excessAmount: deposit.amount,
      };
    }

    let totalAllocated = Currency.Zero();

    // Allocate payments proportionally
    for (const bill of unpaidBills) {
      // Calculate proportion of the deposit for this bill
      const proportion = bill.totalDue.divide(totalDue);
      const allocationAmount = deposit.amount.multiply(proportion).round(2);

      const { allocation, remainingAmount: unusedAmount } = AllocationHelper.allocateToBill(bill, allocationAmount, paymentPriority, deposit.id);
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
class AllocationHelper {
  static allocateToBill(bill: Bill, amount: Currency, paymentPriority: PaymentPriority, depositId: string): { allocation: PaymentAllocation; remainingAmount: Currency } {
    let allocatedPrincipal = Currency.Zero();
    let allocatedInterest = Currency.Zero();
    let allocatedFees = Currency.Zero();

    let remainingAmount = amount;

    for (const component of paymentPriority) {
      if (remainingAmount.round().isZero()) break;

      switch (component) {
        case "interest":
          if (bill.interestDue.getValue().greaterThan(0)) {
            const interestPayment = Currency.min(remainingAmount, bill.interestDue);
            allocatedInterest = allocatedInterest.add(interestPayment);
            remainingAmount = remainingAmount.subtract(interestPayment);
            bill.interestDue = bill.interestDue.subtract(interestPayment);
          }
          break;

        case "fees":
          if (bill.feesDue.getValue().greaterThan(0)) {
            const feesPayment = Currency.min(remainingAmount, bill.feesDue);
            allocatedFees = allocatedFees.add(feesPayment);
            remainingAmount = remainingAmount.subtract(feesPayment);
            bill.feesDue = bill.feesDue.subtract(feesPayment);
          }
          break;

        case "principal":
          if (bill.principalDue.getValue().greaterThan(0)) {
            const principalPayment = Currency.min(remainingAmount, bill.principalDue);
            allocatedPrincipal = allocatedPrincipal.add(principalPayment);
            remainingAmount = remainingAmount.subtract(principalPayment);
            bill.principalDue = bill.principalDue.subtract(principalPayment);
          }
          break;

        default:
          throw new Error(`Unknown payment component: ${component}`);
      }
    }

    // Update bill status if fully paid
    if (bill.principalDue.isZero() && bill.interestDue.isZero() && bill.feesDue.isZero()) {
      bill.isPaid = true;
    }

    // Update bill's payment metadata with the deposit ID
    if (!bill.paymentMetadata) {
      bill.paymentMetadata = { depositIds: [] };
    }
    if (!bill.paymentMetadata.depositIds) {
      bill.paymentMetadata.depositIds = [];
    }
    bill.paymentMetadata.depositIds.push(depositId);

    return {
      allocation: {
        billId: bill.id,
        allocatedPrincipal,
        allocatedInterest,
        allocatedFees,
      },
      remainingAmount,
    };
  }
}

import { DepositRecord } from "./DepositRecord";
import { DepositRecords } from "./DepositRecords";
import { Bill } from "./Bill";
import { Bills } from "./Bills";
import { BalanceModification } from "./Amortization/BalanceModification";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import { PaymentAllocationStrategyName, PaymentComponent, PaymentPriority } from "./PaymentApplication/Types";

import { Currency } from "../utils/Currency";
import { PaymentApplicationResult } from "./PaymentApplication/PaymentApplicationResult";
import { AllocationStrategy } from "./PaymentApplication/AllocationStrategy";
import { FIFOStrategy } from "./PaymentApplication/FIFOStrategy";
import { LIFOStrategy } from "./PaymentApplication/LIFOStrategy";
import { EqualDistributionStrategy } from "./PaymentApplication/EqualDistributionStrategy";
import { CustomOrderStrategy } from "./PaymentApplication/CustomOrderStrategy";

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
      case "CustomOrder":
        allocationStrategy = new CustomOrderStrategy((a: Bill, b: Bill) => a.dueDate.diff(b.dueDate));
        break;
      default:
        throw new Error(`Unknown allocation strategy: ${strategyName}`);
    }
    return allocationStrategy;
  }

  static getAllocationStrategyFromClass(strategy: AllocationStrategy): PaymentAllocationStrategyName {
    let strategyName: PaymentAllocationStrategyName;
    if (strategy instanceof FIFOStrategy) {
      strategyName = "FIFO";
    } else if (strategy instanceof LIFOStrategy) {
      strategyName = "LIFO";
    } else if (strategy instanceof EqualDistributionStrategy) {
      strategyName = "EqualDistribution";
    } else if (strategy instanceof CustomOrderStrategy) {
      strategyName = "CustomOrder";
    } else {
      throw new Error(`Unknown allocation strategy: ${strategy}`);
    }
    return strategyName;
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
      const excessAmount = Currency.of(result.unallocatedAmount);
      result.unallocatedAmount = Currency.Zero();

      // console.log("deposit after unused amount is being reset", deposit);

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
    const openBillsAtDepositDate = this.bills.all
      .filter((bill) => bill.isOpen && bill.dueDate.isSameOrAfter(depositEffectiveDayjs) && bill.openDate.isSameOrBefore(depositEffectiveDayjs))
      .sort((a, b) => a.openDate.diff(b.openDate));

    let balanceModificationDate: Dayjs;

    if (deposit.applyExcessAtTheEndOfThePeriod === true && openBillsAtDepositDate.length > 0) {
      const firstOpenBill = openBillsAtDepositDate[0];

      const nextTermStartDate = firstOpenBill.amortizationEntry.periodEndDate;

      balanceModificationDate = nextTermStartDate;
    } else {
      balanceModificationDate = depositEffectiveDayjs.isAfter(excessAppliedDate) ? depositEffectiveDayjs : dayjs(excessAppliedDate).startOf("day");
    }

    return balanceModificationDate.utc();
  }

  private generateUniqueId(): string {
    return uuidv4();
  }
}

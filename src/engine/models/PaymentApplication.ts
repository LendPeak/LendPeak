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
import { DateUtil } from "../utils/DateUtil";
import { PaymentApplicationResult } from "./PaymentApplication/PaymentApplicationResult";
import { AllocationStrategy } from "./PaymentApplication/AllocationStrategy";
import { FIFOStrategy } from "./PaymentApplication/FIFOStrategy";
import { LIFOStrategy } from "./PaymentApplication/LIFOStrategy";
import { EqualDistributionStrategy } from "./PaymentApplication/EqualDistributionStrategy";
import { CustomOrderStrategy } from "./PaymentApplication/CustomOrderStrategy";
import { Amortization } from "./Amortization";

// Payment Application Module
export class PaymentApplication {
  bills: Bills;
  deposits: DepositRecords;
  amortization: Amortization;
  private allocationStrategy: AllocationStrategy;
  private paymentPriority: PaymentPriority;

  constructor(params: { amortization: Amortization; bills: Bills; deposits: DepositRecords; options?: { allocationStrategy?: AllocationStrategy; paymentPriority?: PaymentPriority } }) {
    this.bills = params.bills;
    this.bills.sortBills();
    this.deposits = params.deposits;
    this.amortization = params.amortization;
    this.deposits.sortByEffectiveDate();

    // Default to LIFO strategy if not provided
    params.options = params.options || {};
    this.allocationStrategy = params.options.allocationStrategy || new FIFOStrategy();

    if (!params.options.paymentPriority) {
      params.options.paymentPriority = ["interest", "fees", "principal"];
    } else {
      params.options.paymentPriority = params.options.paymentPriority;
      // Ensure all components are included
      const components: PaymentPriority = ["interest", "fees", "principal"];
      for (const component of components) {
        if (!params.options.paymentPriority.includes(component)) {
          throw new Error(`Missing payment component in priority list: ${component}`);
        }
      }
    }
    this.paymentPriority = params.options.paymentPriority;
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
    currentDate = DateUtil.normalizeDate(currentDate);
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

    if (deposit.applyExcessToPrincipal && result.unallocatedAmount.greaterThan(0)) {
      let excessAmount = Currency.of(result.unallocatedAmount);
      // excess amount cannot exceed total owed principal amount so lets get that from bills object first
      const summary = this.bills.summary;
      if (excessAmount.greaterThan(summary.remainingPrincipal)) {
        excessAmount = summary.remainingPrincipal;
        result.unallocatedAmount = result.unallocatedAmount.subtract(excessAmount);
      } else {
        result.unallocatedAmount = Currency.Zero();
      }

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
        balanceModification: balanceModification,
      });

      this.amortization.balanceModifications.addBalanceModification(balanceModification);
      // with every balance modification we need to recalculate the amortization plan
      // past will remain the same, since facts didnt change for the past
      // but future will change
      this.amortization.calculateAmortizationPlan();

      // now after amortization changed, our future bills will change also, so that needs to get regenerated
      this.bills.regenerateBillsAfterDate(dateToApply);

      deposit.addUsageDetail(usageDetail);
      deposit.unusedAmount = result.unallocatedAmount;
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

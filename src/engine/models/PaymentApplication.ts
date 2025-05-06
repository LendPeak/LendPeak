import { DepositRecord } from "./DepositRecord";
import { DepositRecords } from "./DepositRecords";
import { Bill } from "./Bill";
import { Bills } from "./Bills";
import { BalanceModification } from "./Amortization/BalanceModification";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { LocalDate, ChronoUnit } from "@js-joda/core";

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
  currentDate: LocalDate;
  private allocationStrategy: AllocationStrategy;
  private paymentPriority: PaymentPriority;

  constructor(params: { currentDate: LocalDate; amortization: Amortization; bills: Bills; deposits: DepositRecords; options?: { allocationStrategy?: AllocationStrategy; paymentPriority?: PaymentPriority } }) {
    this.currentDate = params.currentDate;
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
        allocationStrategy = new CustomOrderStrategy((a: Bill, b: Bill) => ChronoUnit.DAYS.between(a.dueDate, b.dueDate));
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

  processDeposits(currentDate: LocalDate): PaymentApplicationResult[] {
    const results: PaymentApplicationResult[] = [];

    this.deposits.sortByEffectiveDate();
    this.bills.sortBills();

    for (const deposit of this.deposits.all) {
      if (deposit.active !== true) {
        // console.debug(`Skipping deposit ${deposit.id} because it is not active`);
        continue;
      }
      if (deposit.isAdhocRefund) {
        continue;
      }
      // if effective date is after the current date, skip the deposit
      if (deposit.effectiveDate.isAfter(currentDate)) {
        // console.debug(`Skipping deposit ${deposit.id} because its effective date is after the current date`);
        continue;
      }
      const result = this.applyDeposit(currentDate, deposit, {
        allocationStrategy: this.allocationStrategy,
        paymentPriority: this.paymentPriority,
      });
      results.push(result);
    }

    return results;
  }

  applyDeposit(
    currentDate: LocalDate,
    deposit: DepositRecord,
    options?: {
      allocationStrategy?: AllocationStrategy;
      paymentPriority?: PaymentPriority;
    }
  ): PaymentApplicationResult {
    /* ── defaults ─────────────────────────────────────────────────────── */
    options ??= {};
    options.allocationStrategy ??= this.allocationStrategy;
    options.paymentPriority ??= this.paymentPriority;

    const result = options.allocationStrategy.apply(currentDate, deposit, this.bills, options.paymentPriority);

    /* Nothing left to apply → we’re done */
    if (!deposit.applyExcessToPrincipal || result.unallocatedAmount.isZero()) {
      return result;
    }

    /* ── step 1  Clamp excess to remaining principal (pay-off safety) ─── */
    const summary = this.bills.summary;
    let excessAmount = Currency.of(result.unallocatedAmount);
    let isPayoff = false;

    if (excessAmount.greaterThan(summary.remainingPrincipal)) {
      excessAmount = summary.remainingPrincipal;
      result.unallocatedAmount = result.unallocatedAmount.subtract(excessAmount);
      isPayoff = true;
    } else if (excessAmount.equals(summary.remainingPrincipal)) {
      isPayoff = true;
      result.unallocatedAmount = Currency.zero;
    } else {
      result.unallocatedAmount = Currency.zero;
    }

    if (excessAmount.isZero()) {
      return result; // nothing to book
    }

    /* ── step 2  Figure out *when* the principal bump happens ──────────── */
    const dateToApply = this.determineBalanceModificationDate(deposit);

    /* ── step 3  Reuse or create ONE balance-mod per deposit ───────────── */
    let bm = this.amortization.balanceModifications.getByDepositId(deposit.id);
    let bmChanged = false;

    if (bm) {
      /* just mutate the existing record */
      if (!bm.amount.equals(excessAmount) || !bm.date.isEqual(dateToApply)) {
        bm.amount = excessAmount;
        bm.date = dateToApply;
        bmChanged = true;
      }
    } else {
      bm = new BalanceModification({
        id: this.generateUniqueId(),
        amount: excessAmount,
        date: dateToApply,
        type: "decrease",
        isSystemModification: true,
        description: `Excess funds applied to principal from deposit ${deposit.id}`,
        metadata: { depositId: deposit.id, isPayoff },
      });
      this.amortization.balanceModifications.addBalanceModification(bm);
      bmChanged = true;
    }

    result.balanceModification = bm;

    if (bmChanged) {
      this.amortization.versionChanged(); // bumps versionId/dateChanged
    }

    /* ── step 4  Attach/ensure ONE usage-detail on the deposit ─────────── */
    const already = deposit.usageDetails.some((u) => u.balanceModification?.id === bm!.id);

    if (!already) {
      deposit.addUsageDetail(
        new UsageDetail({
          billId: "Principal Prepayment",
          period: 0,
          billDueDate: dateToApply,
          allocatedPrincipal: excessAmount,
          allocatedInterest: 0,
          allocatedFees: 0,
          date: dateToApply,
          balanceModification: bm,
        })
      );
    }

    /* ── step 5  Refresh amortisation & bills, then return ─────────────── */
    if (isPayoff) {
      if (!this.amortization.payoffDate) {
        this.amortization.payoffDate = dateToApply;
      } else if (this.amortization.payoffDate.isBefore(dateToApply)) {
        this.amortization.payoffDate = dateToApply;
      } else {
        // do nothing
      }
    }
    this.amortization.calculateAmortizationPlan();
    this.bills.regenerateBillsAfterDate(dateToApply);

    return result;
  }

  private determineBalanceModificationDate(deposit: DepositRecord): LocalDate {
    const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;

    if (!excessAppliedDate) {
      throw new Error(`Deposit ${deposit.id} has no effective date or excess applied date.`);
    }

    const depositEffectiveDate = deposit.effectiveDate;
    const excessAppliedLocalDate = excessAppliedDate;

    const openBillsAtDepositDate = this.bills.all
      .filter(
        (bill) =>
          bill.isOpen(this.currentDate) &&
          (bill.dueDate.isEqual(depositEffectiveDate) || bill.dueDate.isAfter(depositEffectiveDate)) &&
          (bill.openDate.isEqual(depositEffectiveDate) || bill.openDate.isBefore(depositEffectiveDate))
      )
      .sort((a, b) => ChronoUnit.DAYS.between(a.openDate, b.openDate));

    let balanceModificationDate: LocalDate;

    if (deposit.applyExcessAtTheEndOfThePeriod === true && openBillsAtDepositDate.length > 0) {
      const firstOpenBill = openBillsAtDepositDate[0];
      const nextTermStartDate = firstOpenBill.amortizationEntry.periodEndDate;

      balanceModificationDate = nextTermStartDate;
    } else {
      balanceModificationDate = depositEffectiveDate.isAfter(excessAppliedLocalDate) ? depositEffectiveDate : excessAppliedLocalDate;
    }

    return balanceModificationDate;
  }

  private generateUniqueId(): string {
    return uuidv4();
  }
}

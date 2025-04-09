import { AmortizationVersionManager } from "./AmortizationVersionManager";
import { FinancialOpsVersionManager } from "./FinancialOpsVersionManager";

import { Amortization, AmortizationParams } from "./Amortization";
import { BalanceModifications } from "./Amortization/BalanceModifications";

import { DepositRecords } from "./DepositRecords";
import { DepositRecord } from "./DepositRecord";

import { InterestCalculator, PerDiemCalculationType } from "./InterestCalculator";

import { Bills } from "./Bills";
import { BillPaymentDetail } from "./Bill/BillPaymentDetail";
import { BillGenerator } from "./BillGenerator";
import { Currency } from "../utils/Currency";

import { PaymentApplication } from "./PaymentApplication";
import { PaymentApplicationResult } from "./PaymentApplication/PaymentApplicationResult";
import { PaymentAllocationStrategyName, PaymentComponent } from "./PaymentApplication/Types";

import Decimal from "decimal.js";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { AllocationStrategy } from "./PaymentApplication/AllocationStrategy";
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export interface PayoffQuoteResult {
  duePrincipal: Currency;
  dueInterest: Currency;
  dueFees: Currency;
  dueTotal: Currency;
  unusedAmountFromDeposis: Currency;
}

export class LendPeak {
  _amortization!: Amortization;
  _depositRecords!: DepositRecords;
  _bills!: Bills;
  _currentDate: Dayjs = dayjs();

  _amortizationVersionManager?: AmortizationVersionManager;
  _financialOpsVersionManager?: FinancialOpsVersionManager;

  _allocationStrategy: AllocationStrategy = PaymentApplication.getAllocationStrategyFromName("FIFO");
  paymentPriority: PaymentComponent[] = ["interest", "fees", "principal"];

  _balanceModificationChanged: boolean = false;

  private payoffQuoteCache?: {
    results: PayoffQuoteResult;
    amortizationVersionId: string;
    amortizationDate: Dayjs;
    billsVersionId: string;
    billsDate: Dayjs;
    depositRecordsVersionId: string;
    depositRecordsDate: Dayjs;
  };

  paymentApplicationResults: PaymentApplicationResult[] = [];
  constructor(params: {
    amortization?: Amortization;
    depositRecords?: DepositRecords;
    bills?: Bills;
    amortizationVersionManager?: AmortizationVersionManager;
    financialOpsVersionManager?: FinancialOpsVersionManager;
    allocationStrategy?: AllocationStrategy | PaymentAllocationStrategyName;
    paymentPriority?: PaymentComponent[];
    currentDate?: Dayjs;
  }) {
    this.setAmortization(params.amortization);

    this.setDepositRecords(params.depositRecords);
    this.setBills(params.bills);

    if (params.amortizationVersionManager) {
      this.amortizationVersionManager = params.amortizationVersionManager;
    }

    if (params.financialOpsVersionManager) {
      this.financialOpsVersionManager = params.financialOpsVersionManager;
    }

    if (params.allocationStrategy) {
      this.allocationStrategy = params.allocationStrategy;
    }

    if (params.paymentPriority) {
      this.paymentPriority = params.paymentPriority;
    }

    if (params.currentDate) {
      this.currentDate = params.currentDate;
    }
  }

  get balanceModificationChanged(): boolean {
    return this._balanceModificationChanged;
  }

  set balanceModificationChanged(value: boolean) {
    this._balanceModificationChanged = value;
  }

  get allocationStrategy(): AllocationStrategy {
    return this._allocationStrategy;
  }

  set allocationStrategy(value: AllocationStrategy | PaymentAllocationStrategyName) {
    if (typeof value === "string") {
      this._allocationStrategy = PaymentApplication.getAllocationStrategyFromName(value);
    } else {
      this._allocationStrategy = value;
    }
  }

  get amortization(): Amortization {
    return this._amortization;
  }

  set amortization(value: Amortization) {
    // check type and inflate if necessary
    if (!(value instanceof Amortization)) {
      this._amortization = new Amortization(value);
    } else {
      this._amortization = value;
    }
  }

  get depositRecords(): DepositRecords {
    return this._depositRecords;
  }

  set depositRecords(value: DepositRecords) {
    // check type and inflate if necessary
    if (!(value instanceof DepositRecords)) {
      this._depositRecords = new DepositRecords(value);
    } else {
      this._depositRecords = value;
    }
  }

  get bills(): Bills {
    return this._bills;
  }

  set bills(value: Bills) {
    // check type and inflate if necessary

    if (!(value instanceof Bills) && value !== undefined && Array.isArray(value)) {
      this._bills = new Bills({
        bills: value,
      });
    } else {
      this._bills = value;
    }

    if (this._bills.all.length === 0) {
      console.trace("bills are being set to zero");
    }
  }

  get currentDate(): Dayjs {
    return this._currentDate || dayjs();
  }

  set currentDate(value: Dayjs | Date | string) {
    if (value instanceof Date) {
      this._currentDate = dayjs(value);
    } else if (typeof value === "string") {
      this._currentDate = dayjs(value);
    } else {
      this._currentDate = value;
    }
  }

  get amortizationVersionManager(): AmortizationVersionManager | undefined {
    return this._amortizationVersionManager;
  }

  set amortizationVersionManager(value: AmortizationVersionManager | undefined) {
    if (!value) {
      this._amortizationVersionManager = undefined;
      return;
    }
    // check type and if not amortization manager, call fromJSON static method
    if (!(value instanceof AmortizationVersionManager) && value !== undefined) {
      this._amortizationVersionManager = new AmortizationVersionManager(this.amortization);
      this._amortizationVersionManager.versionNumber = (value as AmortizationVersionManager).versionNumber || 0;
      const versions = AmortizationVersionManager.versionsFromJSON(value);

      this._amortizationVersionManager.replaceVersions(versions);
    } else {
      this._amortizationVersionManager = value;
    }
  }

  get financialOpsVersionManager(): FinancialOpsVersionManager | undefined {
    return this._financialOpsVersionManager;
  }

  set financialOpsVersionManager(value: FinancialOpsVersionManager | undefined) {
    if (!value) {
      this._financialOpsVersionManager = undefined;
      return;
    }
    // check type and if not fiancial ops version manager, call fromJSON static method
    if (!(value instanceof FinancialOpsVersionManager)) {
      FinancialOpsVersionManager.fromJSON(value);
    } else {
      this._financialOpsVersionManager;
    }
  }

  calc() {
    this.cleanupBalanceModifications();

    try {
      this.amortization.jsGenerateSchedule();
    } catch (error) {
      console.error("Error creating Amortization:", error);
      throw error;
    }

    this.applyPayments();
  }

  cleanupBalanceModifications() {
    // remove any existing balance modifications that were associated with deposits
    // but deposits are no longer present
    const filteredBalanceModifications: BalanceModifications = new BalanceModifications();

    this.amortization.balanceModifications.all.forEach((balanceModification) => {
      if (balanceModification.metadata?.depositId) {
        const deposit = this.depositRecords.getById(balanceModification.metadata.depositId);
        if (!deposit) {
          // Deposit not found; remove this balance modification
          // console.log('Removing balance modification', balanceModification);

          this.balanceModificationChanged = true;
          return;
        }

        if (deposit.active !== true) {
          // Deposit is not active; remove this balance modification
          // console.log('Removing balance modification', balanceModification);
          this.balanceModificationChanged = true;

          return;
        }

        if (deposit.effectiveDate.isAfter(this.currentDate)) {
          // Deposit is before snapshot date; remove this balance modification
          // console.log('Removing balance modification', balanceModification);
          this.balanceModificationChanged = true;

          return;
        }
      }
      filteredBalanceModifications.addBalanceModification(balanceModification);
    });

    this.amortization.balanceModifications = filteredBalanceModifications;
  }

  /*
  NOTE FOR TOMORROW:

  payment application and re-amortization needs to have a state where every balance modification must add it to amortization, 
  reamortize the loan with that first modification, regenerate bills, apply payments, and then check if there are any new balance modifications
  if there are, then reamortize the loan again, regenerate bills, apply payments, and repeat until there are no new balance modifications
  */
  applyPayments() {
    console.log("running apply payments");
    this.depositRecords.clearHistory();
    // now we will remove system generated balance modifications, since we are clearing the history
    this.amortization.runGarbageCollection();
    this.generateBills();

    const allocationStrategy = this.allocationStrategy;
    const paymentPriority = this.paymentPriority;
    const paymentApp = new PaymentApplication({
      amortization: this.amortization,
      bills: this.bills,
      deposits: this.depositRecords,
      options: {
        allocationStrategy,
        paymentPriority,
      },
    });
    this.paymentApplicationResults = paymentApp.processDeposits(this.currentDate);

    // this.paymentApplicationResults.forEach((result) => {
    //   result.allocations.forEach((allocation) => {
    //     const bill = this.bills.all.find((b) => b.id === allocation.billId);
    //     if (!bill) return;

    //     bill.paymentDetails = bill.paymentDetails || [];
    //     bill.paymentDetails.push(
    //       new BillPaymentDetail({
    //         depositId: result.depositId,
    //         allocatedPrincipal: allocation.allocatedPrincipal,
    //         allocatedInterest: allocation.allocatedInterest,
    //         allocatedFees: allocation.allocatedFees,
    //         date: result.effectiveDate,
    //       })
    //     );
    //   });
    // });

    this.bills.updateStatus();
    // for (let balanceModification of this.depositRecords.balanceModifications) {
    //   this.amortization.balanceModifications.addBalanceModification(balanceModification);
    // }
  }

  addFinancialOpsVersionManager(): LendPeak {
    this.financialOpsVersionManager = new FinancialOpsVersionManager(this.bills, this.depositRecords);
    return this;
  }

  addAmortizationVersionManager(): LendPeak {
    this.amortizationVersionManager = new AmortizationVersionManager(this.amortization);
    return this;
  }

  setDepositRecords(depositRecords?: DepositRecords) {
    if (!depositRecords) {
      this.depositRecords = new DepositRecords();
    } else {
      this.depositRecords = depositRecords;
    }
  }

  setBills(bills?: Bills) {
    if (!bills) {
      //this.bills = new Bills();
      this.generateBills();
    } else {
      this.bills = bills;
    }
  }

  generateBills() {
    this.bills = new Bills({
      amortization: this.amortization,
      currentDate: this.currentDate,
    });
  }

  setAmortization(amortization?: Amortization) {
    if (!amortization) {
      this.amortization = new Amortization(LendPeak.DEFAULT_AMORTIZATION_PARAMS);
    } else {
      if (amortization instanceof Amortization) {
        this.amortization = amortization;
      } else {
        this.amortization = new Amortization(amortization);
      }
    }
  }

  static get DEFAULT_AMORTIZATION_PARAMS(): AmortizationParams {
    const defaultAmortizationParams: AmortizationParams = {
      name: "Default Loan",

      loanAmount: Currency.of(1000),
      originationFee: Currency.of(10),
      annualInterestRate: new Decimal(0.06),
      term: 24,
      startDate: dayjs().subtract(2, "month").startOf("day"),
    };
    return defaultAmortizationParams;
  }

  updateModelValues() {
    this.amortization.updateModelValues();
    this.depositRecords.updateModelValues();
    this.bills.updateModelValues();
  }

  updateJsValues() {
    this.amortization.updateJsValues();
    this.depositRecords.updateJsValues();
    this.bills.updateJsValues();
  }

  get json() {
    return this.toJSON();
  }

  static fromJSON(params: any) {
    if (params.amortization) {
      if (!params.amortization.hasCustomEndDate) {
        delete params.amortization.endDate;
      }

      if (!params.amortization.hasCustomPreBillDays) {
        delete params.amortization.preBillDays;
      }

      if (!params.amortization.hasCustomBillDueDays) {
        delete params.amortization.dueBillDays;
      }
    }

    const lendPeak = new LendPeak(params);
    lendPeak.calc();
    return lendPeak;
  }

  printPayoffQuote() {
    console.table({
      duePrincipal: this.payoffQuote.duePrincipal.toNumber(),
      dueInterest: this.payoffQuote.dueInterest.toNumber(),
      dueFees: this.payoffQuote.dueFees.toNumber(),
      dueTotal: this.payoffQuote.dueTotal.toNumber(),
      unusedAmountFromDeposis: this.payoffQuote.unusedAmountFromDeposis.toNumber(),
      amortizationVersionId: this.amortization.versionId,
    });
  }

  /**
   * Calculate a payoff quote (principal, interest, fees) as of currentDate.
   * Caches results to avoid recalculating if nothing has changed.
   */
  get payoffQuote(): PayoffQuoteResult {
    // 1) Check if we have a cache and if everything is still up to date
    if (this.payoffQuoteCache) {
      // Compare versionId first
      if (
        this.amortization.versionId !== this.payoffQuoteCache.amortizationVersionId ||
        this.bills.versionId !== this.payoffQuoteCache.billsVersionId ||
        this.depositRecords.versionId !== this.payoffQuoteCache.depositRecordsVersionId
      ) {
        return this.recomputePayoffQuote();
      }

      // Compare dateChanged using .isSame()
      if (
        !this.amortization.dateChanged.isSame(this.payoffQuoteCache.amortizationDate) ||
        !this.bills.dateChanged.isSame(this.payoffQuoteCache.billsDate) ||
        !this.depositRecords.dateChanged.isSame(this.payoffQuoteCache.depositRecordsDate)
      ) {
        return this.recomputePayoffQuote();
      }

      // Otherwise, cache is valid:
      return this.payoffQuoteCache.results;
    }

    // No cache yet, do a fresh calculation
    return this.recomputePayoffQuote();
  }

  /**
   * Internal helper that actually does the payoff logic and updates cache.
   */
  private recomputePayoffQuote(): PayoffQuoteResult {
    // -- 2) Gather Bill summary
    const billSummary = this.bills.summary;
    // The summary typically reflects all amounts not yet fully paid:
    //   remainingPrincipal, remainingInterest, remainingFees, etc.
    //   plus 'dueInterest', 'dueFees', 'duePrincipal' if the Bill is open/past due, etc.

    let duePrincipal = billSummary.remainingPrincipal; // all leftover principal
    let dueInterest = billSummary.dueInterest; // all currently-due interest on open Bills
    let dueFees = billSummary.dueFees; // all due or unpaid fees
    let dueTotal = duePrincipal.add(dueInterest).add(dueFees);

    // -- 3) Check if the "last open" Bill extends beyond the currentDate
    const lastOpenBill = this.bills.lastOpenBill;
    if (lastOpenBill && lastOpenBill.amortizationEntry.periodEndDate.isBefore(this.currentDate)) {
      // That means the current date is mid-way through the last open bill’s period,
      // so we likely owe partial interest from the Bill’s period start up to `currentDate`.
      // The Bill summary might only include interest up to the Bill’s “period start,”
      // or up to the last posted date.

      // For a simple approach, just get the total accrued interest from the original
      // amortization schedule (loan start -> currentDate). Then subtract the interest
      // that is already “on the Bills” to avoid double-counting. If your Bill summary
      // *already* has partial interest, you might skip or adjust this step.

      const extraInterest = this.amortization.getAccruedInterestByDate(this.currentDate);

      // We also need to know how much interest was already included in 'dueInterest'.
      // One simple approach is the total interest that was "billed" so far from
      // the amortization schedule. For demonstration, let’s subtract out
      // the total *already allocated or posted* to your Bill(s).
      // If your Bill summary “dueInterest” is purely the unallocated portion,
      // it might mean we only add the difference:

      // We'll assume for demonstration that `billSummary.dueInterest` only includes interest
      // up to the last fully posted date. So we add the difference:
      const additionalInterest = extraInterest.subtract(billSummary.dueInterest);

      // If that difference is positive, add it to dueInterest:
      if (additionalInterest.getValue().greaterThan(0)) {
        dueInterest = dueInterest.add(additionalInterest);
        dueTotal = dueTotal.add(additionalInterest);
      }
    }

    const unusedAmountFromDeposis = this.depositRecords.unusedAmount;
    // dueTotal = dueTotal.subtract(unusedAmountFromDeposis);

    // -- 4) Build final results
    const payoffResult: PayoffQuoteResult = {
      duePrincipal,
      dueInterest,
      dueFees,
      dueTotal,
      unusedAmountFromDeposis,
    };

    // -- 5) Store payoff in cache
    this.payoffQuoteCache = {
      results: payoffResult,
      amortizationVersionId: this.amortization.versionId,
      amortizationDate: this.amortization.dateChanged,
      billsVersionId: this.bills.versionId,
      billsDate: this.bills.dateChanged,
      depositRecordsVersionId: this.depositRecords.versionId,
      depositRecordsDate: this.depositRecords.dateChanged,
    };

    return payoffResult;
  }

  toJSON() {
    return {
      amortization: this.amortization.json,
      depositRecords: this.depositRecords.json,
      bills: this.bills.json,
      amortizationVersionManager: this.amortizationVersionManager?.toJSON(),
      financialOpsVersionManager: this.financialOpsVersionManager?.toJSON(),
      allocationStrategy: PaymentApplication.getAllocationStrategyFromClass(this.allocationStrategy),
      paymentPriority: this.paymentPriority,
    };
  }

  get compactJSON() {
    return this.toCompactJSON();
  }

  toCompactJSON() {
    return {
      amortization: this.amortization.json,
      depositRecords: this.depositRecords.json,
      bills: this.bills.json,
      //amortizationVersionManager: this.amortizationVersionManager?.toJSON(),
      //financialOpsVersionManager: this.financialOpsVersionManager?.toJSON(),
      allocationStrategy: PaymentApplication.getAllocationStrategyFromClass(this.allocationStrategy),
      paymentPriority: this.paymentPriority,
    };
  }

  static demoObject(): LendPeak {
    const lendPeak = new LendPeak({
      amortization: new Amortization(LendPeak.DEFAULT_AMORTIZATION_PARAMS),
    });
    return lendPeak;
  }
}

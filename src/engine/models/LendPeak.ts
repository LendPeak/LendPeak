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
    if (!(value instanceof Bills)) {
      this._bills = new Bills(value);
    } else {
      this._bills = value;
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

    this.generateBills();
    this.applyPayments();

    if (this.balanceModificationChanged === true) {
      this.balanceModificationChanged = false;
      this.calc();
    }
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

  applyPayments() {
    this.depositRecords.clearHistory();
    this.generateBills();

    const allocationStrategy = this.allocationStrategy;
    const paymentPriority = this.paymentPriority;
    const paymentApp = new PaymentApplication(this.bills, this.depositRecords, {
      allocationStrategy,
      paymentPriority,
    });
    this.paymentApplicationResults = paymentApp.processDeposits(this.currentDate);

    this.paymentApplicationResults.forEach((result) => {
      // Here's where we find the deposit, storing it in a local `deposit` variable
      const deposit = this.depositRecords.all.find((d) => d.id === result.depositId);
      if (!deposit) {
        console.error("No deposit found for", result.depositId);
        return;
      }

      // Handle balance modification etc.
      if (result.balanceModification) {
        //this.amortization.balanceModifications.removeBalanceModificationByDepositId(deposit.id);

        // Add the new BM
        // console.log('Adding balance modification!', result.balanceModification);
        const addedNewBalanceModification = this.amortization.balanceModifications.addBalanceModification(result.balanceModification);
        if (addedNewBalanceModification) {
          deposit.balanceModificationId = result.balanceModification.id;
          this.balanceModificationChanged = true;
        }
        // this.balanceModificationChanged = true;
      } else {
        // Remove old BMs for this deposit if none returned
        this.amortization.balanceModifications.removeBalanceModificationByDepositId(deposit.id);

        deposit.balanceModificationId = undefined;
        // this.balanceModificationChanged = true;
      }

      // Update deposit's leftover
      deposit.unusedAmount = result.unallocatedAmount;

      // 4) Populate BillPaymentDetail on each Bill if needed
      //    (And now `deposit.effectiveDate` is safely in scope)
      result.allocations.forEach((allocation) => {
        const bill = this.bills.all.find((b) => b.id === allocation.billId);
        if (!bill) return;

        bill.paymentDetails = bill.paymentDetails || [];
        bill.paymentDetails.push(
          new BillPaymentDetail({
            depositId: deposit.id,
            allocatedPrincipal: allocation.allocatedPrincipal,
            allocatedInterest: allocation.allocatedInterest,
            allocatedFees: allocation.allocatedFees,
            date: deposit.effectiveDate,
          })
        );
      });
    });

    // 5) Mark bills as paid if principalDue, interestDue, feesDue are all zero
    this.bills.bills = this.bills.all.map((bill) => {
      bill.isPaid = bill.principalDue.isZero() && bill.interestDue.isZero() && bill.feesDue.isZero();
      return bill;
    });
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
    this.bills = BillGenerator.generateBills({ amortizationSchedule: this.amortization.repaymentSchedule, currentDate: this.currentDate });
  }

  setAmortization(amortization?: Amortization) {
    if (!amortization) {
      this.amortization = new Amortization(LendPeak.DEFAULT_AMORTIZATION_PARAMS);
    } else {
      this.amortization = amortization;
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

    return new LendPeak(params);
  }

  get payoffQuote(): {
    duePrincipal: Currency;
    dueInterest: Currency;
    dueFees: Currency;
    dueTotal: Currency;
  } {
    // payoff are all amounts summed up for open bills
    // and if open bill end period is after current date
    // then we need to add acrued interest up to the date of
    // the quote

    let dueTotal = Currency.zero;
    let duePrincipal = Currency.zero;
    let dueInterest = Currency.zero;
    let dueFees = Currency.zero;

    const billSummary = this.bills.summary;

    console.log("billsummary", billSummary);
    // remaining principal is quite simple we can just use remaining Principal from all available bills
    duePrincipal = billSummary.remainingPrincipal;
    // interest and fees are also simple we just need to
    // get all due interest and fees from all open and unpaid bills
    dueInterest = dueInterest.add(billSummary.dueInterest);
    dueFees = dueFees.add(billSummary.dueFees);

    // total due is sum of all due amounts
    dueTotal = dueTotal.add(dueInterest).add(dueFees).add(billSummary.duePrincipal);

    const lastOpenBill = this.bills.lastOpenBill;

    // if lastOpenBill exists, lets check if its period end date is after current date
    if (lastOpenBill && lastOpenBill.amortizationEntry.periodEndDate.isBefore(this.currentDate)) {
      const firstFutureBill = this.bills.getFirstFutureBill(this.currentDate);
      if (firstFutureBill) {
        const extraInterest = this.amortization.getAccruedInterestByDate(this.currentDate);
        dueInterest = dueInterest.add(extraInterest);
        dueTotal = dueTotal.add(extraInterest);

        // if future bill has satisfied amounts, we need to reduce balances by those amounts
        if (firstFutureBill.paymentDetails.length > 0) {
          for (let paymentDetail of firstFutureBill.paymentDetails) {
            duePrincipal = duePrincipal.subtract(paymentDetail.allocatedPrincipal);
            dueInterest = dueInterest.subtract(paymentDetail.allocatedInterest);
            dueFees = dueFees.subtract(paymentDetail.allocatedFees);
            dueTotal = dueTotal.subtract(paymentDetail.allocatedPrincipal).subtract(paymentDetail.allocatedInterest).subtract(paymentDetail.allocatedFees);
          }
        }
      } else {
        // there are models where interest will continue to accrue even after the last bill
        // if the loan is not paid off, this is where it would be hanled
      }
    }

    return {
      dueTotal: dueTotal,
      duePrincipal: duePrincipal,
      dueInterest: dueInterest,
      dueFees: dueFees,
    };
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

  static demoObject(): LendPeak {
    const lendPeak = new LendPeak({
      amortization: new Amortization(LendPeak.DEFAULT_AMORTIZATION_PARAMS),
    });
    return lendPeak;
  }
}

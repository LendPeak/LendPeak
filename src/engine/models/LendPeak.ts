import { AmortizationVersionManager } from "./AmortizationVersionManager";
import { FinancialOpsVersionManager } from "./FinancialOpsVersionManager";

import { Amortization, AmortizationParams } from "./Amortization";
import { BalanceModifications } from "./Amortization/BalanceModifications";
import { BalanceModification } from "./Amortization/BalanceModification";

import { DepositRecords } from "./DepositRecords";
import { DepositRecord, AdhocRefundMeta } from "./DepositRecord";

import { InterestCalculator, PerDiemCalculationType } from "./InterestCalculator";

import { Bills } from "./Bills";
import { BillPaymentDetail } from "./Bill/BillPaymentDetail";
import { BillGenerator } from "./BillGenerator";
import { Currency } from "../utils/Currency";

import { PaymentApplication } from "./PaymentApplication";
import { PaymentApplicationResult } from "./PaymentApplication/PaymentApplicationResult";
import { PaymentAllocationStrategyName, PaymentComponent } from "./PaymentApplication/Types";
import { LocalDate, ZoneId, ChronoUnit } from "@js-joda/core";

import Decimal from "decimal.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { AllocationStrategy } from "./PaymentApplication/AllocationStrategy";
import { DateUtil } from "../utils/DateUtil";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";

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
  _currentDate: LocalDate = LocalDate.now();

  _amortizationVersionManager?: AmortizationVersionManager;
  _financialOpsVersionManager?: FinancialOpsVersionManager;

  _allocationStrategy: AllocationStrategy = PaymentApplication.getAllocationStrategyFromName("FIFO");
  paymentPriority: PaymentComponent[] = ["interest", "fees", "principal"];

  _balanceModificationChanged: boolean = false;

  rawImportData?: string;

  /** -------------------------------------------------
   *  Auto-close threshold: if the payoffQuote.dueTotal
   *  is ≤ this amount AND > 0, the engine will create
   *  a synthetic “Auto Close” payment that zeros-out
   *  the loan.
   *  ------------------------------------------------*/
  private _autoCloseThreshold: Currency = Currency.of(0.1);
  jsAutoCloseThreshold!: number; // <-- for Angular binding

  private payoffQuoteCache?: {
    results: PayoffQuoteResult;
    amortizationVersionId: string;
    amortizationDate: LocalDate;
    billsVersionId: string;
    billsDate: LocalDate;
    depositRecordsVersionId: string;
    depositRecordsDate: LocalDate;
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
    autoCloseThreshold?: Currency | number;
    currentDate?: LocalDate;
    rawImportData?: string;
  }) {
    this.rawImportData = params.rawImportData;
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

    if (typeof params.autoCloseThreshold !== "undefined") {
      this.autoCloseThreshold = params.autoCloseThreshold;
    }

    if (params.currentDate) {
      this.currentDate = params.currentDate;
    }
  }

  get autoCloseThreshold(): Currency {
    return this._autoCloseThreshold;
  }

  set autoCloseThreshold(v: Currency | number) {
    this._autoCloseThreshold = v instanceof Currency ? v : Currency.of(v);
    this.jsAutoCloseThreshold = this._autoCloseThreshold.toNumber();
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
        currentDate: this.currentDate,
      });
    } else {
      this._bills = value;
    }

    if (this._bills.all.length === 0) {
      console.info("bills are being set to zero");
    }
  }

  get currentDate(): LocalDate {
    return this._currentDate || DateUtil.today();
  }

  set currentDate(value: LocalDate | Date | string) {
    this._currentDate = DateUtil.normalizeDate(value);
    this.bills.currentDate = this._currentDate;
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
    let previousVersion = ""; // empty → always enters the loop once
    let guard = 0; // safety to avoid infinite loops
    this.updateModelValues();

    do {
      //console.log("LendPeak.calc()", guard, previousVersion, this.amortization.versionId);
      // 1️⃣  tidy up anything stale
      this.cleanupBalanceModifications();

      // 2️⃣  build schedule + bills from the current BM set
      this.amortization.calculateAmortizationPlan();
      this.generateBills();

      // remember schedule fingerprint
      previousVersion = this.amortization.versionId;

      // 3️⃣  run the full payment pipeline
      this.applyPayments();
    } while (previousVersion !== this.amortization.versionId && ++guard < 4);

    this.updateJsValues();
  }

  /**
   *  Remove or synchronise BalanceModifications that have gone “stale”
   *  *and* collapse accidental duplicates so that **each deposit produces
   *  at most one BM**.
   */
  cleanupBalanceModifications() {
    const filtered = new BalanceModifications();
    const seen = new Map<string, BalanceModification>(); // depositId → BM
    let changed = false;

    /* ── PASS 1 : normal & auto-close balance mods ───────────────────────── */
    for (const bm of this.amortization.balanceModifications.all) {
      const depId = bm.metadata?.depositId;

      /* 1-a  Unlinked manual BM – keep as-is */
      if (!depId) {
        filtered.addBalanceModification(bm);
        continue;
      }

      const dep = this.depositRecords.getById(depId);

      /* deposit was deleted / inactive / in the future → drop BM */
      if (!dep || !dep.active || dep.effectiveDate.isAfter(this.currentDate)) {
        changed = true;
        this.balanceModificationChanged = true;
        continue;
      }

      /* 1-b  De-duplicate normal BMs (keep the *latest* one) */
      const already = seen.get(depId);
      if (already) {
        // later BM wins → replace
        filtered.removeBalanceModification(already);
        changed = true;
        this.balanceModificationChanged = true;
      }
      seen.set(depId, bm);
      filtered.addBalanceModification(bm);
    }

    /* ── PASS 2 : balance-impacting ad-hoc refunds ───────────────────────── */
    for (const dep of this.depositRecords.adhocRefunds) {
      const meta = dep.metadata as AdhocRefundMeta;
      if (!meta.balanceImpacting || !dep.active) {
        if (meta.balanceModificationId) {
          this.amortization.balanceModifications.removeBalanceModificationByDepositId(dep.id);
          delete meta.balanceModificationId;
          changed = true;
          this.balanceModificationChanged = true;
        }
        continue;
      }

      const wantAmount = dep.amount.abs();
      const wantDate = dep.effectiveDate;
      let bm = meta.balanceModificationId ? this.amortization.balanceModifications.getById(meta.balanceModificationId) : undefined;

      const needsNew = !bm || !bm.amount.equals(wantAmount) || !bm.date.isEqual(wantDate);

      if (needsNew) {
        if (bm) this.amortization.balanceModifications.removeBalanceModification(bm);

        bm = new BalanceModification({
          id: `ADHOC_REFUND_BM_${dep.id}`,
          amount: wantAmount,
          date: wantDate,
          type: "increase",
          description: `Ad-hoc refund ${dep.id}`,
          isSystemModification: true,
          metadata: { depositId: dep.id },
        });

        this.amortization.balanceModifications.addBalanceModification(bm);
        meta.balanceModificationId = bm.id;
        changed = true;
        this.balanceModificationChanged = true;
      }

      if (bm) filtered.addBalanceModification(bm);
    }

    /* ── Swap only if something actually changed ─────────────────────────── */
    if (changed) {
      this.amortization.balanceModifications = filtered;
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
   *  Helper: one “normal” payment run (no auto-close decisions)
   * ────────────────────────────────────────────────────────────────────────── */
  private runPaymentPipeline() {
    this.depositRecords.clearHistory();
    this.amortization.runGarbageCollection();
    this.generateBills();

    const paymentApp = new PaymentApplication({
      currentDate: this.currentDate,
      amortization: this.amortization,
      bills: this.bills,
      deposits: this.depositRecords,
      options: {
        allocationStrategy: this.allocationStrategy,
        paymentPriority: this.paymentPriority,
      },
    });

    this.paymentApplicationResults = paymentApp.processDeposits(this.currentDate);
  }

  /* ────────────────────────────────────────────────────────────────────────────
   *  MAIN: applyPayments()
   *         • handles ad-hoc refunds   (balance-impacting ↑ principal)
   *         • handles auto-close rows  (synthetic “waiver” deposits)
   *         • finally runs the payment engine
   * ────────────────────────────────────────────────────────────────────────── */
  applyPayments(): void {
    /* =========================================================
     *  0)  AD-HOC REFUNDS  → create / update Balance Modifications
     * =======================================================*/
    const refundsTouched: DepositRecord[] = [];

    for (const d of this.depositRecords.adhocRefunds) {
      const meta = d.metadata as AdhocRefundMeta;

      /* we only create a BM once – afterwards the id is memoised */
      if (meta.balanceImpacting && !meta.balanceModificationId) {
        const bm = new BalanceModification({
          id: `ADHOC_REFUND_BM_${d.id}`,
          amount: d.amount.abs(), // principal ↑
          date: d.effectiveDate,
          type: "increase",
          description: `Ad-hoc refund ${d.id}`,
          isSystemModification: true, // <-- user cannot delete
          metadata: { depositId: d.id },
        });

        this.amortization.balanceModifications.addBalanceModification(bm);
        this.amortization.calculateAmortizationPlan();
        this.bills.regenerateBillsAfterDate(bm.date);

        meta.balanceModificationId = bm.id;
        refundsTouched.push(d); // remember – we’ll re-attach usage rows
      }
    }

    /* =========================================================
     *  1)  AUTO-CLOSE DEPOSITS
     * =======================================================*/
    const autoDeposits = this.depositRecords.all.filter((d) => d.isAutoClose);
    const activeWaiver = autoDeposits.find((d) => d.active);
    const activeAmount = activeWaiver?.amount ?? Currency.Zero();

    /* disable all auto-close rows → get the true remainder */
    autoDeposits.forEach((d) => (d.active = false));

    /* ── first pass ──────────────────────────────────────── */
    this.runPaymentPipeline();
    const remainder = this.payoffQuote.dueTotal;

    let needsSecondRun = false;

    if (remainder.isZero() || remainder.greaterThan(this.autoCloseThreshold)) {
      /* no waiver needed – leave rows inactive */
    } else if (activeWaiver && activeAmount.equals(remainder)) {
      /* existing waiver still correct → just reactivate */
      activeWaiver.active = true;
      needsSecondRun = true;
    } else {
      /* need a new waiver amount */
      const newWaiver = new DepositRecord({
        amount: remainder,
        currency: "USD",
        effectiveDate: this.currentDate,
        paymentMethod: "system",
        depositor: "Auto Close",
        metadata: { type: "auto_close", systemGenerated: true },
        depositRecords: this.depositRecords,
      });
      newWaiver.id = `AUTO_CLOSE_${Date.now()}`;
      this.depositRecords.addRecord(newWaiver);
      needsSecondRun = true;
    }

    /* ── second pass if required ─────────────────────────── */
    if (needsSecondRun) this.runPaymentPipeline();

    /* =========================================================
     *  2)  RE-ATTACH helper UsageDetail rows for the refunds
     *      (run *after* the final payment pipeline so they
     *       don’t get wiped by clearHistory())
     * =======================================================*/
    for (const d of refundsTouched) {
      const meta = d.metadata as AdhocRefundMeta;
      const bm = this.amortization.balanceModifications.getById(meta.balanceModificationId!);
      if (!bm) continue;

      /* avoid duplicates if applyPayments() runs twice */
      const already = d.usageDetails.some((u) => u.balanceModification?.id === bm.id);
      if (already) continue;

      d.addUsageDetail(
        new UsageDetail({
          billId: "Ad-hoc Refund",
          period: 0,
          billDueDate: d.effectiveDate,
          allocatedPrincipal: bm.amount,
          allocatedInterest: 0,
          allocatedFees: 0,
          date: d.effectiveDate,
          balanceModification: bm,
        })
      );
    }
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

  /** basic state flags */
  get isPaidInFull(): boolean {
    return this.payoffQuote.dueTotal.isZero();
  }
  get hasOverpayment(): boolean {
    return !this.payoffQuote.unusedAmountFromDeposis.isZero();
  }

  /** Paid in full **and** sooner than the contractual schedule */
  get isEarlyPayoff(): boolean {
    return this.isPaidInFull && this.amortization.wasPaidEarly;
  }

  /** Contractual maturity from the **period plan** */
  get expectedMaturity(): LocalDate {
    return this.amortization.endDate;
  }

  /** Last entry in the **repayment** schedule (actual pay-off) */
  get actualPayoff(): LocalDate {
    return this.amortization.payoffDate || this.amortization.repaymentSchedule.lastEntry.periodEndDate;
  }

  /** How many whole terms were skipped thanks to the early pay-off */
  get termsSaved(): number {
    const totalPlanned = this.amortization.term;
    const totalActual = this.amortization.repaymentSchedule.length;
    return Math.max(totalPlanned - totalActual, 0);
  }

  /** Calendar-month delta (rounded down) between planned and actual end dates */
  get monthsSaved(): number {
    return Math.max(ChronoUnit.MONTHS.between(this.actualPayoff, this.expectedMaturity), 0);
  }

  static get DEFAULT_AMORTIZATION_PARAMS(): AmortizationParams {
    const defaultAmortizationParams: AmortizationParams = {
      name: "Default Loan",

      loanAmount: Currency.of(1000),
      originationFee: Currency.of(10),
      annualInterestRate: new Decimal(0.06),
      term: 24,
      startDate: LocalDate.now().minusMonths(2),
    };
    return defaultAmortizationParams;
  }

  updateModelValues() {
    this.amortization.updateModelValues();
    this.depositRecords.updateModelValues();
    this.bills.updateModelValues();
    this.autoCloseThreshold = Currency.of(this.jsAutoCloseThreshold ?? this.autoCloseThreshold);
  }

  updateJsValues() {
    this.amortization.updateJsValues();
    this.depositRecords.updateJsValues();
    this.bills.updateJsValues();
    this.jsAutoCloseThreshold = this.autoCloseThreshold.toNumber();
  }

  get json() {
    return this.toJSON();
  }

  static fromJSON(params: any) {
    if (params.amortization) {
      if (!params.amortization.hasCustomEndDate) {
        delete params.amortization.endDate;
      }

      if (!params.amortization.hasCustomEquitedMonthlyPayment) {
        delete params.amortization.equitedMonthlyPayment;
      }

      // if (!params.amortization.hasCustomPreBillDays) {
      //   delete params.amortization.preBillDays;
      // }

      // if (!params.amortization.hasCustomBillDueDays) {
      //   delete params.amortization.dueBillDays;
      // }
    }

    const lendPeak = new LendPeak({
      ...params,
      currentDate: params.currentDate ? LocalDate.parse(params.currentDate) : LocalDate.now(),
    });

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
        !this.amortization.dateChanged.isEqual(this.payoffQuoteCache.amortizationDate) ||
        !this.bills.dateChanged.isEqual(this.payoffQuoteCache.billsDate) ||
        !this.depositRecords.dateChanged.isEqual(this.payoffQuoteCache.depositRecordsDate)
      ) {
        return this.recomputePayoffQuote();
      }

      // Otherwise, cache is valid:
      return this.payoffQuoteCache.results;
    }

    // No cache yet, do a fresh calculation
    return this.recomputePayoffQuote();
  }

  /** -----------------------------------------------------------------
   *  Pay-off quote generator
   * ----------------------------------------------------------------*/
  private recomputePayoffQuote(): PayoffQuoteResult {
    /* ── 1)  Bill-level balances that are already invoiced / due ───────── */
    const billSummary = this.bills.summary;

    let duePrincipal = billSummary.remainingPrincipal; // unpaid principal
    let dueInterest = billSummary.dueInterest; // interest already on Bills
    let dueFees = billSummary.dueFees; // posted / due fees
    let dueTotal = duePrincipal.add(dueInterest).add(dueFees);

    /* ── 2)  If we’re part-way through the last open Bill,
            tack on additional accrued interest up to “today” ─────────── */
    const lastOpenBill = this.bills.lastOpenBill;

    if (lastOpenBill && this.currentDate.isBefore(lastOpenBill.amortizationEntry.periodEndDate)) {
      /* If interest accrues from *day zero*, count the payoff date itself
       ⇒ use currentDate + 1 day when asking the amortization engine.   */
      const interestSnapshotDate = this.amortization.interestAccruesFromDayZero ? this.currentDate.plusDays(1) : this.currentDate;

      const totalAccruedInterest = this.amortization.getAccruedInterestByDate(interestSnapshotDate);

      /* How much of that interest is **already** on Bills?                */
      const interestAlreadyBilled = (billSummary as any).totalInterestBilled ?? billSummary.dueInterest;

      const additionalInterest = totalAccruedInterest.subtract(interestAlreadyBilled);

      if (additionalInterest.getValue().greaterThan(0)) {
        dueInterest = dueInterest.add(additionalInterest);
        dueTotal = dueTotal.add(additionalInterest);
      }
    }

    /* ── 3)  Unapplied deposits (they don’t change _due_ figures
            here, but are reported back to the caller) ────────────────── */
    const unusedAmountFromDeposis = this.depositRecords.unusedAmount;
    // If you want dueTotal to exclude unused deposits, uncomment:
    // dueTotal = dueTotal.subtract(unusedAmountFromDeposis);

    /* ── 4)  Assemble result & cache fingerprints ─────────────────────── */
    const payoffResult: PayoffQuoteResult = {
      duePrincipal,
      dueInterest,
      dueFees,
      dueTotal,
      unusedAmountFromDeposis,
    };

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
      currentDate: this._currentDate?.toString(),
      amortization: this.amortization.json,
      depositRecords: this.depositRecords.json,
      bills: this.bills.json,
      amortizationVersionManager: this.amortizationVersionManager?.toJSON(),
      financialOpsVersionManager: this.financialOpsVersionManager?.toJSON(),
      allocationStrategy: PaymentApplication.getAllocationStrategyFromClass(this.allocationStrategy),
      paymentPriority: this.paymentPriority,
      autoCloseThreshold: this.autoCloseThreshold.toNumber(),
      rawImportData: this.rawImportData,
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
      autoCloseThreshold: this.autoCloseThreshold.toNumber(),
    };
  }

  static demoObject(): LendPeak {
    const lendPeak = new LendPeak({
      amortization: new Amortization(LendPeak.DEFAULT_AMORTIZATION_PARAMS),
    });
    return lendPeak;
  }

  toCode() {
    // we will return toCode from amortization and from deposits for now
    return this.depositRecords.toCode();
  }

  get summary() {
    const toReturn = {
      highlights: {
        status: {
          isPaidInFull: this.isPaidInFull,
          hasOverpayment: this.hasOverpayment,
          isEarlyPayoff: this.isEarlyPayoff,
          isPastDue: this.bills.pastDue.length > 0,
        },
        payments: {
          monthlyPayment: this.amortization.equitedMonthlyPayment,
          totalPayments: this.paymentApplicationResults.length,
          totalDeposits: this.depositRecords.all.length,
          totalBills: this.bills.all.length,
          unusedAmountFromDeposits: this.depositRecords.unusedAmount,
          hasAutoCloseDeposit: this.depositRecords.hasAutoCloseDeposit,
          totalRefunds: this.depositRecords.totalRefunds,
          activeRefunds: this.depositRecords.activeRefunds,
          hasRefunds: this.depositRecords.hasRefunds,
          totalAdhocRefunds: this.depositRecords.totalAdhocRefunds,
          hasAdhocRefunds: this.depositRecords.hasAdhocRefunds,
        },
        billing: {
          hasOpenBills: this.bills.openBills.length > 0,
        },
        modifications: {
          hasBalanceModifications: this.amortization.balanceModifications.all.length > 0,
          hasPayoffDate: this.amortization.payoffDate !== undefined,
          hasCustomEndDate: this.amortization.hasCustomEndDate,
          hasCustomFirstPaymentDate: this.amortization.hasCustomFirstPaymentDate,
          hasCustomEquitedMonthlyPayment: this.amortization.hasCustomEquitedMonthlyPayment,
          hasCustomPreBillDays: this.amortization.hasCustomPreBillDays,
          hasCustomBillDueDays: this.amortization.hasCustomBillDueDays,
          hasTermPaymentAmountOverride: this.amortization.termPaymentAmountOverride.length > 0,
          hasChangePaymentDates: this.amortization.changePaymentDates.length,
          hasTermInterestAmountOverride: this.amortization.termInterestAmountOverride.length > 0,
          hasTermInterestRateOverride: this.amortization.termInterestRateOverride.length > 0,
          hasCustomCalendars: this.amortization.calendars.hasCustomCalendars,
        },
        setup: {},
      },
    };

    return toReturn;
  }
}

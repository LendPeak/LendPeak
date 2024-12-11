import dayjs, { Dayjs } from "dayjs";
import { Decimal } from "decimal.js";
import { UILoan, PastDueSummary, ActualLoanSummary } from "./models/UIInterfaces";
import { DepositRecord } from "./models/Deposit";
import { Bill } from "./models/Bill";
import { BillPaymentDetail } from "./models/Bill/BillPaymentDetail";
import { UsageDetail } from "./models/Bill/Deposit/UsageDetail";

import { Currency, RoundingMethod } from "./utils/Currency";
import { CalendarType } from "./models/Calendar";
import { Amortization, AmortizationParams, FlushUnbilledInterestDueToRoundingErrorType, TILADisclosures, Fee, LoanSummary } from "./models/Amortization";
import { AmortizationEntry } from "./models/Amortization/AmortizationEntry";
import { BalanceModification } from "./models/Amortization/BalanceModification";
import { PaymentApplication, PaymentApplicationResult, PaymentComponent, PaymentAllocationStrategyName } from "./models/PaymentApplication";
import { BillGenerator } from "./models/BillGenerator";

// Example engine config
interface EngineConfig {
  // future config goes here
}

interface Transaction {
  id: string;
  timestamp: Dayjs;
  type: string;
  details: any;
}

export class LendPeakEngine {
  private loan: UILoan;
  private amortization?: Amortization;
  private bills: Bill[] = [];
  private deposits: DepositRecord[] = [];
  private paymentResults: PaymentApplicationResult[] = [];
  private transactionLog: Transaction[] = [];
  private snapshots: Map<string, { loan: UILoan; deposits: DepositRecord[]; bills: Bill[] }> = new Map();

  private config: EngineConfig;

  constructor(initialLoan: UILoan, config?: EngineConfig) {
    this.loan = { ...initialLoan };
    this.config = config || {};
    this.logTransaction("INIT", { loan: this.loan });
    // Initial calculation
    this.recalculate();
  }

  private recalculate(): void {
    const params = this.fromUILoanToParams(this.loan);
    try {
      this.amortization = new Amortization(params);
      this.generateBills();
      this.applyPayments();
    } catch (error) {
      this.logTransaction("ERROR", { error: error instanceof Error ? error.message : error });
    }
  }

  /**
   * Helper method to convert UILoan fields into AmortizationParams.
   * Adjust this logic as needed based on actual UILoan structure.
   */
  private fromUILoanToParams(loan: UILoan): AmortizationParams {
    // Convert calendar type, rounding method, flush method from strings to enums if necessary
    const calendarType = this.parseCalendarType(loan.calendarType);
    const roundingMethod = this.parseRoundingMethod(loan.roundingMethod);
    const flushMethod = this.parseFlushMethod(loan.flushMethod);
    const perDiemCalculationType = loan.perDiemCalculationType || "AnnualRateDividedByDaysInYear";
    const billingModel = loan.billingModel || "amortized";

    const startDate = this.toDayjs(loan.startDate);
    const endDate = this.toDayjs(loan.endDate);
    const firstPaymentDate = this.toDayjs(loan.firstPaymentDate);

    const principal = Currency.of(loan.principal);
    const originationFee = Currency.of(loan.originationFee || 0);
    const interestRateDecimal = new Decimal(loan.interestRate).div(100); // convert percentage to decimal

    // Convert arrays of feesForAllTerms and feesPerTerm if present
    const feesForAllTerms = (loan.feesForAllTerms || []).map((fee) => this.toFee(fee));
    const feesPerTerm = this.toFeesPerTerm(loan.feesPerTerm || []);

    const periodsSchedule = (loan.periodsSchedule || []).map((period) => ({
      period: period.period,
      startDate: this.toDayjs(period.startDate),
      endDate: this.toDayjs(period.endDate),
      interestRate: new Decimal(period.interestRate).div(100),
      paymentAmount: Currency.of(period.paymentAmount || 0),
    }));

    const ratesSchedule = (loan.ratesSchedule || []).map((rate) => ({
      startDate: this.toDayjs(rate.startDate),
      endDate: this.toDayjs(rate.endDate),
      annualInterestRate: new Decimal(rate.annualInterestRate).div(100),
    }));

    const termPaymentAmountOverride = (loan.termPaymentAmountOverride || []).map((o) => ({
      termNumber: o.termNumber,
      paymentAmount: Currency.of(o.paymentAmount),
    }));

    const changePaymentDates = (loan.changePaymentDates || []).map((cpd) => ({
      termNumber: cpd.termNumber,
      newDate: this.toDayjs(cpd.newDate),
    }));

    const dueBillDays = loan.dueBillDays;
    const preBillDays = loan.preBillDays;

    const balanceModifications = loan.balanceModifications.map((bm) => BalanceModification.fromJSON(bm));

    const termInterestOverride = loan.termInterestOverride?.map((o) => ({
      termNumber: o.termNumber,
      interestAmount: Currency.of(o.interestAmount),
    }));

    return {
      loanAmount: principal,
      originationFee: originationFee,
      annualInterestRate: interestRateDecimal,
      term: loan.term,
      startDate: startDate,
      endDate: endDate,
      firstPaymentDate: firstPaymentDate,
      calendarType: calendarType,
      roundingMethod: roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: flushMethod,
      roundingPrecision: loan.roundingPrecision || 2,
      flushThreshold: Currency.of(loan.flushThreshold || 0.01),
      termPeriodDefinition: loan.termPeriodDefinition,
      defaultPreBillDaysConfiguration: loan.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration: loan.defaultBillDueDaysAfterPeriodEndConfiguration,
      preBillDays: preBillDays,
      dueBillDays: dueBillDays,
      perDiemCalculationType: perDiemCalculationType,
      billingModel: billingModel,
      ratesSchedule: ratesSchedule,
      termPaymentAmountOverride: termPaymentAmountOverride,
      termPaymentAmount: loan.termPaymentAmount ? Currency.of(loan.termPaymentAmount) : undefined,
      periodsSchedule: periodsSchedule,
      changePaymentDates: changePaymentDates,
      balanceModifications: balanceModifications,
      feesForAllTerms: feesForAllTerms,
      feesPerTerm: feesPerTerm,
      termInterestOverride: termInterestOverride,
    };
  }

  /**
   * Converts a UI fee object to the engine Fee object.
   */
  private toFee(fee: any): Fee {
    return {
      type: fee.type,
      amount: fee.amount !== undefined ? Currency.of(fee.amount) : undefined,
      percentage: fee.percentage !== undefined ? new Decimal(fee.percentage).div(100) : undefined,
      basedOn: fee.basedOn,
      description: fee.description,
      metadata: fee.metadata,
    };
  }

  /**
   * Converts an array of UI feesPerTerm into the engine format.
   */
  private toFeesPerTerm(uiFeesPerTerm: any[]): { termNumber: number; fees: Fee[] }[] {
    const grouped: { [key: number]: any[] } = {};
    for (const uiFee of uiFeesPerTerm) {
      const tn = uiFee.termNumber;
      if (!grouped[tn]) grouped[tn] = [];
      grouped[tn].push(uiFee);
    }

    return Object.keys(grouped).map((k) => {
      const termNumber = parseInt(k, 10);
      const fees = grouped[termNumber].map((f) => this.toFee(f));
      return { termNumber, fees };
    });
  }

  /**
   * Parse calendar type from a UI string/enum to engine CalendarType
   */
  private parseCalendarType(ct: string): CalendarType {
    // Assume UI provides string like "ACTUAL_ACTUAL"
    switch (ct) {
      case "ACTUAL_ACTUAL":
        return CalendarType.ACTUAL_ACTUAL;
      case "ACTUAL_360":
        return CalendarType.ACTUAL_360;
      case "ACTUAL_365":
        return CalendarType.ACTUAL_365;
      case "THIRTY_360":
        return CalendarType.THIRTY_360;
      case "THIRTY_ACTUAL":
        return CalendarType.THIRTY_ACTUAL;
      default:
        // fallback to ACTUAL_ACTUAL if unknown
        return CalendarType.ACTUAL_ACTUAL;
    }
  }

  /**
   * Parse rounding method from a UI string to engine RoundingMethod
   */
  private parseRoundingMethod(rm: string): RoundingMethod {
    switch (rm) {
      case "ROUND_UP":
        return RoundingMethod.ROUND_UP;
      case "ROUND_DOWN":
        return RoundingMethod.ROUND_DOWN;
      case "ROUND_HALF_UP":
        return RoundingMethod.ROUND_HALF_UP;
      case "ROUND_HALF_DOWN":
        return RoundingMethod.ROUND_HALF_DOWN;
      case "ROUND_HALF_EVEN":
        return RoundingMethod.ROUND_HALF_EVEN;
      case "ROUND_HALF_CEIL":
        return RoundingMethod.ROUND_HALF_CEIL;
      case "ROUND_HALF_FLOOR":
        return RoundingMethod.ROUND_HALF_FLOOR;
      default:
        return RoundingMethod.ROUND_HALF_UP; // default if unknown
    }
  }

  /**
   * Parse flush method from a UI string to engine FlushUnbilledInterestDueToRoundingErrorType
   */
  private parseFlushMethod(fm: string): FlushUnbilledInterestDueToRoundingErrorType {
    switch (fm) {
      case "none":
        return FlushUnbilledInterestDueToRoundingErrorType.NONE;
      case "at_end":
        return FlushUnbilledInterestDueToRoundingErrorType.AT_END;
      case "at_threshold":
        return FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
      default:
        return FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD; // default
    }
  }

  /**
   * Convert a UI date (string or Date) to dayjs
   */
  private toDayjs(val: Date | string | number | undefined): Dayjs {
    if (!val) return dayjs(); // fallback to current date if missing
    return dayjs(val);
  }

  /**
   * Add a deposit to the engine and recalculate
   */
  public addDeposit(deposit: DepositRecord): void {
    this.deposits.push(deposit);
    this.logTransaction("ADD_DEPOSIT", { deposit });
    this.recalculate();
  }

  /**
   * Update loan parameters and recalculate
   */
  public updateLoanParameters(updatedLoan: Partial<UILoan>): void {
    this.loan = { ...this.loan, ...updatedLoan };
    this.logTransaction("UPDATE_LOAN", { updatedLoan });
    this.recalculate();
  }

  /**
   * Remove a deposit by ID
   */
  public removeDeposit(depositId: string): void {
    this.deposits = this.deposits.filter((d) => d.id !== depositId);
    this.logTransaction("REMOVE_DEPOSIT", { depositId });
    this.recalculate();
  }

  public getAmortizationSchedule(): AmortizationEntry[] {
    return this.amortization ? this.amortization.repaymentSchedule : [];
  }

  public getBills(): Bill[] {
    return this.bills;
  }

  public getDeposits(): DepositRecord[] {
    return this.deposits;
  }

  /**
   * This is a placeholder. Implement logic similar to previous code.
   */
  public getActualLoanSummary(snapshotDate: Date = new Date()): ActualLoanSummary | undefined {
    if (!this.amortization) return undefined;
    return {
      nextBillDate: undefined,
      actualPrincipalPaid: Currency.Zero(),
      actualInterestPaid: Currency.Zero(),
      lastPaymentDate: undefined,
      lastPaymentAmount: Currency.Zero(),
      actualRemainingPrincipal: Currency.of(this.loan.principal),
      actualCurrentPayoff: Currency.of(this.loan.principal),
    };
  }

  /**
   * Placeholder for past due summary
   */
  public getPastDueSummary(snapshotDate: Date = new Date()): PastDueSummary {
    return {
      pastDueCount: 0,
      totalPastDuePrincipal: Currency.Zero(),
      totalPastDueInterest: Currency.Zero(),
      totalPastDueFees: Currency.Zero(),
      totalPastDueAmount: Currency.Zero(),
      daysContractIsPastDue: 0,
    };
  }

  private generateBills(): void {
    if (!this.amortization) return;
    this.bills = BillGenerator.generateBills(this.amortization.repaymentSchedule, dayjs());
  }

  private applyPayments(): void {
    this.deposits.forEach((d) => d.clearHistory());
    if (!this.amortization) return;

    const allocationStrategy = PaymentApplication.getAllocationStrategyFromName(this.loan.paymentAllocationStrategy || "FIFO");
    const paymentPriority: PaymentComponent[] = ["interest", "fees", "principal"];

    const paymentApp = new PaymentApplication(this.bills, this.deposits, {
      allocationStrategy: allocationStrategy,
      paymentPriority: paymentPriority,
    });

    this.paymentResults = paymentApp.processDeposits();

    for (const result of this.paymentResults) {
      const deposit = this.deposits.find((d) => d.id === result.depositId);
      if (!deposit) continue;

      deposit.usageDetails = deposit.usageDetails || [];
      if (result.balanceModification) {
        // remove existing deposit-linked mods
        this.loan.balanceModifications = this.loan.balanceModifications.filter((bm) => !(bm.metadata && bm.metadata.depositId === deposit.id));
        this.loan.balanceModifications.push(result.balanceModification);
        deposit.balanceModificationId = result.balanceModification.id;
      } else {
        // remove existing deposit-linked modification
        this.loan.balanceModifications = this.loan.balanceModifications.filter((bm) => !(bm.metadata && bm.metadata.depositId === deposit.id));
        deposit.balanceModificationId = undefined;
      }

      deposit.unusedAmount = result.unallocatedAmount;

      for (const allocation of result.allocations) {
        const bill = this.bills.find((b) => b.id === allocation.billId);
        if (!bill) continue;
        bill.paymentDetails = bill.paymentDetails || [];
        bill.paymentDetails.push(
          new BillPaymentDetail({
            depositId: deposit.id,
            allocatedPrincipal: allocation.allocatedPrincipal,
            allocatedInterest: allocation.allocatedInterest,
            allocatedFees: allocation.allocatedFees,
            date: deposit.effectiveDate, // Dayjs is accepted by BillPaymentDetail
          })
        );

        deposit.usageDetails = deposit.usageDetails || [];
        deposit.usageDetails.push(
          new UsageDetail({
            billId: bill.id,
            period: bill.amortizationEntry?.term || 0,
            billDueDate: bill.dueDate.toDate(), // converting Dayjs to Date if UsageDetail expects Date
            allocatedPrincipal: allocation.allocatedPrincipal.toNumber(),
            allocatedInterest: allocation.allocatedInterest.toNumber(),
            allocatedFees: allocation.allocatedFees.toNumber(),
            date: deposit.effectiveDate.toDate(), // converting Dayjs to Date if UsageDetail expects Date
          })
        );
      }
    }

    // Update isPaid status
    this.bills = this.bills.map((bill) => {
      if (bill.principalDue.isZero() && bill.interestDue.isZero() && bill.feesDue.isZero()) {
        bill.isPaid = true;
      }
      return bill;
    });
  }

  private logTransaction(type: string, details: any): void {
    const transaction: Transaction = {
      id: Math.random().toString(36).substring(2),
      timestamp: dayjs(),
      type,
      details,
    };
    this.transactionLog.push(transaction);
  }

  public createSnapshot(label: string): void {
    this.snapshots.set(label, {
      loan: { ...this.loan },
      bills: [...this.bills],
      deposits: [...this.deposits],
    });
    this.logTransaction("SNAPSHOT", { label });
  }

  public restoreSnapshot(label: string): void {
    const snapshot = this.snapshots.get(label);
    if (!snapshot) return;
    this.loan = { ...snapshot.loan };
    this.deposits = [...snapshot.deposits];
    this.bills = [...snapshot.bills];
    this.logTransaction("RESTORE_SNAPSHOT", { label });
    this.recalculate();
  }

  public getTransactionLog(): Transaction[] {
    return this.transactionLog;
  }
}

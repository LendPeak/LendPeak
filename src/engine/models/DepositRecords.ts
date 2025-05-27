import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";
import { LocalDate, ZoneId } from "@js-joda/core";

import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { DepositRecord } from "./DepositRecord";
import { Currency } from "../utils/Currency";
import { BalanceModification } from "./Amortization/BalanceModification";

export class DepositRecords {
  _records: DepositRecord[] = [];
  private _modified: boolean = false;
  private _versionId: string = uuidv4();
  private _dateChanged: LocalDate = LocalDate.now();

  constructor(records: DepositRecord[] = []) {
    this.records = records;
    this.sortByEffectiveDate();
    this.updateJsValues();
    this.modified = false;
  }

  // resetModified() {
  //   this.modified = false;
  //   this._records.forEach((bm) => (bm.modified = false));
  // }
  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): LocalDate {
    return this._dateChanged;
  }

  get balanceModifications(): BalanceModification[] {
    let balanceModifications: BalanceModification[] = [];
    this._records.forEach((deposit) => {
      balanceModifications = balanceModifications.concat(deposit.balanceModifications);
    });
    return balanceModifications;
  }

  versionChanged() {
    this._dateChanged = LocalDate.now();
    this._versionId = uuidv4();
  }

  clearHistory() {
    this.all.forEach((deposit) => {
      deposit.clearHistory();
    });
  }

  set modified(value: boolean) {
    this._modified = value;
  }

  get modified(): boolean {
    return this._modified || false;
  }

  // get hasModified(): boolean {
  //   return this.modified || this._records.some((bm) => bm.modified);
  // }

  get hasModified(): boolean {
    return this.modified;
  }

  updateModelValues() {
    this._records.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._records.forEach((bm) => bm.updateJsValues());
  }

  get records(): DepositRecord[] {
    return this._records;
  }

  set records(value: DepositRecord[]) {
    this.modified = true;
    // check type and inflate
    this._records = value
      .map((c) => {
        if (c instanceof DepositRecord) {
          c.depositRecords = this;
          return c;
        }
        const record = new DepositRecord(c);
        record.depositRecords = this;
        return record;
      })
      .sort((a, b) => {
        return a.effectiveDate.isBefore(b.effectiveDate) ? -1 : 1;
      });
    this.versionChanged();
  }

  get first(): DepositRecord | undefined {
    return this.allSorted[0];
  }

  get last(): DepositRecord | undefined {
    return this.allSorted[this.length - 1];
  }

  get length(): number {
    return this._records.length;
  }

  getById(id: string): DepositRecord | undefined {
    return this._records.find((record) => record.id === id);
  }

  atIndex(index: number): DepositRecord | undefined {
    if (index < 0 || index >= this._records.length) {
      return undefined;
    }
    return this._records[index];
  }

  addRecord(record: DepositRecord) {
    this.modified = true;
    record.depositRecords = this;
    this._records.push(record);
    this.reSort();
    this.versionChanged();
  }

  removeRecordAtIndex(index: number) {
    if (index < 0 || index >= this._records.length) {
      console.warn(`Invalid index ${index} for removeRecordAtIndex. Array length: ${this._records.length}`);
      return;
    }
    this.modified = true;
    this._records.splice(index, 1);
    this.reSort();

    this.versionChanged();
  }

  reSort() {
    this._records = this._records.sort((a, b) => {
      if (a.effectiveDate.isBefore(b.effectiveDate)) return -1;
      if (a.effectiveDate.isAfter(b.effectiveDate)) return 1;
      // effectiveDate is the same, sort by systemDate
      if (a.systemDate && b.systemDate) {
        if (a.systemDate.isBefore(b.systemDate)) return -1;
        if (a.systemDate.isAfter(b.systemDate)) return 1;
      }
      return 0;
    });
  }
  removeRecordById(id: string) {
    this.modified = true;
    this._records = this._records.filter((record) => record.id !== id);
    this.reSort();

    this.versionChanged();
  }

  get unusedAmount(): Currency {
    return this.active.reduce((sum, r) => sum.add(r.unusedAmount), Currency.Zero());
  }

  get allSorted(): DepositRecord[] {
    return this._records.sort((a, b) => {
      if (a.effectiveDate.isBefore(b.effectiveDate)) return -1;
      if (a.effectiveDate.isAfter(b.effectiveDate)) return 1;
      // effectiveDate is the same, sort by systemDate
      if (a.systemDate && b.systemDate) {
        if (a.systemDate.isBefore(b.systemDate)) return -1;
        if (a.systemDate.isAfter(b.systemDate)) return 1;
      }
      return 0;
    });
  }

  get allActiveSorted(): DepositRecord[] {
    return this.active.sort((a, b) => {
      if (a.effectiveDate.isBefore(b.effectiveDate)) return -1;
      if (a.effectiveDate.isAfter(b.effectiveDate)) return 1;
      // effectiveDate is the same, sort by systemDate
      if (a.systemDate && b.systemDate) {
        if (a.systemDate.isBefore(b.systemDate)) return -1;
        if (a.systemDate.isAfter(b.systemDate)) return 1;
      }
      return 0;
    });
  }

  sortByEffectiveDate() {
    this._records = this._records.sort((a, b) => {
      if (a.effectiveDate.isBefore(b.effectiveDate)) return -1;
      if (a.effectiveDate.isAfter(b.effectiveDate)) return 1;
      // effectiveDate is the same, sort by systemDate
      if (a.systemDate && b.systemDate) {
        if (a.systemDate.isBefore(b.systemDate)) return -1;
        if (a.systemDate.isAfter(b.systemDate)) return 1;
      }
      return 0;
    });
  }

  /** convenience stats for the two new cards */
  get lastPaymentDateStr(): string | null {
    return this.lastActive ? this.lastActive.effectiveDate.toString() : null;
  }
  get lastPaymentAmt(): number {
    return this.lastActive ? this.lastActive.amount.toNumber() : 0;
  }

  get all(): DepositRecord[] {
    // console.trace("returning all deposit records");
    // this.printToConsole();
    return this._records;
  }

  get active(): DepositRecord[] {
    return this._records.filter((r) => r.active === true);
  }

  get lastActive(): DepositRecord | undefined {
    return this.allActiveSorted[this.active.length - 1];
  }

  /** how many refund rows exist (active + disabled) across ALL deposits */
  get totalRefunds(): number {
    return this._records.reduce((sum, d) => sum + ((d as any).refunds?.length ?? 0), 0);
  }

  /** only the refunds whose `active` flag is true */
  get activeRefunds(): number {
    return this._records.reduce((sum, d) => sum + ((d as any).refunds?.filter((r: any) => r.active).length ?? 0), 0);
  }

  /** quick helper */
  get hasRefunds(): boolean {
    return this.totalRefunds > 0;
  }

  /** both values at once, if you prefer */
  get refundStats() {
    return {
      totalRefunds: this.totalRefunds,
      activeRefunds: this.activeRefunds,
    };
  }

  get adhocRefunds(): DepositRecord[] {
    return this._records.filter((r) => r.isAdhocRefund);
  }

  printToConsole() {
    console.log("Deposit Records");
    const summary = this.summary;
    console.table({
      total: summary.total.toNumber(),
      totalInterest: summary.totalInterest.toNumber(),
      totalFees: summary.totalFees.toNumber(),
      totalPrincipal: summary.totalPrincipal.toNumber(),
      totalUnused: summary.totalUnused.toNumber(),
    });
    console.table(
      this._records.map((r) => {
        return {
          id: r.id,
          amount: r.amount.toNumber(),
          principal: r.allocatedPrincipal.toNumber(),
          interest: r.allocatedInterest.toNumber(),
          unusedAmount: r.unusedAmount.toNumber(),
          effectiveDate: r.effectiveDate.toString(),
          excessAppliedDate: r.excessAppliedDate ? r.excessAppliedDate.toString() : "",
          active: r.active,
        };
      })
    );
  }

  get hasAutoCloseDeposit(): boolean {
    return this._records.some((r) => r.metadata?.type === "auto_close");
  }

  /** quick counters */
  get totalAdhocRefunds(): number {
    return this.adhocRefunds.length;
  }
  get hasAdhocRefunds(): boolean {
    return this.totalAdhocRefunds > 0;
  }

  /**
   * Creates a CSV dump of every deposit record (active + inactive, sorted).
   * You can pass a rounding precision (defaults to 2).
   */
  exportToCSV(roundingPrecision = 2): string {
    if (this.length === 0) return "";

    const cols = [
      { h: "ID", v: (d: DepositRecord) => d.id },
      { h: "Active", v: (d: DepositRecord) => (d.active ? "Yes" : "No") },
      { h: "Amount", v: (d: DepositRecord) => d.amount.getRoundedValue(roundingPrecision) },
      { h: "Currency", v: (d: DepositRecord) => d.currency },
      { h: "System Date", v: (d: DepositRecord) => (d.systemDate ? d.systemDate.toString() : "") },
      { h: "Effective Date", v: (d: DepositRecord) => d.effectiveDate.toString() },
      { h: "Clearing Date", v: (d: DepositRecord) => (d.clearingDate ? d.clearingDate.toString() : "") },
      { h: "Depositor", v: (d: DepositRecord) => d.depositor || '' },
      { h: "Deposit Location", v: (d: DepositRecord) => d.depositLocation || '' },
      { h: "Payment Method", v: (d: DepositRecord) => d.paymentMethod || '' },
      {
        h: "Allocated Total",
        v: (d: DepositRecord) => d.allocatedTotal.getRoundedValue(roundingPrecision),
      },
      {
        h: "Allocated Principal",
        v: (d: DepositRecord) => d.allocatedPrincipal.getRoundedValue(roundingPrecision),
      },
      {
        h: "Allocated Interest",
        v: (d: DepositRecord) => d.allocatedInterest.getRoundedValue(roundingPrecision),
      },
      {
        h: "Allocated Fees",
        v: (d: DepositRecord) => d.allocatedFees.getRoundedValue(roundingPrecision),
      },
      { h: "Unused Amount", v: (d: DepositRecord) => d.unusedAmount.getRoundedValue(roundingPrecision) },
      { h: "Apply Excess To Principal", v: (d: DepositRecord) => (d.applyExcessToPrincipal ? "Yes" : "No") },
      { h: "Excess Applied Date", v: (d: DepositRecord) => (d.excessAppliedDate ? d.excessAppliedDate.toString() : "") },
      { h: "Total Refunded (Active)", v: (d: DepositRecord) => d.activeRefundAmount.getRoundedValue(roundingPrecision) },
      { h: "Total Refunds Count", v: (d: DepositRecord) => d.refunds?.length || 0 },
      { h: "Active Refunds Count", v: (d: DepositRecord) => d.refunds?.filter(r => r.active).length || 0 },
      { h: "Is Adhoc Refund", v: (d: DepositRecord) => d.isAdhocRefund ? "Yes" : "No" },
      { h: "Adhoc Balance Impacting", v: (d: DepositRecord) => d.adhocBalanceImpacting ? "Yes" : "No" },
      // Static allocation details
      { h: "Has Static Allocation", v: (d: DepositRecord) => d.staticAllocation ? "Yes" : "No" },
      { h: "Static Allocation Principal", v: (d: DepositRecord) => d.staticAllocation?.principal.getRoundedValue(roundingPrecision) || '' },
      { h: "Static Allocation Interest", v: (d: DepositRecord) => d.staticAllocation?.interest.getRoundedValue(roundingPrecision) || '' },
      { h: "Static Allocation Fees", v: (d: DepositRecord) => d.staticAllocation?.fees.getRoundedValue(roundingPrecision) || '' },
      { h: "Static Allocation Prepayment", v: (d: DepositRecord) => d.staticAllocation?.prepayment.getRoundedValue(roundingPrecision) || '' },
      // Metadata
      { h: "Metadata Type", v: (d: DepositRecord) => d.metadata?.type || '' },
      { h: "Metadata", v: (d: DepositRecord) => d.metadata ? JSON.stringify(d.metadata) : '' },
      // Usage details summary
      { h: "Usage Details Count", v: (d: DepositRecord) => d.usageDetails?.length || 0 },
      { h: "Usage Details Bills", v: (d: DepositRecord) => d.usageDetails?.map(u => u.billId).join(';') || '' },
    ];

    const esc = (s: any) => {
      let str = String(s);
      if (str.includes('"')) str = str.replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const header = cols.map((c) => c.h).join(",");
    const rows = this.allSorted.map((d) => cols.map((c) => esc(c.v(d))).join(","));
    return [header, ...rows].join("\n");
  }

  /**
   * Exports all usage details across all deposits to CSV format.
   * This provides a detailed view of how each deposit was allocated to bills.
   */
  exportUsageDetailsToCSV(roundingPrecision = 2): string {
    const usageDetails: Array<{deposit: DepositRecord, usage: any}> = [];
    
    // Collect all usage details with their parent deposit
    this.allSorted.forEach(deposit => {
      if (deposit.usageDetails && deposit.usageDetails.length > 0) {
        deposit.usageDetails.forEach(usage => {
          usageDetails.push({ deposit, usage });
        });
      }
    });

    if (usageDetails.length === 0) return "";

    const cols = [
      { h: "Deposit ID", v: (item: any) => item.deposit.id },
      { h: "Deposit Amount", v: (item: any) => item.deposit.amount.getRoundedValue(roundingPrecision) },
      { h: "Deposit Effective Date", v: (item: any) => item.deposit.effectiveDate.toString() },
      { h: "Bill ID", v: (item: any) => item.usage.billId },
      { h: "Bill Due Date", v: (item: any) => item.usage.billDueDate?.toString() || '' },
      { h: "Allocated Principal", v: (item: any) => item.usage.allocatedPrincipal.getRoundedValue(roundingPrecision) },
      { h: "Allocated Interest", v: (item: any) => item.usage.allocatedInterest.getRoundedValue(roundingPrecision) },
      { h: "Allocated Fees", v: (item: any) => item.usage.allocatedFees.getRoundedValue(roundingPrecision) },
      { h: "Allocated Total", v: (item: any) => (item.usage.allocatedPrincipal.add(item.usage.allocatedInterest).add(item.usage.allocatedFees)).getRoundedValue(roundingPrecision) },
      { h: "Allocation Date", v: (item: any) => item.usage.allocationDate?.toString() || '' },
      { h: "Allocation Type", v: (item: any) => item.usage.allocationType || '' },
    ];

    const esc = (s: any) => {
      let str = String(s);
      if (str.includes('"')) str = str.replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const header = cols.map((c) => c.h).join(",");
    const rows = usageDetails.map((item) => cols.map((c) => esc(c.v(item))).join(","));
    return [header, ...rows].join("\n");
  }

  get summary() {
    let total = Currency.of(0);
    let totalInterest = Currency.of(0);
    let totalFees = Currency.of(0);
    let totalPrincipal = Currency.of(0);
    let totalUnused = Currency.of(0);

    this.active.forEach((record) => {
      const s = record.summary;
      total = total.add(s.total);
      totalInterest = totalInterest.add(s.totalInterest);
      totalFees = totalFees.add(s.totalFees);
      totalPrincipal = totalPrincipal.add(s.totalPrincipal);
      totalUnused = totalUnused.add(s.totalUnused);
    });

    return {
      total,
      totalInterest,
      totalFees,
      totalPrincipal,
      totalUnused,
    };
  }

  toJSON() {
    return this.json;
  }

  get json() {
    return this._records.map((r) => r.json);
  }

  toCode() {
    return this._records.map((r) => r.toCode()).join(",\n");
  }
}

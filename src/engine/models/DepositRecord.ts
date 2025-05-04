import { Currency } from "../utils/Currency";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";
import { StaticAllocation, JsStaticAllocation } from "./Bill/DepositRecord/StaticAllocation";
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";
import { DepositRecords } from "./DepositRecords";
import { LocalDate, ZoneId, ChronoUnit } from "@js-joda/core";
import { RefundRecord } from "./RefundRecord";

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
import { BalanceModification } from "./Amortization/BalanceModification";
dayjs.extend(isBetween);

export interface DepositMetadata {
  custom?: { [key: string]: any };
  systemGenerated?: boolean;
  type?: "auto_close";
}

export class DepositRecord {
  id: string;

  private _amount!: Currency;
  jsAmount!: number;

  private _currency!: string;
  jsCurrency?: string;

  private _createdDate!: LocalDate;
  jsCreatedDate?: Date;

  private _insertedDate!: LocalDate;
  jsInsertedDate!: Date;

  private _effectiveDate!: LocalDate;
  jsEffectiveDate?: Date;

  private _clearingDate?: LocalDate;
  jsClearingDate?: Date;

  private _systemDate!: LocalDate;
  jsSystemDate!: Date;

  private _excessAppliedDate?: LocalDate;
  jsExcessAppliedDate?: Date;

  private _paymentMethod?: string;
  jsPaymentMethod?: string;

  private _depositor?: string;
  jsDepositor?: string;

  private _depositLocation?: string;
  jsDepositLocation?: string;

  private _applyExcessToPrincipal!: boolean;
  jsApplyExcessToPrincipal?: boolean;

  private _applyExcessAtTheEndOfThePeriod: boolean = false;
  jsApplyExcessAtTheEndOfThePeriod?: boolean = false;

  private _versionId: string = uuidv4();
  private _dateChanged: LocalDate = LocalDate.now();
  private initialized = false;

  depositRecords?: DepositRecords;

  active: boolean = true;

  _metadata?: DepositMetadata;
  _usageDetails: UsageDetail[] = [];
  _refunds: RefundRecord[] = [];

  _staticAllocation?: StaticAllocation;

  constructor(params: {
    id?: string;
    sequence?: number;
    amount: Currency | number;
    currency: string;
    createdDate?: LocalDate | Date;
    effectiveDate: LocalDate | Date;
    clearingDate?: LocalDate | Date;
    systemDate?: LocalDate | Date;
    paymentMethod?: string;
    depositor?: string;
    depositLocation?: string;
    applyExcessToPrincipal?: boolean;
    excessAppliedDate?: LocalDate | Date;
    applyExcessAtTheEndOfThePeriod?: boolean;
    usageDetails?: UsageDetail[] | any;
    unusedAmount?: Currency | number;
    metadata?: DepositMetadata;
    active?: boolean;
    staticAllocation?: StaticAllocation | JsStaticAllocation;
    depositRecords?: DepositRecords;
    refunds?: RefundRecord[];
  }) {
    // console.log("params in deposit record", params);
    if (params.id) {
      this.id = params.id;
    } else {
      this.id = DepositRecord.generateUniqueId(params.sequence);
    }

    if (params.active !== undefined) {
      this.active = params.active;
    }

    this.amount = Currency.of(params.amount);
    this.currency = params.currency;
    this.insertedDate = LocalDate.now();
    this.effectiveDate = DateUtil.normalizeDate(params.effectiveDate);
    if (params.clearingDate) {
      //console.log(`clearing date is passed as ${params.clearingDate}`);
      this.clearingDate = DateUtil.normalizeDate(params.clearingDate);
    }
    if (params.systemDate) {
      this.systemDate = DateUtil.normalizeDate(params.systemDate);
    } else {
      this.systemDate = LocalDate.now();
    }

    if (params.createdDate) {
      this.createdDate = DateUtil.normalizeDate(params.createdDate);
    } else {
      this.createdDate = LocalDate.now();
    }
    this.paymentMethod = params.paymentMethod;
    this.depositor = params.depositor;
    this.depositLocation = params.depositLocation;
    this.metadata = params.metadata || {};
    this.applyExcessToPrincipal = params.applyExcessToPrincipal || false;
    if (this.applyExcessToPrincipal && !params.excessAppliedDate) {
      this.excessAppliedDate = this.effectiveDate;
    } else if (params.excessAppliedDate) {
      this.excessAppliedDate = DateUtil.normalizeDate(params.excessAppliedDate);
    }
    this.usageDetails = params.usageDetails || [];
    // this.unusedAmount = params.unusedAmount ? params.unusedAmount : 0;

    if (params.staticAllocation) {
      this.staticAllocation = params.staticAllocation;
    }

    if (params.applyExcessAtTheEndOfThePeriod !== undefined) {
      this.applyExcessAtTheEndOfThePeriod = params.applyExcessAtTheEndOfThePeriod;
    }

    if (params.depositRecords) {
      this.depositRecords = params.depositRecords;
    }

    this.refunds = params.refunds ?? [];

    this.updateJsValues();
    this.initialized = true;
  }

  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): LocalDate {
    return this._dateChanged;
  }

  versionChanged() {
    if (this.initialized === true) {
      this._dateChanged = LocalDate.now();
      this._versionId = uuidv4();
      if (this.depositRecords) {
        this.depositRecords.versionChanged();
      }
    }
  }

  get applyExcessAtTheEndOfThePeriod(): boolean {
    return this._applyExcessAtTheEndOfThePeriod;
  }

  set applyExcessAtTheEndOfThePeriod(value: boolean) {
    this._applyExcessAtTheEndOfThePeriod = value;
    this.versionChanged();
  }

  clone(): DepositRecord {
    // console.log("json", this.json);
    // console.log("usage details", this.usageDetails);

    return new DepositRecord(this.json);
  }

  static rehydrateFromJSON(json: any): DepositRecord {
    return new DepositRecord(json);
  }

  addUsageDetail(detail: UsageDetail): void {
    // ignore if all amounts are zero
    if (detail.allocatedPrincipal.isZero() && detail.allocatedInterest.isZero() && detail.allocatedFees.isZero()) {
      console.warn("Ignoring usage detail with all zero amounts");
      return;
    }

    this._usageDetails.push(detail);

    // order by billDueDate using LocalDate and ChronoUnit
    this._usageDetails = this._usageDetails.sort((a, b) => ChronoUnit.DAYS.between(a.billDueDate, b.billDueDate));

    this.versionChanged();
  }

  removeUsageDetail(index: number): void {
    this._usageDetails.splice(index, 1);
    this.versionChanged();
  }

  resetUsageDetails(): void {
    // if usage detail has a balance modification
    // we want to mark it for removal so
    // this will help LendPeak class do do the cleanup
    // in amortization class and remove system generated
    // balance modifications
    this._usageDetails.forEach((detail) => {
      if (detail.balanceModification) {
        detail.balanceModification.markedForRemoval = true;
      }
    });
    this._usageDetails = [];

    this.versionChanged();
  }

  clearHistory(): void {
    this.resetUsageDetails();
    //  this.unusedAmount = Currency.Zero();
    this.versionChanged();
  }

  removeRefund(refund: RefundRecord) {
    const idx = this._refunds.indexOf(refund);
    if (idx >= 0) {
      this._refunds.splice(idx, 1);
      this.amount = this.amount.add(refund.amount); // give cash back
      this.versionChanged();
    }
  }

  /** Sum of amounts on all _active_ refund rows */
  get activeRefundAmount(): Currency {
    if (!this.refunds?.length) return Currency.Zero();
    return this.refunds.filter((r) => r.active).reduce((acc, r) => acc.add(r.amount), Currency.Zero());
  }

  /** convenience for Angular tables */
  get jsActiveRefundAmount(): number {
    return this.activeRefundAmount.toNumber();
  }

  get staticAllocation(): StaticAllocation | undefined {
    return this._staticAllocation;
  }

  set staticAllocation(value: StaticAllocation | JsStaticAllocation | undefined) {
    if (value instanceof StaticAllocation) {
      this._staticAllocation = value;
    } else if (value) {
      this._staticAllocation = new StaticAllocation(value);
    } else {
      this._staticAllocation = undefined;
    }
    this.versionChanged();
  }

  get amount(): Currency {
    return this._amount;
  }

  set amount(value: Currency) {
    this._amount = value;
    this.jsAmount = value.toNumber();
    this.versionChanged();
  }

  get currency(): string {
    return this._currency;
  }

  set currency(value: string) {
    this._currency = value;
    this.jsCurrency = value;
    this.versionChanged();
  }

  get createdDate(): LocalDate {
    return this._createdDate;
  }

  set createdDate(value: LocalDate | Date | string | undefined) {
    this._createdDate = DateUtil.normalizeDate(value);
    this.jsCreatedDate = DateUtil.normalizeDateToJsDate(this._createdDate);
    this.versionChanged();
  }

  get insertedDate(): LocalDate {
    return this._insertedDate;
  }

  set insertedDate(value: LocalDate | Date | string) {
    this._insertedDate = DateUtil.normalizeDate(value);
    this.jsInsertedDate = DateUtil.normalizeDateToJsDate(this._insertedDate);
    this.versionChanged();
  }

  get effectiveDate(): LocalDate {
    return this._effectiveDate;
  }

  set effectiveDate(value: LocalDate | Date | string | undefined) {
    const normalizedDate = DateUtil.normalizeDate(value);
    this._effectiveDate = normalizedDate;
    this.jsEffectiveDate = DateUtil.normalizeDateToJsDate(normalizedDate);
    this.versionChanged();
  }

  get clearingDate(): LocalDate | undefined {
    return this._clearingDate;
  }

  set clearingDate(value: LocalDate | Date | undefined) {
    if (!value) {
      this._clearingDate = undefined;
      this.jsClearingDate = undefined;
    } else {
      const normalizedDate = DateUtil.normalizeDate(value);
      this._clearingDate = normalizedDate;
      this.jsClearingDate = DateUtil.normalizeDateToJsDate(normalizedDate);
    }
    this.versionChanged();
  }

  get systemDate(): LocalDate {
    return this._systemDate;
  }

  set systemDate(value: LocalDate | Date | string) {
    this._systemDate = DateUtil.normalizeDate(value);
    this.jsSystemDate = DateUtil.normalizeDateToJsDate(this._systemDate);
    this.versionChanged();
  }

  get paymentMethod(): string | undefined {
    return this._paymentMethod;
  }

  get depositor(): string | undefined {
    return this._depositor;
  }

  get depositLocation(): string | undefined {
    return this._depositLocation;
  }

  get applyExcessToPrincipal(): boolean {
    return this._applyExcessToPrincipal;
  }

  set applyExcessToPrincipal(value: boolean) {
    this._applyExcessToPrincipal = value;
    this.jsApplyExcessToPrincipal = value;
    this.versionChanged();
  }

  get excessAppliedDate(): LocalDate | undefined {
    return this._excessAppliedDate;
  }

  set excessAppliedDate(value: LocalDate | undefined) {
    if (!value) {
      this._excessAppliedDate = undefined;
      this.jsExcessAppliedDate = undefined;
      return;
    }
    const normalizedDate = DateUtil.normalizeDate(value);
    this._excessAppliedDate = normalizedDate;
    this.jsExcessAppliedDate = DateUtil.normalizeDateToJsDate(normalizedDate);
    this.versionChanged();
  }

  get excessAmountApplied(): Currency {
    // find in the usage details the principal prepayment
    const principalPrepayment = this.usageDetails.find((detail) => detail.billId === "Principal Prepayment");
    if (principalPrepayment) {
      return Currency.of(principalPrepayment.allocatedPrincipal);
    } else {
      return Currency.Zero();
    }
  }

  get usageDetails(): UsageDetail[] {
    // verify type and if incorrect, inflate the object
    this._usageDetails = this._usageDetails.map((detail) => {
      if (detail instanceof UsageDetail) {
        return detail;
      }
      return new UsageDetail(detail);
    });
    return this._usageDetails;
  }

  get metadata(): DepositMetadata | undefined {
    return this._metadata;
  }

  set metadata(value: DepositMetadata | undefined) {
    this._metadata = value;
    this.versionChanged();
  }

  set paymentMethod(value: string | undefined) {
    this._paymentMethod = value;
    this.jsPaymentMethod = value;
    this.versionChanged();
  }

  set depositor(value: string | undefined) {
    this._depositor = value;
    this.jsDepositor = value;
    this.versionChanged();
  }

  set depositLocation(value: string | undefined) {
    this._depositLocation = value;
    this.jsDepositLocation = value;
    this.versionChanged();
  }

  set usageDetails(value: UsageDetail[]) {
    // console.log("usage details", value);
    // verify type and if incorrect, inflate the object
    this._usageDetails = value.map((detail) => {
      if (detail instanceof UsageDetail) {
        return detail;
      }
      return new UsageDetail(detail);
    });
    this.versionChanged();
  }

  get jsUnusedAmount(): number {
    return this.unusedAmount.toNumber();
  }

  get unusedAmount(): Currency {
    if (!this.active) return Currency.Zero();

    const allocated = this.usageDetails.reduce((tot, d) => tot.add(d.allocatedPrincipal).add(d.allocatedInterest).add(d.allocatedFees), Currency.Zero());
    const remainder = this.amount.subtract(allocated);
    return remainder.isNegative() ? Currency.Zero() : remainder;
  }

  /* ------------------------------------------------------------------ */
  /*  Refund helpers                                                    */
  /* ------------------------------------------------------------------ */
  get refunds(): RefundRecord[] {
    /* inflate if deserialized */
    this._refunds = this._refunds.map((r) => (r instanceof RefundRecord ? r : new RefundRecord(r)));
    return this._refunds;
  }
  set refunds(value: RefundRecord[]) {
    /* same “inflate + sort” pattern as other collections */
    this._refunds = value.map((r) => (r instanceof RefundRecord ? r : new RefundRecord(r)));
    this._refunds.forEach((r) => (r.depositRecord = this));
    this.versionChanged();
  }

  /** Total refunded so far (active refunds only). */
  get refundedAmount(): Currency {
    return this._refunds.reduce((sum, r) => (r.active ? sum.add(r.amount) : sum), Currency.Zero());
  }

  /** Primary API — create a refund and auto-adjust deposit. */
  addRefund(refund: RefundRecord): void {
    if (refund.currency !== this.currency) {
      console.warn(`Refund currency (${refund.currency}) != deposit currency (${this.currency}). Proceeding anyway.`);
    }
    refund.depositRecord = this;
    this._refunds.push(refund);

    /* ↓↓↓ core business rule ↓↓↓
       Refunds *reduce* the deposit’s available cash. */
    this.amount = this.amount.subtract(refund.amount);

    this.versionChanged();
  }

  /** Remove by index (for UI edits) */
  removeRefundAt(index: number): void {
    if (index < 0 || index >= this._refunds.length) return;
    const refund = this._refunds[index];
    this._refunds.splice(index, 1);

    /* Re-inflate deposit amount so net stays consistent */
    this.amount = this.amount.add(refund.amount);
    this.versionChanged();
  }

  updateModelValues(): void {
    this.amount = Currency.of(this.jsAmount || 0);
    this.currency = this.jsCurrency || "";
    this.createdDate = this.jsCreatedDate;
    this.insertedDate = this.jsInsertedDate;
    this.effectiveDate = this.jsEffectiveDate;
    this.systemDate = this.jsSystemDate;

    this.clearingDate = this.jsClearingDate;
    this.paymentMethod = this.jsPaymentMethod;
    this.depositor = this.jsDepositor;
    this.depositLocation = this.jsDepositLocation;
    this.applyExcessToPrincipal = this.jsApplyExcessToPrincipal || false;
    this.excessAppliedDate = this.jsExcessAppliedDate ? DateUtil.normalizeDate(this.jsExcessAppliedDate) : undefined;
    //  this.unusedAmount = Currency.of(this.jsUnusedAmount || 0);
    if (this.staticAllocation) {
      this.staticAllocation.updateModelValues();
    }
    this.applyExcessAtTheEndOfThePeriod = this.jsApplyExcessAtTheEndOfThePeriod || false;
    this.refunds.forEach((r) => r.updateModelValues());
  }

  get balanceModifications(): BalanceModification[] {
    return this.usageDetails.filter((detail) => detail.balanceModification).map((detail) => detail.balanceModification!);
  }

  updateJsValues(): void {
    this.jsAmount = this.amount.toNumber();
    this.jsCurrency = this.currency;
    this.jsCreatedDate = DateUtil.normalizeDateToJsDate(this.createdDate);
    this.jsInsertedDate = DateUtil.normalizeDateToJsDate(this.insertedDate);
    this.jsEffectiveDate = DateUtil.normalizeDateToJsDate(this.effectiveDate);
    this.jsSystemDate = DateUtil.normalizeDateToJsDate(this.systemDate);
    if (this.clearingDate) {
      this.jsClearingDate = DateUtil.normalizeDateToJsDate(this.clearingDate);
    } else {
      this.jsClearingDate = undefined;
    }
    this.jsPaymentMethod = this.paymentMethod;
    this.jsDepositor = this.depositor;
    this.jsDepositLocation = this.depositLocation;
    this.jsApplyExcessToPrincipal = this.applyExcessToPrincipal;
    if (this.excessAppliedDate) {
      this.jsExcessAppliedDate = DateUtil.normalizeDateToJsDate(this.excessAppliedDate);
    } else {
      this.jsExcessAppliedDate = undefined;
    }
    if (this.staticAllocation) {
      this.staticAllocation.updateJsValues();
    }
    this.jsApplyExcessAtTheEndOfThePeriod = this.applyExcessAtTheEndOfThePeriod;
    this.refunds.forEach((r) => r.updateJsValues());
  }

  static generateUniqueId(sequence?: number): string {
    // Simple unique ID generator (you can replace this with UUID if needed)
    const sequencePrefix = sequence !== undefined ? `${sequence}-` : "";
    return "DEPOSIT-" + sequencePrefix + Math.random().toString(36).substr(2, 9);
  }

  removeStaticAllocation(): void {
    this._staticAllocation = undefined;
    this.versionChanged();
  }

  /** convenience fields for the datatable */
  get allocatedPrincipal(): Currency {
    return this.summary.totalPrincipal;
  }
  get allocatedInterest(): Currency {
    return this.summary.totalInterest;
  }
  get allocatedFees(): Currency {
    return this.summary.totalFees;
  }
  get allocatedTotal(): Currency {
    return this.summary.totalPrincipal.add(this.summary.totalInterest).add(this.summary.totalFees);
  }

  get summary() {
    let total = this.amount;
    let totalUnused = this.unusedAmount;
    let totalInterest = Currency.of(0);
    let totalFees = Currency.of(0);
    let totalPrincipal = Currency.of(0);

    this.usageDetails.forEach((detail) => {
      totalInterest = totalInterest.add(detail.allocatedInterest);
      totalFees = totalFees.add(detail.allocatedFees);
      totalPrincipal = totalPrincipal.add(detail.allocatedPrincipal);
    });

    return {
      total: total,
      totalInterest: totalInterest,
      totalFees: totalFees,
      totalPrincipal: totalPrincipal,
      totalUnused: totalUnused,
    };
  }

  toJSON() {
    return this.json;
  }

  get json() {
    const toReturn: any = {
      id: this.id,
      amount: this.amount.toNumber(),
      currency: this.currency,
      createdDate: DateUtil.normalizeDateToJsDate(this.createdDate),
      insertedDate: DateUtil.normalizeDateToJsDate(this.insertedDate),
      effectiveDate: DateUtil.normalizeDateToJsDate(this.effectiveDate),
      clearingDate: this.clearingDate ? DateUtil.normalizeDateToJsDate(this.clearingDate) : undefined,
      systemDate: DateUtil.normalizeDateToJsDate(this.systemDate),
      paymentMethod: this.paymentMethod,
      depositor: this.depositor,
      depositLocation: this.depositLocation,
      applyExcessToPrincipal: this.applyExcessToPrincipal,
      excessAppliedDate: this.excessAppliedDate ? DateUtil.normalizeDateToJsDate(this.excessAppliedDate) : undefined,
      usageDetails: this.usageDetails.map((detail) => {
        // console.log("Inside deposit record detail", detail);
        // console.log('"Inside deposit record detail.json', detail.json);
        return detail.json;
      }),
      unusedAmount: this.unusedAmount.toNumber(),
      metadata: this.metadata,
      active: this.active,
      staticAllocation: this.staticAllocation ? this.staticAllocation.json : undefined,
      applyExcessAtTheEndOfThePeriod: this.applyExcessAtTheEndOfThePeriod,
    };

    if (this.refunds) {
      toReturn.refunds = this.refunds.map((r) => r.json);
    }
    return toReturn;
  }

  toCode() {
    return `new DepositRecord({
      id: "${this.id}",
      amount: ${this.amount.toNumber()},
      currency: "${this.currency}",
      createdDate: DateUtil.normalizeDate("${this.createdDate.toString()}"),
      effectiveDate: DateUtil.normalizeDate("${this.effectiveDate.toString()}"),
      clearingDate: ${this.clearingDate ? `DateUtil.normalizeDate("${this.clearingDate.toString()}")` : "undefined"},
      systemDate: DateUtil.normalizeDate("${this.systemDate.toString()}"),
      paymentMethod: ${this.paymentMethod ? `"${this.paymentMethod}"` : "undefined"},
      depositor: ${this.depositor ? `"${this.depositor}"` : "undefined"},
      depositLocation: ${this.depositLocation ? `"${this.depositLocation}"` : "undefined"},
      applyExcessToPrincipal: ${this.applyExcessToPrincipal},
      excessAppliedDate: ${this.excessAppliedDate ? `DateUtil.normalizeDate("${this.excessAppliedDate.toString()}")` : "undefined"},
      unusedAmount: ${this.unusedAmount.toNumber()},
      metadata: ${JSON.stringify(this.metadata)},
      active: ${this.active},
      staticAllocation: ${this.staticAllocation ? this.staticAllocation.toCode() : "undefined"},
      applyExcessAtTheEndOfThePeriod: ${this.applyExcessAtTheEndOfThePeriod},
      refunds: [
    ${this.refunds.map((r) => r.toCode()).join(",\n    ")}
  ],
    })`;
  }
}

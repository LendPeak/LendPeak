import { Currency } from "../utils/Currency";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";
import { StaticAllocation, JsStaticAllocation } from "./Bill/DepositRecord/StaticAllocation";
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";
import { DepositRecords } from "./DepositRecords";

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

export interface DepositMetadata {
  custom?: { [key: string]: any };
}

export class DepositRecord {
  id: string;

  private _amount!: Currency;
  jsAmount!: number;

  private _currency!: string;
  jsCurrency?: string;

  private _createdDate!: Dayjs;
  jsCreatedDate?: Date;

  private _insertedDate!: Dayjs;
  jsInsertedDate!: Date;

  private _effectiveDate!: Dayjs;
  jsEffectiveDate?: Date;

  private _clearingDate?: Dayjs;
  jsClearingDate?: Date;

  private _systemDate!: Dayjs;
  jsSystemDate!: Date;

  private _unusedAmount: Currency = Currency.of(0);
  jsUnusedAmount?: number;

  private _excessAppliedDate?: Dayjs;
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

  private _balanceModificationId?: string;
  jsBalanceModificationId?: string;

  private _versionId: string = uuidv4();
  private _dateChanged: Dayjs = dayjs();
  private initialized = false;

  depositRecords?: DepositRecords;

  active: boolean = true;

  _metadata?: DepositMetadata;
  _usageDetails: UsageDetail[] = [];

  _staticAllocation?: StaticAllocation;

  constructor(params: {
    id?: string;
    sequence?: number;
    amount: Currency | number;
    currency: string;
    createdDate?: Dayjs | Date;
    effectiveDate: Dayjs | Date;
    clearingDate?: Dayjs | Date;
    systemDate?: Dayjs | Date;
    paymentMethod?: string;
    depositor?: string;
    depositLocation?: string;
    applyExcessToPrincipal?: boolean;
    excessAppliedDate?: Dayjs | Date;
    applyExcessAtTheEndOfThePeriod?: boolean;
    usageDetails?: UsageDetail[] | any;
    unusedAmount?: Currency | number;
    balanceModificationId?: string;
    metadata?: DepositMetadata;
    active?: boolean;
    staticAllocation?: StaticAllocation | JsStaticAllocation;
    depositRecords?: DepositRecords;
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
    this.insertedDate = dayjs();
    this.effectiveDate = dayjs.utc(params.effectiveDate).startOf("day");
    if (params.clearingDate) {
      //console.log(`clearing date is passed as ${params.clearingDate}`);
      this.clearingDate = dayjs.utc(params.clearingDate).startOf("day");
    }
    if (params.systemDate) {
      this.systemDate = dayjs.utc(params.systemDate).startOf("day");
    } else {
      this.systemDate = dayjs();
    }

    if (params.createdDate) {
      this.createdDate = dayjs.utc(params.createdDate).startOf("day");
    } else {
      this.createdDate = dayjs();
    }
    this.paymentMethod = params.paymentMethod;
    this.depositor = params.depositor;
    this.depositLocation = params.depositLocation;
    this.metadata = params.metadata || {};
    this.applyExcessToPrincipal = params.applyExcessToPrincipal || false;
    if (this.applyExcessToPrincipal && !params.excessAppliedDate) {
      this.excessAppliedDate = this.effectiveDate;
    } else if (params.excessAppliedDate) {
      this.excessAppliedDate = dayjs.utc(params.excessAppliedDate).startOf("day");
    }
    this.usageDetails = params.usageDetails || [];
    this.unusedAmount = params.unusedAmount ? params.unusedAmount : 0;
    this.balanceModificationId = params.balanceModificationId;

    if (params.staticAllocation) {
      this.staticAllocation = params.staticAllocation;
    }

    if (params.applyExcessAtTheEndOfThePeriod !== undefined) {
      this.applyExcessAtTheEndOfThePeriod = params.applyExcessAtTheEndOfThePeriod;
    }

    if (params.depositRecords) {
      this.depositRecords = params.depositRecords;
    }

    this.updateJsValues();
    this.initialized = true;
  }

  get versionId(): string {
    return this._versionId;
  }

  get dateChanged(): Dayjs {
    return this._dateChanged;
  }

  versionChanged() {
    if (this.initialized === true) {
      this._dateChanged = dayjs();
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
    // lets ignore if all amounts are zeros
    if (detail.allocatedPrincipal.isZero() && detail.allocatedInterest.isZero() && detail.allocatedFees.isZero()) {
      console.warn("Ignoring usage detail with all zero amounts");
      return;
    }
    this._usageDetails.push(detail);
    // order by date
    this._usageDetails = this._usageDetails.sort((a, b) => a.billDueDate.diff(b.billDueDate));
    this.versionChanged();
  }

  removeUsageDetail(index: number): void {
    this._usageDetails.splice(index, 1);
    this.versionChanged();
  }

  resetUsageDetails(): void {
    this._usageDetails = [];
    this.versionChanged();
  }

  clearHistory(): void {
    this.resetUsageDetails();
    this.unusedAmount = Currency.Zero();
    this.balanceModificationId = undefined;
    this.versionChanged();
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

  get createdDate(): Dayjs {
    return this._createdDate;
  }

  set createdDate(value: Dayjs | Date | string | undefined) {
    this._createdDate = DateUtil.normalizeDate(value);
    this.jsCreatedDate = this._createdDate.toDate();
    this.versionChanged();
  }

  get insertedDate(): Dayjs {
    return this._insertedDate;
  }

  set insertedDate(value: Dayjs | Date | string) {
    this._insertedDate = dayjs(value).utc();
    this.jsInsertedDate = this._insertedDate.toDate();
    this.versionChanged();
  }

  get effectiveDate(): Dayjs {
    return this._effectiveDate;
  }

  set effectiveDate(value: Dayjs | Date | string | undefined) {
    this._effectiveDate = DateUtil.normalizeDate(value);
    this.jsEffectiveDate = this._effectiveDate.toDate();
    this.versionChanged();
  }

  get clearingDate(): Dayjs | undefined {
    return this._clearingDate;
  }

  set clearingDate(value: Dayjs | Date | undefined) {
    this._clearingDate = DateUtil.normalizeDate(value);
    this.jsClearingDate = this._clearingDate.toDate();
    this.versionChanged();
  }

  get systemDate(): Dayjs {
    return this._systemDate;
  }

  set systemDate(value: Dayjs | Date | string) {
    this._systemDate = dayjs(value).utc();
    this.jsSystemDate = this._systemDate.toDate();
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

  get excessAppliedDate(): Dayjs | undefined {
    return this._excessAppliedDate;
  }

  set excessAppliedDate(value: Dayjs | undefined) {
    this._excessAppliedDate = DateUtil.normalizeDate(value);
    this.jsExcessAppliedDate = this._excessAppliedDate.toDate();
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

  get unusedAmount(): Currency {
    return this._unusedAmount;
  }

  get balanceModificationId(): string | undefined {
    return this._balanceModificationId;
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

  set unusedAmount(value: Currency | number) {
    // check type and inflate if necessary
    if (typeof value === "number") {
      value = Currency.of(value);
    }
    this._unusedAmount = value;
    this.jsUnusedAmount = value.toNumber();
    this.versionChanged();
  }

  set balanceModificationId(value: string | undefined) {
    this._balanceModificationId = value;
    this.jsBalanceModificationId = value;
    this.versionChanged();
  }

  removeStaticAllocation(): void {
    this._staticAllocation = undefined;
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
    this.excessAppliedDate = this.jsExcessAppliedDate ? dayjs(this.jsExcessAppliedDate) : undefined;
    this.unusedAmount = Currency.of(this.jsUnusedAmount || 0);
    this.balanceModificationId = this.jsBalanceModificationId;
    if (this.staticAllocation) {
      this.staticAllocation.updateModelValues();
    }
    this.applyExcessAtTheEndOfThePeriod = this.jsApplyExcessAtTheEndOfThePeriod || false;
  }

  updateJsValues(): void {
    this.jsAmount = this.amount.toNumber();
    this.jsCurrency = this.currency;
    this.jsCreatedDate = this.createdDate.toDate();
    this.jsInsertedDate = this.insertedDate.toDate();
    this.jsEffectiveDate = this.effectiveDate.toDate();
    this.jsSystemDate = this.systemDate.toDate();
    this.jsClearingDate = this.clearingDate?.toDate();
    this.jsPaymentMethod = this.paymentMethod;
    this.jsDepositor = this.depositor;
    this.jsDepositLocation = this.depositLocation;
    this.jsApplyExcessToPrincipal = this.applyExcessToPrincipal;
    this.jsExcessAppliedDate = this.excessAppliedDate?.toDate();
    this.jsUnusedAmount = this.unusedAmount.toNumber();
    this.jsBalanceModificationId = this.balanceModificationId;
    if (this.staticAllocation) {
      this.staticAllocation.updateJsValues();
    }
    this.jsApplyExcessAtTheEndOfThePeriod = this.applyExcessAtTheEndOfThePeriod;
  }

  static generateUniqueId(sequence?: number): string {
    // Simple unique ID generator (you can replace this with UUID if needed)
    const sequencePrefix = sequence !== undefined ? `${sequence}-` : "";
    return "DEPOSIT-" + sequencePrefix + Math.random().toString(36).substr(2, 9);
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
    return {
      id: this.id,
      amount: this.amount.toNumber(),
      currency: this.currency,
      createdDate: this.createdDate.toDate(),
      insertedDate: this.insertedDate.toDate(),
      effectiveDate: this.effectiveDate.toDate(),
      clearingDate: this.clearingDate?.toDate(),
      systemDate: this.systemDate.toDate(),
      paymentMethod: this.paymentMethod,
      depositor: this.depositor,
      depositLocation: this.depositLocation,
      applyExcessToPrincipal: this.applyExcessToPrincipal,
      excessAppliedDate: this.excessAppliedDate?.toDate(),
      usageDetails: this.usageDetails.map((detail) => {
        // console.log("Inside deposit record detail", detail);
        // console.log('"Inside deposit record detail.json', detail.json);
        return detail.json;
      }),
      unusedAmount: this.unusedAmount.toNumber(),
      balanceModificationId: this.balanceModificationId,
      metadata: this.metadata,
      active: this.active,
      staticAllocation: this.staticAllocation ? this.staticAllocation.json : undefined,
      applyExcessAtTheEndOfThePeriod: this.applyExcessAtTheEndOfThePeriod,
    };
  }
}

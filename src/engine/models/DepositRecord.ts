import { Currency } from "../utils/Currency";
import { UsageDetail } from "./Bill/DepositRecord/UsageDetail";
import { StaticAllocation, JsStaticAllocation } from "./Bill/DepositRecord/StaticAllocation";

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
  jsInsertedDate?: Date;

  private _effectiveDate!: Dayjs;
  jsEffectiveDate?: Date;

  private _clearingDate?: Dayjs;
  jsClearingDate?: Date;

  private _systemDate!: Dayjs;
  jsSystemDate?: Date;

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

    this.updateJsValues();
  }

  get applyExcessAtTheEndOfThePeriod(): boolean {
    return this._applyExcessAtTheEndOfThePeriod;
  }

  set applyExcessAtTheEndOfThePeriod(value: boolean) {
    this._applyExcessAtTheEndOfThePeriod = value;
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
  }

  removeUsageDetail(index: number): void {
    this._usageDetails.splice(index, 1);
  }

  resetUsageDetails(): void {
    this._usageDetails = [];
  }

  clearHistory(): void {
    this.resetUsageDetails();
    this.unusedAmount = Currency.Zero();
    this.balanceModificationId = undefined;
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
  }

  get amount(): Currency {
    return this._amount;
  }

  set amount(value: Currency) {
    this._amount = value;
    this.jsAmount = value.toNumber();
  }

  get currency(): string {
    return this._currency;
  }

  set currency(value: string) {
    this._currency = value;
    this.jsCurrency = value;
  }

  get createdDate(): Dayjs {
    return this._createdDate;
  }

  set createdDate(value: Dayjs) {
    this._createdDate = value;
    this.jsCreatedDate = value.toDate();
  }

  get insertedDate(): Dayjs {
    return this._insertedDate;
  }

  set insertedDate(value: Dayjs) {
    this._insertedDate = value;
    this.jsInsertedDate = value.toDate();
  }

  get effectiveDate(): Dayjs {
    return this._effectiveDate;
  }

  set effectiveDate(value: Dayjs) {
    this._effectiveDate = value;
    this.jsEffectiveDate = value.toDate();
  }

  get clearingDate(): Dayjs | undefined {
    return this._clearingDate;
  }

  set clearingDate(value: Dayjs | undefined) {
    this._clearingDate = value;
    this.jsClearingDate = value ? value.toDate() : undefined;
  }

  get systemDate(): Dayjs {
    return this._systemDate;
  }

  set systemDate(value: Dayjs) {
    this._systemDate = value;
    this.jsSystemDate = value.toDate();
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
  }

  get excessAppliedDate(): Dayjs | undefined {
    return this._excessAppliedDate;
  }

  set excessAppliedDate(value: Dayjs | undefined) {
    this._excessAppliedDate = value;
    this.jsExcessAppliedDate = value ? value.toDate() : undefined;
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
  }

  set paymentMethod(value: string | undefined) {
    this._paymentMethod = value;
    this.jsPaymentMethod = value;
  }

  set depositor(value: string | undefined) {
    this._depositor = value;
    this.jsDepositor = value;
  }

  set depositLocation(value: string | undefined) {
    this._depositLocation = value;
    this.jsDepositLocation = value;
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
  }

  set unusedAmount(value: Currency | number) {
    // check type and inflate if necessary
    if (typeof value === "number") {
      value = Currency.of(value);
    }
    this._unusedAmount = value;
    this.jsUnusedAmount = value.toNumber();
  }

  set balanceModificationId(value: string | undefined) {
    this._balanceModificationId = value;
    this.jsBalanceModificationId = value;
  }

  removeStaticAllocation(): void {
    this._staticAllocation = undefined;
  }

  updateModelValues(): void {
    this.amount = Currency.of(this.jsAmount || 0);
    this.currency = this.jsCurrency || "";
    this.createdDate = dayjs(this.jsCreatedDate);
    this.insertedDate = dayjs(this.jsInsertedDate);
    this.effectiveDate = dayjs(this.jsEffectiveDate);
    this.systemDate = dayjs(this.jsSystemDate);
    this.clearingDate = this.jsClearingDate ? dayjs(this.jsClearingDate) : undefined;
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

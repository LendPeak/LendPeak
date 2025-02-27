import { Deposit, DepositMetadata } from "./Deposit";
import { Currency } from "../utils/Currency";
import { UsageDetail } from "./Bill/Deposit/UsageDetail";

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
import { stat } from "fs";
dayjs.extend(isBetween);

export class DepositRecord implements Deposit {
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

  private _balanceModificationId?: string;
  jsBalanceModificationId?: string;

  active: boolean = true;

  _metadata?: DepositMetadata;
  _usageDetails: UsageDetail[] = [];

  _staticAllocation?: {
    principal: Currency;
    interest: Currency;
    fees: Currency;
    prepayment: Currency;
  };

  jsStaticAllocation?: {
    principal: number;
    interest: number;
    fees: number;
    prepayment: number;
  };

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
    usageDetails?: UsageDetail[] | any;
    unusedAmount?: Currency | number;
    balanceModificationId?: string;
    metadata?: DepositMetadata;
    active?: boolean;
    staticAllocation?: {
      principal: Currency | number;
      interest: Currency | number;
      fees: Currency | number;
      prepayment: Currency | number;
    };
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
    this.unusedAmount = params.unusedAmount ? Currency.of(params.unusedAmount) : Currency.of(0);
    this.balanceModificationId = params.balanceModificationId;

    if (params.staticAllocation) {
      this.staticAllocation = params.staticAllocation;
    }

    this.updateJsValues();
  }

  clone(): DepositRecord {
    return new DepositRecord(this.json);
  }

  static rehydrateFromJSON(json: any): DepositRecord {
    // when object is saved it will have js keys and keys prefixed with _ and with js
    const rehydrated: any = Object.keys(json).reduce((acc, key) => {
      const newKey = key.startsWith("js") ? key.charAt(2).toLowerCase() + key.slice(3) : key;
      acc[newKey] = (json as any)[key];
      return acc;
    }, {} as any);
    rehydrated.usageDetails = (json._usageDetails || [])
      .filter((detail: any) => detail.allocatedInterest !== 0 || detail.allocatedPrincipal !== 0 || detail.allocatedFees !== 0)
      .map((detail: any) => UsageDetail.rehydrateFromJSON(detail));
    rehydrated.metadata = json._metadata;
    return new DepositRecord(rehydrated);
  }

  set staticAllocation(value: { principal: Currency | number; interest: Currency | number; fees: Currency | number; prepayment: Currency | number }) {
    // validate to make sure the sum of all static allocations is not greater than the deposit amount
    const principal = Currency.of(value.principal);
    const interest = Currency.of(value.interest);
    const fees = Currency.of(value.fees);
    const prepayment = Currency.of(value.prepayment);
    const total = principal.add(interest).add(fees).add(prepayment);
    if (!total.equals(this.amount)) {
      throw new Error(
        `Sum of static allocations for principal(${principal.toNumber()}) + interest(${interest.toNumber()}) + fees(${fees.toNumber()}) + prepayment(${prepayment.toNumber()}) must be equal to deposit amount(${this.amount.toNumber()})`
      );
    }

    this._staticAllocation = {
      principal: principal,
      interest: interest,
      fees: fees,
      prepayment: prepayment,
    };
  }

  get staticAllocation(): { principal: Currency; interest: Currency; fees: Currency; prepayment: Currency } | undefined {
    return this._staticAllocation;
  }

  addUsageDetail(detail: UsageDetail): void {
    // lets ignore if all amounts are zeros
    if (detail.allocatedPrincipal.isZero() && detail.allocatedInterest.isZero() && detail.allocatedFees.isZero()) {
      console.warn("Ignoring usage detail with all zero amounts");
      return;
    }
    this._usageDetails.push(detail);
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

  get usageDetails(): UsageDetail[] {
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
    // verify type and if incorrect, inflate the object
    this._usageDetails = value.map((detail) => {
      if (detail instanceof UsageDetail) {
        return detail;
      }
      return new UsageDetail(detail);
    });
  }

  set unusedAmount(value: Currency) {
    this._unusedAmount = value;
    this.jsUnusedAmount = value.toNumber();
  }

  set balanceModificationId(value: string | undefined) {
    this._balanceModificationId = value;
    this.jsBalanceModificationId = value;
  }

  removeStaticAllocation(): void {
    this._staticAllocation = undefined;
    this.jsStaticAllocation = undefined;
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
    if (this.jsStaticAllocation) {
      this.staticAllocation = {
        principal: Currency.of(this.jsStaticAllocation.principal),
        interest: Currency.of(this.jsStaticAllocation.interest),
        fees: Currency.of(this.jsStaticAllocation.fees),
        prepayment: Currency.of(this.jsStaticAllocation.prepayment),
      };
    }
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
      this.jsStaticAllocation = {
        principal: this.staticAllocation.principal.toNumber(),
        interest: this.staticAllocation.interest.toNumber(),
        fees: this.staticAllocation.fees.toNumber(),
        prepayment: this.staticAllocation.prepayment.toNumber(),
      };
    }
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
      usageDetails: this.usageDetails.map((detail) => detail.json),
      unusedAmount: this.unusedAmount.toNumber(),
      balanceModificationId: this.balanceModificationId,
      metadata: this.metadata,
      active: this.active,
      staticAllocation: this.staticAllocation
        ? {
            principal: this.staticAllocation.principal.toNumber(),
            interest: this.staticAllocation.interest.toNumber(),
            fees: this.staticAllocation.fees.toNumber(),
            prepayment: this.staticAllocation.prepayment.toNumber(),
          }
        : undefined,
    };
  }
}

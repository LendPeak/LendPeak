import { Currency } from "../utils/Currency";
import { v4 as uuidv4 } from "uuid";
import { DateUtil } from "../utils/DateUtil";
import { LocalDate } from "@js-joda/core";

/** Optional extra data for audit / UI use */
export interface RefundMetadata {
  reason?: string; // e.g. “DuplicatePayment”, “CourtesyWaiver”
  custom?: { [key: string]: any }; // anything the UI wants to stash
}

export class RefundRecord {
  /** Primary key */
  id: string;

  private _amount!: Currency;
  jsAmount!: number;

  private _currency!: string;
  jsCurrency?: string;

  private _createdDate!: LocalDate;
  jsCreatedDate?: Date;

  private _effectiveDate!: LocalDate;
  jsEffectiveDate?: Date;

  private _metadata?: RefundMetadata;
  private _active = true;
  /** audit / versioning */
  private _versionId: string = uuidv4();
  private _dateChanged: LocalDate = LocalDate.now();
  private initialized = false;

  /** back-pointer is set automatically when you add the refund to a DepositRecord */
  depositRecord?: any; // typed late to avoid circular import problems

  /* ------------------------------------------------------------------ */
  constructor(params: { id?: string; amount: Currency | number; currency: string; createdDate?: LocalDate | Date; effectiveDate: LocalDate | Date; metadata?: RefundMetadata; active?: boolean }) {
    this.id = params.id ?? RefundRecord.generateUniqueId();
    if (params.active !== undefined) {
      this.active = params.active;
    }

    this.amount = Currency.of(params.amount);
    this.currency = params.currency;

    this.createdDate = params.createdDate ?? LocalDate.now();
    this.effectiveDate = params.effectiveDate;

    this.metadata = params.metadata;

    this.updateJsValues();
    this.initialized = true;
  }

  /* ------------------------------------------------------------------ */
  /*  Versioning helpers                                                */
  /* ------------------------------------------------------------------ */
  get versionId(): string {
    return this._versionId;
  }
  get dateChanged(): LocalDate {
    return this._dateChanged;
  }
  private versionChanged() {
    if (!this.initialized) return;
    this._dateChanged = LocalDate.now();
    this._versionId = uuidv4();
    /* bubble up so the loan snapshot knows something changed */
    if (this.depositRecord?.versionChanged) {
      this.depositRecord.versionChanged();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Core properties                                                    */
  /* ------------------------------------------------------------------ */

  /** True → refund reduces deposit.balance;  
   *  False → cash is “given back”, so deposit.balance increases. */
  get active(): boolean {
    return this._active;
  }
  set active(value: boolean) {
    if (value === this._active) return;          // no change

    /* when we already belong to a deposit, move the cash in/out */
    if (this.depositRecord) {
      const delta = value ? this.amount.negated() : this.amount; // on ⇢ –amount, off ⇢ +amount
      this.depositRecord.amount = this.depositRecord.amount.add(delta);
    }

    this._active = value;
    this.versionChanged();                       // bump version + bubble up
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

  get effectiveDate(): LocalDate {
    return this._effectiveDate;
  }
  set effectiveDate(value: LocalDate | Date | string | undefined) {
    const d = DateUtil.normalizeDate(value);
    this._effectiveDate = d;
    this.jsEffectiveDate = DateUtil.normalizeDateToJsDate(d);
    this.versionChanged();
  }

  get metadata(): RefundMetadata | undefined {
    return this._metadata;
  }
  set metadata(value: RefundMetadata | undefined) {
    this._metadata = value;
    this.versionChanged();
  }

  /* ------------------------------------------------------------------ */
  /*  (De)serialization helpers                                          */
  /* ------------------------------------------------------------------ */
  updateModelValues() {
    this.amount = Currency.of(this.jsAmount ?? 0);
    this.currency = this.jsCurrency ?? "";
    this.createdDate = this.jsCreatedDate;
    this.effectiveDate = this.jsEffectiveDate;
  }

  updateJsValues() {
    this.jsAmount = this.amount.toNumber();
    this.jsCurrency = this.currency;
    this.jsCreatedDate = DateUtil.normalizeDateToJsDate(this.createdDate);
    this.jsEffectiveDate = DateUtil.normalizeDateToJsDate(this.effectiveDate);
  }

  toJSON() {
    return this.json;
  }
  get json() {
    return {
      id: this.id,
      amount: this.amount.toNumber(),
      currency: this.currency,
      createdDate: DateUtil.normalizeDateToJsDate(this.createdDate),
      effectiveDate: DateUtil.normalizeDateToJsDate(this.effectiveDate),
      metadata: this.metadata,
      active: this.active,
    };
  }

  static rehydrateFromJSON(json: any): RefundRecord {
    return new RefundRecord(json);
  }

  toCode() {
    return `new RefundRecord({
  id: "${this.id}",
  amount: ${this.amount.toNumber()},
  currency: "${this.currency}",
  createdDate: DateUtil.normalizeDate("${this.createdDate.toString()}"),
  effectiveDate: DateUtil.normalizeDate("${this.effectiveDate.toString()}"),
  metadata: ${JSON.stringify(this.metadata)},
  active: ${this.active},
})`;
  }

  static generateUniqueId() {
    return "REFUND-" + Math.random().toString(36).substr(2, 9);
  }
}

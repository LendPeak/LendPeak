import { Currency, RoundingMethod } from "../../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import Decimal from "decimal.js";
import { DateUtil } from "../../utils/DateUtil";
import { LocalDate, ZoneId } from "@js-joda/core";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export type BalanceModificationType = "increase" | "decrease";

export interface IBalanceModification {
  id?: string;
  amount: Currency | number;
  date: LocalDate | Date | string;
  type: BalanceModificationType;
  description?: string;
  metadata?: any;
  isSystemModification?: boolean;
}

export class BalanceModification {
  id?: string;

  private _amount!: Currency;
  jsAmount!: number;

  private _date!: LocalDate;
  jsDate!: Date;

  type: BalanceModificationType;
  description?: string;
  metadata?: any;
  isSystemModification: boolean;

  private _usedAmount: Currency = Currency.of(0);
  jsUsedAmount!: number;

  private _unusedAmount!: Currency;
  jsUnusedAmount!: number;

  private _inputParams: IBalanceModification;

  private _markedForRemoval: boolean = false;

  constructor(params: IBalanceModification) {
    this._inputParams = JSON.parse(JSON.stringify(params));

    if (params.id) {
      this.id = params.id;
    }

    this.isSystemModification = params.isSystemModification || false;
    this.amount = params.amount;
    this.date = params.date;

    this.type = params.type;
    this.description = params.description;
    this.metadata = params.metadata;
  }

  get markedForRemoval(): boolean {
    return this._markedForRemoval;
  }

  set markedForRemoval(value: boolean) {
    this._markedForRemoval = value;
  }

  updateJsValues() {
    this.jsAmount = this.amount.toNumber();
    this.jsDate = DateUtil.normalizeDateToJsDate(this.date);
    this.jsUsedAmount = this.usedAmount.toNumber();
    this.jsUnusedAmount = this.unusedAmount.toNumber();
  }

  resetUsedAmount() {
    this.usedAmount = 0;
  }

  updateModelValues() {
    this.amount = this.jsAmount;
    this.date = this.jsDate;
    this.updateUsedAmount();
  }

  updateUsedAmount() {
    this.usedAmount = this.jsUsedAmount;
  }

  set unusedAmount(amount: Currency) {
    this._unusedAmount = amount;
    this.jsUnusedAmount = amount.toNumber();
  }

  set date(date: LocalDate | Date | string) {
    this._date = DateUtil.normalizeDate(date);
    this.jsDate = DateUtil.normalizeDateToJsDate(this._date);
  }

  get date(): LocalDate {
    return this._date;
  }

  get amount(): Currency {
    return this._amount;
  }

  set usedAmount(amount: Currency | number | Decimal) {
    this._usedAmount = Currency.of(amount);
    this.jsUsedAmount = this._usedAmount.toNumber();
    this.unusedAmount = this._amount.subtract(this._usedAmount);
  }

  get unusedAmount(): Currency {
    return this._unusedAmount;
  }

  get usedAmount(): Currency {
    return this._usedAmount;
  }

  set amount(amount: Currency | number | Decimal) {
    this._amount = Currency.of(amount);
    const amountAsNumber = this._amount.toNumber();
    this.jsAmount = this._amount.toNumber();
    this.unusedAmount = this._amount;
  }

  static rehydrateFromJSON(json: any): BalanceModification {
    // when object is saved it will have js keys and keys prefixed with _ and with js
    const rehydrated: any = Object.keys(json).reduce((acc, key) => {
      const newKey = key.startsWith("js") ? key.charAt(2).toLowerCase() + key.slice(3) : key;
      acc[newKey] = (json as any)[key];
      return acc;
    }, {} as any);
    return new BalanceModification(rehydrated);
  }

  static parseJSONArray(json: any[]): BalanceModification[] {
    if (!json) {
      return [];
    }

    if (!Array.isArray(json)) {
      json = [json];
    }

    const mods: BalanceModification[] = [];
    for (const entry of json) {
      // ensure modification is greater than zero otherwise discard it
      const mod = BalanceModification.rehydrateFromJSON(entry);
      if (mod.amount.greaterThan(0)) {
        mods.push(mod);
      } else {
        console.log(`BalanceModification with amount ${mod.amount.toCurrencyString()} is not greater than zero. Discarding.`);
      }
    }
    return mods;
  }

  /**
   * Generates TypeScript code to recreate this BalanceModification instance.
   * @returns A string containing the TypeScript code.
   */
  public toCode(): string {
    // Helper functions
    const serializeCurrency = (currency: Currency | number): string => {
      if (currency instanceof Currency) {
        return `Currency.of(${currency.toNumber()})`;
      } else {
        return `Currency.of(${currency})`;
      }
    };

    const serializeDayjs = (date: LocalDate | Date | string): string => {
      const dateStr = dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : date.toString();
      return `dayjs('${dateStr}')`;
    };

    const serializeAny = (value: any): string => {
      return JSON.stringify(value);
    };

    // Build the BalanceModification object
    const lines = [];

    lines.push("{");

    if (this.id) {
      lines.push(`  id: '${this.id}',`);
    }

    lines.push(`  amount: ${serializeCurrency(this.amount)},`);
    lines.push(`  date: ${serializeDayjs(this.date)},`);
    lines.push(`  type: '${this.type}',`);

    if (this.description) {
      lines.push(`  description: '${this.description}',`);
    }

    if (this.metadata) {
      lines.push(`  metadata: ${serializeAny(this.metadata)},`);
    }

    if (this.isSystemModification !== undefined) {
      lines.push(`  isSystemModification: ${this.isSystemModification},`);
    }

    lines.push("}");

    return lines.join("\n");
  }

  /**
   * Serializes the BalanceModification instance into a JSON object.
   * @returns A JSON-compatible object representing the BalanceModification instance.
   */
  get json(): any {
    return {
      id: this.id,
      amount: this.amount.toNumber(),
      date: this.date.toString(),
      type: this.type,
      description: this.description,
      metadata: this.metadata,
      isSystemModification: this.isSystemModification,
      usedAmount: this.usedAmount.toNumber(),
      unusedAmount: this.unusedAmount.toNumber(),
    };
  }

  /**
   * Recreates a BalanceModification instance from a JSON object.
   * @param json The JSON object representing a BalanceModification instance.
   * @returns A new BalanceModification instance.
   */
  public static fromJSON(json: any): BalanceModification {
    const params: IBalanceModification = {
      id: json.id,
      amount: Currency.of(json.amount),
      date: DateUtil.normalizeDate(json.date),
      type: json.type,
      description: json.description,
      metadata: json.metadata,
      isSystemModification: json.isSystemModification,
    };

    const balanceModification = new BalanceModification(params);
    balanceModification.usedAmount = Currency.of(json.usedAmount);
    return balanceModification;
  }
}

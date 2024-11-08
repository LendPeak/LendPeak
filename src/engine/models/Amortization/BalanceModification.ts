import { Currency, RoundingMethod } from "../../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import Decimal from "decimal.js";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export type BalanceModificationType = "increase" | "decrease";

export interface IBalanceModification {
  id?: string;
  amount: Currency | number;
  date: Dayjs | Date | string;
  type: BalanceModificationType;
  description?: string;
  metadata?: any;
  isSystemModification?: boolean;
}

export class BalanceModification {
  id?: string;

  private _amount!: Currency;
  jsAmount!: number;

  private _date!: Dayjs;
  jsDate: Date;

  type: BalanceModificationType;
  description?: string;
  metadata?: any;
  isSystemModification: boolean;

  constructor(params: IBalanceModification) {
    if (params.id) {
      this.id = params.id;
    }

    this.isSystemModification = params.isSystemModification || false;
    this.amount = params.amount;
    this.date = params.date;
    this.jsDate = this.date.toDate();

    this.type = params.type;
    this.description = params.description;
    this.metadata = params.metadata;
  }

  set date(date: Dayjs | Date | string) {
    this._date = dayjs(date).startOf("day");
    this.jsDate = this._date.toDate();
  }

  get date(): Dayjs {
    return this._date;
  }

  get amount(): Currency {
    return this._amount;
  }

  set amount(amount: Currency | number | Decimal) {
    this._amount = Currency.of(amount);
    this.jsAmount = this._amount.toNumber();
  }

  static parseJSONArray(json: any[]): BalanceModification[] {
    const mods: BalanceModification[] = [];
    for (const entry of json) {
      // ensure modification is greater than zero otherwise discard it
      const mod = new BalanceModification(entry);
      if (mod.amount.greaterThan(0)) {
        mods.push(mod);
      }
    }
    return mods;
  }
}

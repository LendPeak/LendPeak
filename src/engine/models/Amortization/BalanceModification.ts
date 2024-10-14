import { Currency, RoundingMethod } from "../../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

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

  amount: Currency = Currency.Zero();
  private _date: Dayjs = dayjs();
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
    this.amount = Currency.of(params.amount);
    this.date = dayjs(params.date);
    this.jsDate = this.date.toDate();

    this.type = params.type;
    this.description = params.description;
    this.metadata = params.metadata;
  }

  get date(): Dayjs {
    return this._date;
  }

  set date(date: Dayjs | Date | string) {
    this._date = dayjs(date).startOf("day");
    this.jsDate = this._date.toDate();
  }

  get jsAmount(): number {
    return this.amount.toNumber();
  }

  set jsAmount(amount: number) {
    this.amount = Currency.of(amount);
  }
}

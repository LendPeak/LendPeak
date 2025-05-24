import Decimal from "decimal.js";
import { Currency } from "../utils/Currency";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export type FeeType = "fixed" | "percentage";
export type FeeBasedOn = "interest" | "principal" | "totalPayment";

export interface FeeParams {
  id?: string;
  type: FeeType;
  amount?: number | Currency; // For fixed amount fees
  percentage?: number | Decimal; // For percentage-based fees
  basedOn?: FeeBasedOn; // What the percentage is applied to
  description?: string;
  metadata?: any;
  active?: boolean;
}

export class Fee {
  id: string;
  jsTermNumber!: number;

  private _type!: FeeType;
  private _amount?: Currency;
  private _percentage?: Decimal;
  private _basedOn?: FeeBasedOn;
  private _description?: string;
  private _metadata?: any;
  jsAmount?: number;
  jsPercentage?: number;
  private _active = true;
  jsActive = true;

  constructor(params: FeeParams) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = params.type;
    if (params.amount) {
      this.amount = params.amount;
    }
    if (params.percentage) {
      this.percentage = params.percentage;
    }
    if (params.basedOn) {
      this.basedOn = params.basedOn;
    }
    if (params.description) {
      this.description = params.description;
    }
    if (params.metadata) {
      this.metadata = params.metadata;
    }
    if (params.active !== undefined) {
      this.active = params.active;
    }
  }

  get type(): FeeType {
    return this._type;
  }

  set type(value: FeeType) {
    if (value !== "fixed" && value !== "percentage") {
      throw new Error("Fee type must be either 'fixed' or 'percentage'");
    }
    this._type = value;
  }

  get amount(): Currency | undefined {
    return this._amount;
  }

  set amount(value: Currency | number | Decimal | undefined) {
    if (this.type !== "fixed") {
      throw new Error("Cannot set amount for a percentage-based fee");
    }
    this._amount = value !== undefined ? new Currency(value) : undefined;
    this.jsAmount = this._amount?.toNumber();
  }

  get percentage(): Decimal | undefined {
    return this._percentage;
  }

  set percentage(value: Decimal | number | undefined) {
    if (this.type !== "percentage") {
      throw new Error("Cannot set percentage for a fixed amount fee");
    }
    this._percentage = value !== undefined ? new Decimal(value) : undefined;
    this.jsPercentage = this._percentage?.toNumber();
  }

  get basedOn(): FeeBasedOn | undefined {
    return this._basedOn;
  }

  set basedOn(value: FeeBasedOn | undefined) {
    if (value !== "interest" && value !== "principal" && value !== "totalPayment") {
      throw new Error("Fee basedOn must be either 'interest', 'principal', or 'totalPayment'");
    }
    this._basedOn = value;
  }

  get description(): string | undefined {
    return this._description;
  }

  set description(value: string | undefined) {
    this._description = value;
  }

  get metadata(): any | undefined {
    return this._metadata;
  }

  set metadata(value: any | undefined) {
    this._metadata = value;
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
    this.jsActive = value;
  }

  updateModelValues(): void {
    if (this.jsAmount !== undefined) {
      this.amount = this.jsAmount;
    } else {
      this.amount = undefined;
    }

    if (this.jsPercentage) {
      this.percentage = this.jsPercentage;
    } else {
      this.percentage = undefined;
    }

    this.active = this.jsActive;
  }

  updateJsValues(): void {
    this.jsAmount = this.amount?.toNumber();
    this.jsPercentage = this.percentage?.toNumber();
    this.jsActive = this.active;
  }

  get json(): FeeParams {
    return {
      type: this.type,
      amount: this.amount?.toNumber(),
      percentage: this.percentage?.toNumber(),
      basedOn: this.basedOn,
      description: this.description,
      metadata: this.metadata,
      active: this.active,
    };
  }
}

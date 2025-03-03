import { Currency } from "../../../utils/Currency";
import { UsageDetail } from "../../Bill/DepositRecord/UsageDetail";

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
import { stat } from "fs";
dayjs.extend(isBetween);

export interface JsStaticAllocation {
  principal: Currency | number;
  interest: Currency | number;
  fees: Currency | number;
  prepayment: Currency | number;
}

export class StaticAllocation {
  private _principal!: Currency;
  private _interest!: Currency;
  private _fees!: Currency;
  private _prepayment!: Currency;

  jsPrincipal!: number;
  jsInterest!: number;
  jsFees!: number;
  jsPrepayment!: number;

  constructor(params: JsStaticAllocation) {
    this.principal = params.principal;
    this.interest = params.interest;
    this.fees = params.fees;
    this.prepayment = params.prepayment;

    this.updateJsValues();
  }

  get principal(): Currency {
    return this._principal;
  }

  set principal(value: Currency | number) {
    if (value instanceof Currency) {
      this._principal = value;
    } else {
      this._principal = new Currency(value);
    }
  }

  get interest(): Currency {
    return this._interest;
  }

  set interest(value: Currency | number) {
    if (value instanceof Currency) {
      this._interest = value;
    } else {
      this._interest = new Currency(value);
    }
  }

  get fees(): Currency {
    return this._fees;
  }

  set fees(value: Currency | number) {
    if (value instanceof Currency) {
      this._fees = value;
    } else {
      this._fees = new Currency(value);
    }
  }

  get prepayment(): Currency {
    return this._prepayment;
  }

  set prepayment(value: Currency | number) {
    if (value instanceof Currency) {
      this._prepayment = value;
    } else {
      this._prepayment = new Currency(value);
    }
  }

  get json() {
    return {
      principal: this.principal.toNumber(),
      interest: this.interest.toNumber(),
      fees: this.fees.toNumber(),
      prepayment: this.prepayment.toNumber(),
    };
  }

  updateJsValues() {
    this.jsPrincipal = this.principal.toNumber();
    this.jsInterest = this.interest.toNumber();
    this.jsFees = this.fees.toNumber();
    this.jsPrepayment = this.prepayment.toNumber();
  }

  updateModelValues() {
    this.principal = this.jsPrincipal;
    this.interest = this.jsInterest;
    this.fees = this.jsFees;
    this.prepayment = this.jsPrepayment;
  }
}

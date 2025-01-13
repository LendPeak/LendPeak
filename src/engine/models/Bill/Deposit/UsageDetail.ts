import dayjs, { Dayjs } from "dayjs";
import { Currency } from "../../../utils/Currency";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export interface UsageDetailParams {
  billId: string;
  period: number;
  billDueDate: Dayjs | Date;
  allocatedPrincipal: Currency | number;
  allocatedInterest: Currency | number;
  allocatedFees: Currency | number;
  date: Dayjs | Date;
}

export class UsageDetail {
  billId: string;
  period: number;

  _billDueDate!: Dayjs;
  jsBillDueDate?: Date;

  _allocatedPrincipal!: Currency;
  jsAllocatedPrincipal!: number;

  _allocatedInterest!: Currency;
  jsAllocatedInterest!: number;

  _allocatedFees!: Currency;
  jsAllocatedFees!: number;

  _date!: Dayjs;
  jsDate!: Date;

  constructor(params: UsageDetailParams) {
    this.billId = params.billId;
    this.period = params.period;
    this.billDueDate = dayjs(params.billDueDate);
    this.allocatedPrincipal = Currency.of(params.allocatedPrincipal);
    this.allocatedInterest = Currency.of(params.allocatedInterest);
    this.allocatedFees = Currency.of(params.allocatedFees);
    this.date = dayjs(params.date);
  }

  static rehydrateFromJSON(json: any): UsageDetail {
    // console.log("rehydrating usage details", json);
    return new UsageDetail({
      billId: json.jsBillId,
      period: json.period,
      billDueDate: json.jsBillDueDate,
      allocatedPrincipal: json.allocatedPrincipal ? Currency.fromJSON(json.allocatedPrincipal) : Currency.Zero(),
      allocatedInterest: json.allocatedInterest ? Currency.fromJSON(json.allocatedInterest) : Currency.Zero(),
      allocatedFees: json.allocatedFees ? Currency.fromJSON(json.allocatedFees) : Currency.Zero(),
      date: json.jsDate,
    });
  }

  get billDueDate(): Dayjs {
    return this._billDueDate;
  }

  set billDueDate(date: Dayjs | Date) {
    this._billDueDate = dayjs(date).startOf("day");
    this.jsBillDueDate = this._billDueDate.toDate();
  }

  get allocatedPrincipal(): Currency {
    return this._allocatedPrincipal;
  }

  set allocatedPrincipal(amount: Currency | number) {
    this._allocatedPrincipal = Currency.of(amount);
    this.jsAllocatedPrincipal = this._allocatedPrincipal.toNumber();
  }

  get allocatedInterest(): Currency {
    return this._allocatedInterest;
  }

  set allocatedInterest(amount: Currency | number) {
    this._allocatedInterest = Currency.of(amount);
    this.jsAllocatedInterest = this._allocatedInterest.toNumber();
  }

  get allocatedFees(): Currency {
    return this._allocatedFees;
  }

  set allocatedFees(amount: Currency | number) {
    this._allocatedFees = Currency.of(amount);
    this.jsAllocatedFees = this._allocatedFees.toNumber();
  }

  get date(): Dayjs {
    return this._date;
  }

  set date(date: Dayjs | Date) {
    this._date = dayjs(date).startOf("day");
    this.jsDate = this._date.toDate();
  }

  syncJSPropertiesFromValues(): void {
    this.jsBillDueDate = this.billDueDate.toDate();
    this.jsAllocatedPrincipal = this.allocatedPrincipal.toNumber();
    this.jsAllocatedInterest = this.allocatedInterest.toNumber();
    this.jsAllocatedFees = this.allocatedFees.toNumber();
    this.jsDate = this.date.toDate();
  }

  syncValuesFromJSProperties(): void {
    this.billDueDate = dayjs(this.jsBillDueDate);
    this.allocatedPrincipal = Currency.of(this.jsAllocatedPrincipal);
    this.allocatedInterest = Currency.of(this.jsAllocatedInterest);
    this.allocatedFees = Currency.of(this.jsAllocatedFees);
    this.date = dayjs(this.jsDate);
  }
}

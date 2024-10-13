import { Currency } from "../../utils/Currency";
import dayjs, { Dayjs } from "dayjs";

export interface IBillPaymentDetail {
  depositId: string;
  allocatedPrincipal: Currency | number;
  allocatedInterest: Currency | number;
  allocatedFees: Currency | number;
  date: Dayjs | Date;
}

export class BillPaymentDetail {
  depositId: string;
  allocatedPrincipal: Currency;
  allocatedInterest: Currency;
  allocatedFees: Currency;
  date: Dayjs;

  constructor(params: IBillPaymentDetail) {
    this.depositId = params.depositId;
    this.allocatedPrincipal = Currency.of(params.allocatedPrincipal);
    this.allocatedInterest = Currency.of(params.allocatedInterest);
    this.allocatedFees = Currency.of(params.allocatedFees);
    this.date = dayjs(params.date);
  }

  get jsAllocatedPrincipal(): number {
    return this.allocatedPrincipal.toNumber();
  }

  get jsAllocatedInterest(): number {
    return this.allocatedInterest.toNumber();
  }

  get jsAllocatedFees(): number {
    return this.allocatedFees.toNumber();
  }

  get jsDate(): Date {
    return this.date.toDate();
  }
}

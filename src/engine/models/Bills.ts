// Bill.ts
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { Bill } from "./Bill";

export class Bills {
  private _bills: Bill[] = [];

  constructor(bills: Bill[] = []) {
    this.bills = bills;
  }

  get bills(): Bill[] {
    return this._bills;
  }

  get all(): Bill[] {
    return this._bills;
  }

  get sortedByDueDate(): Bill[] {
    return this._bills.sort((a, b) => a.dueDate.diff(b.dueDate));
  }

  get unpaid(): Bill[] {
    return this._bills.filter((bill) => !bill.isPaid);
  }

  set bills(value: Bill[]) {
    // check if the value is an array of Bill objects
    // if not, create a new Bill object from the value

    this._bills = value.map((c) => {
      if (c instanceof Bill) {
        return c;
      }
      return new Bill(c);
    });

    // sort bills from olders to newest
    this._bills = this._bills.sort((a, b) => a.period - b.period);
  }

  sortBills() {
    this._bills = this._bills.sort((a, b) => a.period - b.period);
  }

  getBillByPeriod(period: number): Bill | undefined {
    return this._bills.find((bill) => bill.period === period);
  }

  getBillByDueDate(dueDate: Dayjs): Bill | undefined {
    return this._bills.find((bill) => bill.dueDate.isSame(dueDate, "day"));
  }

  getBillByOpenDate(openDate: Dayjs): Bill | undefined {
    return this._bills.find((bill) => bill.openDate.isSame(openDate, "day"));
  }

  getBillById(id: string): Bill | undefined {
    return this._bills.find((bill) => bill.id === id);
  }

  addBill(bill: Bill): void {
    this._bills.push(bill);
    this._bills = this._bills.sort((a, b) => a.period - b.period);
  }

  removeBill(bill: Bill): void {
    this._bills = this._bills.filter((_bill) => _bill.id !== bill.id);
    this._bills = this._bills.sort((a, b) => a.period - b.period);
  }

  updateModelValues() {
    this._bills.forEach((bill) => bill.amortizationEntry.updateModelValues());
  }

  updateJsValues() {
    this._bills.forEach((bill) => bill.amortizationEntry.updateJsValues());
  }

  get length(): number {
    return this._bills.length;
  }

  atIndex(index: number): Bill {
    if (index < 0) {
      return this.first;
    }
    return this._bills[index];
  }

  get first(): Bill {
    return this._bills[0];
  }

  get last(): Bill {
    return this._bills[this._bills.length - 1];
  }

  get json() {
    return this._bills.map((bill) => bill.json);
  }

  toJSON() {
    return this.json;
  }
}

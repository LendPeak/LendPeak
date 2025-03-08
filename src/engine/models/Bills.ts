// Bill.ts
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { Bill } from "./Bill";
import { Currency } from "../utils/Currency";

export interface BillsSummary {
  remainingTotal: Currency;
  remainingFees: Currency;
  remainingPrincipal: Currency;
  remainingInterest: Currency;
  allocatedTotalSum: Currency;
  allocatedFeesSum: Currency;
  allocatedPrincipalSum: Currency;
  allocatedInterestSum: Currency;
  dueTotal: Currency;
  duePrincipal: Currency;
  dueInterest: Currency;
  dueFees: Currency;
  pastDueTotal: Currency;
  pastDuePrincipal: Currency;
  pastDueInterest: Currency;
  pastDueFees: Currency;
  billsPastDue: number;
  daysPastDue: number;
  remainingUnpaidBills: number;
  totalBillsCount: number;
}
export class Bills {
  private _bills: Bill[] = [];

  private _summary?: BillsSummary;

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
    return this._bills.filter((bill) => !bill.isPaid).sort((a, b) => a.dueDate.diff(b.dueDate));
  }

  get lastOpenBill(): Bill | undefined {
    return this._bills.filter((bill) => bill.isOpen).sort((a, b) => b.period - a.period)[0];
  }

  getFirstFutureBill(currentDate: Dayjs | Date = dayjs()): Bill | undefined {
    if (currentDate instanceof Date) {
      currentDate = dayjs(currentDate);
    }
    // we want to find bill where period end date of the amortization entry
    // is same or before the current date, there will be several
    // we want to find the last one
    const futureBills = this._bills.filter((bill) => !bill.isOpen && bill.amortizationEntry.periodEndDate.isSameOrBefore(currentDate));
    if (futureBills.length === 0) {
      return undefined;
    }
    return futureBills[futureBills.length - 1];
  }

  set bills(value: Bill[]) {
    this.resetSummary();
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

  get pastDue(): Bill[] {
    return this._bills.filter((bill) => bill.isPastDue && !bill.isPaid);
  }

  get nextUpcomingBill(): Bill | undefined {
    const unpaidBills = this.unpaid;
    if (unpaidBills.length === 0) {
      return undefined;
    }
    return unpaidBills[0];
  }

  resetSummary() {
    this._summary = undefined;
  }

  calculateSummary(): BillsSummary {
    let remainingTotal = Currency.zero;
    let remainingFees = Currency.zero;
    let remainingPrincipal = Currency.zero;
    let remainingInterest = Currency.zero;
    let allocatedTotalSum = Currency.zero;
    let allocatedFeesSum = Currency.zero;
    let allocatedPrincipalSum = Currency.zero;
    let allocatedInterestSum = Currency.zero;
    let pastDueTotal = Currency.zero;
    let pastDuePrincipal = Currency.zero;
    let pastDueInterest = Currency.zero;
    let pastDueFees = Currency.zero;
    let dueTotal = Currency.zero;
    let duePrincipal = Currency.zero;
    let dueInterest = Currency.zero;
    let dueFees = Currency.zero;
    let billsPastDue = 0;
    let daysPastDue = 0;
    let remainingUnpaidBills = 0;
    let totalBillsCount = this._bills.length;

    this.all.forEach((bill) => {
      remainingTotal = remainingTotal.add(bill.remainingTotal);
      remainingFees = remainingFees.add(bill.remainingFees);
      remainingPrincipal = remainingPrincipal.add(bill.remainingPrincipal);
      remainingInterest = remainingInterest.add(bill.remainingInterest);
      if (!bill.isPaid) {
        remainingUnpaidBills++;
      }
      if (!bill.isPaid && bill.isOpen) {
        dueTotal = dueTotal.add(bill.totalDue);
        duePrincipal = duePrincipal.add(bill.principalDue);
        dueInterest = dueInterest.add(bill.interestDue);
        dueFees = dueFees.add(bill.feesDue);
      }
      allocatedTotalSum = allocatedTotalSum.add(bill.allocatedTotalSum);
      allocatedFeesSum = allocatedFeesSum.add(bill.allocatedFeesSum);
      allocatedPrincipalSum = allocatedPrincipalSum.add(bill.allocatedPrincipalSum);
      allocatedInterestSum = allocatedInterestSum.add(bill.allocatedInterestSum);
      if (bill.isPastDue && !bill.isPaid) {
        pastDueTotal = pastDueTotal.add(bill.remainingTotal);
        pastDuePrincipal = pastDuePrincipal.add(bill.remainingPrincipal);
        pastDueInterest = pastDueInterest.add(bill.remainingInterest);
        pastDueFees = pastDueFees.add(bill.remainingFees);
        billsPastDue++;
        // we want to capture a bill with the highest days past due
        daysPastDue = Math.max(daysPastDue, bill.daysPastDue);
      }
    });

    return {
      remainingTotal: remainingTotal,
      remainingFees: remainingFees,
      remainingPrincipal: remainingPrincipal,
      remainingInterest: remainingInterest,
      remainingUnpaidBills: remainingUnpaidBills,

      allocatedTotalSum: allocatedTotalSum,
      allocatedFeesSum: allocatedFeesSum,
      allocatedPrincipalSum: allocatedPrincipalSum,
      allocatedInterestSum: allocatedInterestSum,

      pastDueTotal: pastDueTotal,
      pastDuePrincipal: pastDuePrincipal,
      pastDueInterest: pastDueInterest,
      pastDueFees: pastDueFees,

      dueTotal: dueTotal,
      duePrincipal: duePrincipal,
      dueInterest: dueInterest,
      dueFees: dueFees,

      billsPastDue: billsPastDue,
      daysPastDue: daysPastDue,
      totalBillsCount: totalBillsCount,
    };
  }

  get summary(): BillsSummary {
    //  if (!this._summary) {
    this._summary = this.calculateSummary();
    // }
    return this._summary;
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

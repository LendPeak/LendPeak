  // Bill.ts
  import dayjs, { Dayjs } from "dayjs";
  import isBetween from "dayjs/plugin/isBetween";
  dayjs.extend(isBetween);
  import { Bill } from "./Bill";
  import { Currency } from "../utils/Currency";
  import { v4 as uuidv4 } from "uuid";
  import { DateUtil } from "../utils/DateUtil";
  import { Amortization } from "./Amortization";
  import { BillGenerator } from "./BillGenerator";

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

    private cacheSummary?: {
      results: BillsSummary;
      versionId: string;
      dateChanged: Dayjs;
    };
    private _versionId: string = uuidv4();
    private _dateChanged: Dayjs = dayjs();
    amortization?: Amortization;
    private _currentDate!: Dayjs;

    constructor(params: { bills?: Bill[]; currentDate?: Dayjs; amortization?: Amortization } = {}) {
      this.bills = params.bills || [];
      this.currentDate = params.currentDate || dayjs();
      if (params.amortization) {
        this.amortization = params.amortization;
        this.generateBills();
      }
    }

    generateBills() {
      console.log("generating bills");
      if (this.amortization) {
        const bills = BillGenerator.generateBills({
          amortizationSchedule: this.amortization.repaymentSchedule,
          currentDate: this.currentDate,
        });
        this.bills = bills.all;
      } else {
        console.info("No amortization schedule provided, bills will not be generated");
      }
    }

    regenerateBillsAfterDate(dateToRegenerateBillsAfter: Dayjs) {
      if (this.amortization) {
        const bills = BillGenerator.generateBills({
          amortizationSchedule: this.amortization.repaymentSchedule,
          currentDate: this.currentDate,
        });

        // now we have new bills generated, however
        // we need to preserve unmodified bills that are before the dateToRegenerateBillsAfter
        // so we will take this.bills and get all bills that were created before dateToRegenerateBillsAfter
        // add then to array, and then everything that is after dateToRegenerateBillsAfter
        // we will add from the new bills array
        const billsBeforeDate = this.bills.filter((bill) => bill.dueDate.isBefore(dateToRegenerateBillsAfter));
        const billsAfterDate = bills.all.filter((bill) => bill.dueDate.isAfter(dateToRegenerateBillsAfter));
        this.bills = billsBeforeDate.concat(billsAfterDate);
      } else {
        throw new Error("Cannot regenerate bills without an amortization schedule");
      }
    }

    get currentDate() {
      return this._currentDate;
    }

    set currentDate(value: Dayjs) {
      this._currentDate = DateUtil.normalizeDate(value);
    }

    get versionId(): string {
      return this._versionId;
    }

    get dateChanged(): Dayjs {
      return this._dateChanged;
    }

    versionChanged() {
      this._dateChanged = dayjs();
      this._versionId = uuidv4();
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

    /**
     * Return the earliest Bill whose amortizationEntry.periodEndDate is strictly after `currentDate`.
     * If none exist, returns undefined.
     */
    getFirstFutureBill(currentDate: Dayjs | Date = dayjs()): Bill | undefined {
      const refDate = DateUtil.normalizeDate(currentDate);

      // "Future" means the Bill’s periodEndDate is after currentDate.
      const futureBills = this._bills.filter((bill) => bill.amortizationEntry.periodEndDate.isAfter(refDate)).sort((a, b) => a.amortizationEntry.periodEndDate.diff(b.amortizationEntry.periodEndDate));

      return futureBills.length > 0 ? futureBills[0] : undefined;
    }

    updateStatus() {
      this._bills.forEach((bill) => bill.updateStatus());
    }

    set bills(value: Bill[]) {
      // check if the value is an array of Bill objects
      // if not, create a new Bill object from the value

      this._bills = value.map((c) => {
        if (c instanceof Bill) {
          c.bills = this;
          return c;
        }

        const bill = new Bill(c);
        bill.bills = this;
        return bill;
      });

      // sort bills from olders to newest
      this._bills = this._bills.sort((a, b) => a.period - b.period);
      this.versionChanged();
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

      const billSummaryResults: BillsSummary = {
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

      this.cacheSummary = {
        results: billSummaryResults,
        versionId: this.versionId,
        dateChanged: this.dateChanged,
      };

      return billSummaryResults;
    }

    get summary(): BillsSummary {
      if (this.cacheSummary) {
        if (this.cacheSummary.versionId !== this.versionId) {
          return this.calculateSummary();
        }
        if (!this.cacheSummary.dateChanged.isSame(this.dateChanged)) {
          return this.calculateSummary();
        }

        return this.cacheSummary.results;
      }

      return this.calculateSummary();
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
      bill.bills = this;
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

    printToConsole() {
      console.log("Bills:");
      console.table(
        this._bills.map((r) => {
          return {
            period: r.period,
            dueDate: r.dueDate.format("YYYY-MM-DD"),
            openDate: r.openDate.format("YYYY-MM-DD"),
            totalDue: r.totalDue.toNumber(),
            principalDue: r.principalDue.toNumber(),
            interestDue: r.interestDue.toNumber(),
            feesDue: r.feesDue.toNumber(),
            isPaid: r.isPaid,
            isPastDue: r.isPastDue,
            daysPastDue: r.daysPastDue,
          };
        })
      );
    }
  }

import { Currency, RoundingMethod } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { Amortization } from "./Amortization";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class AmortizationSummary {
  private amortization: Amortization;

  constructor(amortization: Amortization) {
    this.amortization = amortization;
  }
  /**
   * Computes a comprehensive LoanSummary object at a given snapshot date.
   */
  calculateLoanSummaryAsOfDate(date?: Dayjs | Date | string) {
    if (!date) {
      console.log("No date provided, using today's date");
      console.trace("Stack Trace");
      date = dayjs();
    } else {
      date = dayjs(date);
    }
    // total terms = this.term
    const totalTerms = this.amortization.term;

    // Determine how many terms have been fully paid
    // A fully paid term is one where the billable period entries sum up to principal + interest paid
    // For simplicity, count terms as completed if periodEndDate < date
    const completedTerms = this.amortization.repaymentSchedule.entries.filter((e) => e.billablePeriod && e.periodEndDate.isBefore(date, "day")).map((e) => e.term);
    const maxCompletedTerm = completedTerms.length > 0 ? Math.max(...completedTerms) : 0;
    const remainingTerms = totalTerms - maxCompletedTerm;

    // Next bill date: the end date of the next unpaid period
    const nextTermEntry = this.amortization.repaymentSchedule.entries.find((e) => e.term === maxCompletedTerm + 1 && e.billablePeriod);
    const nextBillDate = nextTermEntry ? nextTermEntry.periodBillDueDate.toDate() : undefined;

    // Paid principal to date and paid interest to date
    // Sum all principal and interest paid in periods fully before 'date'
    let paidPrincipalToDate = Currency.Zero();
    let paidInterestToDate = Currency.Zero();
    let lastPaymentDate: Date | undefined = undefined;
    let lastPaymentAmount = Currency.Zero();

    // Iterate through all fully-paid periods
    for (const entry of this.amortization.repaymentSchedule.entries) {
      if (entry.billablePeriod && entry.periodEndDate.isBefore(date, "day")) {
        paidPrincipalToDate = paidPrincipalToDate.add(entry.principal);
        // accruedInterestForPeriod is the interest charged this period
        paidInterestToDate = paidInterestToDate.add(entry.accruedInterestForPeriod);
        // lastPayment info
        if (!lastPaymentDate || entry.periodEndDate.isAfter(dayjs(lastPaymentDate))) {
          lastPaymentDate = entry.periodEndDate.toDate();
          lastPaymentAmount = entry.totalPayment;
        }
      }
    }

    // Remaining Principal = last period that ended before 'date' endBalance of that period,
    // or if date is mid-period use activePeriod startBalance minus principal if any partial calculation done
    // For simplicity, use the active period's startBalance as remaining principal approximation
    const activePeriod = this.amortization.repaymentSchedule.getPeriodByDate(date) || this.amortization.repaymentSchedule.lastEntry;
    const remainingPrincipal = activePeriod.startBalance;

    const accruedInterestToDate = this.amortization.getAccruedInterestToDate(date);
    const projectedFutureInterest = this.amortization.repaymentSchedule.getProjectedFutureInterest(date);
    const currentPayoffAmount = this.amortization.getCurrentPayoffAmount(date);

    return {
      totalTerms: totalTerms,
      remainingTerms: remainingTerms,
      nextBillDate: nextBillDate,
      paidPrincipalToDate: paidPrincipalToDate,
      paidInterestToDate: paidInterestToDate,
      lastPaymentDate: lastPaymentDate,
      lastPaymentAmount: lastPaymentAmount,
      remainingPrincipal: remainingPrincipal,
      currentPayoffAmount: currentPayoffAmount,
      accruedInterestToDate: accruedInterestToDate,
      projectedFutureInterest: projectedFutureInterest,
    };
  }
}

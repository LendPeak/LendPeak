import { Currency } from "../utils/Currency";
import { Amortization } from "./Amortization";
import { LocalDate } from "@js-joda/core";
import { DateUtil } from "../utils/DateUtil";

export class AmortizationSummary {
  private amortization: Amortization;

  constructor(amortization: Amortization) {
    this.amortization = amortization;
  }

  /**
   * Computes a comprehensive LoanSummary object at a given snapshot date.
   */
  calculateLoanSummaryAsOfDate(date?: LocalDate | Date | string) {
    // Normalize provided date
    let snapshotDate: LocalDate;

    if (!date) {
      console.log("No date provided, using today's date");
      snapshotDate = LocalDate.now();
    } else {
      snapshotDate = DateUtil.normalizeDate(date);
    }

    const totalTerms = this.amortization.term;

    // Determine completed terms (billable periods with periodEndDate strictly before snapshotDate)
    const completedEntries = this.amortization.repaymentSchedule.entries.filter((e) => e.billablePeriod && e.periodEndDate.isBefore(snapshotDate));
    const completedTerms = completedEntries.map((e) => e.term);
    const maxCompletedTerm = completedTerms.length > 0 ? Math.max(...completedTerms) : 0;
    const remainingTerms = totalTerms - maxCompletedTerm;

    // Next bill date: due date of the next unpaid period after snapshotDate
    const nextTermEntry = this.amortization.repaymentSchedule.entries.find((e) => e.billablePeriod && e.term === maxCompletedTerm + 1);
    const nextBillDate = nextTermEntry ? DateUtil.normalizeDateToJsDate(nextTermEntry.periodBillDueDate) : undefined;

    // Paid principal and interest up to snapshotDate
    let paidPrincipalToDate = Currency.Zero();
    let paidInterestToDate = Currency.Zero();
    let lastPaymentDate: Date | undefined = undefined;
    let lastPaymentAmount = Currency.Zero();

    completedEntries.forEach((entry) => {
      paidPrincipalToDate = paidPrincipalToDate.add(entry.principal);
      paidInterestToDate = paidInterestToDate.add(entry.accruedInterestForPeriod);

      if (!lastPaymentDate || entry.periodEndDate.isAfter(DateUtil.normalizeDate(lastPaymentDate))) {
        lastPaymentDate = DateUtil.normalizeDateToJsDate(entry.periodEndDate);
        lastPaymentAmount = entry.totalPayment;
      }
    });

    // Remaining principal: startBalance of active period
    const activePeriod = this.amortization.repaymentSchedule.getPeriodByDate(snapshotDate);
    const remainingPrincipal = activePeriod ? activePeriod.startBalance : Currency.Zero();

    const accruedInterestToDate = this.amortization.getAccruedInterestToDate(snapshotDate);
    const projectedFutureInterest = this.amortization.repaymentSchedule.getProjectedFutureInterest(snapshotDate);
    const currentPayoffAmount = this.amortization.getCurrentPayoffAmount(snapshotDate);

    return {
      totalTerms,
      remainingTerms,
      nextBillDate,
      paidPrincipalToDate,
      paidInterestToDate,
      lastPaymentDate,
      lastPaymentAmount,
      remainingPrincipal,
      currentPayoffAmount,
      accruedInterestToDate,
      projectedFutureInterest,
    };
  }
}

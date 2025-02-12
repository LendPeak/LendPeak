// AmortizationExplainer.ts
import { AmortizationParams, Amortization } from "./Amortization";
import { CalendarType } from "./Calendar";
import { RoundingMethod } from "../utils/Currency";
import { FlushUnbilledInterestDueToRoundingErrorType } from "./Amortization";
import Decimal from "decimal.js";
import { AmortizationEntries } from "./Amortization/AmortizationEntries";
import { PerDiemCalculationType } from "./InterestCalculator";

export class AmortizationExplainer {
  private amortization: Amortization;
  private schedule: AmortizationEntries;

  constructor(amortization: Amortization) {
    this.amortization = amortization;
    this.schedule = this.amortization.getRepaymentSchedule();
  }

  getLoanOverview(): string {
    let result = `Loan Overview:\n`;
    result += `- Principal: ${this.amortization.loanAmount.toCurrencyString()}\n`;
    result += `- Term: ${this.amortization.term} periods\n`;
    const annualRatePercent = this.amortization.annualInterestRate.mul(100).toFixed(2);
    result += `- Annual Interest Rate: ${annualRatePercent}%\n`;

    if (this.amortization.originationFee && !this.amortization.originationFee.isZero()) {
      result += `- Origination Fee: ${this.amortization.originationFee.toCurrencyString()}\n`;
    }

    result += `- Billing Model: ${this.amortization.billingModel === "dailySimpleInterest" ? "Daily Simple Interest" : "Amortized"}\n`;
    return result;
  }

  getCalendarExplanation(): string {
    const params = this.amortization;
    let explanation = `Calendar and Day Counting:\n`;
    explanation += `- Calendar Type: ${this.amortization.calendar.calendarType}.\n`;
    explanation += `  This defines how days between dates are counted.\n`;

    explanation += `- Per Diem Calculation: ${params.perDiemCalculationType}\n`;
    if (params.perDiemCalculationType === "AnnualRateDividedByDaysInYear") {
      explanation += `  Interest is calculated by dividing the annual rate by the number of days in the year.\n`;
    } else if (params.perDiemCalculationType === "MonthlyRateDividedByDaysInMonth") {
      explanation += `  Interest is calculated by dividing the monthly rate by the number of days in that month.\n`;
    }

    return explanation;
  }

  getManualModificationsExplanation(): string {
    const params = this.amortization;
    let explanation = `Manual Modifications:\n`;

    if (params.balanceModifications && params.balanceModifications.length > 0) {
      explanation += `- Balance Modifications: ${params.balanceModifications.length} modifications adjust the principal mid-term.\n`;
    } else {
      explanation += `- No Balance Modifications.\n`;
    }

    if (params.termInterestAmountOverride && params.termInterestAmountOverride.length > 0) {
      explanation += `- Static Interest Overrides: Some terms have a predefined interest amount, overriding normal calculation.\n`;
    } else {
      explanation += `- No Static Interest Overrides.\n`;
    }

    if (params.changePaymentDates && params.changePaymentDates.length > 0) {
      explanation += `- Payment Date Changes: Some terms have custom due dates, affecting term length and interest.\n`;
    } else {
      explanation += `- No Payment Date Changes.\n`;
    }

    return explanation;
  }

  getInterestCalculationExplanation(): string {
    const params = this.amortization;
    let explanation = `Interest Calculation and Rounding:\n`;
    explanation += `- Interest is computed based on the calendar and annual rate.\n`;

    explanation += `- Rounding Method: ${this.amortization.roundingMethod}.\n`;
    explanation += `  This method is used to round interest and other financial values.\n`;

    explanation += `- Unbilled Interest Due to Rounding: `;
    if (params.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.NONE) {
      explanation += `No flushing is performed.\n`;
    } else if (params.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_END) {
      explanation += `Accumulated differences are applied at the end of the schedule.\n`;
    } else if (params.flushUnbilledInterestRoundingErrorMethod === FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD) {
      explanation += `Differences are applied when they exceed a certain threshold.\n`;
    }

    return explanation;
  }

  getFeesExplanation(): string {
    const params = this.amortization;
    let explanation = `Fees Explanation:\n`;

    const hasFees = (params.feesForAllTerms && params.feesForAllTerms.length > 0) || (params.feesPerTerm && params.feesPerTerm.length > 0);

    if (hasFees) {
      explanation += `- Fees may apply each term or globally. Fees can be fixed or percentage-based (on interest, principal, or total payment).\n`;
    } else {
      explanation += `- No fees applied.\n`;
    }

    return explanation;
  }

  getTermByTermExplanation(): string {
    let explanation = `Term-by-Term Breakdown:\n`;
    for (const entry of this.schedule.entries) {
      explanation += `Term ${entry.term}:\n`;
      explanation += `  Period: ${entry.periodStartDate.format("YYYY-MM-DD")} to ${entry.periodEndDate.format("YYYY-MM-DD")}\n`;
      explanation += `  Start Balance: ${entry.startBalance.toCurrencyString()} | End Balance: ${entry.endBalance.toCurrencyString()}\n`;
      explanation += `  Interest: ${entry.accruedInterestForPeriod.toCurrencyString()}, Principal: ${entry.principal.toCurrencyString()}, Fees: ${entry.fees.toCurrencyString()}\n`;
      explanation += `  Payment: ${entry.totalPayment.toCurrencyString()}\n`;

      if (entry.metadata.staticInterestOverrideApplied) {
        explanation += `  *Static interest override applied.\n`;
      }
      if (entry.metadata.splitInterestPeriod) {
        explanation += `  *Interest split due to varying conditions in the period.\n`;
      }
      if (entry.metadata.finalAdjustment) {
        explanation += `  *Final adjustment made to fully settle the loan.\n`;
      }
      explanation += "\n";
    }
    return explanation;
  }

  getFullExplanation(): string {
    let full = this.getLoanOverview() + "\n";
    full += this.getCalendarExplanation() + "\n";
    full += this.getManualModificationsExplanation() + "\n";
    full += this.getInterestCalculationExplanation() + "\n";
    full += this.getFeesExplanation() + "\n";
    full += this.getTermByTermExplanation() + "\n";
    return full;
  }
}

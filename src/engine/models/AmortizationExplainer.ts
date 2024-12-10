// AmortizationExplainer.ts
import { AmortizationParams, Amortization } from "./Amortization";
import { CalendarType } from "./Calendar";
import { RoundingMethod } from "../utils/Currency";
import { FlushUnbilledInterestDueToRoundingErrorType } from "./Amortization";
import Decimal from "decimal.js";
import { AmortizationEntry } from "./Amortization/AmortizationEntry";
import { PerDiemCalculationType } from "./InterestCalculator";

export class AmortizationExplainer {
  private amortization: Amortization;
  private params: AmortizationParams;
  private schedule: AmortizationEntry[];

  constructor(amortization: Amortization) {
    this.amortization = amortization;
    this.params = this.amortization.getInputParams();
    this.schedule = this.amortization.getRepaymentSchedule();
  }

  getLoanOverview(): string {
    const params = this.params;
    let result = `Loan Overview:\n`;
    result += `- Principal: ${params.loanAmount.toCurrencyString()}\n`;
    result += `- Term: ${params.term} periods\n`;
    const annualRatePercent = params.annualInterestRate.mul(100).toFixed(2);
    result += `- Annual Interest Rate: ${annualRatePercent}%\n`;

    if (params.originationFee && !params.originationFee.isZero()) {
      result += `- Origination Fee: ${params.originationFee.toCurrencyString()}\n`;
    }

    result += `- Billing Model: ${params.billingModel === "dailySimpleInterest" ? "Daily Simple Interest" : "Amortized"}\n`;
    return result;
  }

  getCalendarExplanation(): string {
    const params = this.params;
    let explanation = `Calendar and Day Counting:\n`;
    explanation += `- Calendar Type: ${CalendarType[params.calendarType!]}.\n`;
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
    const params = this.params;
    let explanation = `Manual Modifications:\n`;

    if (params.balanceModifications && params.balanceModifications.length > 0) {
      explanation += `- Balance Modifications: ${params.balanceModifications.length} modifications adjust the principal mid-term.\n`;
    } else {
      explanation += `- No Balance Modifications.\n`;
    }

    if (params.termInterestOverride && params.termInterestOverride.length > 0) {
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
    const params = this.params;
    let explanation = `Interest Calculation and Rounding:\n`;
    explanation += `- Interest is computed based on the calendar and annual rate.\n`;

    explanation += `- Rounding Method: ${RoundingMethod[params.roundingMethod!]}.\n`;
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
    const params = this.params;
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
    for (const entry of this.schedule) {
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

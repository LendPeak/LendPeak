// AmortizationExplainer.ts

import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "./Amortization";
import { CalendarType } from "./Calendar";
import { RoundingMethod } from "../utils/Currency";
import Decimal from "decimal.js";
import { AmortizationEntries } from "./Amortization/AmortizationEntries";
import { PerDiemCalculationType } from "./InterestCalculator";

/**
 * Helper to get a friendly label + short explanation for the calendar type.
 */
function getCalendarTypeLabelAndExplanation(type: CalendarType): { label: string; explanation: string } {
  switch (type) {
    case CalendarType.ACTUAL_ACTUAL:
      return {
        label: "Actual/Actual",
        explanation: "Calculates interest using actual days between dates and an actual number of days per year.",
      };
    case CalendarType.ACTUAL_360:
      return {
        label: "Actual/360",
        explanation: "Uses actual days between dates but scales calculations to a 360-day year.",
      };
    case CalendarType.ACTUAL_365:
      return {
        label: "Actual/365",
        explanation: "Uses actual days between dates and assumes a 365-day year for interest accrual.",
      };
    case CalendarType.THIRTY_360:
      return {
        label: "30/360",
        explanation: "Assumes 30 days per month and a 360-day year for calculation simplicity.",
      };
    case CalendarType.THIRTY_ACTUAL:
      return {
        label: "30/Actual",
        explanation: "Uses 30 days for months but actual days in the year (365).",
      };
    default:
      // Fallback
      return {
        label: `Unknown (${type})`,
        explanation: "No explanation available.",
      };
  }
}

/**
 * Helper to get a friendly label + short explanation for how daily interest is derived.
 */
function getPerDiemCalculationLabelAndExplanation(type: PerDiemCalculationType): { label: string; explanation: string } {
  switch (type) {
    case "AnnualRateDividedByDaysInYear":
      return {
        label: "Annual Rate / Days in Year",
        explanation: "A consistent daily rate: (Annual Rate) / (365 or 360, depending on calendar).",
      };
    case "MonthlyRateDividedByDaysInMonth":
      return {
        label: "Monthly Rate / Days in Month",
        explanation: "Divides the annual rate by 12 for a monthly rate, then divides by the exact days in that month. The effective daily rate varies each month.",
      };
    default:
      // Fallback or additional cases if you have more
      return {
        label: type,
        explanation: "No additional explanation provided.",
      };
  }
}

/**
 * Helper to get a friendly label + short explanation for rounding methods.
 */
function getRoundingMethodLabelAndExplanation(method: RoundingMethod): { label: string; explanation: string } {
  switch (method) {
    case RoundingMethod.ROUND_UP:
      return { label: "Round Up", explanation: "Always rounds fractional cent amounts up." };
    case RoundingMethod.ROUND_DOWN:
      return { label: "Round Down", explanation: "Always rounds fractional cent amounts down." };
    case RoundingMethod.ROUND_HALF_UP:
      return { label: "Round Half Up", explanation: "Rounds .5 and above up, below .5 down." };
    case RoundingMethod.ROUND_HALF_DOWN:
      return { label: "Round Half Down", explanation: "Rounds .5 and above down, below .5 up." };
    case RoundingMethod.ROUND_HALF_EVEN:
      return {
        label: "Round Half to Even (Banker's Rounding)",
        explanation: "Rounds .5 to the nearest even digit, reducing bias.",
      };
    case RoundingMethod.ROUND_HALF_CEIL:
      return { label: "Round Half Ceiling", explanation: "Rounds .5 and above up, otherwise down." };
    case RoundingMethod.ROUND_HALF_FLOOR:
      return { label: "Round Half Floor", explanation: "Rounds .5 and above down, otherwise up." };
    default:
      return { label: `Unknown (${method})`, explanation: "No explanation available." };
  }
}

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
    const calInfo = getCalendarTypeLabelAndExplanation(this.amortization.calendar.calendarType);
    const perDiemInfo = getPerDiemCalculationLabelAndExplanation(this.amortization.perDiemCalculationType);

    let explanation = `Calendar and Day Counting:\n`;
    explanation += `- Calendar Type: ${calInfo.label}\n`;
    explanation += `  ${calInfo.explanation}\n\n`;

    explanation += `- Per Diem Calculation: ${perDiemInfo.label}\n`;
    explanation += `  ${perDiemInfo.explanation}\n`;

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

    const roundingInfo = getRoundingMethodLabelAndExplanation(params.roundingMethod);
    explanation += `- Rounding Method: ${roundingInfo.label}\n`;
    explanation += `  ${roundingInfo.explanation}\n\n`;

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
      explanation += `- Fees may apply each term or globally. Fees can be fixed or percentage-based.\n`;
      explanation += `  Fee percentages can be based on principal, interest, or total payment.\n`;
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

      // Metadata indicators
      if (entry.metadata.staticInterestOverrideApplied) {
        explanation += `  *Static interest override applied.\n`;
      }
      if (entry.metadata.splitInterestPeriod) {
        explanation += `  *Interest split into multiple segments in this period.\n`;
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

import { Currency } from "../utils/Currency";

export interface ActualLoanSummary {
  nextBillDate?: Date;
  actualPrincipalPaid: Currency;
  actualInterestPaid: Currency;
  lastPaymentDate?: Date;
  lastPaymentAmount: Currency;
  actualRemainingPrincipal: Currency;
  actualCurrentPayoff: Currency;
}

export interface PastDueSummary {
  pastDueCount: number;
  totalPastDuePrincipal: Currency;
  totalPastDueInterest: Currency;
  totalPastDueFees: Currency;
  totalPastDueAmount: Currency;
  daysContractIsPastDue: number;
}

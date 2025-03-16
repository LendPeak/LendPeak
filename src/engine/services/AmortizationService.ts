import { Loan } from "../models/Loan";
import { Amortization } from "../models/Amortization";
import { TermCalendars } from "../models/TermCalendars";

export class AmortizationService {
  static createAmortizationSchedule(loan: Loan): Amortization {
    const amortization = new Amortization({
      loanAmount: loan.loanAmount,
      annualInterestRate: loan.interestRate,
      term: loan.term,
      startDate: loan.startDate,
      calendars: new TermCalendars({ primary: loan.calendarType || "THIRTY_360" }),
    });
    return amortization;
  }
}

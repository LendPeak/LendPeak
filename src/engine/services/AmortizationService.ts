import { Loan } from "../models/Loan";
import { Amortization } from "../models/Amortization";

export class AmortizationService {
  static createAmortizationSchedule(loan: Loan): Amortization {
    const amortization = new Amortization({ loanAmount: loan.loanAmount, annualInterestRate: loan.interestRate, term: loan.term, startDate: loan.startDate, calendarType: loan.calendarType });
    return amortization;
  }
}

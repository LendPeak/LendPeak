import { Loan } from "../models/Loan";
import { Amortization } from "../models/Amortization";

export class AmortizationService {
  static createAmortizationSchedule(loan: Loan): Amortization {
    const amortization = new Amortization(loan.loanAmount, loan.interestRate, loan.term, loan.startDate, loan.calendarType);
    return amortization;
  }
}

import { Loan } from "../models/Loan";
import { Restructure, RestructureService } from "../models/Restructure";

export class LoanRestructureService {
  static applyRestructureToLoan(loan: Loan, restructure: Restructure): Loan {
    return RestructureService.applyRestructure(loan, restructure);
  }
}

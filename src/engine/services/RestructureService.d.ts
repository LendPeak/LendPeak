import { Loan } from "../models/Loan";
import { Restructure } from "../models/Restructure";
export declare class LoanRestructureService {
    static applyRestructureToLoan(loan: Loan, restructure: Restructure): Loan;
}

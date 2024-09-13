import { Loan } from "../models/Loan";
import { Amortization } from "../models/Amortization";
export declare class AmortizationService {
    static createAmortizationSchedule(loan: Loan): Amortization;
}

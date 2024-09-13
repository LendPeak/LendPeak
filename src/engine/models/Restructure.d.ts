import { Loan } from "./Loan";
export interface Restructure {
    type: "rateModification" | "termExtension" | "paymentReduction" | "rateSuspension";
    details: any;
}
export declare class RestructureService {
    static applyRestructure(loan: Loan, restructure: Restructure): Loan;
    private static modifyRate;
    private static extendTerm;
    private static reducePayment;
    private static suspendRate;
}

import { Loan } from "./Loan";
import { Currency } from "@utils/Currency";

export interface Restructure {
  type: "rateModification" | "termExtension" | "paymentReduction" | "rateSuspension";
  details: any;
}

export class RestructureService {
  static applyRestructure(loan: Loan, restructure: Restructure): Loan {
    switch (restructure.type) {
      case "rateModification":
        return this.modifyRate(loan, restructure.details.newRate);
      case "termExtension":
        return this.extendTerm(loan, restructure.details.additionalMonths);
      case "paymentReduction":
        return this.reducePayment(loan, restructure.details.reductionAmount);
      case "rateSuspension":
        return this.suspendRate(loan, restructure.details.suspensionMonths);
      default:
        throw new Error("Invalid restructure type");
    }
  }

  private static modifyRate(loan: Loan, newRate: number): Loan {
    return { ...loan, interestRate: newRate };
  }

  private static extendTerm(loan: Loan, additionalMonths: number): Loan {
    return { ...loan, term: loan.term + additionalMonths };
  }

  private static reducePayment(loan: Loan, reductionAmount: Currency): Loan {
    return { ...loan, loanAmount: loan.loanAmount.subtract(reductionAmount) };
  }

  private static suspendRate(loan: Loan, suspensionMonths: number): Loan {
    // Example logic: Suspend rate for specific months
    // This could include more complex logic depending on requirements
    return loan;
  }
}

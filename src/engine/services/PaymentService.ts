import { Payment } from "../models/Payment";
import { Loan } from "../models/Loan";

export class PaymentService {
  static processPayment(loan: Loan, payment: Payment): Loan {
    // Logic to process payment, reduce principal, etc.
    return loan;
  }
}

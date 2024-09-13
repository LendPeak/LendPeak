import { Payment } from "../models/Payment";
import { Loan } from "../models/Loan";
export declare class PaymentService {
    static processPayment(loan: Loan, payment: Payment): Loan;
}

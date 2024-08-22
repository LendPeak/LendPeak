import { Payment } from "./models/Payment";
import { Loan } from "./models/Loan";
import { AmortizationService } from "./services/AmortizationService";
import { LoanRestructureService } from "./services/RestructureService";
import { PaymentService } from "./services/PaymentService";
import { Restructure } from "./models/Restructure";
import dayjs from "dayjs";

// Extend the dayjs prototype
dayjs.prototype.toJSON = function () {
  return this.toISOString(); // Convert dayjs object to ISO string
};

const loan: Loan = {
  id: "loan1",
  loanAmount: 100000,
  interestRate: 0.05,
  term: 360,
  startDate: dayjs("2024-01-01"),
};

// Generate Amortization Schedule
const amortization = AmortizationService.createAmortizationSchedule(loan);
console.log(amortization.generateSchedule());

// Apply Loan Restructure
const restructure: Restructure = {
  type: "rateModification",
  details: { newRate: 0.03 },
};

const restructuredLoan = LoanRestructureService.applyRestructureToLoan(loan, restructure);
console.log(restructuredLoan);

// Process Payment
const payment: Payment = {
  amount: 5000,
  paymentDate: dayjs(),
  type: "prepayment",
};

const updatedLoan = PaymentService.processPayment(restructuredLoan, payment);
console.log(updatedLoan);

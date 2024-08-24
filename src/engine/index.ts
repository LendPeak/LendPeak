import { Payment } from "./models/Payment";
import { Loan } from "./models/Loan";
import { AmortizationService } from "./services/AmortizationService";
import { LoanRestructureService } from "./services/RestructureService";
import { PaymentService } from "./services/PaymentService";
import { Restructure } from "./models/Restructure";
import dayjs from "dayjs";
import { Currency } from "./utils/Currency";
import { CalendarType } from "./models/Calendar";

const loan: Loan = {
  id: "loan1",
  loanAmount: Currency.of(1000),
  interestRate: 0.26,
  term: 12,
  startDate: dayjs("2024-01-01"),
  calendarType: CalendarType.THIRTY_360,
};

// Generate Amortization Schedule
const amortization = AmortizationService.createAmortizationSchedule(loan);
amortization.printAmortizationSchedule();

// Apply Loan Restructure
const restructure: Restructure = {
  type: "rateModification",
  details: { newRate: 0.03 },
};

const restructuredLoan = LoanRestructureService.applyRestructureToLoan(loan, restructure);
//console.log(restructuredLoan);

// Process Payment
const payment: Payment = {
  amount: 5000,
  paymentDate: dayjs(),
  type: "prepayment",
};

const updatedLoan = PaymentService.processPayment(restructuredLoan, payment);
//console.log(updatedLoan);

import { Payment } from "./models/Payment";
import { Loan } from "./models/Loan";
import { AmortizationService } from "./services/AmortizationService";
import { LoanRestructureService } from "./services/RestructureService";
import { PaymentService } from "./services/PaymentService";
import { Restructure } from "./models/Restructure";
import dayjs from "dayjs";
import { Currency } from "./utils/Currency";
import { CalendarType } from "./models/Calendar";

const loanAmount = Currency.of(1); // 1 unit of currency
const interestRate = 0.05; // 5% annual interest rate
const term = 12; // 12 months
const startDate = dayjs("2023-01-01");

const loan: Loan = {
  id: "loan1",
  loanAmount: loanAmount,
  interestRate: interestRate,
  term: term,
  startDate: startDate,
  // calendarType: CalendarType.THIRTY_360,
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

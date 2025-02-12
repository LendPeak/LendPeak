import { Payment } from "./models/Payment";
import { Loan } from "./models/Loan";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "./models/Amortization";
import { BalanceModification } from "./models/Amortization/BalanceModification";
import { BalanceModifications } from "./models/Amortization/BalanceModifications";
import { LoanRestructureService } from "./services/RestructureService";
import { PaymentService } from "./services/PaymentService";
import { Restructure } from "./models/Restructure";
import dayjs from "dayjs";
import { Currency, RoundingMethod } from "./utils/Currency";
import { CalendarType } from "./models/Calendar";
import Decimal from "decimal.js";
import { TermPaymentAmounts } from "@models/TermPaymentAmounts";

// const loanAmount = Currency.of(1); // 1 unit of currency
// const interestRate = 0.05; // 5% annual interest rate
// const term = 12; // 12 months
// const startDate = dayjs("2023-01-01");

const loanAmount = Currency.of(10000); // 1 unit of currency
const interestRate = new Decimal(0.1); // 5% annual interest rate
const term = 12; // 12 months
const startDate = dayjs("2024-09-13");

const loan: Loan = {
  id: "loan1",
  loanAmount: loanAmount,
  interestRate: interestRate,
  term: term,
  startDate: startDate,
  // calendarType: CalendarType.THIRTY_360,
};

// Instantiate Amortization class
const amortization = new Amortization({
  loanAmount: loanAmount,
  annualInterestRate: interestRate,
  term: term,
  startDate: startDate,
  //calendarType: CalendarType.ACTUAL_ACTUAL,
  calendarType: CalendarType.THIRTY_360,
  //roundingMethod: RoundingMethod.ROUND_HALF_EVEN,
  flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.NONE,
  termPaymentAmountOverride: new TermPaymentAmounts([
    // {
    //   paymentAmount: Currency.of(0),
    //   termNumber: 1,
    // },
  ]),

  balanceModifications: new BalanceModifications([
    new BalanceModification({
      amount: 0,
      date: startDate,
      type: "decrease",
    }),
    // {
    //   amount: Currency.of(1000),
    //   date: dayjs("2024-09-25"),
    //   type: "decrease",
    // },
  ]),
  // flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD,
  // roundingPrecision: 2, // 5 decimal places
  //flushThreshold: Currency.of(0.01), // 1 cent threshold
  // ratesSchedule: [
  //   {
  //     startDate: startDate,
  //     endDate: startDate.add(10, "days"),
  //     annualInterestRate: new Decimal(0.25),
  //   },
  //   {
  //     startDate: startDate.add(10, "days"),
  //     endDate: startDate.add(1, "month"),
  //     annualInterestRate: new Decimal(0.18),
  //   },
  //   // {
  //   //   startDate: startDate.add(1, "month"),
  //   //   endDate: startDate.add(term, "month"),
  //   //   annualInterestRate: interestRate,
  //   // },
  // ],
  // ratesSchedule: [
  //   { startDate: dayjs("2024-09-13"), endDate: dayjs("2024-10-13"), annualInterestRate: new Decimal(0.12) },
  //{ annualInterestRate: "0.1", startDate: "2024-10-14T02:26:21.870Z", endDate: "2025-09-14T02:26:14.078Z" },
  // ],
});

// Generate and print Amortization Schedule
//amortization.printAmortizationSchedule();
amortization.printShortAmortizationSchedule();

// amortization.generateSchedule();

// console.log(amortization.apr);

// // Apply Loan Restructure
// const restructure: Restructure = {
//   type: "rateModification",
//   details: { newRate: 0.03 },
// };

// const restructuredLoan = LoanRestructureService.applyRestructureToLoan(loan, restructure);
// //console.log(restructuredLoan);

// // Process Payment
// const payment: Payment = {
//   amount: 5000,
//   paymentDate: dayjs(),
//   type: "prepayment",
// };

// const updatedLoan = PaymentService.processPayment(restructuredLoan, payment);
//console.log(updatedLoan);

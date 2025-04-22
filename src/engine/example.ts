import { Currency, RoundingMethod } from "./utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "./models/Amortization";
import { ChangePaymentDate } from "./models/ChangePaymentDate";
import { CalendarType } from "./models/Calendar";
import Decimal from "decimal.js";
import { LocalDate } from "@js-joda/core";

const loanAmount = Currency.of(1000);
const interestRate = new Decimal(0.05); // 5% annual interest rate
const term = 12; // 12 months
const startDate = LocalDate.parse("2023-01-01");

const amortization = new Amortization({
  loanAmount: loanAmount,
  annualInterestRate: interestRate,
  term: term,
  startDate: startDate,
});
amortization.printShortAmortizationSchedule();
console.log("current term coumnt", amortization.term);
console.log("end date", amortization.endDate.toString());
amortization.term = 24;
console.log("end date after 24 terms", amortization.endDate.toString());
console.log("current term coumnt", amortization.term);
amortization.printShortAmortizationSchedule();

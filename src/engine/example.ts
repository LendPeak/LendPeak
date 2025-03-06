import dayjs from "dayjs";
import { Currency, RoundingMethod } from "./utils/Currency";
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from "./models/Amortization";
import { ChangePaymentDate } from "./models/ChangePaymentDate";
import { CalendarType } from "./models/Calendar";
import Decimal from "decimal.js";

const loanAmount = Currency.of(1000);
const interestRate = new Decimal(0.05); // 5% annual interest rate
const term = 12; // 12 months
const startDate = dayjs("2023-01-01");

const amortization = new Amortization({
  loanAmount: loanAmount,
  annualInterestRate: interestRate,
  term: term,
  startDate: startDate,
});
amortization.printShortAmortizationSchedule();
console.log("current term coumnt", amortization.term);
console.log("end date", amortization.endDate.format("YYYY-MM-DD"));
amortization.term = 24;
console.log("end date after 24 terms", amortization.endDate.format("YYYY-MM-DD"));
console.log("current term coumnt", amortization.term);
amortization.printShortAmortizationSchedule();

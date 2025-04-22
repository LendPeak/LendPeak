import { Currency } from "@utils/Currency";
import { CalendarType } from "./Calendar";
import Decimal from "decimal.js";
import { LocalDate } from "@js-joda/core";

export interface Loan {
  id: string;
  loanAmount: Currency;
  interestRate: Decimal;
  term: number;
  startDate: LocalDate;
  calendarType?: CalendarType;
}

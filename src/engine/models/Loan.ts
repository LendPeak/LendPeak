import dayjs, { Dayjs } from "dayjs";
import { Currency } from "@utils/Currency";
import { CalendarType } from "./Calendar";
import Decimal from "decimal.js";

export interface Loan {
  id: string;
  loanAmount: Currency;
  interestRate: Decimal;
  term: number;
  startDate: Dayjs;
  calendarType?: CalendarType;
}

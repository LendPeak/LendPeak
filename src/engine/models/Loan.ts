import dayjs, { Dayjs } from "dayjs";
import { Currency } from "@utils/Currency";
import { CalendarType } from "./Calendar";

export interface Loan {
  id: string;
  loanAmount: Currency;
  interestRate: number;
  term: number;
  startDate: Dayjs;
  calendarType?: CalendarType;
}

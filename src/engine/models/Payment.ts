import { Dayjs } from "dayjs";
export interface Payment {
  amount: number;
  paymentDate: Dayjs;
  type: "regular" | "prepayment" | "balloon";
}

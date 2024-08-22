import dayjs, { Dayjs } from "dayjs";

// Extend the dayjs prototype
dayjs.prototype.toJSON = function () {
  return this.toISOString(); // Convert dayjs object to ISO string
};

export interface Loan {
  id: string;
  loanAmount: number;
  interestRate: number;
  term: number;
  startDate: Dayjs;
}

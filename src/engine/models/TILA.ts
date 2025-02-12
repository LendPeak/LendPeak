import { Currency, RoundingMethod } from "../utils/Currency";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { Amortization } from "./Amortization";
import Decimal from "decimal.js";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

/**
 * Interface representing each entry in the payment schedule.
 */
export interface PaymentScheduleEntry {
  paymentNumber: number;
  paymentDate: Dayjs;
  paymentAmount: Currency;
  principal: Currency;
  interest: Currency;
  balance: Currency;
}

export class TILA {
  private amortization: Amortization;

  constructor(amortization: Amortization) {
    this.amortization = amortization;
  }

  /**
   * Generates the TILA disclosures for the loan.
   * @returns An object containing all the TILA-required fields.
   */
  generateTILADisclosures() {
    // Ensure the amortization schedule is generated
    const schedule = this.amortization.repaymentSchedule;

    if (schedule.length === 0) {
      throw new Error("Amortization schedule is empty. Please generate the amortization schedule before generating TILA disclosures.");
    }

    // Amount Financed: The net amount of credit provided to the borrower
    const amountFinanced = this.amortization.loanAmount.subtract(this.amortization.originationFee);

    // Total of Payments: The total amount the borrower will have paid after making all scheduled payments
    const totalOfPayments = schedule.entries.reduce((sum, payment) => {
      if (payment.billablePeriod) {
        return sum.add(payment.totalPayment);
      }
      return sum;
    }, Currency.Zero());

    // Finance Charge: The total cost of credit as a dollar amount
    // Finance Charge = Total of Payments - Amount Financed
    const financeCharge = totalOfPayments.subtract(amountFinanced);

    // Annual Percentage Rate (APR): Already calculated in the class
    const annualPercentageRate = this.amortization.apr;

    // Payment Schedule: Details of each payment
    const paymentSchedule: PaymentScheduleEntry[] = schedule.entries
      .filter((payment) => payment.billablePeriod)
      .map((payment) => ({
        paymentNumber: payment.term,
        paymentDate: payment.periodEndDate,
        paymentAmount: payment.totalPayment,
        principal: payment.principal,
        interest: payment.accruedInterestForPeriod,
        balance: payment.endBalance,
      }));

    return {
      amountFinanced,
      financeCharge,
      totalOfPayments,
      annualPercentageRate,
      paymentSchedule,
    };
  }

  /**
   * Generates a formatted TILA disclosure document as a string.
   * @returns A string containing the formatted TILA disclosure document.
   */
  printTILADocument(): string {
    const tilaDisclosures = this.generateTILADisclosures();

    // Format numbers and dates
    const formatCurrency = (value: Currency): string => `$${value.toCurrencyString()}`;
    const formatPercentage = (value: Decimal): string => `${value.toFixed(2)}%`;
    const formatDate = (date: Dayjs): string => date.format("MM/DD/YYYY");

    // Build the document string
    let document = "";
    document += "TRUTH IN LENDING DISCLOSURE STATEMENT\n";
    document += "-------------------------------------\n\n";

    document += `ANNUAL PERCENTAGE RATE (APR): ${formatPercentage(tilaDisclosures.annualPercentageRate)}\n`;
    document += `Finance Charge: ${formatCurrency(tilaDisclosures.financeCharge)}\n`;
    document += `Amount Financed: ${formatCurrency(tilaDisclosures.amountFinanced)}\n`;
    document += `Total of Payments: ${formatCurrency(tilaDisclosures.totalOfPayments)}\n\n`;

    document += "PAYMENT SCHEDULE:\n";
    document += "-----------------------------------------------------------\n";
    document += "Payment No. | Payment Date | Payment Amount | Principal | Interest | Balance\n";
    document += "------------|--------------|----------------|-----------|----------|----------\n";

    tilaDisclosures.paymentSchedule.forEach((payment) => {
      document += `${payment.paymentNumber.toString().padStart(11)} | `;
      document += `${formatDate(payment.paymentDate).padEnd(12)} | `;
      document += `${formatCurrency(payment.paymentAmount).padStart(14)} | `;
      document += `${formatCurrency(payment.principal).padStart(9)} | `;
      document += `${formatCurrency(payment.interest).padStart(8)} | `;
      document += `${formatCurrency(payment.balance).padStart(8)}\n`;
    });

    document += "-----------------------------------------------------------\n";

    return document;
  }
}

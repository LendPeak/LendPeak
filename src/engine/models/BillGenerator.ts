import { AmortizationSchedule } from "./Amortization"; // Adjust the import path as needed
import { Bill } from "./Bill";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { Currency } from "../utils/Currency";

export class BillGenerator {
  static generateBills(amortizationSchedule: AmortizationSchedule[]): Bill[] {
    const bills: Bill[] = [];

    let billIdSequence = 1;
    for (const entry of amortizationSchedule) {
      if (!entry.billablePeriod) {
        // Skip non-billable periods
        continue;
      }

      const totalDue = entry.totalPayment;
      const id = BillGenerator.generateId(billIdSequence++);
      const bill: Bill = {
        id: id,
        period: entry.term,
        dueDate: entry.periodBillDueDate,
        principalDue: entry.principal,
        interestDue: entry.accruedInterestForPeriod,
        feesDue: entry.fees,
        totalDue: totalDue,
        isPaid: false,
        isOpen: false,
        amortizationEntry: entry,
      };

      bills.push(bill);
    }

    return bills;
  }

  static generateId(sequence?: number): string {
    //    return uuidv4();
    const sequencePrefix = sequence ? `${sequence}-` : "";
    return "BILL-" + sequencePrefix + Math.random().toString(36).substr(2, 9);
  }
}

/*
import { Amortization, AmortizationParams } from './Amortization';
import { BillGenerator } from './BillGenerator';

// Set up your amortization parameters
const amortizationParams: AmortizationParams = {
  loanAmount: Currency.of(10000),
  annualInterestRate: new Decimal(0.05),
  term: 12,
  startDate: dayjs('2023-10-01'),
  // Include other parameters as needed
};

// Create an instance of Amortization
const amortization = new Amortization(amortizationParams);

// Generate the amortization schedule
const amortizationSchedule = amortization.generateSchedule();

// Generate bills from the amortization schedule
const bills = BillGenerator.generateBills(amortizationSchedule);

// Now you can use the bills with your Payments Application Module
console.log('Generated Bills:', bills);

// Output:
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  period: 1,
  dueDate: Dayjs('2023-11-01'),
  principalDue: Currency.of(833.33),
  interestDue: Currency.of(41.67),
  feesDue: Currency.of(0),
  totalDue: Currency.of(875.00),
  isPaid: false,
  amortizationEntry: { 
  // Reference to AmortizationSchedule entry  
  },
}

*/

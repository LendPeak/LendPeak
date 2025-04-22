import { Currency } from "../../utils/Currency";
import { Bill } from "../Bill";
import { PaymentAllocation } from "./PaymentAllocation";
import { PaymentPriority } from "./Types";
import { DepositRecord } from "../DepositRecord";
import { UsageDetail } from "../Bill/DepositRecord/UsageDetail";
import { BillPaymentDetail } from "../Bill/BillPaymentDetail";

/**
 * This version accumulates total principal, interest, fees
 * in a single usage detail for this deposit-bill pair.
 *
 * e.g. If the deposit covers $50 interest and $100 principal
 * for Bill #123, we end up with *one* usage detail that has
 * allocatedInterest=50, allocatedPrincipal=100.
 */
export class AllocationHelper {
  static allocateToBill(deposit: DepositRecord, bill: Bill, amount: Currency, paymentPriority: PaymentPriority): { allocation: PaymentAllocation; remainingAmount: Currency } {
    let allocatedPrincipal = Currency.Zero();
    let allocatedInterest = Currency.Zero();
    let allocatedFees = Currency.Zero();

    let remainingAmount = amount.clone();

    for (const component of paymentPriority) {
      if (remainingAmount.isZero()) break;

      switch (component) {
        case "interest": {
          const payInterest = Currency.min(remainingAmount, bill.interestDue);
          if (!payInterest.isZero()) {
            allocatedInterest = allocatedInterest.add(payInterest);
            remainingAmount = remainingAmount.subtract(payInterest);
            bill.reduceInterestDueBy(payInterest);
          }
          break;
        }
        case "fees": {
          const payFees = Currency.min(remainingAmount, bill.feesDue);
          if (!payFees.isZero()) {
            allocatedFees = allocatedFees.add(payFees);
            remainingAmount = remainingAmount.subtract(payFees);
            bill.reduceFeesDueBy(payFees);
          }
          break;
        }
        case "principal": {
          const payPrincipal = Currency.min(remainingAmount, bill.principalDue);
          if (!payPrincipal.isZero()) {
            allocatedPrincipal = allocatedPrincipal.add(payPrincipal);
            remainingAmount = remainingAmount.subtract(payPrincipal);
            bill.reducePrincipalDueBy(payPrincipal);
          }
          break;
        }
        default:
          throw new Error(`Unknown payment component: ${component}`);
      }
    }

    // If we allocated anything, record one usage detail
    const totalAllocated = allocatedPrincipal.add(allocatedInterest).add(allocatedFees);
    if (!totalAllocated.isZero()) {
      deposit.addUsageDetail(
        new UsageDetail({
          billId: bill.id,
          period: bill.period,
          billDueDate: bill.dueDate,
          allocatedPrincipal,
          allocatedInterest,
          allocatedFees,
          date: deposit.effectiveDate,
        })
      );

      bill.paymentDetails.push(
        new BillPaymentDetail({
          depositId: deposit.id,
          allocatedPrincipal: allocatedPrincipal.toNumber(),
          allocatedInterest: allocatedInterest.toNumber(),
          allocatedFees: allocatedFees.toNumber(),
          date: deposit.effectiveDate,
        })
      );
    }

    // Ensure deposit ID is in Bill's metadata
    if (!bill.paymentMetadata) {
      bill.paymentMetadata = { depositIds: [] };
    }
    if (!bill.paymentMetadata.depositIds) {
      bill.paymentMetadata.depositIds = [];
    }
    if (!bill.paymentMetadata.depositIds.includes(deposit.id)) {
      bill.paymentMetadata.depositIds.push(deposit.id);
    }

    // Return PaymentAllocation so we can show how much we allocated
    const allocation: PaymentAllocation = {
      billId: bill.id,
      allocatedPrincipal,
      allocatedInterest,
      allocatedFees,
    };

    // bill.paymentDetails.push(allocation);

    return { allocation, remainingAmount };
  }
}

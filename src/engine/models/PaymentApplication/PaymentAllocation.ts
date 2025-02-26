import { Currency } from "../../utils/Currency";

// Payment Allocation to a Bill
export interface PaymentAllocation {
  billId: string;
  allocatedPrincipal: Currency;
  allocatedInterest: Currency;
  allocatedFees: Currency;
}

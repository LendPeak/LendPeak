import { Currency } from '../../utils/Currency';
import { Bill } from '../Bill';
import { UsageDetail } from '../Bill/DepositRecord/UsageDetail';

// Payment Allocation to a Bill
export interface PaymentAllocation {
  billId: string;
  bill?: Bill;
  usageDetails?: UsageDetail[];
  allocatedPrincipal: Currency;
  allocatedInterest: Currency;
  allocatedFees: Currency;
}

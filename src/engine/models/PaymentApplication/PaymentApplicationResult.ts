import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { DepositRecords } from "../DepositRecords";
import Decimal from "decimal.js";
import { Bill } from "../Bill";
import { Bills } from "../Bills";
import { BalanceModification } from "../Amortization/BalanceModification";
import { UsageDetail } from "../Bill/DepositRecord/UsageDetail";
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid"; // Import UUID
import isBetween from "dayjs/plugin/isBetween";
import { PaymentAllocation } from "./PaymentAllocation";

// Payment Application Result
export interface PaymentApplicationResult {
  depositId: string;
  totalAllocated: Currency;
  allocations: PaymentAllocation[];
  unallocatedAmount: Currency;
  excessAmount: Currency;
  balanceModification?: BalanceModification;
}

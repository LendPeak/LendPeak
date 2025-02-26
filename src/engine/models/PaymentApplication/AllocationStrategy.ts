import { Currency } from "../../utils/Currency";
import { DepositRecord } from "../DepositRecord";
import { DepositRecords } from "../DepositRecords";
import Decimal from "decimal.js";
import { Bill } from "../Bill";
import { Bills } from "../Bills";
import { BalanceModification } from "../Amortization/BalanceModification";
import { UsageDetail } from "../Bill/Deposit/UsageDetail";
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid"; // Import UUID
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { PaymentAllocationStrategyName, PaymentComponent, PaymentPriority } from "./Types";
import { PaymentApplicationResult } from "./PaymentApplicationResult";
// Allocation Strategy Interface
export interface AllocationStrategy {
  apply(deposit: DepositRecord, bills: Bills, paymentPriority: PaymentPriority): PaymentApplicationResult;
}

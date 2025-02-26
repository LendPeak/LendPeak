import { Currency } from "../utils/Currency";
import { UsageDetail } from "./Bill/Deposit/UsageDetail";

import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import isBetween from "dayjs/plugin/isBetween";
import { stat } from "fs";
dayjs.extend(isBetween);

export interface DepositMetadata {
  [key: string]: any;
}

export interface Deposit {
  id: string;
  amount: Currency;
  currency: string;
  createdDate: Dayjs;
  insertedDate: Dayjs;
  effectiveDate: Dayjs;
  clearingDate?: Dayjs;
  systemDate: Dayjs;
  paymentMethod?: string;
  depositor?: string;
  depositLocation?: string;
  applyExcessToPrincipal: boolean;
  excessAppliedDate?: Dayjs;
  usageDetails?: UsageDetail[];
  unusedAmount: Currency;
  balanceModificationId?: string;
  metadata?: DepositMetadata;
  staticAllocation?: {
    principal: Currency;
    interest: Currency;
    fees: Currency;
    prepayment: Currency;
  };
}


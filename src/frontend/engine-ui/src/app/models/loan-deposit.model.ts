// models/loan-deposit.model.ts
export interface LoanDeposit {
  id: string;
  amount: number;
  currency: string;
  createdDate: Date;
  insertedDate: Date;
  effectiveDate: Date;
  clearingDate?: Date;
  systemDate: Date;
  paymentMethod?: string;
  depositor?: string;
  depositLocation?: string;
  usageDetails: any[];
  unusedAmount?: number;
  applyExcessToPrincipal: boolean;
  excessAppliedDate?: Date;
  metadata?: any;
}

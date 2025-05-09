/**
 * ----------------------------
 *  CLS (Salesforce) interfaces
 * ----------------------------
 */

/** Re-usable “attributes” block that Salesforce puts on every SObject. */
export interface SFAttributes {
  type: string;
  url: string;
}

/**
 * Top-level payload that comes back from the API / export you gave me.
 *  • `loan`      – one record that describes the account itself
 *  • `schedule`  – amortization lines (one per period / bill)
 *  • `lpts`      – loan-payment transactions (posted, reversed, etc.)
 *  • `history`   – field-history-tracking entries
 */
export interface CLSDataResponse {
  loan: CLSLoan;
  schedule: CLSScheduleEntry[];
  lpts: CLSLPT[];
  history: CLSHistoryEntry[];
}

/* -----------------------------------------------------------------------
 * 1.  Loan header (one row) – keys taken verbatim from the sample JSON
 * ---------------------------------------------------------------------*/
/* -----------------------------------------------------------------------
 * 1.  Loan header (one row) – UPDATED
 * ---------------------------------------------------------------------*/
export interface CLSLoan {
  _id: string;
  attributes: SFAttributes;
  /** Salesforce record Id (18-char) */
  Id: string;

  /** “Name” value shown in the UI – often LAI-xxxxx */
  Name: string;

  /* ─────── Monetary / rate basics ─────────────────────────────────── */
  loan__Loan_Amount__c: number; // Principal
  loan__Contractual_Interest_Rate__c: number; // % as 0–100
  loan__Interest_Rate__c: number; // Running / promo % (if different)
  /**  ← convenience alias used in the first-pass mapper */
  intRatePct?: number; // same value, optional

  /* ─────── Term / period info ─────────────────────────────────────── */
  loan__Number_of_Installments__c: number; // Planned term length
  loan__Amortization_Term__c: string | number | null;
  loan__Term_Cur__c: number; // “current term” (runtime)

  /* ─────── Key life-cycle dates ───────────────────────────────────── */
  loan__Application_Date__c: string; // ISO date
  loan__Disbursal_Date__c: string;
  loan__Expected_Repayment_Start_Date__c: string;
  loan__Maturity_Date_Current__c: string;
  loan__Closed_Date__c: string | null;
  loan__Last_Accrual_Date__c: string;
  loan__Accrual_Start_Date__c: string;
  loan__Last_Installment_Date__c: string;

  /* ─────── Balances / roll-ups ────────────────────────────────────── */
  loan__Principal_Remaining__c: number;
  loan__Principal_Paid__c: number;
  loan__Interest_Remaining__c: number;
  loan__Interest_Paid__c: number;
  loan__Payment_Amount__c: number; // current P&I (may differ from scheduled)

  /* ─────── Status & flags ─────────────────────────────────────────── */
  loan__Loan_Status__c: string;
  isMigrated__c: boolean | number;
  Reschedule_Count__c: number;
  Payoff_Loan_ID__c: string | null;

  /* ─────── Misc. metrics / compliance ─────────────────────────────── */
  loan__Number_of_Days_Overdue__c: number;
  loan__Pre_Bill_Days__c: number;
  loan__Contractual_Due_Day__c: number;
  loan__Due_Day__c: number;

  /* ─────── Charged-off & CPD fields ───────────────────────────────── */
  loan__Charged_Off_Date__c: string | number | null;
  loan__Charged_Off_Fees__c: number;
  loan__Charged_Off_Interest__c: number;
  loan__Charged_Off_Principal__c: number;
  CPD_Date__c: string | number | null;
  CPD_Expire_Date__c: string | number | null;

  /* ─────── Relationships ──────────────────────────────────────────── */
  loan__Account__c: string; // Borrower / account lookup
  lead_Guid__c: string | number | null;

  /** …catch-all for new / rarely-used custom fields */
  [key: string]: any;
}
/* -----------------------------------------------------------------------
 * 2.  Schedule line (period / bill)
 * ---------------------------------------------------------------------*/
export interface CLSScheduleEntry {
  _id: string;
  attributes: SFAttributes;
  Id: string;
  Name: string;
  CreatedDate: string;
  loan__Balance__c: number;
  loan__Due_Date__c: string;
  loan__Due_Interest__c: number;
  loan__Due_Principal__c: number;
  loan__Is_Archived__c: boolean;
  loan__Is_Billed__c: boolean;
  loan__isPaid__c: boolean;
  loan__Paid_Interest__c: number;
  loan__Total_Installment__c: number;
  loan__Id__c: string;
  loan__Loan_Account__c: string;
  loan__Interest_Rounding_Error__c: number;
  [key: string]: any; // catch-all for future columns
}

/* -----------------------------------------------------------------------
 * 3.  LPT – Loan Payment Transaction
 * ---------------------------------------------------------------------*/
export interface CLSLPT {
  _id: string;
  attributes: SFAttributes;
  Id: string;
  Name: string;
  loan__Loan_Account__c: string;
  loan__Cleared__c: boolean;
  loan__Clearing_Date__c: string;
  loan__Early_Payment__c: boolean;
  loan__Early_Total_Repayment_of_the_Loan__c: boolean;
  loan__Excess__c: number;
  loan__Fees__c: number;
  loan__Interest__c: number;
  loan__Late_Charge_Interest__c: number;
  loan__Late_Charge_Principal__c: number;
  loan__Manual_Payment__c: boolean;
  loan__Missed_Loan_Installment__c: boolean;
  loan__Other_Charges_Interest__c: number;
  loan__Other_Charges_Principal__c: number;
  loan__Principal__c: number;
  loan__Receipt_Date__c: string;
  loan__Receipt_ID__c: string;
  loan__Reversed__c: boolean;
  loan__Total_Charges_Interest__c: number;
  loan__Total_Charges_Principal__c: number;
  loan__Total_Payment_Amount__c: number;
  loan__Transaction_Amount__c: number;
  loan__Transaction_Date__c: string;
  loan__Transaction_Time__c: string;
  loan__Write_Off_Recovery_Payment__c: number;
  loan__Cleared_Reversal_Txn_Count__c: number;
  loan__Archived__c: boolean;
  loan__Automated_Payment_Setup__c: boolean;
  loan__Interest_Rate__c: number;
  loan__Payoff_Balance__c: number;
  loan__Installment_Date__c: string;
  loan__Installment_Payment__c: number;
  loan__Payment_Type__c: string;
  loan__Transaction_Creation_Date__c: string;
  Principal_without_Reversal__c: number;
  Sum_Principal_Payment_Amount__c: number;
  Posted_Date__c: string;
  loan__Rejected__c: boolean;
  [key: string]: any;
}

/* -----------------------------------------------------------------------
 * 4.  Field-history tracking record
 * ---------------------------------------------------------------------*/
export interface CLSHistoryEntry {
  _id: string;
  attributes: SFAttributes;
  Id: string;
  ParentId: string;
  CreatedById: string;
  CreatedDate: string;
  Field: string;
  OldValue: any | null;
  NewValue: any | null;
  [key: string]: any;
}

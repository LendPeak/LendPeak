import { MongoClient, Db, Collection } from "mongodb";

export class ClsMongoRepo {
  private readonly colLoan: Collection<any>;
  private readonly colRsi: Collection<any>;
  private readonly colLpt: Collection<any>;
  private readonly colLoanHistory: Collection<any>;
  private readonly colBills: Collection<any>;

  constructor(private client: MongoClient, dbName: string) {
    const db: Db = this.client.db(dbName);

    this.colLoan = db.collection("loan__Loan_Account__c");
    this.colRsi = db.collection("loan__Repayment_Schedule__c");
    this.colLpt = db.collection("loan__Loan_Payment_Transaction__c");
    this.colLoanHistory = db.collection("loan__Loan_Account__History");
    this.colBills = db.collection("loan__Loan_account_Due_Details__c");
  }

  /** flexible lookup by Id / Name / Payoff_Id */
  async findLoan(identifier: string) {
    return this.colLoan.findOne({
      $or: [{ Id: identifier }, { Name: identifier }, { Payoff_Loan_ID__c: identifier }, { Payoff_Loan_ID__c: identifier.toUpperCase() }],
    });
  }

  async getRepaymentSchedule(loanId: string) {
    return this.colRsi.find({ loan__Loan_Account__c: loanId }).sort({ loan__Id__c: 1 }).toArray();
  }

  async getLoanPaymentTransactions(loanId: string) {
    return this.colLpt.find({ loan__Loan_Account__c: loanId }).sort({ loan__Clearing_Date__c: 1 }).toArray();
  }

  async getDueDetails(loanId: string) {
    return this.colBills
      .find({
        loan__Loan_Account__c: loanId,
        loan__Archived__c: { $ne: true }, // skip archived rows
      })
      .sort({ loan__Due_Date__c: 1 }) // chronological order
      .toArray();
  }

  async getLoanAccountHistory(loanId: string) {
    return this.colLoanHistory
      .find({
        ParentId: loanId,
        Field: {
          $nin: [
            "loan__Interest_Accrued_Not_Due__c",
            "loan__Interest_Paid__c",
            "loan__Next_Interest_Posting_Date__c",
            "loan__Principal_Remaining__c",
            "loan__Interest_Remaining__c",
            "loan__Last_Transaction_Id__c",
            "loan__Last_Accrual_Date__c",
            "loan__Next_Due_Generation_Date__c",
            "loan__Uncleared_Repayment_Amount__c",
            "loan__Next_Due_Generation_Date__c",
            "loan__Next_Installment_Date__c",
            "loan__Last_Transaction_Type__c",
            "Hardship_Reason__c",
            "Hardship_New_Maturity_Date__c",
            "loan__Last_Transaction_Type__c",
            "U_LoanModForbearance__c",
            "Skipped_a_pay_Date__c",
            "loan__Reschedule_Status__c",
            "loan__Last_Payment_Amount__c",
          ],
        },
      })
      .sort({ CreatedDate: 1 })
      .toArray();
  }

  /** one-shot loader used by the controller */
  async loadContract(identifier: string) {
    const loan = await this.findLoan(identifier);
    if (!loan) throw new Error(`Loan account '${identifier}' not found`);

    const [schedule, lpts, bills, history] = await Promise.all([
      this.getRepaymentSchedule(loan.Id), // RSIs
      this.getLoanPaymentTransactions(loan.Id), // LPTs
      this.getDueDetails(loan.Id), // PCNs
      this.getLoanAccountHistory(loan.Id), // field history
    ]);

    return { loan, schedule, lpts, bills, history };
  }
}

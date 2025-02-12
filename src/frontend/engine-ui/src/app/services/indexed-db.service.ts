import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// We define an interface to hold loan data in the DB
export interface LoanRow {
  key: string; // e.g. 'loan_MyLoanName'
  data: any; // the actual loan/bills/deposits
}

@Injectable({ providedIn: 'root' })
export class IndexedDbService extends Dexie {
  // Dexie table definition
  public loans!: Table<LoanRow, string>;

  constructor() {
    // Initialize Dexie by giving your DB a name
    super('MyLoansDatabase');

    // Define your table(s)
    // Version 1, store by 'key' in an object store named 'loans'
    this.version(1).stores({
      loans: 'key', // key is our primary key
    });

    // Map the "loans" property to the actual Dexie table
    this.loans = this.table('loans');
  }

  /**
   * Save a loan object by key.
   */
  async saveLoan(key: string, data: any): Promise<void> {
    //console.log('saving loan', key, data);
    const dataString = JSON.stringify(data);
    await this.loans.put({ key, data: dataString });
  }

  /**
   * Load a loan object by key.
   */
  async loadLoan(key: string): Promise<any | null> {
    const row = await this.loans.get(key);
    if (!row) return null;
    return JSON.parse(row.data);
    // return row ? row.data : null;
  }

  /**
   * Delete a loan object by key.
   */
  async deleteLoan(key: string): Promise<void> {
    await this.loans.delete(key);
  }

  /**
   * Get all saved loans (for a "Manage Loans" dialog, etc.).
   */
  async getAllLoans(): Promise<LoanRow[]> {
    // return this.loans.toArray();
    const arrayOfLoans = await this.loans.toArray();
    return arrayOfLoans.map((row) => {
      return {
        key: row.key,
        data: JSON.parse(row.data),
      };
    });
  }
}

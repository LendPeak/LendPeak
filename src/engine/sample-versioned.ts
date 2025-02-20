import { Amortization } from "./models/Amortization";
import { AmortizationVersionManager } from "./models/AmortizationVersionManager";

function printDiffsAsTable(diffs: Record<string, { oldValue: any; newValue: any }>, title: string) {
  console.log(`\n=== ${title} ===`);
  // Convert the diff object into an array so console.table can show rows
  const rows = Object.entries(diffs).map(([path, { oldValue, newValue }]) => ({
    path,
    oldValue: JSON.stringify(oldValue),
    newValue: JSON.stringify(newValue),
  }));
  console.table(rows);
}

// 1. Create your Amortization instance
const loan = new Amortization({
  loanAmount: 5000,
  annualInterestRate: 0.05,
  term: 12,
  startDate: new Date("2025-01-01"),
  // etc...
});

// 2. Wrap it with your version manager (the "dual-diff" version)
const manager = new AmortizationVersionManager(loan);

// 3. Make some changes and commit
loan.description = "Some test loan";
loan.generateSchedule();
const v1 = manager.commitTransaction("Initial version");

// 4. Make more changes
loan.loanAmount = 6000;
loan.generateSchedule();
const v2 = manager.commitTransaction("Increased loan amount");

// 5. Let's show the diffs for v2 in a nice table format
printDiffsAsTable(v2.inputChanges, "v2 Input Changes");
// printDiffsAsTable(v2.outputChanges, "v2 Output Changes");

/* 
   Sample console output might look like:

   === v2 Input Changes ===
   ┌─────────┬─────────────────────┬───────────┬───────────┐
   │ (index) │        path        │ oldValue  │ newValue  │
   ├─────────┼─────────────────────┼───────────┼───────────┤
   │    0    │    'loanAmount'    │   "5000"  │   "6000"  │
   │    1    │ 'totalLoanAmount'  │   "5000"  │   "6000"  │
   └─────────┴─────────────────────┴───────────┴───────────┘

   === v2 Output Changes ===
   ┌─────────┬───────────────────────────────────────┬───────────┬───────────┐
   │ (index) │                 path                  │ oldValue  │ newValue  │
   ├─────────┼───────────────────────────────────────┼───────────┼───────────┤
   │    0    │ 'repaymentSchedule.0.principal'      │  "..."    │  "..."    │
   │    1    │ 'repaymentSchedule.0.endBalance'     │  "..."    │  "..."    │
   │   ...    │                 ...                  │   ...     │   ...     │
   └─────────┴───────────────────────────────────────┴───────────┴───────────┘

*/

// 6. If you do a rollback, you can also display the diffs of the new rollback version
manager.rollback(v1.versionId, "Rollback to initial version");
const v3 = manager.getVersionHistory().slice(-1)[0]; // the new rollback version
printDiffsAsTable(v3.inputChanges, "Rollback Input Changes");
// printDiffsAsTable(v3.outputChanges, "Rollback Output Changes");

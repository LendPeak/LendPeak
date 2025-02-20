export interface AmortizationVersion {
  versionId: string;
  timestamp: number;
  commitMessage?: string;

  // Full JSON snapshot of the Amortization state (for rollback)
  snapshot: any;

  // The two separate diff objects
  inputChanges: Record<string, { oldValue: any; newValue: any }>;
  outputChanges: Record<string, { oldValue: any; newValue: any }>;

  // Soft-delete & rollback flags
  isDeleted: boolean;
  isRollback: boolean;
  rolledBackFromVersionId?: string;
}

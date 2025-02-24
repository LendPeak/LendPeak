import { Bills } from "./Bills";
import { DepositRecords } from "./DepositRecords";
import cloneDeep from "lodash/cloneDeep";

/**
 * A version record for Bills+Deposits changes.
 */
export interface FinancialOpsVersion {
  versionId: string;
  timestamp: number;
  commitMessage?: string;
  snapshot: any;
  inputChanges: Record<string, { oldValue: any; newValue: any }>;
  outputChanges: Record<string, { oldValue: any; newValue: any }>;
  isDeleted: boolean;
  isRollback: boolean;
  rolledBackFromVersionId?: string;
}

/**
 * Minimal computeDualDiff (same approach as in your AmortizationVersionManager)
 */
function computeDualDiff(
  oldObj: any,
  newObj: any,
  path: string[] = [],
  inputDiffs: Record<string, { oldValue: any; newValue: any }>,
  outputDiffs: Record<string, { oldValue: any; newValue: any }>,
  excludedPaths: string[],
  outputPaths: string[]
): void {
  if (oldObj === newObj) return;

  const currentPath = path.join(".");
  // Example: if you have excludedPaths or outputPaths, adapt the logic:
  // if (excludedPaths.some(...)) return;

  const oldType = typeof oldObj;
  const newType = typeof newObj;
  const bothObjects = oldType === "object" && newType === "object" && oldObj !== null && newObj !== null;
  const bothArrays = bothObjects && Array.isArray(oldObj) && Array.isArray(newObj);

  if (!bothObjects || Array.isArray(oldObj) !== Array.isArray(newObj)) {
    recordChange(currentPath, oldObj, newObj, inputDiffs, outputDiffs, outputPaths);
    return;
  }
  if (bothArrays) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      computeDualDiff(oldObj[i], newObj[i], [...path, String(i)], inputDiffs, outputDiffs, excludedPaths, outputPaths);
    }
    return;
  }

  // Both plain objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    computeDualDiff(oldObj[key], newObj[key], [...path, key], inputDiffs, outputDiffs, excludedPaths, outputPaths);
  }
}

function recordChange(pathStr: string, oldVal: any, newVal: any, inputDiffs: Record<string, { oldValue: any; newValue: any }>, outputDiffs: Record<string, { oldValue: any; newValue: any }>, outputPaths: string[]) {
  // For demonstration, let's say we treat everything as "input" by default
  // unless we decide certain paths are "output".
  // If you have "repaymentSchedule" or something, adapt accordingly.
  const isOutput = outputPaths.some((op) => pathStr.startsWith(op));
  if (isOutput) {
    outputDiffs[pathStr] = { oldValue: oldVal, newValue: newVal };
  } else {
    inputDiffs[pathStr] = { oldValue: oldVal, newValue: newVal };
  }
}

function generateVersionId(versionNum: number) {
  return versionNum.toString() + "." + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * The main manager for tracking Bills + Deposits changes.
 */
export class FinancialOpsVersionManager {
  private versions: FinancialOpsVersion[] = [];
  private excludedPaths: string[] = [];
  private outputPaths: string[] = [];

  private _versionNumber = 0;

  constructor(private bills: Bills, private deposits: DepositRecords) {}

  get versionNumber(): number {
    return this._versionNumber;
  }
  set versionNumber(val: number) {
    this._versionNumber = val;
  }

  public getBills(): Bills {
    return this.bills;
  }
  public getDeposits(): DepositRecords {
    return this.deposits;
  }

  /** Returns a simple combined snapshot object. */
  private getCurrentSnapshot(): any {
    return {
      bills: this.bills.toJSON(),
      deposits: this.deposits.toJSON(),
    };
  }

  public getVersionHistory(includeDeleted = false): FinancialOpsVersion[] {
    return includeDeleted ? [...this.versions] : this.versions.filter((v) => !v.isDeleted);
  }

  /** Check for differences from the last committed version. */
  public hasChanges(): boolean {
    const { inputChanges, outputChanges } = this.previewChanges();
    return Object.keys(inputChanges).length > 0 || Object.keys(outputChanges).length > 0;
  }

  public previewChanges(): {
    inputChanges: Record<string, { oldValue: any; newValue: any }>;
    outputChanges: Record<string, { oldValue: any; newValue: any }>;
  } {
    const currentSnap = this.getCurrentSnapshot();
    const lastVer = this.versions[this.versions.length - 1];
    const oldSnap = lastVer?.snapshot || {};

    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    computeDualDiff(oldSnap, currentSnap, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);
    return { inputChanges, outputChanges };
  }

  public commitTransaction(commitMessage?: string): FinancialOpsVersion {
    const currentSnap = this.getCurrentSnapshot();
    const lastVer = this.versions[this.versions.length - 1];
    const oldSnap = lastVer?.snapshot || {};

    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    computeDualDiff(oldSnap, currentSnap, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    this._versionNumber++;

    const newVer: FinancialOpsVersion = {
      versionId: generateVersionId(this._versionNumber),
      timestamp: Date.now(),
      commitMessage,
      snapshot: currentSnap,
      inputChanges,
      outputChanges,
      isDeleted: false,
      isRollback: false,
    };
    this.versions.push(newVer);

    return newVer;
  }

  public isLatestVersion(versionId: string): boolean {
    if (this.versions.length === 0) return false;
    return this.versions[this.versions.length - 1].versionId === versionId;
  }

  public rollback(versionId: string, commitMessage?: string): FinancialOpsVersion {
    if (this.versions.length === 0) {
      throw new Error("No versions to rollback");
    }
    if (this.isLatestVersion(versionId)) {
      throw new Error("Cannot rollback to the current version");
    }

    const targetVer = this.versions.find((v) => v.versionId === versionId);
    if (!targetVer) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const oldSnap = targetVer.snapshot;
    // Reconstruct the domain objects from oldSnap
    this.bills = new Bills(oldSnap.bills || []);
    this.deposits = new DepositRecords(oldSnap.deposits || []);

    // Now create a new version flagged as rollback
    const currentSnap = this.getCurrentSnapshot();
    const lastVer = this.versions[this.versions.length - 1];
    const prevSnap = lastVer?.snapshot || {};

    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    computeDualDiff(prevSnap, currentSnap, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    this._versionNumber++;

    const rollbackVersion: FinancialOpsVersion = {
      versionId: generateVersionId(this._versionNumber),
      timestamp: Date.now(),
      commitMessage: commitMessage || `Rollback to version ${versionId}`,
      snapshot: currentSnap,
      inputChanges,
      outputChanges,
      isDeleted: false,
      isRollback: true,
      rolledBackFromVersionId: versionId,
    };
    this.versions.push(rollbackVersion);
    return rollbackVersion;
  }

  public deleteVersion(versionId: string): void {
    const ver = this.versions.find((v) => v.versionId === versionId);
    if (!ver) {
      throw new Error(`Version not found: ${versionId}`);
    }
    ver.isDeleted = true;
  }

  public toJSON(): any {
    // store current versionNumber, versions, plus the domain objects
    return {
      versionNumber: this._versionNumber,
      versions: JSON.parse(JSON.stringify(this.versions)),
      currentFinancialOps: this.getCurrentSnapshot(),
    };
  }

  public static fromJSON(data: any): FinancialOpsVersionManager {
    if (!data || !data.currentFinancialOps) {
      throw new Error("Invalid data: missing currentFinancialOps");
    }

    const bills = new Bills(data.currentFinancialOps.bills || []);
    const deposits = new DepositRecords(data.currentFinancialOps.deposits || []);
    const mgr = new FinancialOpsVersionManager(bills, deposits);
    mgr.versionNumber = data.versionNumber || 0;

    if (Array.isArray(data.versions)) {
      mgr.versions = data.versions.map((v: any) => ({
        versionId: v.versionId,
        timestamp: v.timestamp,
        commitMessage: v.commitMessage,
        snapshot: v.snapshot,
        inputChanges: v.inputChanges,
        outputChanges: v.outputChanges,
        isDeleted: v.isDeleted,
        isRollback: v.isRollback,
        rolledBackFromVersionId: v.rolledBackFromVersionId,
      }));
    }

    return mgr;
  }
}

import { Amortization } from "./Amortization";
import { AmortizationVersion } from "./AmortizationVersion";
import cloneDeep from "lodash/cloneDeep";
/**
 * Utility that checks if the dot-notation path is excluded.
 */
function isExcluded(pathString: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((ex) => pathString === ex || pathString.startsWith(ex + "."));
}

/**
 * Utility that checks if the dot-notation path should be considered "output" (e.g. 'repaymentSchedule').
 */
function isOutputPath(pathString: string, outputPaths: string[]): boolean {
  return outputPaths.some((op) => pathString === op || pathString.startsWith(op + "."));
}

/**
 * Recursive function that populates two diff objects:
 * - inputDiffs: fields not excluded and not in outputPaths
 * - outputDiffs: fields matching outputPaths
 *
 * If a path is in excludedPaths, we skip it entirely.
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
  // If they are exactly the same (including null/undefined), no diff.
  if (oldObj === newObj) return;

  const currentPath = path.join(".");

  // 1. Exclusion check
  if (isExcluded(currentPath, excludedPaths)) {
    // We ignore this path entirely. Return without recording or recursing further.
    return;
  }

  const oldType = typeof oldObj;
  const newType = typeof newObj;

  // 2. If one side is primitive (or array vs. object mismatch), record a direct diff
  //    (Alternatively, if either is null, or different array lengths, etc.)
  const bothAreObjects = oldType === "object" && newType === "object" && oldObj !== null && newObj !== null;
  const bothAreArrays = bothAreObjects && Array.isArray(oldObj) && Array.isArray(newObj);

  if (!bothAreObjects || Array.isArray(oldObj) !== Array.isArray(newObj)) {
    // We have a direct difference
    recordChange(currentPath, oldObj, newObj, inputDiffs, outputDiffs, outputPaths);
    return;
  }

  // 3. If both are arrays
  if (bothAreArrays) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      computeDualDiff(oldObj[i], newObj[i], [...path, String(i)], inputDiffs, outputDiffs, excludedPaths, outputPaths);
    }
    return;
  }

  // 4. If both are plain objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    computeDualDiff(oldObj[key], newObj[key], [...path, key], inputDiffs, outputDiffs, excludedPaths, outputPaths);
  }
}

/**
 * Decides whether to record a change in `inputDiffs` or `outputDiffs`.
 * If the path is in outputPaths, we put it in `outputDiffs`; otherwise in `inputDiffs`.
 */
function recordChange(
  pathString: string,
  oldValue: any,
  newValue: any,
  inputDiffs: Record<string, { oldValue: any; newValue: any }>,
  outputDiffs: Record<string, { oldValue: any; newValue: any }>,
  outputPaths: string[]
) {
  if (isOutputPath(pathString, outputPaths)) {
    outputDiffs[pathString] = { oldValue, newValue };
  } else {
    inputDiffs[pathString] = { oldValue, newValue };
  }
}

// Re-use any existing helpers or define them here
function generateVersionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export class AmortizationVersionManager {
  private versions: AmortizationVersion[] = [];

  // Configure which paths go to "outputDiffs" vs. "excluded entirely"
  // e.g., ["repaymentSchedule"] means "repaymentSchedule.*" is output.
  private outputPaths = ["repaymentSchedule"];

  // If you want certain top-level or nested fields excluded from *both* diffs, list them here.
  // e.g. ["summary", "export", "tila"]
  private excludedPaths = ["export", "summary"];

  constructor(private amortization: Amortization) {}

  public getAmortization(): Amortization {
    return this.amortization;
  }

  /**
   * Commits the current state as a new version, splitting changes into
   * "inputChanges" vs. "outputChanges."
   */
  public commitTransaction(commitMessage?: string): AmortizationVersion {
    const fullNewSnapshot = cloneDeep(this.amortization.json);
    const lastVersion = this.versions[this.versions.length - 1];
    const fullOldSnapshot = lastVersion?.snapshot || {};

    // We'll track two separate result objects
    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    // Compute diffs in one pass
    computeDualDiff(fullOldSnapshot, fullNewSnapshot, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    const version: AmortizationVersion = {
      versionId: generateVersionId(),
      timestamp: Date.now(),
      commitMessage,
      snapshot: fullNewSnapshot, // The entire snapshot for rollback
      inputChanges,
      outputChanges,
      isDeleted: false,
      isRollback: false,
    };

    this.versions.push(version);
    return version;
  }

  /**
   * Rolls back to an older version by rehydrating a new Amortization
   * from that version's full snapshot.
   * Then commits a new version flagged as a rollback.
   */
  public rollback(versionId: string, commitMessage?: string): AmortizationVersion {
    const targetVersion = this.versions.find((v) => v.versionId === versionId);
    if (!targetVersion) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Rebuild from old snapshot
    const oldSnapshot = targetVersion.snapshot;

    // some changes like endDate and equited montly payment amounts are returned however they might be calcuilated
    // and in those instances when they are calculated, we dont want to roll them back
    // so we will remove them from the inputChanges if hasCustomX is false
    if (!oldSnapshot.hasCustomEndDate) {
      delete oldSnapshot.endDate;
    }

    if (!oldSnapshot.hasCustomEquitedMonthlyPayment) {
      delete oldSnapshot.equitedMonthlyPayment;
    }

    const rolledBackAmort = new Amortization(oldSnapshot);

    // Replace the manager's current amortization
    this.amortization = rolledBackAmort;

    // Now commit a new version that references the rollback
    const fullNewSnapshot = cloneDeep(this.amortization.json);
    const lastVersion = this.versions[this.versions.length - 1];
    const fullOldSnapshot = lastVersion?.snapshot || {};

    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    computeDualDiff(fullOldSnapshot, fullNewSnapshot, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    const rollbackVersion: AmortizationVersion = {
      versionId: generateVersionId(),
      timestamp: Date.now(),
      commitMessage: commitMessage || `Rollback to version ${versionId}`,
      snapshot: fullNewSnapshot,
      inputChanges,
      outputChanges,
      isDeleted: false,
      isRollback: true,
      rolledBackFromVersionId: versionId,
    };

    this.versions.push(rollbackVersion);
    return rollbackVersion;
  }

  /**
   * Soft-delete a version so it's hidden from normal history listings.
   */
  public deleteVersion(versionId: string): void {
    const ver = this.versions.find((v) => v.versionId === versionId);
    if (!ver) {
      throw new Error(`Version not found: ${versionId}`);
    }
    ver.isDeleted = true;
  }

  /**
   * Return all versions (optionally including deleted).
   */
  public getVersionHistory(includeDeleted = false): AmortizationVersion[] {
    if (includeDeleted) return [...this.versions];
    return this.versions.filter((v) => !v.isDeleted);
  }
}

import { Amortization } from "./Amortization";
import { AmortizationVersion } from "./AmortizationVersion";
import cloneDeep from "lodash/cloneDeep";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

function isGeneratedObject(val: any): boolean {
  return val && typeof val === "object" && !Array.isArray(val) && val.type === "generated";
}

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

function isDate(value: any): boolean {
  return (value instanceof Date && !isNaN(value.valueOf())) || dayjs.isDayjs(value);
}

function inflateAmortizationIfNeeded(obj: any): any {
  // Already an instance?
  if (obj instanceof Amortization) {
    return obj;
  } else if (!obj || Object.keys(obj).length === 0) {
    // if it is empty object, we just return that
    // usually that is when initial version is being compared
    return obj;
  }
  try {
    const amort = new Amortization(obj);
    amort.calculateAmortizationPlan();
    return amort;
  } catch (e) {
    console.error("Error inflating Amortization", e);
    console.trace("Original object", obj);
    throw e;
  }
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
  // 1. If exactly the same (including null/undefined), no diff
  if (oldObj === newObj) return;

  // 2. If both are Date objects, compare getTime()
  if (isDate(oldObj) && isDate(newObj)) {
    const oldObjDate = dayjs(oldObj);
    const newObjDate = dayjs(newObj);
    if (!oldObjDate.isSame(newObjDate)) {
      console.error("Date mismatch", path.join("."), oldObj, newObj);
      recordChange(path.join("."), oldObj, newObj, inputDiffs, outputDiffs, outputPaths);
    }
    return;
  }

  const currentPath = path.join(".");

  // 3. Exclusion check
  if (isExcluded(currentPath, excludedPaths)) {
    return;
  }

  const oldType = typeof oldObj;
  const newType = typeof newObj;

  // 4. If one side is primitive or mismatch (array vs. object, etc.), record a direct diff
  //    (Also handles if either is null or different array lengths, etc.)
  const bothAreObjects = oldType === "object" && newType === "object" && oldObj !== null && newObj !== null;
  const bothAreArrays = bothAreObjects && Array.isArray(oldObj) && Array.isArray(newObj);

  if (!bothAreObjects || Array.isArray(oldObj) !== Array.isArray(newObj)) {
    recordChange(currentPath, oldObj, newObj, inputDiffs, outputDiffs, outputPaths);
    return;
  }

  // 5. If both are arrays
  if (bothAreArrays) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      computeDualDiff(oldObj[i], newObj[i], [...path, String(i)], inputDiffs, outputDiffs, excludedPaths, outputPaths);
    }
    return;
  }

  // 6. If both are plain objects
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
  // Check if this path is "output" or "input"
  const isOutput = isOutputPath(pathString, outputPaths);

  if (isOutput) {
    // This difference belongs in outputDiffs
    outputDiffs[pathString] = { oldValue, newValue };
  } else {
    // It's an input path
    // If oldValue or newValue is an object with type='generated', skip.
    if (isGeneratedObject(oldValue) || isGeneratedObject(newValue)) {
      // Simply do nothing (skip recording the diff).
      return;
    }

    // Otherwise record it in inputDiffs
    inputDiffs[pathString] = { oldValue, newValue };
  }
}

// Re-use any existing helpers or define them here
function generateVersionId(versionNumber?: number): string {
  return (versionNumber || 0).toString() + "." + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export class AmortizationVersionManager {
  versions: AmortizationVersion[] = [];

  // Configure which paths go to "outputDiffs" vs. "excluded entirely"
  // e.g., ["repaymentSchedule"] means "repaymentSchedule.*" is output.
  private outputPaths = ["repaymentSchedule"];

  // If you want certain top-level or nested fields excluded from *both* diffs, list them here.
  // e.g. ["summary", "export", "tila"]
  private excludedPaths = ["export", "summary"];

  private _versionNumber: number = 0;

  constructor(private amortization: Amortization) {}

  get versionNumber(): number {
    return this._versionNumber;
  }

  set versionNumber(value: number) {
    this._versionNumber = value;
  }

  replaceVersions(versions: AmortizationVersion[]): void {
    this.versions = cloneDeep(versions);
  }

  increaseVersionNumber() {
    this._versionNumber++;
  }

  public getAmortization(): Amortization {
    return this.amortization;
  }

  public hasChanges(): boolean {
    const previewChanges = this.previewChanges();
    return Object.keys(previewChanges.inputChanges).length > 0;
  }

  public hasNewInputChanges(inputChanges: Record<string, { oldValue: any; newValue: any }>): boolean {
    const previewChanges = this.previewChanges();
    // before going into comparison lets check if the inputChanges has any keys
    if (Object.keys(inputChanges).length === 0 && Object.keys(previewChanges.inputChanges).length === 0) {
      return false;
    }

    if (Object.keys(inputChanges).length !== Object.keys(previewChanges.inputChanges).length) {
      return true;
    }

    return Object.keys(previewChanges.inputChanges).some((key) => {
      return previewChanges.inputChanges[key].newValue !== inputChanges[key].newValue;
    });
  }
  /**
   * Returns a preview of what would change if we committed the current state
   * right now, without actually committing.
   */
  public previewChanges(): {
    inputChanges: Record<string, { oldValue: any; newValue: any }>;
    outputChanges: Record<string, { oldValue: any; newValue: any }>;
  } {
    // 1. Pull the current in-memory snapshot
    const fullNewSnapshot = cloneDeep(this.amortization.json);

    // 2. Grab the latest committed snapshot (if any)
    const lastVersion = this.versions[this.versions.length - 1];
    const fullOldSnapshot = inflateAmortizationIfNeeded(lastVersion?.snapshot || {});
    const fullOldSnapshotJson = fullOldSnapshot?.json || {};

    // 3. Prepare diff maps
    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    // 4. Compute the diffs (using the same function as commitTransaction)
    computeDualDiff(fullOldSnapshotJson, fullNewSnapshot, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    // 5. Return them (no commit performed)
    return { inputChanges, outputChanges };
  }

  /**
   * Commits the current state as a new version, splitting changes into
   * "inputChanges" vs. "outputChanges."
   */
  commitTransaction(commitMessage?: string): AmortizationVersion {
    const fullNewSnapshot = cloneDeep(this.amortization.json);
    const lastVersion = this.versions[this.versions.length - 1];
    const fullOldSnapshot = inflateAmortizationIfNeeded(lastVersion?.snapshot || {});
    const fullOldSnapshotJson = fullOldSnapshot?.json || {};
    // console.log("fullOldSnapshotJson", fullOldSnapshotJson);
    // console.log("lastVersion", lastVersion);

    // We'll track two separate result objects
    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    // Compute diffs in one pass
    computeDualDiff(fullOldSnapshotJson, fullNewSnapshot, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    this.increaseVersionNumber();

    const version: AmortizationVersion = {
      versionId: generateVersionId(this.versionNumber),
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
   * Method that returns if versionId is latest version
   * @param versionId
   * @returns boolean
   */

  public isLatestVersion(versionId: string): boolean {
    return this.versions[this.versions.length - 1].versionId === versionId;
  }

  /**
   * Rolls back to an older version by rehydrating a new Amortization
   * from that version's full snapshot.
   * Then commits a new version flagged as a rollback.
   */
  public rollback(versionId: string, commitMessage?: string): AmortizationVersion {
    // you cannot rollback to the current version, lets check for that
    if (this.versions.length === 0) {
      throw new Error("No versions to rollback to");
    }

    if (this.isLatestVersion(versionId)) {
      throw new Error("Cannot rollback to the current version");
    }

    const targetVersion = this.versions.find((v) => v.versionId === versionId);
    if (!targetVersion) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const targetVersionSnapshot = inflateAmortizationIfNeeded(targetVersion?.snapshot || {});

    // Rebuild from old snapshot
    const oldSnapshot = targetVersionSnapshot;

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
    const fullOldSnapshot = inflateAmortizationIfNeeded(lastVersion?.snapshot || {});
    const fullOldSnapshotJson = fullOldSnapshot?.json || {};

    const inputChanges: Record<string, { oldValue: any; newValue: any }> = {};
    const outputChanges: Record<string, { oldValue: any; newValue: any }> = {};

    computeDualDiff(fullOldSnapshotJson, fullNewSnapshot, [], inputChanges, outputChanges, this.excludedPaths, this.outputPaths);

    this.increaseVersionNumber();
    const rollbackVersion: AmortizationVersion = {
      versionId: generateVersionId(this.versionNumber),
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
    if (includeDeleted) {
      const toReturn = [...this.versions];
      return toReturn;
    } else {
      const toReturn = this.versions.filter((v) => !v.isDeleted);
      console.log("toReturn ELSE", toReturn);
      return toReturn;
    }
  }

  /**
   * Exports the Version Manager as a plain JSON object that includes:
   *   - all versions (each with its snapshot, diffs, etc.)
   *   - the current amortization’s snapshot
   */
  public toJSON(): any {
    // We'll store the entire versions array plus the current amortization JSON.
    return {
      versionNumber: this.versionNumber,
      // Make sure to store the *raw* array, not a reference.
      versions: JSON.parse(JSON.stringify(this.versions)),

      // Also include the current (live) Amortization in JSON form
      currentAmortization: this.amortization.json,
    };
  }

  /**
   * Recreates a Version Manager from the plain JSON data produced by toJSON().
   *   - Rebuilds the current Amortization from the stored snapshot
   *   - Restores the versions array as-is
   *
   * If you want to avoid the “smart” constructor logic that flips flags, you
   * can call `Amortization.fromSnapshotDirect(...)`. If your normal constructor
   * is safe, you can just do `new Amortization(...)`.
   */
  public static fromJSON(data: any): AmortizationVersionManager {
    if (!data || !data.currentAmortization) {
      throw new Error("Invalid data: missing currentAmortization");
    }

    // 1. Rebuild the current amortization.
    //    If you have a “fromSnapshotDirect” method, use it here:
    //       const am = Amortization.fromSnapshotDirect(data.currentAmortization);
    //
    //    Otherwise, if it's safe to call the normal constructor, do:
    const am = new Amortization(data.currentAmortization);

    // 2. Create a new manager with that amortization
    const manager = new AmortizationVersionManager(am);
    manager.versionNumber = data.versionNumber || 0;

    // 3. Restore the versions array (each version is plain data:
    //    we don't need special logic unless you want additional validation).
    if (Array.isArray(data.versions)) {
      manager.versions = data.versions.map((v: any) => {
        // If you want to ensure the shape is correct,
        // or do any casting, do it here. Otherwise, just store as is.
        return {
          versionId: v.versionId,
          timestamp: v.timestamp,
          commitMessage: v.commitMessage,
          snapshot: v.snapshot, // The old amortization snapshot
          inputChanges: v.inputChanges,
          outputChanges: v.outputChanges,
          isDeleted: v.isDeleted,
          isRollback: v.isRollback,
          rolledBackFromVersionId: v.rolledBackFromVersionId,
        } as AmortizationVersion;
      });
    }

    return manager;
  }

  public static versionsFromJSON(data: any): AmortizationVersion[] {
    let versions: AmortizationVersion[] = [];

    if (Array.isArray(data.versions)) {
      versions = data.versions.map((v: any) => {
        // If you want to ensure the shape is correct,
        // or do any casting, do it here. Otherwise, just store as is.
        return {
          versionId: v.versionId,
          timestamp: v.timestamp,
          commitMessage: v.commitMessage,
          snapshot: v.snapshot, // The old amortization snapshot
          inputChanges: v.inputChanges,
          outputChanges: v.outputChanges,
          isDeleted: v.isDeleted,
          isRollback: v.isRollback,
          rolledBackFromVersionId: v.rolledBackFromVersionId,
        } as AmortizationVersion;
      });
    }

    return versions;
  }
}

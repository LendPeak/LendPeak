import { TermExtension, TermExtensionParams } from './TermExtension';

export class TermExtensions {
  private _extensions: TermExtension[] = [];
  private _modified = false;
  onChange?: () => void;

  constructor(
    extensions: TermExtension[] | TermExtensionParams[] = [],
    config?: any // no longer supports emiRecalculationMode/Term at collection level
  ) {
    this.extensions = extensions as any;
    this.updateJsValues();
  }

  get modified(): boolean {
    return this._modified || this._extensions.some((e) => e.modified);
  }
  set modified(v: boolean) {
    this._modified = v;
  }
  get hasModified(): boolean {
    return this.modified;
  }
  resetModified(): void {
    this.modified = false;
    this._extensions.forEach((e) => (e.modified = false));
  }

  updateModelValues(): void {
    this._extensions.forEach((e) => e.updateModelValues());
  }
  updateJsValues(): void {
    this._extensions.forEach((e) => e.updateJsValues());
  }

  get extensions(): TermExtension[] {
    return this._extensions;
  }
  set extensions(vals: TermExtension[] | TermExtensionParams[]) {
    this.modified = true;
    this._extensions = vals.map((v) => (v instanceof TermExtension ? v : new TermExtension(v)));
    if (this.onChange) this.onChange();
  }

  get all(): TermExtension[] {
    return this._extensions;
  }
  get active(): TermExtension[] {
    return this._extensions.filter((e) => e.active);
  }

  deactivateAll(): void {
    this._extensions.forEach((e) => (e.active = false));
    if (this.onChange) this.onChange();
  }
  activateAll(): void {
    this._extensions.forEach((e) => (e.active = true));
    if (this.onChange) this.onChange();
  }

  addExtension(ext: TermExtension): void {
    this.modified = true;
    this._extensions.push(ext);
    if (this.onChange) this.onChange();
  }
  removeExtensionAtIndex(idx: number): void {
    this.modified = true;
    this._extensions.splice(idx, 1);
    if (this.onChange) this.onChange();
  }
  removeAll() {
    this._extensions = [];
    if (this.onChange) this.onChange();
  }

  get length(): number {
    return this._extensions.length;
  }
  atIndex(idx: number): TermExtension {
    return this._extensions[idx];
  }
  get first(): TermExtension {
    return this._extensions[0];
  }
  get last(): TermExtension {
    return this._extensions[this._extensions.length - 1];
  }

  getTotalActiveExtensionQuantity(): number {
    return this.active.reduce((sum, ext) => sum + ext.quantity, 0);
  }

  get json() {
    return this._extensions.map((e) => e.json);
  }
  toJSON() {
    return this.json;
  }

  /**
   * Returns the first active extension with EMI recalculation enabled (mode !== 'none'), or undefined.
   */
  get nextEmiRecalculationExtension(): TermExtension | undefined {
    return this.active.find((e) => e.emiRecalculationMode && e.emiRecalculationMode !== 'none');
  }
}

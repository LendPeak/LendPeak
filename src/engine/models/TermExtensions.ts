import { TermExtension, TermExtensionParams } from './TermExtension';

export class TermExtensions {
  private _extensions: TermExtension[] = [];
  private _modified = false;
  onChange?: () => void;
  emiRecalculationMode: 'fromStart' | 'fromTerm' = 'fromStart';
  emiRecalculationTerm?: number;

  constructor(
    extensions: TermExtension[] | TermExtensionParams[] = [],
    config?: { emiRecalculationMode?: 'fromStart' | 'fromTerm'; emiRecalculationTerm?: number }
  ) {
    this.extensions = extensions as any;
    this.updateJsValues();
    if (config) {
      if (config.emiRecalculationMode) this.emiRecalculationMode = config.emiRecalculationMode;
      if (typeof config.emiRecalculationTerm === 'number') this.emiRecalculationTerm = config.emiRecalculationTerm;
    }
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

  setEmiRecalculationMode(mode: 'fromStart' | 'fromTerm') {
    this.emiRecalculationMode = mode;
    if (this.onChange) this.onChange();
  }
  setEmiRecalculationTerm(term: number) {
    this.emiRecalculationTerm = term;
    if (this.onChange) this.onChange();
  }
}

import { TermExtension, TermExtensionParams } from './TermExtension';

export class TermExtensions {
  private _extensions: TermExtension[] = [];
  private _modified = false;

  constructor(exts: (TermExtension | TermExtensionParams)[] = []) {
    this.extensions = exts as any;
  }

  get modified(): boolean {
    return this._modified || this._extensions.some((e) => e.jsActive !== undefined);
  }
  set modified(v: boolean) {
    this._modified = v;
  }

  get extensions(): TermExtension[] {
    return this._extensions;
  }
  set extensions(vals: (TermExtension | TermExtensionParams)[]) {
    this._extensions = vals.map((v) =>
      v instanceof TermExtension ? v : new TermExtension(v)
    );
    this._modified = true;
  }

  get all(): TermExtension[] {
    return this._extensions;
  }

  get active(): TermExtension[] {
    return this._extensions.filter((e) => e.active);
  }

  activateAll() {
    this._extensions.forEach((e) => (e.active = true));
  }

  deactivateAll() {
    this._extensions.forEach((e) => (e.active = false));
  }

  addExtension(ext: TermExtension) {
    this._extensions.push(ext);
    this._modified = true;
  }

  removeExtension(ext: TermExtension) {
    this._extensions = this._extensions.filter((e) => e !== ext);
    this._modified = true;
  }

  removeExtensionAtIndex(idx: number) {
    this._extensions.splice(idx, 1);
    this._modified = true;
  }

  get length(): number {
    return this._extensions.length;
  }

  atIndex(i: number): TermExtension {
    return this._extensions[i];
  }

  get first(): TermExtension {
    return this._extensions[0];
  }

  get last(): TermExtension {
    return this._extensions[this._extensions.length - 1];
  }

  updateModelValues() {
    this._extensions.forEach((e) => e.updateModelValues());
  }

  updateJsValues() {
    this._extensions.forEach((e) => e.updateJsValues());
  }

  get json() {
    return this._extensions.map((e) => e.json);
  }

  toJSON() {
    return this.json;
  }
}

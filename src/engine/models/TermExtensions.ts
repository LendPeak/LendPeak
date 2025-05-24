import { TermExtension, TermExtensionParams } from './TermExtension';

export class TermExtensions {
  private _termExtensions: TermExtension[] = [];
  private _modified = false;

  constructor(extensions: TermExtension[] | TermExtensionParams[] = []) {
    this._termExtensions = extensions.map(ext =>
      ext instanceof TermExtension ? ext : new TermExtension(ext),
    );
  }

  updateModelValues(): void {
    this._termExtensions.forEach(ext => ext.updateModelValues());
  }

  updateJsValues(): void {
    this._termExtensions.forEach(ext => ext.updateJsValues());
  }

  get all(): TermExtension[] {
    return this._termExtensions;
  }

  get active(): TermExtension[] {
    return this._termExtensions.filter(ext => ext.active);
  }

  addTermExtension(extension: TermExtension | TermExtensionParams): void {
    const newExtension =
      extension instanceof TermExtension ? extension : new TermExtension(extension);
    this._termExtensions.push(newExtension);
    this._modified = true;
  }

  removeTermExtension(extensionToRemove: TermExtension): void {
    this._termExtensions = this._termExtensions.filter(
      ext => ext !== extensionToRemove,
    );
    this._modified = true;
  }

  removeConfigurationAtIndex(index: number): void {
    if (index >= 0 && index < this._termExtensions.length) {
      this._termExtensions.splice(index, 1);
      this._modified = true;
    }
  }

  activateAll(): void {
    this._termExtensions.forEach(ext => (ext.active = true));
    this._modified = true;
  }

  deactivateAll(): void {
    this._termExtensions.forEach(ext => (ext.active = false));
    this._modified = true;
  }

  reSort(): void {
    this._termExtensions.sort((a, b) => {
      if (a.date.isBefore(b.date)) {
        return -1;
      }
      if (a.date.isAfter(b.date)) {
        return 1;
      }
      return 0;
    });
  }

  get json(): TermExtensionParams[] {
    return this._termExtensions.map(ext => ext.json);
  }

  toJSON(): TermExtensionParams[] {
    return this.json;
  }

  get modified(): boolean {
    return this._modified;
  }

  set modified(v: boolean) {
    this._modified = v;
  }

  get length(): number {
    return this._termExtensions.length;
  }
}

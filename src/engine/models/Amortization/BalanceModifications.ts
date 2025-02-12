import { BalanceModification } from "./BalanceModification";

export class BalanceModifications {
  private _balanceModifications: BalanceModification[] = [];

  constructor(balanceModifications: BalanceModification[] = []) {
    this.balanceModifications = balanceModifications;
  }



  get all(): BalanceModification[] {
    return this._balanceModifications;
  }

  get balanceModifications(): BalanceModification[] {
    return this._balanceModifications;
  }

  set balanceModifications(value: BalanceModification[]) {
    this._balanceModifications = value.sort((a, b) => {
      return a.date.diff(b.date);
    });
  }

  get lastModification(): BalanceModification | undefined {
    return this._balanceModifications[this._balanceModifications.length - 1];
  }

  get firstModification(): BalanceModification | undefined {
    return this._balanceModifications[0];
  }

  addBalanceModification(balanceModification: BalanceModification) {
    this._balanceModifications.push(balanceModification);
  }

  removeBalanceModification(balanceModification: BalanceModification) {
    this._balanceModifications = this._balanceModifications.filter((bm) => bm.id !== balanceModification.id);
  }

  removeBalanceModificationAtIndex(index: number) {
    this._balanceModifications.splice(index, 1);
  }

  getBalanceModificationById(id: string): BalanceModification | undefined {
    return this._balanceModifications.find((bm) => bm.id === id);
  }

  getBalanceModificationIndexById(id: string): number {
    return this._balanceModifications.findIndex((bm) => bm.id === id);
  }

  getBalanceModificationIndex(balanceModification: BalanceModification): number {
    return this._balanceModifications.findIndex((bm) => bm.id === balanceModification.id);
  }

  getBalanceModificationByIndex(index: number): BalanceModification | undefined {
    return this._balanceModifications[index];
  }

  getBalanceModificationCount(): number {
    return this._balanceModifications.length;
  }

  resetUsedAmounts() {
    this._balanceModifications.forEach((bm) => bm.resetUsedAmount());
  }

  updateModelValues() {
    this._balanceModifications.forEach((bm) => bm.updateModelValues());
  }

  updateJsValues() {
    this._balanceModifications.forEach((bm) => bm.updateJsValues());
  }

  get json() {
    return this._balanceModifications.map((bm) => bm.json);
  }

  get length() {
    return this._balanceModifications.length;
  }
}

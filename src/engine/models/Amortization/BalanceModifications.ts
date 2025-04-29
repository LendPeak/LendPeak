import { BalanceModification } from "./BalanceModification";
import { Currency } from "../../utils/Currency";
import { LocalDate, ZoneId, ChronoUnit } from "@js-joda/core";

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
    // console.trace("setting balance modification", value);
    this._balanceModifications = value
      .map((bm) => {
        if (bm instanceof BalanceModification) {
          return bm;
        } else {
          return new BalanceModification(bm);
        }
      })
      .filter((bm) => bm.amount.greaterThan(0) && bm.isSystemModification !== true)
      .sort((a, b) => ChronoUnit.DAYS.between(a.date, b.date));
  }

  get lastModification(): BalanceModification | undefined {
    return this._balanceModifications[this._balanceModifications.length - 1];
  }

  get firstModification(): BalanceModification | undefined {
    return this._balanceModifications[0];
  }

  removeMarkedForRemoval() {
    this._balanceModifications = this._balanceModifications.filter((bm) => !bm.markedForRemoval);
  }

  removeBalanceModificationByDepositId(depositId: string) {
    this._balanceModifications = this._balanceModifications.filter((bm) => !(bm.metadata && bm.metadata.depositId === depositId));
  }

  removeSystemGeneratedBalanceModifications() {
    this._balanceModifications = this._balanceModifications.filter((bm) => bm.metadata && bm.metadata.isSystemGenerated !== true);
  }

  addBalanceModification(balanceModification: BalanceModification): boolean {
    // before adding balance modification, lets check if it already exists
    // we will use bm.metadata.depositId, amount, date, and type
    // to find if the balance modification already exists
    const existingBalanceModification = this._balanceModifications.find((bm) => {
      if (bm.metadata && balanceModification.metadata) {
        return bm.metadata.depositId === balanceModification.metadata.depositId && bm.amount.equals(balanceModification.amount) && bm.date.isEqual(balanceModification.date) && bm.type === balanceModification.type;
      }
      return false;
    });

    if (existingBalanceModification) {
      return false;
    } else {
      this._balanceModifications.push(balanceModification);
      return true;
    }
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

  get summary() {
    let total = Currency.of(0);
    let increases = Currency.of(0);
    let decreases = Currency.of(0);

    this.all.forEach((bm) => {
      if (bm.type === "increase") {
        increases = increases.add(bm.amount);
        total = total.add(bm.amount);
      }
      if (bm.type === "decrease") {
        decreases = decreases.add(bm.amount);
        total = total.subtract(bm.amount);
      }
    });

    return {
      total: total,
      increases: increases,
      decreases: decreases,
    };
  }

  get json() {
    return this._balanceModifications.map((bm) => bm.json);
  }

  get length() {
    return this._balanceModifications.length;
  }

  toCode() {
    // we dont want system generated balance modifications
    return this._balanceModifications
      .filter((bm) => bm.isSystemModification !== true)
      .map((bm) => {
        return `new BalanceModification(${JSON.stringify(bm.json)})`;
      });
  }

  printToConsole() {
    console.log("Balance Modifications");
    console.table(
      this.all.map((r) => {
        return {
          id: r.id,
          amount: r.amount.toNumber(),
          unusedAmount: r.unusedAmount.toNumber(),
          date: r.date.toString(),
          type: r.type,
          description: r.description,
          metadata: r.metadata,
        };
      })
    );
  }
}

/* TermPaymentAmounts.ts */
import { TermPaymentAmount, TermPaymentAmountParams } from "./TermPaymentAmount";

export class TermPaymentAmounts {
  private _paymentAmounts: TermPaymentAmount[] = [];
  private _modified = false;

  /* ─────────────────────────────────────────── */
  constructor(paymentAmounts: TermPaymentAmount[] | TermPaymentAmountParams[] = []) {
    this.paymentAmounts = paymentAmounts as any;
    this.updateJsValues();
  }

  /* ===== modified flag (aggregate) ===== */
  get modified(): boolean {
    return this._modified || this._paymentAmounts.some((p) => p.modified);
  }
  set modified(v: boolean) {
    this._modified = v;
  }
  get hasModified(): boolean {
    return this.modified;
  }
  resetModified(): void {
    this.modified = false;
    this._paymentAmounts.forEach((p) => (p.modified = false));
  }

  /* ===== model/JS sync helpers ===== */
  updateModelValues(): void {
    this._paymentAmounts.forEach((p) => p.updateModelValues());
  }
  updateJsValues(): void {
    this._paymentAmounts.forEach((p) => p.updateJsValues());
  }

  /* ===== getters / setters ===== */
  get paymentAmounts(): TermPaymentAmount[] {
    return this._paymentAmounts;
  }
  set paymentAmounts(vals: TermPaymentAmount[] | TermPaymentAmountParams[]) {
    this.modified = true;
    this._paymentAmounts = vals.map((v) => (v instanceof TermPaymentAmount ? v : new TermPaymentAmount(v)));
  }

  /* ------ convenience collections ------ */
  get all(): TermPaymentAmount[] {
    return this._paymentAmounts;
  }
  get active(): TermPaymentAmount[] {
    return this._paymentAmounts.filter((p) => p.active);
  }

  /* ===== activation helpers ===== */
  deactivateAll(): void {
    this._paymentAmounts.forEach((p) => (p.active = false));
  }
  activateAll(): void {
    this._paymentAmounts.forEach((p) => (p.active = true));
  }

  /* ===== CRUD ===== */
  addPaymentAmount(pa: TermPaymentAmount): void {
    this.modified = true;
    this._paymentAmounts.push(pa);
  }
  removePaymentAmountAtIndex(idx: number): void {
    this.modified = true;
    this._paymentAmounts.splice(idx, 1);
  }

  /* ===== look-ups ===== */
  get length(): number {
    return this._paymentAmounts.length;
  }
  atIndex(idx: number): TermPaymentAmount {
    return this._paymentAmounts[idx];
  }
  get first(): TermPaymentAmount {
    return this._paymentAmounts[0];
  }
  get last(): TermPaymentAmount {
    return this._paymentAmounts[this._paymentAmounts.length - 1];
  }

  /** returns the *first active* override for the term (or undefined) */
  getPaymentAmountForTerm(termNumber: number): TermPaymentAmount | undefined {
    return this._paymentAmounts.find((p) => p.active && p.termNumber === termNumber);
  }

  /* ===== utils ===== */
  isDuplicateTermNumber(termNumber: number): boolean {
    return this._paymentAmounts.filter((p) => p.termNumber === termNumber).length > 1;
  }
  reSort(): void {
    this._paymentAmounts.sort((a, b) => a.termNumber - b.termNumber);
  }

  /* ===== serialization ===== */
  get json() {
    return this._paymentAmounts.map((p) => p.json);
  }
  toJSON() {
    return this.json;
  }
}

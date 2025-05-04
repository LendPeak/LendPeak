import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import {
  RefundRecord,
  RefundMetadata,
} from 'lendpeak-engine/models/RefundRecord';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';

/**
 * Opens inside a DynamicDialog shell created by DialogService.
 * Contains its own <p-dialog> that binds to `visible`.
 */
@Component({
  selector: 'app-refund-dialog',
  templateUrl: './refund-dialog.component.html',
  styleUrls: ['./refund-dialog.component.css'],
  standalone: false,
})
export class RefundDialogComponent implements OnInit {
  /** inner PrimeNG dialog visibility */
  visible = true;

  /** supplied by the parent via `DialogService.open()` */
  deposit!: DepositRecord;

  /** present iff we’re editing an existing refund */
  existingRefund?: RefundRecord;

  /** form fields */
  jsAmount = 0;
  jsDate: Date = new Date();
  reason = '';

  constructor(
    private ref: DynamicDialogRef,
    private cfg: DynamicDialogConfig,
  ) {}

  /* ─────────────────────────────────────────────────────────────── */
  /*  INITIALISE                                                    */
  /* ─────────────────────────────────────────────────────────────── */
  ngOnInit(): void {
    this.deposit = this.cfg.data.deposit as DepositRecord;
    this.existingRefund = this.cfg.data.refund as RefundRecord | undefined;

    if (this.existingRefund) {
      /* ---------- edit mode ---------- */
      this.jsAmount = this.existingRefund.amount.toNumber();
      this.jsDate = this.existingRefund.jsEffectiveDate ?? new Date();
      this.reason = this.existingRefund.metadata?.reason ?? '';
    } else {
      /* ---------- create mode ---------- */
      const unused = this.deposit.unusedAmount;
      if (!unused.isZero()) {
        this.jsAmount = unused.toNumber();
      } else {
        /* original = current net + sum(refunds) */
        const original = this.deposit.amount.add(this.deposit.refundedAmount);
        this.jsAmount = original.toNumber();
      }
      this.jsDate = this.deposit.jsEffectiveDate ?? new Date();
    }
  }

  /* ─────────────────────────────────────────────────────────────── */
  /*  SAVE                                                          */
  /* ─────────────────────────────────────────────────────────────── */
  save(): void {
    const newAmt = Currency.of(this.jsAmount);
    if (newAmt.isZero() || newAmt.isNegative()) return;

    const effDate = DateUtil.normalizeDate(this.jsDate);
    const meta: RefundMetadata = this.reason ? { reason: this.reason } : {};

    if (this.existingRefund) {
      /* -------- UPDATE -------- */
      const delta = this.existingRefund.amount.subtract(newAmt); // + if we decreased amount
      this.deposit.amount = this.deposit.amount.add(delta); // restore / deduct cash
      this.existingRefund.amount = newAmt;
      this.existingRefund.effectiveDate = effDate;
      this.existingRefund.metadata = meta;
      this.deposit.versionChanged();
    } else {
      /* -------- CREATE -------- */
      const refund = new RefundRecord({
        amount: newAmt,
        currency: this.deposit.currency,
        effectiveDate: effDate,
        metadata: meta,
      });
      this.deposit.addRefund(refund); // adjusts deposit.amount
    }

    this.ref.close(true); // tell caller a change happened
  }

  /* ─────────────────────────────────────────────────────────────── */
  /*  CLOSE                                                         */
  /* ─────────────────────────────────────────────────────────────── */
  close(): void {
    this.visible = false; // hide inner <p-dialog>
    this.ref.close(); // destroy DynamicDialog wrapper
  }
}

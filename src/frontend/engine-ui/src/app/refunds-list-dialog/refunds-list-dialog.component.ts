import { Component, OnInit } from '@angular/core';
import {
  DynamicDialogRef,
  DynamicDialogConfig,
  DialogService,
} from 'primeng/dynamicdialog';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { RefundRecord } from 'lendpeak-engine/models/RefundRecord';
import { RefundDialogComponent } from '../refund-dialog/refund-dialog.component';

@Component({
  selector: 'app-refunds-list-dialog',
  templateUrl: './refunds-list-dialog.component.html',
  styleUrls: ['./refunds-list-dialog.component.css'],
  standalone: false,
})
export class RefundsListDialogComponent implements OnInit {
  visible = true;
  deposit!: DepositRecord;

  constructor(
    private ref: DynamicDialogRef,
    private cfg: DynamicDialogConfig,
    private dlg: DialogService,
  ) {}

  ngOnInit(): void {
    this.deposit = this.cfg.data.deposit;
  }

  /* enable / disable simply flips .active and bumps version */
  toggleActive(r: RefundRecord) {
    this.deposit.versionChanged();
  }

  edit(refund: RefundRecord) {
    /* open the same refund dialog but pass the existing refund */
    this.dlg.open(RefundDialogComponent, {
      header: 'Edit Refund',
      width: '30%',
      data: { deposit: this.deposit, refund },
    });
  }

  remove(index: number) {
    const [removed] = this.deposit.refunds.splice(index, 1);
    /* restore deposit.amount */
    this.deposit.amount = this.deposit.amount.add(removed.amount);
    this.deposit.versionChanged();
  }

  close(changed = true) {
    this.visible = false; // hides inner p-dialog
    this.ref.close(changed); // closes the outer dynamic dialog
  }
}

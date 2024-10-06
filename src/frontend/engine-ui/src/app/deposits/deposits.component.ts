// deposits.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LoanDeposit } from '../models/loan-deposit.model';
import { DropDownOptionString } from '../models/common.model';
import { Currency } from 'lendpeak-engine/utils/Currency';

@Component({
  selector: 'app-deposits',
  templateUrl: './deposits.component.html',
  styleUrls: ['./deposits.component.css'],
})
export class DepositsComponent {
  @Input() deposits: LoanDeposit[] = [];
  @Input() currencyOptions: DropDownOptionString[] = [];

  @Output() depositsChange = new EventEmitter<LoanDeposit[]>();
  @Output() depositUpdated = new EventEmitter<void>();

  // For dialog control
  showDepositDialog: boolean = false;
  showDepositUsageDetailsDialog: boolean = false;
  selectedDepositForEdit: LoanDeposit | null = null;
  selectedDeposit: LoanDeposit | null = null;
  depositData: any = {};

  openDepositDialog(deposit?: LoanDeposit) {
    if (deposit) {
      // Edit existing deposit
      this.selectedDepositForEdit = deposit;
      this.depositData = { ...deposit };
      if (deposit.effectiveDate) {
        this.depositData.effectiveDate = new Date(deposit.effectiveDate);
      }
      if (deposit.clearingDate) {
        this.depositData.clearingDate = new Date(deposit.clearingDate);
      }
    } else {
      // Add new deposit
      this.selectedDepositForEdit = null;
      this.depositData = {
        amount: 0,
        currency: 'USD',
        effectiveDate: new Date(),
        clearingDate: null,
        paymentMethod: '',
        depositor: '',
        depositLocation: '',
      };
    }
    this.showDepositDialog = true;
  }

  onDepositDialogHide() {
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
    this.depositData = {};
  }

  saveDeposit() {
    if (this.selectedDepositForEdit) {
      // Update existing deposit
      Object.assign(this.selectedDepositForEdit, this.depositData);
    } else {
      // Add new deposit
      const newDeposit: LoanDeposit = {
        id: this.generateUniqueId(),
        amount: this.depositData.amount,
        currency: this.depositData.currency,
        createdDate: new Date(),
        insertedDate: new Date(),
        effectiveDate: this.depositData.effectiveDate,
        clearingDate: this.depositData.clearingDate,
        systemDate: new Date(),
        paymentMethod: this.depositData.paymentMethod,
        depositor: this.depositData.depositor,
        depositLocation: this.depositData.depositLocation,
        usageDetails: [],
      };
      this.deposits.push(newDeposit);
    }
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
    this.depositData = {};
  }

  removeDeposit(deposit: LoanDeposit) {
    this.deposits = this.deposits.filter((d) => d.id !== deposit.id);
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
  }

  viewDepositUsageDetails(deposit: LoanDeposit) {
    this.selectedDeposit = deposit;
    this.showDepositUsageDetailsDialog = true;
  }

  generateUniqueId(): string {
    // Simple unique ID generator (you can replace this with UUID if needed)
    return 'DEPOSIT-' + Math.random().toString(36).substr(2, 9);
  }
}

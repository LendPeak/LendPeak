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
        if (deposit.excessAppliedDate) {
          this.depositData.excessAppliedDate = new Date(
            deposit.excessAppliedDate
          );
        } else {
          this.depositData.excessAppliedDate = null;
        }
        this.depositData.applyExcessToPrincipal =
          deposit.applyExcessToPrincipal ?? false;
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
          applyExcessToPrincipal: false,
          excessAppliedDate: null,
        };
      }
      this.showDepositDialog = true;
    }

    onDepositDialogHide() {
      this.showDepositDialog = false;
      this.selectedDepositForEdit = null;
      this.depositData = {};
      this.depositUpdated.emit();
    }

    saveDeposit() {
      if (
        this.depositData.applyExcessToPrincipal &&
        !this.depositData.excessAppliedDate
      ) {
        this.depositData.excessAppliedDate = new Date(); // Default to today
      } else if (!this.depositData.applyExcessToPrincipal) {
        this.depositData.excessAppliedDate = null;
      }

      if (this.selectedDepositForEdit) {
        // Update existing deposit
        Object.assign(this.selectedDepositForEdit, this.depositData);
      } else {
        // Add new deposit
        // get last deposit id
        let depositCount = this.deposits.length + 1;
        const newDeposit: LoanDeposit = {
          id: this.generateUniqueId(depositCount),
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
          applyExcessToPrincipal: this.depositData.applyExcessToPrincipal,
          excessAppliedDate: this.depositData.excessAppliedDate,
        };
        this.deposits.push(newDeposit);
      }
      this.depositsChange.emit(this.deposits);
      this.depositUpdated.emit();
      this.showDepositDialog = false;
      this.selectedDepositForEdit = null;
      this.depositData = {};
    }

    onApplyExcessToPrincipalChange(event: any) {
      if (event.checked) {
        this.depositData.excessAppliedDate = new Date();
      } else {
        this.depositData.excessAppliedDate = null;
      }
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

    generateUniqueId(sequence?: number): string {
      // Simple unique ID generator (you can replace this with UUID if needed)
      const sequencePrefix = sequence !== undefined ? `${sequence}-` : '';
      return (
        'DEPOSIT-' + sequencePrefix + Math.random().toString(36).substr(2, 9)
      );
    }
  }

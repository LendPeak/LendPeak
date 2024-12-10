// deposits.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { DropDownOptionString } from '../models/common.model';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';

@Component({
  selector: 'app-deposits',
  templateUrl: './deposits.component.html',
  styleUrls: ['./deposits.component.css'],
})
export class DepositsComponent {
  @Input() deposits: DepositRecord[] = [];
  @Input() currencyOptions: DropDownOptionString[] = [];

  @Output() depositsChange = new EventEmitter<DepositRecord[]>();
  @Output() depositUpdated = new EventEmitter<void>();

  @ViewChildren('depositRow', { read: ElementRef })
  depositRows!: QueryList<ElementRef>;

  // For dialog control
  showDepositDialog: boolean = false;
  showDepositUsageDetailsDialog: boolean = false;
  selectedDepositForEdit: DepositRecord | null = null;
  selectedDeposit: DepositRecord | null = null;
  depositData: DepositRecord = this.getEmptyDepositData();

  highlightedDepositId?: string;

  ngAfterViewInit(): void {
    // After view init, rows are available if we need further logic
  }

  scrollToLastDeposit() {
    if (this.deposits.length === 0) {
      return;
    }

    // Last deposit is the last in the array
    const lastDeposit = this.deposits[this.deposits.length - 1];
    this.highlightedDepositId = lastDeposit.id;

    // Wait a tick to ensure query list is updated if deposits changed
    setTimeout(() => {
      const lastRow = this.depositRows.last;
      if (lastRow && lastRow.nativeElement) {
        lastRow.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 0);
  }

  isDepositHighlighted(deposit: DepositRecord): boolean {
    return this.highlightedDepositId === deposit.id;
  }
  
  getEmptyDepositData(): DepositRecord {
    return new DepositRecord({
      amount: 0,
      sequence: this.deposits.length + 1,
      currency: 'USD',
      effectiveDate: new Date(),
      depositor: '',
      depositLocation: '',
      applyExcessToPrincipal: false,
      excessAppliedDate: undefined,
    });
  }

  openDepositDialog(deposit?: DepositRecord) {
    if (deposit) {
      // Edit existing deposit
      this.selectedDepositForEdit = deposit;
      this.depositData = deposit;
      if (deposit.effectiveDate) {
        this.depositData.effectiveDate = deposit.effectiveDate;
      }
      if (deposit.clearingDate) {
        this.depositData.clearingDate = deposit.clearingDate;
      }
      if (deposit.excessAppliedDate) {
        this.depositData.excessAppliedDate = deposit.excessAppliedDate;
      } else {
        this.depositData.excessAppliedDate = undefined;
      }
      this.depositData.applyExcessToPrincipal =
        deposit.applyExcessToPrincipal ?? false;
    } else {
      // Add new deposit
      this.depositData = this.getEmptyDepositData();
      this.selectedDepositForEdit = null;
    }
    this.showDepositDialog = true;
  }

  onDataChange(event: any) {
    this.depositData.syncValuesFromJSProperties();

    if (
      this.depositData.applyExcessToPrincipal &&
      this.depositData.effectiveDate.isAfter(this.depositData.excessAppliedDate)
    ) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    }
  }

  onDepositDialogHide() {
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
    this.depositUpdated.emit();
  }

  saveDeposit() {
    if (
      this.depositData.applyExcessToPrincipal &&
      !this.depositData.jsExcessAppliedDate
    ) {
      this.depositData.jsExcessAppliedDate = this.depositData.jsEffectiveDate;
    } else if (!this.depositData.applyExcessToPrincipal) {
      this.depositData.jsExcessAppliedDate = undefined;
    }

    this.depositData.syncJSPropertiesFromValues();

    if (this.selectedDepositForEdit) {
      // Update existing deposit
      Object.assign(this.selectedDepositForEdit, this.depositData);
    } else {
      this.deposits.push(this.depositData);
    }
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
  }

  onApplyExcessToPrincipalChange(event: any) {
    console.log('onApplyExceesToPrincipalChange triggered', event);
    if (event.checked === true) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    } else {
      this.depositData.excessAppliedDate = undefined;
    }
  }

  removeDeposit(deposit: DepositRecord) {
    this.deposits = this.deposits.filter((d) => d.id !== deposit.id);
    this.depositsChange.emit(this.deposits);
    this.depositUpdated.emit();
  }

  viewDepositUsageDetails(deposit: DepositRecord) {
    this.selectedDeposit = deposit;
    this.showDepositUsageDetailsDialog = true;
  }
}

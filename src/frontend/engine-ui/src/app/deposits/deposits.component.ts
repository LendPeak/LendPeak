import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { DropDownOptionString } from '../models/common.model';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { Amortization } from 'lendpeak-engine/models/Amortization';
import { Bills } from 'lendpeak-engine/models/Bills';
import { Bill } from 'lendpeak-engine/models/Bill';
import { Currency } from 'lendpeak-engine/utils/Currency';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import { UsageDetail } from 'lendpeak-engine/models/Bill/DepositRecord/UsageDetail';
import { StaticAllocation } from 'lendpeak-engine/models/Bill/DepositRecord/StaticAllocation';
import { Popover } from 'primeng/popover';

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

@Component({
  selector: 'app-deposits',
  templateUrl: './deposits.component.html',
  styleUrls: ['./deposits.component.css'],
  standalone: false,
})
export class DepositsComponent {
  @Input({ required: true }) loan!: Amortization;
  @Input({ required: true }) deposits: DepositRecords = new DepositRecords();
  @Input() currencyOptions: DropDownOptionString[] = [];
  @Input({ required: true }) bills: Bills = new Bills();
  @Input({ required: true }) snapshotDate: Date = new Date();
  @Input() payoffAmount: Currency = Currency.Zero();
  @Input() accruedInterestToDate: Currency = Currency.Zero();

  @Output() depositUpdated = new EventEmitter<void>();

  @ViewChildren('depositRow', { read: ElementRef })
  depositRows!: QueryList<ElementRef>;

  test: any;
  showDepositDialog: boolean = false;
  selectedDepositForEdit: DepositRecord | null = null;
  depositData: DepositRecord = this.getEmptyDepositData();
  originalDepositData: DepositRecord = this.getEmptyDepositData();

  nextDuePrincipal: Currency = Currency.Zero();
  nextDueInterest: Currency = Currency.Zero();
  nextDueFees: Currency = Currency.Zero();
  nextDueBillAmount: Currency = Currency.Zero();
  nextDueBillDate?: Date;
  isNextBillOverdue: boolean = false;
  daysPastDue: number = 0;
  totalFutureScheduledPayments: Currency = Currency.Zero();
  noUnpaidBills: boolean = false;

  amountCoveringNextDue: Currency = Currency.Zero();
  remainingUnpaidAfterDeposit: Currency = Currency.Zero();
  excessPayment: Currency = Currency.Zero();

  highlightedDepositId?: string;

  selectedDeposit: DepositRecord | null = null;
  showDepositUsageDetailsDialog: boolean = false;

  baselineNextDueBillAmount: Currency = Currency.Zero();
  baselineTotalFutureScheduledPayments: Currency = Currency.Zero();
  baselinePayoffAmount: Currency = Currency.Zero();
  baselineNextDuePrincipal: Currency = Currency.Zero();
  baselineNextDueInterest: Currency = Currency.Zero();
  baselineNextDueFees: Currency = Currency.Zero();

  selectedBillForCard: Bill | null = null;
  showBillCardDialog = false;

  viewBillCard(billId: string) {
    const found = this.bills.getBillById(billId);
    if (found) {
      this.selectedBillForCard = found;
      this.showBillCardDialog = true;
    }
  }

  // ------------------------------------------
  // BULK EDIT PROPERTIES
  // ------------------------------------------
  bulkEditMode: boolean = false;
  showBulkEditDialog: boolean = false;

  // Holds the “selected” rows when user checks the boxes
  selectedDeposits: DepositRecord[] = [];

  // The field we’re editing in bulk
  bulkAllocationType: string = 'default';

  // Our dropdown items. One is disabled, so user cannot pick it.
  bulkEditAllocationTypes: DropDownOptionString[] = [
    { label: `Loan's Default`, value: 'default', disabled: false },
    {
      label: 'Static Distribution',
      value: 'staticDistribution',
      disabled: true,
    },
  ];

  // ------------------------------------------
  // BULK EDIT METHODS
  // ------------------------------------------
  toggleBulkEdit() {
    // Toggle on/off
    this.bulkEditMode = !this.bulkEditMode;

    // If turning off, clear any selected rows
    if (!this.bulkEditMode) {
      this.selectedDeposits = [];
    }
  }

  openBulkEditDialog() {
    if (this.selectedDeposits.length === 0) return;
    this.bulkAllocationType = 'default';
    this.showBulkEditDialog = true;
  }

  applyBulkEdit() {
    // For now, we only handle changing to Loan's default
    // so remove any static allocation from selected deposits.
    if (this.bulkAllocationType === 'default') {
      this.selectedDeposits.forEach((deposit) => {
        deposit.removeStaticAllocation();
        // If you have a deposit.allocationType property:
        // deposit.allocationType = 'default';
      });
    }

    // Emit changes
    this.depositUpdated.emit();

    // Close the dialog & end bulk edit mode
    this.showBulkEditDialog = false;
    this.toggleBulkEdit();
  }

  ngAfterViewInit(): void {}

  allocationTypes: DropDownOptionString[] = [
    { label: `Loan's Default`, value: 'default' },
    { label: 'Static Distribution', value: 'staticDistribution' },
  ];

  selectedAllocationType: string = 'default';
  staticUnusedAmount = 0;

  onAllocationTypeChange(event: any) {
    if (event === 'default') {
      this.depositData.removeStaticAllocation();
    } else {
      this.depositData.staticAllocation = new StaticAllocation({
        principal: 0,
        interest: 0,
        fees: 0,
        prepayment: 0,
      });
      this.staticUnusedAmount = this.depositData.amount.toNumber();
    }
    this.depositData.updateJsValues();
  }

  scrollToLastDeposit() {
    if (this.deposits.length === 0) {
      return;
    }

    const lastDeposit = this.deposits.last;
    this.highlightedDepositId = lastDeposit?.id;

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
      this.selectedDepositForEdit = deposit;
      this.depositData = deposit;
      this.originalDepositData = deposit.clone();

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
      if (this.depositData.staticAllocation) {
        this.selectedAllocationType = 'staticDistribution';
        this.staticUnusedAmount = this.depositData.amount
          .subtract(this.depositData.staticAllocation.principal)
          .subtract(this.depositData.staticAllocation.interest)
          .subtract(this.depositData.staticAllocation.fees)
          .subtract(this.depositData.staticAllocation.prepayment)
          .toNumber();
      }
    } else {
      this.depositData = this.getEmptyDepositData();
      this.originalDepositData = this.getEmptyDepositData();
      this.selectedDepositForEdit = null;
      this.selectedAllocationType = 'default';
    }
    this.showDepositDialog = true;
  }

  onDataChange(event: any) {
    if (this.depositData.staticAllocation) {
      this.staticUnusedAmount = this.depositData.amount
        .subtract(this.depositData?.staticAllocation?.jsPrincipal || 0)
        .subtract(this.depositData?.staticAllocation?.jsInterest || 0)
        .subtract(this.depositData?.staticAllocation?.jsFees || 0)
        .subtract(this.depositData?.staticAllocation?.jsPrepayment || 0)
        .toNumber();

      if (this.staticUnusedAmount < 0) {
        console.error('Static allocation exceeds deposit amount');
        return;
      }
    }
    this.depositData.updateModelValues();

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
    // we want to rollback any changes made to the deposit data
    // simplest way is to sync model values back to js
    this.selectedAllocationType = 'default';
    this.depositData = this.originalDepositData.clone();
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

    this.depositData.updateModelValues();

    if (this.selectedDepositForEdit) {
      Object.assign(this.selectedDepositForEdit, this.depositData);
    } else {
      this.deposits.addRecord(this.depositData);
      // hack to force table refresh
      this.deposits.records = this.deposits.records;
    }
    this.depositActiveUpdated();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
  }

  depositActiveUpdated() {
    this.depositUpdated.emit();
  }

  onApplyExcessToPrincipalChange(event: any) {
    if (event.checked === true) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    } else {
      this.depositData.excessAppliedDate = undefined;
    }
  }

  removeDeposit(deposit: DepositRecord) {
    this.deposits.removeRecordById(deposit.id);
    this.depositUpdated.emit();
  }

  viewDepositUsageDetails(deposit: DepositRecord) {
    this.selectedDeposit = deposit;
    console.log('deposit usage details');
    this.showDepositUsageDetailsDialog = true;
  }

  /**
   * Returns the total allocated principal across all usage details for the currently selected deposit.
   */
  get allocatedPrincipalSum(): number {
    if (!this.selectedDeposit?.usageDetails) return 0;
    return this.selectedDeposit.usageDetails.reduce(
      (acc, u) => acc + u.allocatedPrincipal.toNumber(),
      0,
    );
  }

  /**
   * Returns the total allocated interest across all usage details for the currently selected deposit.
   */
  get allocatedInterestSum(): number {
    if (!this.selectedDeposit?.usageDetails) return 0;
    return this.selectedDeposit.usageDetails.reduce(
      (acc, u) => acc + u.allocatedInterest.toNumber(),
      0,
    );
  }

  /**
   * Returns the total allocated fees across all usage details for the currently selected deposit.
   */
  get allocatedFeesSum(): number {
    if (!this.selectedDeposit?.usageDetails) return 0;
    return this.selectedDeposit.usageDetails.reduce(
      (acc, u) => acc + u.allocatedFees.toNumber(),
      0,
    );
  }

  /**
   * Returns the total allocated amount (principal + interest + fees) for the selected deposit.
   */
  get allocatedTotalSum(): number {
    return (
      this.allocatedPrincipalSum +
      this.allocatedInterestSum +
      this.allocatedFeesSum
    );
  }

  /**
   * Helper method to calculate one usage row's total allocated
   * (principal + interest + fees).
   */
  getUsageRowTotal(u: UsageDetail): number {
    return (
      u.allocatedPrincipal.toNumber() +
      u.allocatedInterest.toNumber() +
      u.allocatedFees.toNumber()
    );
  }

  selectedDepositUnusedAmount(): number {
    return this.selectedDeposit?.unusedAmount?.toNumber() || 0;
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    tooltipRef.toggle(event);
  }
}

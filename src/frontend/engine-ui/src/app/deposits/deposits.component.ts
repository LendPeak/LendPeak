import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  ChangeDetectorRef,
  OnChanges,
} from '@angular/core';
import { DropDownOptionString } from '../models/common.model';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
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
export class DepositsComponent implements OnChanges {
  @Input({ required: true }) lendPeak?: LendPeak;
  @Input() currencyOptions: DropDownOptionString[] = [];
  @Input({ required: true }) snapshotDate: Date = new Date();

  @Output() depositUpdated = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  @ViewChildren('depositRow', { read: ElementRef })
  depositRows!: QueryList<ElementRef>;

  test: any;
  showDepositDialog: boolean = false;
  selectedDepositForEdit: DepositRecord | null = null;
  depositData?: DepositRecord;
  originalDepositData?: DepositRecord;

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
  bulkDepositEditAllocationType = false;
  bulkDepositEditApplyExccessToPrincipal = false;

  viewBillCard(billId: string) {
    if (!this.lendPeak) {
      return;
    }
    const found = this.lendPeak.bills.getBillById(billId);
    if (found) {
      this.selectedBillForCard = found;
      this.showBillCardDialog = true;
    }
  }

  ngOnChanges(event: any) {
    if (!this.lendPeak) {
      return;
    }
  }

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

  bulkApplyExccessToPrincipal: 'true' | 'false' = 'false';
  bulkApplyExccessToPrincipalTypes: DropDownOptionString[] = [
    { label: `True`, value: 'true' },
    {
      label: 'False',
      value: 'false',
    },
  ];

  openBulkEditDialog() {
    if (this.selectedDeposits.length === 0) return;
    this.bulkAllocationType = 'default';
    this.showBulkEditDialog = true;
  }

  applyBulkEdit() {
    // For now, we only handle changing to Loan's default
    // so remove any static allocation from selected deposits.
    if (this.bulkDepositEditAllocationType === true) {
      if (this.bulkAllocationType === 'default') {
        this.selectedDeposits.forEach((deposit) => {
          deposit.removeStaticAllocation();
          // If you have a deposit.allocationType property:
          // deposit.allocationType = 'default';
        });
      }
    }

    if (this.bulkDepositEditApplyExccessToPrincipal === true) {
      if (this.bulkApplyExccessToPrincipal === 'true') {
        this.selectedDeposits.forEach((deposit) => {
          deposit.excessAppliedDate = deposit.effectiveDate;
          deposit.applyExcessToPrincipal = true;
        });
      } else {
        this.selectedDeposits.forEach((deposit) => {
          deposit.excessAppliedDate = undefined;
          deposit.applyExcessToPrincipal = false;
        });
      }
    }
    // Emit changes
    this.depositUpdated.emit();

    // Close the dialog & end bulk edit mode
    this.showBulkEditDialog = false;
  }

  ngAfterViewInit(): void {}

  allocationTypes: DropDownOptionString[] = [
    { label: `Loan's Default`, value: 'default' },
    { label: 'Static Distribution', value: 'staticDistribution' },
  ];

  selectedAllocationType: string = 'default';
  staticUnusedAmount = 0;

  onAllocationTypeChange(event: any) {
    if (!this.depositData) {
      return;
    }
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
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.depositRecords.length === 0) {
      return;
    }

    const lastDeposit = this.lendPeak.depositRecords.last;
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
      sequence: (this.lendPeak?.depositRecords?.length || 0) + 1,
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
    if (!this.depositData) {
      return;
    }
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
  }

  saveDeposit() {
    if (!this.lendPeak) {
      return;
    }
    if (!this.depositData) {
      return;
    }
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
      this.lendPeak.depositRecords.addRecord(this.depositData);
    }
    this.depositActiveUpdated();
    this.showDepositDialog = false;
    this.selectedDepositForEdit = null;
  }

  depositActiveUpdated() {
    this.depositUpdated.emit();
    //  this.cdr.detectChanges();
  }

  onApplyExcessToPrincipalChange(event: any) {
    if (!this.depositData) {
      return;
    }
    if (event.checked === true) {
      this.depositData.excessAppliedDate = this.depositData.effectiveDate;
    } else {
      this.depositData.excessAppliedDate = undefined;
    }
  }

  removeDeposit(deposit: DepositRecord) {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.depositRecords.removeRecordById(deposit.id);
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

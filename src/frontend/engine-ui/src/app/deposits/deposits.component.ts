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
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
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
import { LocalDate, ChronoUnit } from '@js-joda/core';
import { MessageService, SortEvent } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CalculatorDialogComponent } from '../calculator-dialog/calculator-dialog.component';
import { NgModel } from '@angular/forms';
import {
  SystemSettingsService,
  DeveloperModeType,
} from '../services/system-settings.service';
import { RefundDialogComponent } from '../refund-dialog/refund-dialog.component';
import { RefundRecord } from 'lendpeak-engine/models/RefundRecord';
import { RefundsListDialogComponent } from '../refunds-list-dialog/refunds-list-dialog.component';

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

interface Column {
  field: string;
  header: string;
  default: boolean;
  filter?: 'text' | 'numeric' | 'boolean' | 'date';
  sortable?: boolean;
}

@Component({
  selector: 'app-deposits',
  templateUrl: './deposits.component.html',
  styleUrls: ['./deposits.component.css'],
  providers: [MessageService],
  standalone: false,
})
export class DepositsComponent implements OnChanges {
  @Input({ required: true }) lendPeak?: LendPeak;
  @Input() currencyOptions: DropDownOptionString[] = [];
  @Input({ required: true }) snapshotDate: Date = new Date();

  @Output() depositUpdated = new EventEmitter<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private dialogSvc: DialogService,
    private systemSettingsService: SystemSettingsService,
  ) {}

  @ViewChildren('depositRow', { read: ElementRef })
  depositRows!: QueryList<ElementRef>;

  /* ── column-picker state ─────────────────────────── */
  showDepositColumnsDialog = false;

  depositTableCols: Column[] = [
    { field: 'active', header: 'Enabled', default: true, filter: 'boolean' },
    {
      field: 'id',
      header: 'ID',
      default: true,
      filter: 'text',
      sortable: true,
    },
    {
      field: 'jsEffectiveDate',
      header: 'Effective Date',
      default: true,
      filter: 'date',
      sortable: true,
    },
    {
      field: 'jsClearingDate',
      header: 'Clearing Date',
      default: false,
      filter: 'date',
      sortable: true,
    },
    { field: 'amount', header: 'Amount', default: true, filter: 'numeric' },
    { field: 'currency', header: 'Currency', default: false, filter: 'text' },

    {
      field: 'jsUnusedAmount',
      header: 'Unused Amount',
      default: true,
      filter: 'numeric',
    },
    {
      field: 'allocatedTotal',
      header: 'Allocated Total',
      sortable: true,
      filter: 'numeric',
      default: true,
    },
    {
      field: 'allocatedPrincipal',
      header: 'Allocated Principal',
      sortable: true,
      filter: 'numeric',
      default: true,
    },
    {
      field: 'allocatedInterest',
      header: 'Allocated Interest',
      sortable: true,
      filter: 'numeric',
      default: true,
    },
    {
      field: 'allocatedFees',
      header: 'Allocated Fees',
      sortable: true,
      filter: 'numeric',
      default: false,
    },
    {
      field: 'applyExcessToPrincipal',
      header: 'Apply Excess to Principal',
      default: false,
      filter: 'boolean',
    },
    {
      field: 'excessAppliedDate',
      header: 'Excess Applied Date',
      default: false,
      filter: 'date',
    },
  ];

  availableDepositCols: Column[] = [];
  selectedDepositCols: Column[] = [];
  /* ────────────────────────────────────────────────── */

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

  currencySort(event: SortEvent) {
    const field = event.field as keyof DepositRecord;

    event.data?.sort(
      (a: any, b: any) =>
        (a[field] as Currency).toNumber() - (b[field] as Currency).toNumber(),
    );
  }

  currencyFilter(value: Currency, filter: any /* string from input */) {
    if (filter === undefined || filter === null || filter === '') return true;

    const numFilter = +filter; // cast to number
    // default “equals”; change to >=, <=, etc. as you wish
    return value.toNumber() === numFilter;
  }

  openRefundsManager(deposit: DepositRecord) {
    const ref = this.dialogSvc.open(RefundsListDialogComponent, {
      header: 'Refunds',
      width: '45%',
      dismissableMask: true,
      data: { deposit },
    });

    ref.onClose.subscribe((changed: boolean) => {
      if (changed) {
        this.depositUpdated.emit();
        this.cdr.detectChanges();
      }
    });
  }

  /** Opens calculator, patches the originating control when user hits “Use result”. */
  openCalc(ctrl: NgModel) {
    const ref: DynamicDialogRef = this.dialogSvc.open(
      CalculatorDialogComponent,
      {
        showHeader: false,
        dismissableMask: true,
        styleClass: 'p-fluid', // shares PrimeFlex spacing
        data: { initial: ctrl.model }, // optional – preload current value
      },
    );

    ref.onClose.subscribe((val: number | undefined) => {
      if (val != null && !isNaN(val)) {
        ctrl.control.setValue(val); // ← write result back
      }
    });
  }

  openRefundDialog(deposit: DepositRecord) {
    const ref = this.dialogSvc.open(RefundDialogComponent, {
      header: 'Create Refund',
      dismissableMask: true,
      data: { deposit },
      width: '30%',
    });

    ref.onClose.subscribe(() => {
      this.depositUpdated.emit(); // bubble change to parent
      this.cdr.detectChanges();
    });
  }


  /** Active-only count (what you already had) */
  activeRefunds(d: DepositRecord): number {
    return d.refunds?.filter((r) => r.active).length ?? 0;
  }

  /** Total (active + inactive) refunds on this deposit */
  totalRefunds(d: DepositRecord): number {
    return d.refunds?.length ?? 0;
  }


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

  ngOnInit() {
    const saved = this.systemSettingsService.getDepositColumns();

    if (saved?.selectedDepositCols?.length) {
      // enrich each saved column with the missing metadata
      this.selectedDepositCols = saved.selectedDepositCols.map((sc: any) => {
        const full = this.depositTableCols.find((d) => d.field === sc.field);
        return { ...full, ...sc }; // full has filter & sortable
      });

      this.availableDepositCols = this.depositTableCols.filter(
        (col) =>
          !this.selectedDepositCols.some((sel) => sel.field === col.field),
      );
    } else {
      this.resetDepositColumns(); // first-time users
    }
  }

  ngOnChanges(event: any) {
    if (!this.lendPeak) {
      return;
    }
  }

  depositColumnsDialog() {
    this.showDepositColumnsDialog = true;
  }

  resetDepositColumns() {
    this.availableDepositCols = this.depositTableCols.filter((c) => !c.default);
    this.selectedDepositCols = this.depositTableCols.filter((c) => c.default);
  }

  saveDepositColumns() {
    this.systemSettingsService.setDepositColumns?.({
      selectedDepositCols: this.selectedDepositCols,
    });
    this.showDepositColumnsDialog = false;
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

  effectiveDateIsAfterSnapshotDate(deposit: DepositRecord): boolean {
    if (!this.snapshotDate) {
      return false;
    }
    return deposit.effectiveDate.isAfter(
      DateUtil.normalizeDate(this.snapshotDate),
    );
  }

  openBulkEditDialog() {
    if (this.selectedDeposits.length === 0) return;
    this.bulkAllocationType = 'default';
    this.showBulkEditDialog = true;
  }

  dateIsInTheFutureFromSnapshotDate(date: LocalDate): boolean {
    if (!this.snapshotDate) {
      return false;
    }
    const snapshotDate = DateUtil.normalizeDate(this.snapshotDate);
    return date.isAfter(snapshotDate);
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
      this.depositData.excessAppliedDate !== undefined &&
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

  /** Build a CSV string from all deposits (active + inactive, sorted) */
  private exportDepositsToCSV(): string {
    if (!this.lendPeak) return '';

    const deposits = this.lendPeak.depositRecords.allSorted;
    if (deposits.length === 0) return '';

    const cols = [
      { h: 'ID', v: (d: DepositRecord) => d.id },
      { h: 'Amount', v: (d: any) => d.amount.getRoundedValue(2) },
      { h: 'Currency', v: (d: any) => d.currency },
      { h: 'Effective Date', v: (d: any) => d.effectiveDate.toString() },
      {
        h: 'Clearing Date',
        v: (d: any) => (d.clearingDate ? d.clearingDate.toString() : ''),
      },
      { h: 'Unused Amount', v: (d: any) => d.unusedAmount.getRoundedValue(2) },
      {
        h: 'Apply Excess To Principal',
        v: (d: any) => (d.applyExcessToPrincipal ? 'Yes' : 'No'),
      },
      {
        h: 'Excess Applied Date',
        v: (d: any) =>
          d.excessAppliedDate ? d.excessAppliedDate.toString() : '',
      },
      { h: 'Active', v: (d: any) => (d.active ? 'Yes' : 'No') },
    ];

    const esc = (s: any) => {
      let str = String(s);
      if (str.includes('"')) str = str.replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const header = cols.map((c) => c.h).join(',');
    const rows = deposits.map((d) => cols.map((c) => esc(c.v(d))).join(','));
    return [header, ...rows].join('\n');
  }

  /* ----------  CSV helpers  ---------- */

  downloadDepositsAsCSV(): void {
    const csv = this.lendPeak?.depositRecords.exportToCSV() || '';
    if (!csv) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No deposits to download',
      });
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deposits.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Deposits downloaded',
    });
  }

  copyDepositsAsCSV(): void {
    const csv = this.lendPeak?.depositRecords.exportToCSV() || '';
    if (!csv) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No deposits to copy',
      });
      return;
    }
    navigator.clipboard
      .writeText(csv)
      .then(() =>
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Deposits copied to clipboard',
        }),
      )
      .catch((err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to copy',
        });
      });
  }

  depositActiveUpdated() {
    this.depositUpdated.emit();
    this.cdr.detectChanges();
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

// repayment-plan.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { MessageService } from 'primeng/api';

// Removed OverlayPanel, now import Popover from primeng/popover
import { Popover } from 'primeng/popover';
import dayjs from 'dayjs';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { Currency } from 'lendpeak-engine/utils/Currency';
import {
  SystemSettingsService,
  DeveloperModeType,
} from '../services/system-settings.service';
import { LocalDate, ChronoUnit } from '@js-joda/core';

interface Column {
  field: string;
  header: string;
  default: boolean;
}

@Component({
  selector: 'app-repayment-plan',
  templateUrl: './repayment-plan.component.html',
  styleUrls: ['./repayment-plan.component.css'],
  providers: [MessageService],

  standalone: false,
})
export class RepaymentPlanComponent {
  @Input({ required: true }) lendPeak!: LendPeak;
  @Input({ required: true }) snapshotDate!: Date;

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  selectedPeriods: number[] = [];

  enableFirstPaymentDate = false;
  enableEndDate = false;
  showRepaymentPlanColumnsDialog = false;

  availableRepaymentPlanCols: Column[] = [];
  selectedRepaymentPlanCols: Column[] = [];

  developerMode: DeveloperModeType = 'Disabled';

  repaymentPlanTableCols: Column[] = [
    {
      header: 'Term',
      field: 'term',
      default: true,
    },
    {
      header: 'Billing Model',
      field: 'billingModel',
      default: false,
    },
    {
      header: 'Period Start Date',
      field: 'periodStartDate',
      default: true,
    },
    {
      header: 'Period End Date',
      field: 'periodEndDate',
      default: true,
    },
    {
      header: 'Pre-bill Days',
      field: 'prebillDaysConfiguration',
      default: false,
    },
    {
      header: 'Days to Due',
      field: 'billDueDaysAfterPeriodEndConfiguration',
      default: false,
    },
    {
      header: 'Billable Period',
      field: 'billablePeriod',
      default: false,
    },
    {
      header: 'Bill Open Date',
      field: 'periodBillOpenDate',
      default: false,
    },
    {
      header: 'Bill Due Date',
      field: 'periodBillDueDate',
      default: false,
    },
    {
      header: 'Interest Rounding Error',
      field: 'interestRoundingError',
      default: false,
    },
    {
      header: 'Unbilled Interest Due to Rounding',
      field: 'unbilledInterestDueToRounding',
      default: false,
    },
    {
      header: 'Period Interest Rate',
      field: 'periodInterestRate',
      default: true,
    },
    {
      header: 'Per Diem',
      field: 'perDiem',
      default: true,
    },
    {
      header: 'Days In a Period',
      field: 'daysInPeriod',
      default: true,
    },
    {
      header: 'Term Calendar',
      field: 'calendar',
      default: false,
    },
    {
      header: 'Due Fees',
      field: 'fees',
      default: false,
    },
    {
      header: 'Due Interest',
      field: 'dueInterestForTerm',
      default: true,
    },

    {
      header: 'Due Principal',
      field: 'principal',
      default: true,
    },
    {
      header: 'Total Payment',
      field: 'totalPayment',
      default: true,
    },
    {
      header: 'Accrued Interest For Period',
      field: 'accruedInterestForPeriod',
      default: false,
    },
    {
      header: 'Billed Interest For Term',
      field: 'billedInterestForTerm',
      default: false,
    },
    {
      header: 'Billed Deferred Interest',
      field: 'billedDeferredInterest',
      default: false,
    },
    {
      header: 'Unbilled Deferred Interest',
      field: 'unbilledTotalDeferredInterest',
      default: false,
    },
    {
      header: 'Billed Deferred Fees',
      field: 'billedDeferredFees',
      default: false,
    },
    {
      header: 'Unbilled Deferred Fees',
      field: 'unbilledTotalDeferredFees',
      default: false,
    },
    {
      header: 'Balance Modification Amount',
      field: 'balanceModificationAmount',
      default: false,
    },

    {
      header: 'Period Start Balance',
      field: 'startBalance',
      default: true,
    },
    {
      header: 'Period End Balance',
      field: 'endBalance',
      default: true,
    },
    // {
    //   header: 'Balance Modification',
    //   field: 'balanceModification',
    //   type: 'object',
    // },

    {
      header: 'Metadata',
      field: 'metadata',
      default: false,
    },
    // DSI fields
    {
      header: 'DSI Actual Principal',
      field: 'actualDSIPrincipal',
      default: false,
    },
    {
      header: 'DSI Actual Interest',
      field: 'actualDSIInterest',
      default: false,
    },
    {
      header: 'DSI Actual Fees',
      field: 'actualDSIFees',
      default: false,
    },
    {
      header: 'DSI Interest Savings',
      field: 'dsiInterestSavings',
      default: false,
    },
    {
      header: 'DSI Interest Penalty',
      field: 'dsiInterestPenalty',
      default: false,
    },
    {
      header: 'DSI Start Balance',
      field: 'actualDSIStartBalance',
      default: false,
    },
    {
      header: 'DSI End Balance',
      field: 'actualDSIEndBalance',
      default: false,
    },
  ];

  constructor(
    private messageService: MessageService,
    private systemSettingsService: SystemSettingsService,
  ) {}

  ngOnInit(): void {
    this.developerMode = this.systemSettingsService.getDeveloperMode();

    const systemServiceRepaymentPlanColumns =
      this.systemSettingsService.getRepaymentPlanColumns();

    if (systemServiceRepaymentPlanColumns) {
      this.selectedRepaymentPlanCols =
        systemServiceRepaymentPlanColumns.selectedRepaymentPlanCols;
      this.availableRepaymentPlanCols = this.repaymentPlanTableCols.filter(
        (col) =>
          !this.selectedRepaymentPlanCols.find(
            (selectedCol) => selectedCol.field === col.field,
          ),
      );
    } else {
      this.resetRepaymentPlanColumns();
    }
    
    // Auto-add DSI columns if loan uses DSI billing model
    this.addDSIColumnsIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {}

  showTooltip(event: Event, tooltipRef: Popover) {
    // Same usage as OverlayPanel
    tooltipRef.toggle(event);
  }

  repaymentPlanColumnsDialog() {
    this.showRepaymentPlanColumnsDialog = true;
  }

  scrollToLastDueLine(): void {
    if (
      !this.lendPeak.amortization ||
      this.lendPeak.amortization.repaymentSchedule.entries.length === 0
    )
      return;

    const snapshot = DateUtil.normalizeDate(this.snapshotDate);

    // Find the last period due on or before snapshot date
    let lastDueIndex = -1;
    for (
      let i = this.lendPeak.amortization.repaymentSchedule.entries.length - 1;
      i >= 0;
      i--
    ) {
      const plan = this.lendPeak.amortization.repaymentSchedule.entries[i];
      const dueDate = plan.periodBillDueDate;
      if (dueDate.isEqual(snapshot) || dueDate.isBefore(snapshot)) {
        lastDueIndex = i;
        break;
      }
    }

    if (lastDueIndex === -1) {
      // No past due line found, maybe show a message or do nothing
      this.messageService.add({
        severity: 'info',
        summary: 'No Past Due Lines',
        detail:
          'There are no repayment lines due on or before the snapshot date.',
      });
      return;
    }

    // Scroll to that row
    const rowElement = document.getElementById('plan-row-' + lastDueIndex);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Simulate a click on the row to trigger your highlighting logic
      setTimeout(() => {
        rowElement.click();
      }, 500); // a small delay to ensure scrolling completes
    }
  }

  onRowClick(plan: any, event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) {
      return; // Ignore clicks on interactive elements
    }

    const period = plan.term;
    const index = this.selectedPeriods.indexOf(period);
    if (index === -1) {
      this.selectedPeriods.push(period);
    } else {
      this.selectedPeriods.splice(index, 1);
    }
  }

  onRowKeyDown(event: KeyboardEvent, plan: any) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.onRowClick(plan, event);
      event.preventDefault(); // Prevent default scrolling behavior
    }
  }

  downloadRepaymentPlanAsCSV() {
    const repaymentPlanCSV =
      this.lendPeak.amortization?.export.exportRepaymentScheduleToCSV();
    if (repaymentPlanCSV) {
      const blob = new Blob([repaymentPlanCSV], {
        type: 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'repayment-plan.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Repayment plan downloaded',
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No repayment plan to download',
      });
    }
  }

  copyRepaymentPlanAsCSV() {
    const repaymentPlanCSV =
      this.lendPeak.amortization?.export.exportRepaymentScheduleToCSV();
    if (repaymentPlanCSV) {
      navigator.clipboard
        .writeText(repaymentPlanCSV)
        .then(() => {
          // Show success toast
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Repayment plan copied to clipboard',
          });
        })
        .catch((err) => {
          // Show error toast
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to copy repayment plan to clipboard',
          });
          console.error('Failed to copy text: ', err);
        });
    } else {
      // Handle the case where repaymentPlanCSV is null or undefined
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No repayment plan to copy',
      });
    }
  }

  resetRepaymentPlanColumns() {
    this.availableRepaymentPlanCols = [
      ...this.repaymentPlanTableCols.filter((col) => !col.default),
    ];
    this.selectedRepaymentPlanCols = [
      ...this.repaymentPlanTableCols.filter((col) => col.default),
    ];
  }

  saveRepaymentPlanColumns() {
    this.systemSettingsService.setRepaymentPlanColumns({
      selectedRepaymentPlanCols: this.selectedRepaymentPlanCols,
    });
    this.showRepaymentPlanColumnsDialog = false;
  }

  showTilaDialog: boolean = false;

  showTilaDialogButton() {
    this.showTilaDialog = true;
  }

  private addDSIColumnsIfNeeded(): void {
    if (!this.lendPeak) return;
    
    // Check if loan uses DSI or has DSI overrides
    const usesDSI = this.lendPeak.billingModel === 'dailySimpleInterest' || 
      (this.lendPeak.billingModelOverrides && this.lendPeak.billingModelOverrides.length > 0);
    
    // Always show billing model column if there are overrides or DSI
    const showBillingModel = usesDSI || (this.lendPeak.billingModelOverrides && this.lendPeak.billingModelOverrides.length > 0);
    
    if (showBillingModel) {
      // Ensure billing model column is visible
      const billingModelColumn = this.availableRepaymentPlanCols.find(col => col.field === 'billingModel');
      if (billingModelColumn) {
        const columnIndex = this.availableRepaymentPlanCols.indexOf(billingModelColumn);
        this.availableRepaymentPlanCols.splice(columnIndex, 1);
        // Insert after Term column
        const termIndex = this.selectedRepaymentPlanCols.findIndex(col => col.field === 'term');
        this.selectedRepaymentPlanCols.splice(termIndex + 1, 0, billingModelColumn);
      }
    }
    
    if (usesDSI) {
      // DSI columns to auto-add (excluding billingModel as it's already handled)
      const dsiColumns = ['actualDSIPrincipal', 'actualDSIInterest', 'actualDSIFees', 'dsiInterestSavings', 'dsiInterestPenalty', 'actualDSIStartBalance', 'actualDSIEndBalance'];
      
      dsiColumns.forEach(fieldName => {
        // Check if column is already selected
        const isSelected = this.selectedRepaymentPlanCols.find(col => col.field === fieldName);
        
        if (!isSelected) {
          // Find the column in available columns
          const columnIndex = this.availableRepaymentPlanCols.findIndex(col => col.field === fieldName);
          
          if (columnIndex !== -1) {
            // Move from available to selected
            const column = this.availableRepaymentPlanCols.splice(columnIndex, 1)[0];
            this.selectedRepaymentPlanCols.push(column);
          }
        }
      });
    }
  }
}

import { appVersion } from '../environments/version';
import { MessageService } from 'primeng/api';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { AmortizationExplainer } from 'lendpeak-engine/models/AmortizationExplainer';
import { ConfirmationService } from 'primeng/api';

import { ConfirmPopup } from 'primeng/confirmpopup';

import {
  Component,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  EventEmitter,
  SecurityContext,
  ChangeDetectorRef,
} from '@angular/core';

import {
  DropDownOptionString,
  DropDownOptionNumber,
} from './models/common.model';

import { IndexedDbService } from './services/indexed-db.service';

import { Amortization } from 'lendpeak-engine/models/Amortization';

import { LendPeak } from 'lendpeak-engine/models/LendPeak';

import { AmortizationVersionManager } from 'lendpeak-engine/models/AmortizationVersionManager';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import {
  PaymentAllocationStrategyName,
  PaymentComponent,
} from 'lendpeak-engine/models/PaymentApplication/Types';

import { Bills } from 'lendpeak-engine/models/Bills';
import { Currency } from 'lendpeak-engine/utils/Currency';
import Decimal from 'decimal.js';
import { XaiSummarizeService } from './services/xai-summarize-service';
import { OpenAiChatService } from './services/openai-summarize-service';
import {
  SystemSettingsService,
  DeveloperModeType,
} from './services/system-settings.service';
import { FinancialOpsVersionManager } from 'lendpeak-engine/models/FinancialOpsVersionManager';
import { MarkdownService } from 'ngx-markdown';

import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { v4 as uuidv4 } from 'uuid';
import {
  PastDueSummary,
  ActualLoanSummary,
} from 'lendpeak-engine/models/UIInterfaces';

declare let gtag: Function;

interface Column {
  field: string;
  header: string;
  default: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [MessageService, ConfirmationService, MarkdownService],
  standalone: false,
})
export class AppComponent implements OnChanges {
  @ViewChild('confirmPopup') confirmPopup!: ConfirmPopup;
  @ViewChild('repaymentPlanTable', { static: false })
  repaymentPlanTableRef!: ElementRef;
  public versionHistoryRefresh = new EventEmitter<AmortizationVersionManager>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private indexedDbService: IndexedDbService,
    private xaiService: XaiSummarizeService,
    private openaiService: OpenAiChatService,
    private systemSettingsService: SystemSettingsService,
    private markdownService: MarkdownService,
    private cdr: ChangeDetectorRef,
  ) {}

  developerMode: DeveloperModeType = 'Disabled';

  repaymentPlanTableCols: Column[] = [
    {
      header: 'Term',
      field: 'term',
      default: true,
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
  ];

  availableRepaymentPlanCols: Column[] = [];
  selectedRepaymentPlanCols: Column[] = [];

  showRepaymentPlanColumnsDialog = false;

  repaymentPlanColumnsDialog() {
    this.showRepaymentPlanColumnsDialog = true;
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

  needsRecalc = false;

  ngAfterViewChecked() {
    if (this.needsRecalc) {
      this.needsRecalc = false;
      console.log('rerunning calc');
      this.submitLoan();
    }
  }

  lendPeak: LendPeak = new LendPeak({})
    .addAmortizationVersionManager()
    .addFinancialOpsVersionManager();

  actualLoanSummary?: ActualLoanSummary;
  pastDueSummary?: PastDueSummary;

  showCodeDialogVisible: boolean = false;
  generatedCode: string = ''; // Use SafeHtml to safely bind HTML content

  currentVersion = appVersion;

  loanNotFound: boolean = false;

  showExplanationDialog: boolean = false;
  loanExplanationText: string = '';

  showConnectorManagementDialog: boolean = false;
  showLoanImportDialog: boolean = false;

  selectedVersion: string = this.currentVersion;
  selectedReleaseNotes: any;

  snapshotDate: Date = new Date();

  CURRENT_OBJECT_VERSION = 9;

  paymentAllocationStrategy: PaymentAllocationStrategyName = 'FIFO';

  changesSummary: string = '';

  // Method to open Connector Management Dialog
  openConnectorManagement() {
    this.showConnectorManagementDialog = true;
  }

  // Method to open Loan Import Dialog
  openLoanImport() {
    this.showLoanImportDialog = true;
  }

  async onLoanImported(
    loanData: {
      loan: Amortization;
      deposits: DepositRecords;
    }[],
  ) {
    if (loanData.length > 1) {
      // Multiple loans imported
      // For example, save each loan individually under its own name

      for (let singleLoan of loanData) {
        console.log('adding loan:', singleLoan.loan.name);
        try {
          await this.saveLoanWithoutLoading(singleLoan);
        } catch (e) {
          console.error('Error while saving loan:', e, singleLoan);
        }
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `${loanData.length} loans imported and saved successfully.`,
      });
    } else {
      // Single loan imported
      await this.saveAndLoadLoan(loanData[0]);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loan "${loanData[0].loan.name}" imported successfully`,
      });
    }

    this.showLoanImportDialog = false;
  }

  aiSummaryInProgress: boolean = false;

  getAiAssistantName(): string {
    const name: any = this.systemSettingsService.getAiAssistant();
    return name;
  }

  onSystemsSettingsChange() {
    this.developerMode = this.systemSettingsService.getDeveloperMode();
  }

  summarize() {
    // Example changes object
    // const changes = {
    //   loanAmount: { oldValue: 1000, newValue: 1200 },
    //   originationFee: { oldValue: 50, newValue: 75 },
    // };
    this.aiSummaryInProgress = true;
    const changes = this.lendPeak.amortizationVersionManager!.previewChanges();
    const inputChanges = changes.inputChanges;

    // const aiChangeSummaryService = this.xaiService;
    //const aiChangeSummaryService = this.openaiService;

    const aiAssistant = this.systemSettingsService.getAiAssistant();
    console.log('assistant used in summary', aiAssistant);
    const aiChangeSummaryService =
      aiAssistant === 'xAI' ? this.xaiService : this.openaiService;

    aiChangeSummaryService.summarizeLoanChanges(inputChanges).subscribe({
      // this.xaiService.summarizeLoanChanges(inputChanges).subscribe({
      next: (summaryText) => {
        this.changesSummary = summaryText;
        this.aiSummaryInProgress = false;
      },
      error: (err) => {
        console.error('Error from XAI summary:', err);
        this.changesSummary = '';
        this.aiSummaryInProgress = false;
      },
    });
  }

  // A helper function to avoid repeating code:
  private async saveAndLoadLoan(loanData: {
    loan: Amortization;
    deposits: DepositRecords;
  }) {
    this.lendPeak = await this.saveLoanWithoutLoading(loanData);
    await this.executeLoadLoan(this.lendPeak.amortization.name);
  }

  private async saveLoanWithoutLoading(loanData: {
    loan: Amortization;
    deposits: DepositRecords;
  }) {
    try {
      const lendPeak = new LendPeak({
        amortization: loanData.loan,
        depositRecords: loanData.deposits,
      })
        .addAmortizationVersionManager()
        .addFinancialOpsVersionManager();

      this.loanModified = true;

      await this.saveLoan(lendPeak);
      return lendPeak;
    } catch (e) {
      console.error('Error while saving loan:', e);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save loan to IndexedDB.',
      });
      throw e;
    }
  }

  // Handle any actions emitted by the bills component
  onBillAction() {
    // Implement any logic needed when a bill action occurs
  }

  private getActualLoanSummary(): ActualLoanSummary {
    let actualPrincipalPaid = Currency.Zero();
    let actualInterestPaid = Currency.Zero();
    let lastPaymentDate: Dayjs | null = null;
    let lastPaymentAmount = Currency.Zero();

    // Sum principal and interest actually paid from bills
    for (const bill of this.lendPeak.bills.all) {
      if (bill.paymentDetails && bill.paymentDetails.length > 0) {
        for (const pd of bill.paymentDetails) {
          actualPrincipalPaid = actualPrincipalPaid.add(pd.allocatedPrincipal);
          actualInterestPaid = actualInterestPaid.add(pd.allocatedInterest);
          const pdDate = dayjs(pd.date);
          if (!lastPaymentDate || pdDate.isAfter(lastPaymentDate)) {
            lastPaymentDate = pdDate;
            lastPaymentAmount = pd.allocatedPrincipal
              .add(pd.allocatedInterest)
              .add(pd.allocatedFees);
          }
        }
      }
    }

    // Determine next unpaid bill
    const unpaidBills = this.lendPeak.bills.unpaid;
    let nextBillDate: Date | undefined = undefined;
    if (unpaidBills.length > 0) {
      // sort by dueDate
      unpaidBills.sort((a, b) => (a.dueDate.isAfter(b.dueDate) ? 1 : -1));
      nextBillDate = unpaidBills[0].dueDate.toDate();
    }

    const originalPrincipal = Currency.of(
      this.lendPeak.amortization.loanAmount,
    ).add(this.lendPeak.amortization.originationFee);
    const actualRemainingPrincipal =
      originalPrincipal.subtract(actualPrincipalPaid);

    const accruedInterestNow = this.lendPeak.amortization
      ? this.lendPeak.amortization.getAccruedInterestByDate(this.snapshotDate)
      : Currency.Zero();
    const actualCurrentPayoff =
      actualRemainingPrincipal.add(accruedInterestNow);

    return {
      nextBillDate,
      actualPrincipalPaid,
      actualInterestPaid,
      lastPaymentDate: lastPaymentDate ? lastPaymentDate.toDate() : undefined,
      lastPaymentAmount,
      actualRemainingPrincipal,
      actualCurrentPayoff,
    };
  }

  newLoan() {
    console.log('new loan');
    if (this.loanModified) {
      if (
        !confirm(
          'You have unsaved changes. Do you want to discard them and create a new loan?',
        )
      ) {
        return;
      }
    }

    this.lendPeak = new LendPeak({})
      .addAmortizationVersionManager()
      .addFinancialOpsVersionManager();

    // Generate the default loan data
    this.updateTermOptions();
    this.submitLoan();

    // Update the URL without navigating
    const queryParams = { loan: null, tab: 'basicInfo' };
    const urlTree = this.router.createUrlTree([], {
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
    const newUrl = this.router.serializeUrl(urlTree);
    this.location.go(newUrl);
  }

  // Handle loan change event
  onLoanChange(updatedLoan: any) {
    this.lendPeak.updateModelValues();
    this.loanModified = true;
  }

  loanModified: boolean = false;

  lenderName = 'Your Bank Name';
  borrowerName = 'John Doe';
  loanDate = new Date();
  loanNumber = 'LN123456789';
  collateralDescription = '2008 Toyota Camry';

  // Terms and conditions
  prepaymentPenalty = false;
  latePaymentGracePeriod = 15; // Days
  latePaymentFee = Currency.of(25);
  assumable = false;

  accruedInterest = Currency.of(0);

  selectedDepositForEdit: DepositRecord | null = null;
  showDepositDialog: boolean = false;
  depositData: any = {};

  advancedSettingsCollapsed = true;
  termPaymentAmountOverrideCollapsed = true;
  rateOverrideCollapsed = true;
  customPeriodsScheduleCollapsed = true;
  changePaymentDateCollapsed = true;
  preBillDayTermOverrideCollapsed = true;
  dueBillDayTermOverrideCollapsed = true;
  balanceModificationsCollapsed = true;

  selectedBill: any = null;
  showPaymentDetailsDialog: boolean = false;

  selectedDeposit: any = null;
  showDepositUsageDetailsDialog: boolean = false;

  activeTabIndex: number = 0;

  accruedInterestToDate: Currency = Currency.Zero();
  payoffAmount: Currency = Currency.Zero();

  tabIndices: { [key: string]: number } = {
    basicInfo: 0,
    overrides: 1,
    advancedSettings: 2,
    customPeriodsSchedule: 3,
    deposits: 4,
    bills: 5,
    loanHistory: 6,
    financialHistory: 7,
  };

  tabNames: string[] = [
    'basicInfo',
    'overrides',
    'advancedSettings',
    'customPeriodsSchedule',
    'deposits',
    'bills',
    'loanHistory',
    'financialHistory',
  ];

  onTabChange(tabIndex: any) {
    // console.log('tab changed:', tabIndex);
    this.activeTabIndex = tabIndex;
    const tabName = this.tabNames[this.activeTabIndex];
    const queryParams = { ...this.route.snapshot.queryParams, tab: tabName };
    const urlTree = this.router.createUrlTree([], {
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
    const newUrl = this.router.serializeUrl(urlTree);
    this.location.go(newUrl);
  }

  selectedPeriods: number[] = [];

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

  // Method to handle click events on the calendar component
  onCalendarClick(event: Event): void {
    event.stopPropagation();
  }

  // Method to handle changes to snapshotDate
  onSnapshotDateChange(date: Date) {
    this.snapshotDate = date;
    this.lendPeak.currentDate = this.snapshotDate;

    // if snapshot date is today, we don't need to store it in local storage
    // and we want to clear the stored snapshot date
    const today = dayjs().startOf('day');
    const selectedDate = dayjs(date).startOf('day');
    if (selectedDate.isSame(today)) {
      localStorage.removeItem('snapshotDate');
    } else {
      localStorage.setItem('snapshotDate', date.toISOString());
    }

    this.submitLoan();
    // this.updateDataForSnapshotDate();
  }

  closeNewVersionModal() {
    this.showNewVersionModal = false;
  }

  showCurrentReleaseNotes() {
    this.showNewVersionModal = true;

    this.selectedReleaseNotes = this.releaseNotes.find(
      (note) => note.version === this.selectedVersion,
    );
  }

  onVersionChange(event: any) {
    this.selectedVersion = event.value;
    this.selectedReleaseNotes = this.releaseNotes.find(
      (note) => note.version === this.selectedVersion,
    );
  }

  ngOnInit(): void {
    this.developerMode = this.systemSettingsService.getDeveloperMode();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const fullUrl = event.urlAfterRedirects; // This includes query parameters

        // Send page view event with query parameters
        gtag('config', 'G-1BMY92G86G', {
          page_path: fullUrl, // Tracking full URL with query parameters
        });
      }
    });

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

    const storedVersion = localStorage.getItem('appVersion');
    if (storedVersion !== this.currentVersion) {
      this.showCurrentReleaseNotes();
      localStorage.setItem('appVersion', this.currentVersion);
    }

    try {
      const snapshotDate = localStorage.getItem('snapshotDate');
      if (snapshotDate) {
        this.snapshotDate = new Date(snapshotDate);
        if (isNaN(this.snapshotDate.getTime())) {
          this.snapshotDate = new Date();
        }
      } else {
        this.snapshotDate = new Date();
      }
    } catch (e) {
      // clear the snapshot date from local storage
      localStorage.removeItem('snapshotDate');
      this.snapshotDate = new Date();
    }

    this.lendPeak.currentDate = this.snapshotDate;
    // Retrieve loan from local storage if exists
    // try {
    //   this.loadDefaultLoan();
    // } catch (e) {
    //   console.error('Error while loading loan from local storage:', e);
    //   localStorage.clear();
    // }

    this.updateTermOptions();
    this.loanModified = false;

    // Read query parameter
    this.route.queryParams.subscribe((params) => {
      const loanName = decodeURIComponent(params['loan'] || '');
      if (loanName) {
        if (this.lendPeak.amortization.name !== loanName) {
          //this.loadLoanFromURL(loanName);
          this.executeLoadLoan(loanName);
        }
      } else {
        // No loan specified, proceed as normal
        this.loadDefaultLoan();
      }

      const tabParam = params['tab'];
      if (tabParam !== undefined) {
        if (isNaN(tabParam)) {
          // tabParam is a string (tab name)
          const tabIndex = this.tabIndices[tabParam];
          if (tabIndex !== undefined) {
            this.activeTabIndex = tabIndex;
          }
        } else {
          // tabParam is a number (tab index)
          const tabIndex = parseInt(tabParam, 10);
          if (!isNaN(tabIndex)) {
            this.activeTabIndex = tabIndex;
          }
        }
      }
    });

    // Handle browser navigation events to update the activeTabIndex
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const params = this.route.snapshot.queryParams;
        const tabParam = params['tab'];
        if (tabParam !== undefined) {
          if (isNaN(tabParam)) {
            // tabParam is a string (tab name)
            const tabIndex = this.tabIndices[tabParam];
            if (tabIndex !== undefined) {
              this.activeTabIndex = tabIndex;
            }
          } else {
            // tabParam is a number (tab index)
            const tabIndex = parseInt(tabParam, 10);
            if (!isNaN(tabIndex)) {
              this.activeTabIndex = tabIndex;
            }
          }
        } else {
          this.activeTabIndex = 0; // Default to the first tab if no tab parameter
        }
      }
    });

    this.loanModified = false;
  }

  loadDefaultLoan() {
    // Reset the loanNotFound flag
    this.loanNotFound = false;

    // No loan found in localStorage, initialize with default values
    this.lendPeak = new LendPeak({})
      .addAmortizationVersionManager()
      .addFinancialOpsVersionManager();

    this.submitLoan();
  }

  goHome() {
    this.router.navigate(['/']).then(() => {
      // Reset the loanNotFound flag
      this.loanNotFound = false;

      // Reload the default loan
      this.loadDefaultLoan();
    });
  }

  showTable = false;
  showTilaDialog: boolean = false;
  termOptions: DropDownOptionNumber[] = [];

  updateTermOptions() {
    this.termOptions = [];
    for (let i = 1; i <= this.lendPeak.amortization.term; i++) {
      this.termOptions.push({ label: `Term ${i}`, value: i });
    }
  }

  showTilaDialogButton() {
    this.showTilaDialog = true;
  }
  showAdvancedOptions = false;

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

  ngOnChanges(changes: SimpleChanges) {
    //console.log('Changes detected:', changes);
  }
  billingModelOptions: DropDownOptionString[] = [
    { label: 'Amortized Loan', value: 'amortized' },
    { label: 'Daily Simple Interest Loan', value: 'dailySimpleInterest' },
  ];

  currencyOptions = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    // Add more currencies as needed
  ];

  perDiemCalculationTypes: DropDownOptionString[] = [
    {
      label: 'Annual Rate Divided by Days in Year',
      value: 'AnnualRateDividedByDaysInYear',
    },
    {
      label: 'Monthly Rate Divided by Days in Month',
      value: 'MonthlyRateDividedByDaysInMonth',
    },
  ];

  showEditLoanDialog: boolean = false;

  openEditLoanDialog() {
    this.showEditLoanDialog = true;
  }

  async saveEditedLoanDetails() {
    await this.saveAndLoadLoan({
      loan: this.lendPeak.amortization,
      deposits: this.lendPeak.depositRecords,
    });

    this.showEditLoanDialog = false;
  }

  toolbarActions = [
    {
      label: 'System Settings',
      icon: 'pi pi-cog',
      command: () => this.showSystemSettings(),
    },
    {
      label: 'New Loan',
      icon: 'pi pi-plus',
      command: () => this.newLoan(),
    },
    {
      label: 'Manage Loans',
      icon: 'pi pi-folder-open',
      command: () => this.openManageLoansDialog(),
    },
    {
      label: 'Import Loan',
      icon: 'pi pi-cloud-download',
      command: () => this.openLoanImport(),
    },
    {
      label: 'Manage Connectors',
      icon: 'pi pi-link',
      command: () => this.openConnectorManagement(),
    },
    {
      label: 'Export Data',
      icon: 'pi pi-file-export',
      command: () => this.exportData(),
    },
    {
      label: 'Import Data',
      icon: 'pi pi-file-import',
      command: () => this.importData(),
    },
    {
      label: 'Help',
      icon: 'pi pi-question',
      command: () => this.openHelpDialog(),
    },
    {
      label: 'Show Code',
      icon: 'pi pi-code',
      command: () => this.openCodeDialog(),
    },
    {
      label: 'Explain Loan',
      icon: 'pi pi-info-circle',
      command: () => this.showLoanExplanation(),
      tooltip: 'Get a detailed explanation of loan calculations',
    },
    {
      label: 'Current Release Notes',
      icon: 'pi pi-sparkles',
      command: () => this.showCurrentReleaseNotes(),
    },
  ];

  showSaveLoanDialog: boolean = false;
  loanToSave = {
    name: '',
    description: '',
  };

  showManageLoansDialog: boolean = false;
  savedLoans: any[] = [];

  showLoanExplanation() {
    if (!this.lendPeak.amortization) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Amortization Data',
        detail: 'Please calculate the amortization schedule first.',
      });
      return;
    }
    const explainer = new AmortizationExplainer(this.lendPeak.amortization);
    this.loanExplanationText = explainer.getFullExplanation();
    this.showExplanationDialog = true;
  }

  showSystemSettingsDialog = false;

  showSystemSettings() {
    this.showSystemSettingsDialog = true;
  }

  getLineNumbers(code: string): number[] {
    return Array.from({ length: code.split('\n').length }, (_, i) => i + 1);
  }

  openCodeDialog() {
    if (this.lendPeak) {
      this.generatedCode = this.lendPeak.amortization.export.toCode();
      this.showCodeDialogVisible = true;
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No loan data to generate code',
      });
    }
  }

  copyCodeToClipboard() {
    navigator.clipboard.writeText(this.generatedCode).then(
      () => alert('Code copied to clipboard'),
      (err) => console.error('Could not copy text:', err),
    );
  }

  openSaveLoanDialog() {
    // if (this.lendPeak.amortization.name && this.lendPeak.amortization.name !== 'New Loan') {
    //   // Existing loan, save directly
    //   this.saveLoan();
    // } else {

    this.loanToSave = {
      name: this.lendPeak.amortization.name || '',
      description: this.lendPeak.amortization.description || '',
    };
    this.showSaveLoanDialog = true;
    //}
  }

  openManageLoansDialog() {
    this.loadSavedLoans();
    this.showManageLoansDialog = true;
  }

  async loadSavedLoans() {
    this.savedLoans = [];

    try {
      let allLoans = await this.indexedDbService.getAllLoans();
      console.log('loadSavedLoans:', allLoans);

      this.savedLoans = allLoans
        .filter((row) => {
          return row.data.amortization;
        })
        .map((row) => {
          // row.key => e.g. 'loan_MyLoanName'
          // row.data => the actual object
          // you can parse out "loanName" from row.key or row.data
          const name = row.key.replace('loan_', '');
          return {
            key: row.key,
            name,
            id: row.data.amortization.id || '',
            description: row.data.amortization.description || '',
            loanAmount: row.data.amortization.loanAmount ?? 0,
            startDate: row.data.amortization?.startDate ?? '',
            endDate: row.data.amortization?.endDate ?? '',
            annualInterestRate:
              (row.data.amortization?.annualInterestRate ?? 0) * 100,
          };
        });
      // console.log('loadSavedLoans:', this.savedLoans);
    } catch (err) {
      console.error('loadSavedLoans error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load the saved loans from IndexedDB.',
      });
    }
  }

  async deleteLoan(key: string) {
    try {
      await this.indexedDbService.deleteLoan(key);
      await this.loadSavedLoans(); // refresh list
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loan "${key}" deleted from IndexedDB successfully.`,
      });
    } catch (err) {
      console.error('deleteLoan error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to delete loan "${key}" from IndexedDB.`,
      });
    }
  }

  async loadLoan(key: string, event: Event) {
    // If no unsaved changes, just do it directly
    if (!this.loanModified) {
      await this.executeLoadLoan(key);
      return;
    }

    // If unsaved changes exist => show p-confirmPopup
    this.confirmationService.confirm({
      target: (event.currentTarget || event.target) as EventTarget, // anchor to the button
      message:
        'You have unsaved changes. Discard them and load a different loan?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'Cancel',
      accept: () => {
        // user clicked 'Yes' => proceed to load
        this.executeLoadLoan(key);
      },
      reject: () => {
        // user clicked 'Cancel' => do nothing
      },
    });
  }

  async saveFinancialOps() {
    // If changes exist
    if (this.lendPeak?.financialOpsVersionManager?.hasChanges()) {
      this.lendPeak?.financialOpsVersionManager.commitTransaction(
        'User updated some bills/deposits',
      );
    }

    // Then store to IndexedDB (like your main loan data)
    const data = this.lendPeak?.financialOpsVersionManager?.toJSON();
    await this.indexedDbService.saveLoan(
      'financial_ops_' + this.lendPeak.amortization.name,
      data,
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Bills/Deposits Saved',
      detail: 'Financial operations saved successfully',
    });
  }

  public handleFinancialOpsRollback(payload: {
    versionId: string;
    event: Event;
  }): void {
    const { versionId, event } = payload;
    // Show a confirm popup if desired
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: `Are you sure you want to rollback financial ops to version ${versionId}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'Cancel',
      accept: () => {
        try {
          this.lendPeak?.financialOpsVersionManager?.rollback(
            versionId,
            `Rollback to version ${versionId}`,
          );
          // Re-sync the domain objects
          if (this.lendPeak?.financialOpsVersionManager) {
            this.lendPeak.bills =
              this.lendPeak?.financialOpsVersionManager?.getBills();
            this.lendPeak.depositRecords =
              this.lendPeak?.financialOpsVersionManager?.getDeposits();
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Rollback successful',
            detail: `Rolled back financial ops to version ${versionId}`,
          });
        } catch (err) {
          this.messageService.add({
            severity: 'error',
            summary: 'Rollback Failed',
            detail: String(err),
          });
        }
      },
    });
  }

  executeLoadLoan(key: string) {
    // check if key starts with loan_ if not lets add it
    if (!key.startsWith('loan_')) {
      key = `loan_${key}`;
    }

    this.indexedDbService.loadLoan(key).then((loanData) => {
      if (loanData) {
        console.log('loading loanData', loanData);
        this.lendPeak = LendPeak.fromJSON(loanData);
        this.lendPeak.currentDate = this.snapshotDate;

        this.submitLoan();
        //this.needsRecalc = true;

        this.showManageLoansDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Loan "${loanData.name}" loaded successfully`,
        });

        // Update the URL without navigating
        const queryParams = {
          loan: encodeURIComponent(this.lendPeak.amortization.name),
          tab: this.tabNames[this.activeTabIndex],
        };
        const urlTree = this.router.createUrlTree([], {
          queryParams: queryParams,
          queryParamsHandling: 'merge',
        });
        const newUrl = this.router.serializeUrl(urlTree);
        this.location.go(newUrl);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to load loan.`,
        });
      }
      this.loanModified = false;
      this.cdr.detectChanges();
    });
  }

  async saveLoan(lendPeak: LendPeak = this.lendPeak) {
    lendPeak.updateModelValues();
    // Existing loan, save to the same key
    const key = `loan_${lendPeak.amortization.name}`;
    // check if there are no changes, then that means
    // we did a rollback and nothing else
    // in that instance we wont commit a transaction because manager has been updated already
    if (lendPeak.amortizationVersionManager?.hasChanges()) {
      //console.log('committing transaction');
      lendPeak.amortizationVersionManager.commitTransaction(
        this.changesSummary || 'Initial Version',
      );
    }

    // Also commit Bills+Deposits if changed
    if (lendPeak?.financialOpsVersionManager?.hasChanges()) {
      lendPeak?.financialOpsVersionManager.commitTransaction(
        'Financial ops changes',
      );
    }

    // this.versionHistoryRefresh.emit(this.lendPeak.amortizationVersionManager);

    const loanData = lendPeak.toJSON();

    //localStorage.setItem(key, JSON.stringify(loanData));
    await this.indexedDbService.saveLoan(key, loanData);

    // Reset loanModified
    this.loanModified = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Loan "${lendPeak.amortization.name}" saved successfully`,
    });

    this.showSaveLoanDialog = false;
  }

  exportData() {
    // Code to export data
    console.log('Exporting data', this.lendPeak.amortization.json);
    console.log(
      'Exporting data',
      JSON.stringify(this.lendPeak.amortization.json),
    );
  }

  importData() {
    // Code to import data
  }

  openHelpDialog() {
    // Code to open a help dialog
  }

  openSettingsDialog() {
    // Code to open a settings dialog
  }

  balanceIncreaseType: DropDownOptionString[] = [
    { label: 'Increase', value: 'increase' },
    { label: 'Decrease', value: 'decrease' },
  ];

  termPeriodUnits: DropDownOptionString[] = [
    { label: 'Year', value: 'year' },
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
  ];

  calendarTypes: DropDownOptionString[] = [
    { label: 'Actual/Actual', value: 'ACTUAL_ACTUAL' },
    { label: 'Actual/360', value: 'ACTUAL_360' },
    { label: 'Actual/365', value: 'ACTUAL_365' },
    { label: '30/360', value: 'THIRTY_360' },
    { label: '30/Actual', value: 'THIRTY_ACTUAL' },
  ];

  roundingMethods: DropDownOptionString[] = [
    { label: 'Round Up', value: 'ROUND_UP' },
    { label: 'Round Down', value: 'ROUND_DOWN' },
    { label: 'Round Half Up', value: 'ROUND_HALF_UP' },
    { label: 'Round Half Down', value: 'ROUND_HALF_DOWN' },
    { label: 'Round Half Even (Bankers Rounding)', value: 'ROUND_HALF_EVEN' },
    { label: 'Round Half Ceiling', value: 'ROUND_HALF_CEIL' },
    { label: 'Round Half Floor', value: 'ROUND_HALF_FLOOR' },
  ];

  flushMethods: DropDownOptionString[] = [
    { label: 'None', value: 'none' },
    { label: 'At End', value: 'at_end' },
    { label: 'At Threshold', value: 'at_threshold' },
  ];

  loanSummary?: any;

  createLoanRepaymentPlan() {
    this.submitLoan();
  }

  removeLoanRepaymentPlan() {
    // Logic to remove schedule override
    this.lendPeak.amortization.periodsSchedule.reset();
    // console.log('Loan repayment plan removed');
    this.submitLoan();
  }

  deletePlan(index: number) {
    this.lendPeak.amortization.periodsSchedule.periods.splice(index, 1);
    // console.log('Plan deleted at index:', index);
    this.submitLoan();
  }

  repaymentPlanEndDateChange(index: number) {
    // when end date is changed following start date should be updated
    const selectedRow =
      this.lendPeak.amortization.periodsSchedule.periods[index];
    const endDate = dayjs(selectedRow.endDate);
    const startDate = endDate;
    this.lendPeak.amortization.periodsSchedule.periods[index + 1].startDate =
      selectedRow.endDate;
    this.submitLoan();
  }

  // Handle deposit updated event (e.g., to recalculate loan details)
  onDepositUpdated() {
    // this.submitLoan();
    this.needsRecalc = true;
    this.cdr.detectChanges();
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  // Payment Allocation Strategy Options
  paymentAllocationStrategies = [
    { label: 'First In First Out (FIFO)', value: 'FIFO' },
    { label: 'Last In First Out (LIFO)', value: 'LIFO' },
    { label: 'Equal Distribution', value: 'EqualDistribution' },
    { label: 'Proportional', value: 'Proportional' },
  ];

  // Payment Priority Options
  paymentPriorityOptions = ['interest', 'fees', 'principal'];
  paymentPriority: PaymentComponent[] = ['interest', 'fees', 'principal'];

  onPaymentPriorityChange() {
    // Ensure that each component is selected only once
    // Remove duplicates
    this.paymentPriority = Array.from(new Set(this.paymentPriority));

    // If the array is less than 3 elements, add missing components
    const allComponents: PaymentComponent[] = ['interest', 'fees', 'principal'];
    for (const component of allComponents) {
      if (!this.paymentPriority.includes(component)) {
        this.paymentPriority.push(component);
      }
    }

    // Update the UI
    this.submitLoan();
  }

  previousChanges: Record<string, { oldValue: any; newValue: any }> = {};

  // submitLoan(loanModified: boolean = false): void {
  //   setTimeout(() => {
  //     this.asyncSubmitLoan(loanModified);
  //   }, 0);
  // }

  submitLoan(loanModified: boolean = false): void {
    // submitLoan(loanModified: boolean = false): void {
    if (loanModified) {
      this.loanModified = true;
    }

    this.lendPeak.currentDate = this.snapshotDate;

    try {
      console.log('running calc on LendPeak', this.lendPeak);
      this.lendPeak.calc();
    } catch (error) {
      console.error('Error creating Amortization:', error);

      this.messageService.add({
        severity: 'error',
        summary: 'System Error During Amortization',
        detail: `An error occurred while calculating the amortization schedule: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return;
    }

    this.showTable = true;
    this.loanModified = true; // Mark as modified

    this.cdr.detectChanges();
  }

  makeReactive(obj: any, callback: Function): any {
    const handler = {
      get: (target: any, property: string | symbol) => {
        const value = target[property];
        if (typeof value === 'object' && value !== null) {
          return new Proxy(value, handler);
        }
        return value;
      },
      set: (target: any, property: string | symbol, value: any) => {
        target[property] = value;
        callback(target, property, value);
        return true;
      },
      deleteProperty: (target: any, property: string | symbol) => {
        delete target[property];
        callback(target, property, undefined);
        return true;
      },
    };

    return new Proxy(obj, handler);
  }

  private getPastDueSummary(): PastDueSummary {
    const snapshot = dayjs(this.snapshotDate).startOf('day');
    let pastDueCount = 0;
    let totalPastDuePrincipal = Currency.Zero();
    let totalPastDueInterest = Currency.Zero();
    let totalPastDueFees = Currency.Zero();
    let totalPastDueAmount = Currency.Zero();

    let earliestPastDueBillDate: Dayjs | null = null;

    for (const bill of this.lendPeak.bills.all) {
      // A bill is past due if it's not fully paid and due before the snapshot date
      if (!bill.isPaid && bill.dueDate.isBefore(snapshot)) {
        // Calculate the currently unpaid amount of the bill
        const unpaidPrincipal = bill.principalDue;
        const unpaidInterest = bill.interestDue;
        const unpaidFees = bill.feesDue;

        // If nothing is unpaid (fully satisfied), skip
        if (
          unpaidPrincipal.getValue().isZero() &&
          unpaidInterest.getValue().isZero() &&
          unpaidFees.getValue().isZero()
        ) {
          continue;
        }

        pastDueCount++;
        totalPastDuePrincipal = totalPastDuePrincipal.add(unpaidPrincipal);
        totalPastDueInterest = totalPastDueInterest.add(unpaidInterest);
        totalPastDueFees = totalPastDueFees.add(unpaidFees);
        const unpaidTotal = unpaidPrincipal.add(unpaidInterest).add(unpaidFees);
        totalPastDueAmount = totalPastDueAmount.add(unpaidTotal);

        // Track the earliest (oldest) past due bill date
        if (
          earliestPastDueBillDate === null ||
          bill.dueDate.isBefore(earliestPastDueBillDate)
        ) {
          earliestPastDueBillDate = bill.dueDate;
        }
      }
    }

    // Calculate days the contract is past due based on earliest past due bill date
    let daysContractIsPastDue = 0;
    if (earliestPastDueBillDate) {
      daysContractIsPastDue = snapshot.diff(earliestPastDueBillDate, 'day');
    }

    return {
      pastDueCount,
      totalPastDuePrincipal,
      totalPastDueInterest,
      totalPastDueFees,
      totalPastDueAmount,
      daysContractIsPastDue,
    };
  }

  public handleRollback(params: { versionId: string; event?: Event }) {
    // Possibly confirm with user
    // const confirmed = confirm(
    //   `Are you sure you want to rollback to version ${versionId}?`,
    // );
    // if (!confirmed) return;
    const versionId = params.versionId;
    const event = params.event;

    this.confirmationService.confirm({
      target: (event?.currentTarget || event?.target) as EventTarget, // anchor to the button,
      message: `Are you sure you want to rollback to version ${versionId}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'Cancel',
      accept: () => {
        // user clicked 'Yes' => proceed to rollback
        try {
          this.lendPeak.amortizationVersionManager?.rollback(
            versionId,
            `Rollback to version ${versionId}`,
          );
          // After rollback, the manager has a new version at the top referencing the old version
          // Re-sync the loan in your UI
          if (this.lendPeak.amortizationVersionManager) {
            this.lendPeak.amortization =
              this.lendPeak.amortizationVersionManager?.getAmortization();
          }
          this.loanModified = true; // or false, depending on your logic
          // Then re-run the schedule if needed
          this.submitLoan();
          this.messageService.add({
            severity: 'success',
            summary: 'Rollback Successful',
            detail: `Rolled back to version ${versionId}`,
          });
          this.versionHistoryRefresh.emit(
            this.lendPeak.amortizationVersionManager,
          );
        } catch (err) {
          console.error('Rollback error:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Rollback Failed',
            detail: 'Error rolling back loan: ' + err,
          });
        }
      },
      reject: () => {
        // user clicked 'Cancel' => do nothing
      },
    });
  }

  scrollToLastDueLine(): void {
    if (
      !this.lendPeak.amortization ||
      this.lendPeak.amortization.repaymentSchedule.entries.length === 0
    )
      return;

    const snapshot = dayjs(this.snapshotDate).startOf('day');

    // Find the last period due on or before snapshot date
    let lastDueIndex = -1;
    for (
      let i = this.lendPeak.amortization.repaymentSchedule.entries.length - 1;
      i >= 0;
      i--
    ) {
      const plan = this.lendPeak.amortization.repaymentSchedule.entries[i];
      const dueDate = dayjs(plan.periodBillDueDate);
      if (dueDate.isSameOrBefore(snapshot)) {
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

  /**
   * For the Markdown preview demo:
   */
  previewVisible: boolean = false; // Whether the preview dialog is open

  openPreview() {
    this.previewVisible = true;
  }

  closePreview() {
    this.previewVisible = false;
  }

  get amortizationFeesTotal(): number {
    return this.lendPeak.amortization.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.fees.toNumber(),
      0,
    );
  }

  get amortizationInterestTotal(): number {
    return this.lendPeak.amortization.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.dueInterestForTerm.toNumber(),
      0,
    );
  }

  get amortizationPrincipalTotal(): number {
    return this.lendPeak.amortization.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.principal.toNumber(),
      0,
    );
  }

  get amortizationTotal(): number {
    return this.lendPeak.amortization.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.totalPayment.toNumber(),
      0,
    );
  }

  showNewVersionModal = false;
  currentReleaseNotes: any;
  releaseNotes = [
    {
      version: '1.0.0',
      date: '2024-10-09',
      details: ['Initial release with basic features.'],
    },
    {
      version: '1.1.0',
      date: '2024-10-09',
      details: [
        'Added version tracking and release notes. Now you can see the release notes for the current version along with the release notes for previous versions. You will also get a notification when a new version is released.',
      ],
    },
    {
      version: '1.2.0',
      date: '2024-10-09',
      details: [
        'Added logic to expand accordion section in overrides tab if override exists, allowing user to identify quickly areas that have some configuration present',
        'Implemented deferred fee logic, so if total term payment amount cannot satisfy fees, fees are deferred to next term',
      ],
    },
    {
      version: '1.3.0',
      date: '2024-10-10',
      details: [
        'Minor cosmetic changes to the UI to text input fields to align with the rest of the application',
        'Added to deposit option to apply excess to principal balance',
      ],
    },
    {
      version: '1.4.0',
      date: '2024-10-12',
      details: [
        'Implemented early repayment where user can pay off the loan early',
      ],
    },
    {
      version: '1.5.0',
      date: '2024-10-13',
      details: [
        'Simplified programmatic interfaces for UI moving logic to the engine',
        'Added principal prepayment logic with excess application date, so payment can be forced allocated to principal balance',
        'added balance modification locking to system generated modifications so principal prepayments that apply balance modifications automatically cannot be removed through UI',
      ],
    },
    {
      version: '1.6.0',
      date: '2024-10-17',
      details: [
        'Added export to CSV repayment plan functionality',
        'Added copy to clipboard repayment plan functionality',
      ],
    },
    {
      version: '1.7.0',
      date: '2024-10-18',
      details: [
        'Added "Per Diem Calculation Type" setting in the Interest Settings. Users can now choose between calculating per diem interest based on the annual rate divided by days in the year or the monthly rate divided by days in the month.',
        'Improved tooltip formatting for better clarity and user experience.',
      ],
    },
    {
      version: '1.8.0',
      date: '2024-10-19',
      details: [
        'Deprecated Reset and Save UI buttons in the toolbar as they are no longer relevant with the introduction of manage loans functionality.',
        'Improved the usability of the "More" menu by breaking it into multiple, context-aware buttons for better user interaction.',
        'Added indicators for loan modification status, allowing users to see when a loan has unsaved changes.',
        'Fixed Save Loan button alignment issue in dialogs.',
        'Implemented loan not found handling, providing users with a clear message and suggestion to go back to the home page.',
      ],
    },
    {
      version: '1.9.0',
      date: '2024-10-22',
      details: [
        'Added accrued interest functionality to get current accrued interest for mid term, for demo UI it is represented as a tag above the repayment plan',
        'Added loan object tracking to simplify loan modification detection in the UI',
      ],
    },
    {
      version: '1.10.0',
      date: '2024-10-28',
      details: [
        'Implemented URL updating when loading loans, so that refreshing the browser reloads the same loan.',
        'Fixed an issue where loading a loan through the Manage Loans screen would cause the loan to load twice.',
        'Enhanced the user experience by updating the URL without triggering navigation or component re-initialization.',
        'Resolved accumulation of `usageDetails` in deposits by resetting them before processing payments, ensuring accurate tracking of deposit usage.',
        'Added serialization and deserialization methods to the `Currency` class, enabling instances to be reconstructed from JSON objects for database storage and retrieval.',
        'Improved error handling in `InterestCalculator` when calculating APR by validating inputs and providing more descriptive error messages when inputs are invalid or calculations fail.',
      ],
    },
    {
      version: '1.12.0',
      date: '2024-11-27',
      details: [
        'Refactored the AppComponent by externalizing advanced settings into separate components.',
        'Added support to load and retrieve overrides and advanced settings.',
        'Implemented versioning support and preview for settings.',
        'Reorganized the toolbar in the OverridesComponent and AdvancedSettingsComponent for improved usability.',
        'Fixed an issue where date fields were not correctly restored when loading settings from JSON by converting date strings back to Date objects upon deserialization.',
        'Enhanced user experience by simplifying the workflow for saving and updating settings, reducing confusion with button placement and functionality.',
      ],
    },
    {
      version: '1.13.0',
      date: '2024-11-30',
      details: [
        'Implemented logging with Winston, enhancing application monitoring and error tracking.',
        'Updated LoanProService to utilize the `$expand` parameter for systemId searches, allowing retrieval of LoanSetup, LoanSettings, and Payments in a single API call.',
        'Refactored Proxy Controller to improve error handling and prevent circular JSON serialization errors.',
        'Created comprehensive TypeScript interfaces for loan data responses, ensuring type safety and improving code maintainability.',
        'Enhanced AppComponent to integrate new LoanProService functionalities, including loan import by displayId and systemId, and updated the UI to display detailed loan information with related entities.',
      ],
    },
    {
      version: '1.14.0',
      date: '2024-12-09',
      details: [
        'Refined amortization calculations and interest rounding approaches.',
        'Explored and then removed the AmortizationExplainer prototype after user feedback.',
        'Enhanced UI transparency and pipeline stability.',
        'Improved integration with TILA disclosure components and overall user experience.',
      ],
    },
    {
      version: '1.15.0',
      date: '2024-12-09',
      details: [
        'Refined calculation for days left in the current term to accurately reflect the next due date instead of the contract end date.',
        'Enhanced the loan summary section to include payoff amount (principal + accrued interest), accrued interest to date, and projected future interest if the loan runs to maturity.',
        'Improved UI layout to better utilize space and provide a cleaner, more modern look for the loan summary and repayment plan overview.',
        'These changes aim to increase transparency and clarity for the user, providing a more intuitive understanding of their loan status.',
      ],
    },
    {
      version: '1.16.0',
      date: '2024-12-10',
      details: [
        'Added daysContractIsPastDue metric to Past Due Bills Status, reflecting contract-level delinquency from the earliest unpaid bill.',
        'Improved partial payment handling for past due bills, now calculating unpaid amounts dynamically for greater accuracy.',
        'Enhanced transparency and clarity in delinquency reporting, providing a more accurate and actionable status overview for all stakeholders.',
      ],
    },
    {
      version: '1.17.0',
      date: '2024-12-10',
      details: [
        'Added a new feature that allows users to quickly scroll to the last due line in the repayment plan and automatically highlight it.',
        'This improvement assists users in easily locating and reviewing the most recently due portion of their loan schedule.',
        'Continued refinements to user experience and interface clarity to better guide users through their loan details.',
      ],
    },
    {
      version: '1.18.0',
      date: '2024-12-10',
      details: [
        'Enhanced the Bills and Deposits views with "Go to Last Due Bill" and "Go to Last Deposit" functionalities.',
        'Implemented row highlighting on scroll to visually emphasize the relevant record.',
        'Improved reliability of scrolling by ensuring DOM elements are accessible after view rendering.',
        'Minor UI adjustments and code refactoring to maintain consistency across components.',
      ],
    },
    {
      version: '1.19.0',
      date: '2024-12-11',
      details: [
        'Added bulk import functionality from systemId range, allowing multi-loan imports in a single action.',
        'Enhanced loan preview dialog to display multiple loans and aid in selecting the correct ones before import.',
        'Updated onLoanImported method to handle single or multiple loans seamlessly, saving and loading each accordingly.',
        'Fixed UI layout of preview and import buttons to appear side by side for better user experience.',
        'General UI and code improvements for clarity, consistency, and easier maintenance.',
      ],
    },
  ];
}

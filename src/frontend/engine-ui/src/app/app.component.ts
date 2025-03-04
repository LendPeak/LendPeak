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
} from '@angular/core';

import {
  DropDownOptionString,
  DropDownOptionNumber,
} from './models/common.model';

import { IndexedDbService } from './services/indexed-db.service';

import {
  Amortization,
  AmortizationParams,
} from 'lendpeak-engine/models/Amortization';
import { Fee } from 'lendpeak-engine/models/Fee';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';

import { AmortizationVersionManager } from 'lendpeak-engine/models/AmortizationVersionManager';
import { AmortizationEntry } from 'lendpeak-engine/models/Amortization/AmortizationEntry';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { BalanceModifications } from 'lendpeak-engine/models/Amortization/BalanceModifications';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { PaymentApplication } from 'lendpeak-engine/models/PaymentApplication';
import { PaymentApplicationResult } from 'lendpeak-engine/models/PaymentApplication/PaymentApplicationResult';
import {
  PaymentAllocationStrategyName,
  PaymentComponent,
} from 'lendpeak-engine/models/PaymentApplication/Types';

import { Bill } from 'lendpeak-engine/models/Bill';
import { Bills } from 'lendpeak-engine/models/Bills';
import { BillPaymentDetail } from 'lendpeak-engine/models/Bill/BillPaymentDetail';
import { BillGenerator } from 'lendpeak-engine/models/BillGenerator';
import { Currency } from 'lendpeak-engine/utils/Currency';
import Decimal from 'decimal.js';
import { XaiSummarizeService } from './services/xai-summarize-service';
import { OpenAiChatService } from './services/openai-summarize-service';
import { SystemSettingsService } from './services/system-settings.service';
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
  ) {}

  actualLoanSummary?: ActualLoanSummary;
  pastDueSummary?: PastDueSummary;

  showCodeDialogVisible: boolean = false;
  generatedCode: string = ''; // Use SafeHtml to safely bind HTML content

  currentVersion = appVersion;

  loanNotFound: boolean = false;
  requestedLoanName: string = '';

  showExplanationDialog: boolean = false;
  loanExplanationText: string = '';

  showConnectorManagementDialog: boolean = false;
  showLoanImportDialog: boolean = false;

  selectedVersion: string = this.currentVersion;
  selectedReleaseNotes: any;

  snapshotDate: Date = new Date();

  loanName = 'Loan 1';

  CURRENT_OBJECT_VERSION = 9;

  showFullNumbers: boolean = false;

  paymentAllocationStrategy: PaymentAllocationStrategyName = 'FIFO';

  defaultLoanParams: AmortizationParams = {
    loanAmount: Currency.of(1000),
    originationFee: Currency.of(10),
    annualInterestRate: new Decimal(0.06), // 5% annual interest rate
    term: 24, // 24 months
    startDate: dayjs(),
  };

  loan: Amortization = new Amortization(this.defaultLoanParams);
  manager = new AmortizationVersionManager(this.loan);
  changesSummary: string = '';

  bills: Bills = new Bills();
  deposits: DepositRecords = new DepositRecords();
  financialOpsManager = new FinancialOpsVersionManager(
    this.bills,
    this.deposits,
  );

  toggleFullNumberDisplay() {
    this.showFullNumbers = !this.showFullNumbers;
  }

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
        await this.saveLoanWithoutLoading(singleLoan);
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

  summarize() {
    // Example changes object
    // const changes = {
    //   loanAmount: { oldValue: 1000, newValue: 1200 },
    //   originationFee: { oldValue: 50, newValue: 75 },
    // };
    this.aiSummaryInProgress = true;
    const changes = this.manager.previewChanges();
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
    await this.saveLoanWithoutLoading(loanData);
    this.executeLoadLoan(this.loan.name);
  }

  private async saveLoanWithoutLoading(loanData: {
    loan: Amortization;
    deposits: DepositRecords;
  }) {
    this.loan = loanData.loan;
    this.deposits = loanData.deposits;
    this.loanModified = true;
    this.loanName = this.loan.name || 'Imported Loan';
    this.currentLoanName = this.loanName;
    this.currentLoanId = this.loan.id || '';
    this.currentLoanDescription =
      this.loan.description || 'Imported from LoanPro';

    this.manager = new AmortizationVersionManager(this.loan);
    this.financialOpsManager = new FinancialOpsVersionManager(
      this.bills,
      this.deposits,
    );
    await this.saveLoan();
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
    for (const bill of this.bills.all) {
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
    const unpaidBills = this.bills.unpaid;
    let nextBillDate: Date | undefined = undefined;
    if (unpaidBills.length > 0) {
      // sort by dueDate
      unpaidBills.sort((a, b) => (a.dueDate.isAfter(b.dueDate) ? 1 : -1));
      nextBillDate = unpaidBills[0].dueDate.toDate();
    }

    const originalPrincipal = Currency.of(this.loan.loanAmount).add(
      this.loan.originationFee,
    );
    const actualRemainingPrincipal =
      originalPrincipal.subtract(actualPrincipalPaid);

    const accruedInterestNow = this.loan
      ? this.loan.getAccruedInterestByDate(this.snapshotDate)
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

    // Reset the loan to default values
    this.loan = new Amortization(this.defaultLoanParams);

    // Reset other properties
    this.currentLoanName = 'New Loan';
    this.loanModified = false;

    // Reset bills and deposits
    this.bills = new Bills();

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
    this.loan = updatedLoan;
    this.loanModified = true;
  }

  paymentApplicationResults: PaymentApplicationResult[] = [];

  currentLoanId: string = '';
  currentLoanName: string = 'New Loan';
  currentLoanDescription: string = 'New Loan';
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

    const period = plan.period;
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
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const fullUrl = event.urlAfterRedirects; // This includes query parameters

        // Send page view event with query parameters
        gtag('config', 'G-1BMY92G86G', {
          page_path: fullUrl, // Tracking full URL with query parameters
        });
      }
    });
    const storedVersion = localStorage.getItem('appVersion');
    if (storedVersion !== this.currentVersion) {
      this.showCurrentReleaseNotes();
      localStorage.setItem('appVersion', this.currentVersion);
    }

    this.loan = this.makeReactive(
      this.loan,
      (target: any, property: string | symbol, value: any) => {
        this.loanModified = true;
      },
    );

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
        if (this.currentLoanName !== loanName) {
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
    this.requestedLoanName = '';

    // No loan found in localStorage, initialize with default values
    this.loan = new Amortization(this.defaultLoanParams);
    this.currentLoanName = 'New Loan';
    this.submitLoan();
  }

  goHome() {
    this.router.navigate(['/']).then(() => {
      // Reset the loanNotFound flag
      this.loanNotFound = false;
      this.requestedLoanName = '';

      // Reload the default loan
      this.loadDefaultLoan();
    });
  }

  showTable = false;
  showAdvancedTable: boolean = false; // Default is simple view
  showTilaDialog: boolean = false;
  termOptions: DropDownOptionNumber[] = [];

  updateTermOptions() {
    this.termOptions = [];
    for (let i = 1; i <= this.loan.term; i++) {
      this.termOptions.push({ label: `Term ${i}`, value: i });
    }
  }

  showTilaDialogButton() {
    this.showTilaDialog = true;
  }
  showAdvancedOptions = false;

  toggleAdvancedTable() {
    this.showAdvancedTable = !this.showAdvancedTable;
  }

  generateBills() {
    // console.log('generating bills');
    const repaymentSchedule = this.loan.repaymentSchedule;
    this.bills = BillGenerator.generateBills({
      amortizationSchedule: repaymentSchedule,
      currentDate: this.snapshotDate,
    });
  }

  downloadRepaymentPlanAsCSV() {
    const repaymentPlanCSV = this.loan?.export.exportRepaymentScheduleToCSV();
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
    const repaymentPlanCSV = this.loan?.export.exportRepaymentScheduleToCSV();
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

  markBillAsPaid(bill: Bill) {
    bill.isPaid = true;
    // Optionally, update any backend or perform additional actions
  }

  // termPeriodDefinitionChange() {
  //   const termUnit =
  //     this.loan.termPeriodDefinition.unit === 'complex'
  //       ? 'day'
  //       : this.loan.termPeriodDefinition.unit;
  //   this.loan.endDate = dayjs(this.loan.startDate)
  //     .add(this.loan.term * this.loan.termPeriodDefinition.count[0], termUnit)
  //     .toDate();

  //   this.loan.firstPaymentDate = dayjs(this.loan.startDate)
  //     .add(this.loan.termPeriodDefinition.count[0], termUnit)
  //     .toDate();
  //   this.loanModified = true;
  //   this.submitLoan();
  // }

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

  saveEditedLoanDetails() {
    this.saveAndLoadLoan({
      loan: this.loan,
      deposits: this.deposits,
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
    if (!this.loan) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Amortization Data',
        detail: 'Please calculate the amortization schedule first.',
      });
      return;
    }
    const explainer = new AmortizationExplainer(this.loan);
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
    if (this.loan) {
      this.generatedCode = this.loan.export.toCode();
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
    // if (this.currentLoanName && this.currentLoanName !== 'New Loan') {
    //   // Existing loan, save directly
    //   this.saveLoan();
    // } else {

    this.loanToSave = {
      name: this.loan.name || '',
      description: this.loan.description || '',
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
      const allLoans = await this.indexedDbService.getAllLoans();
      console.log('loadSavedLoans:', allLoans);
      this.savedLoans = allLoans.map((row) => {
        // row.key => e.g. 'loan_MyLoanName'
        // row.data => the actual object
        // you can parse out "loanName" from row.key or row.data
        const name = row.key.replace('loan_', '');
        return {
          key: row.key,
          name,
          id: row.data.loan.id || '',
          description: row.data.loan.description || '',
          loanAmount: row.data.loan.loanAmount ?? 0,
          startDate: row.data.loan?.startDate ?? '',
          endDate: row.data.loan?.endDate ?? '',
          annualInterestRate: (row.data.loan?.annualInterestRate ?? 0) * 100,
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

  loadLoan(key: string, event: Event) {
    // If no unsaved changes, just do it directly
    if (!this.loanModified) {
      this.executeLoadLoan(key);
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
    if (this.financialOpsManager.hasChanges()) {
      this.financialOpsManager.commitTransaction(
        'User updated some bills/deposits',
      );
    }

    // Then store to IndexedDB (like your main loan data)
    const data = this.financialOpsManager.toJSON();
    await this.indexedDbService.saveLoan(
      'financial_ops_' + this.loan.name,
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
          this.financialOpsManager.rollback(
            versionId,
            `Rollback to version ${versionId}`,
          );
          // Re-sync the domain objects
          this.bills = this.financialOpsManager.getBills();
          this.deposits = this.financialOpsManager.getDeposits();
          // Possibly re-run any calculations needed
          // ...
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

  async executeLoadLoan(key: string) {
    // check if key starts with loan_ if not lets add it
    if (!key.startsWith('loan_')) {
      key = `loan_${key}`;
    }
    const loanData = await this.indexedDbService.loadLoan(key);

    if (loanData) {
      console.log('loading loanData', loanData);
      if (!loanData.loan.hasCustomEndDate) {
        delete loanData.loan.endDate;
      }

      if (!loanData.loan.hasCustomPreBillDays) {
        delete loanData.loan.preBillDays;
      }

      if (!loanData.loan.hasCustomBillDueDays) {
        delete loanData.loan.dueBillDays;
      }
      //this.loan = new Amortization(loanData.loan);
      this.deposits = new DepositRecords(loanData.deposits);

      this.manager = AmortizationVersionManager.fromJSON(loanData.manager);
      this.loan = this.manager.getAmortization();

      if (loanData.financialOpsManager) {
        this.financialOpsManager = FinancialOpsVersionManager.fromJSON(
          loanData.financialOpsManager,
        );
        // Extract the domain objects from it
        this.bills = this.financialOpsManager.getBills();
        this.deposits = this.financialOpsManager.getDeposits();
      } else {
        // fallback if older data didn't store financialOpsManager
        this.bills = new Bills(loanData.bills || []);
        this.deposits = new DepositRecords(loanData.deposits || []);
        this.financialOpsManager = new FinancialOpsVersionManager(
          this.bills,
          this.deposits,
        );
      }

      // console.log('manager', this.manager);
      // Set the current loan name
      this.currentLoanName = loanData.name || 'Loaded Loan';
      this.currentLoanDescription = loanData.loan.description;
      this.currentLoanId = loanData.loan.id;

      this.submitLoan();
      this.showManageLoansDialog = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loan "${loanData.name}" loaded successfully`,
      });

      // Update the URL without navigating
      const queryParams = {
        loan: encodeURIComponent(this.currentLoanName),
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
  }

  async saveLoan() {
    this.loan.updateModelValues();
    // Existing loan, save to the same key
    const key = `loan_${this.loan.name}`;
    // check if there are no changes, then that means
    // we did a rollback and nothing else
    // in that instance we wont commit a transaction because manager has been updated already
    if (this.manager.hasChanges()) {
      this.manager.commitTransaction(this.changesSummary || 'Initial Version');
    }

    // Also commit Bills+Deposits if changed
    if (this.financialOpsManager.hasChanges()) {
      this.financialOpsManager.commitTransaction('Financial ops changes');
    }

    this.versionHistoryRefresh.emit(this.manager);

    const loanData = {
      loan: this.loan.toJSON(),
      bills: this.bills.toJSON(),
      deposits: this.deposits.toJSON(),
      description: this.loan.description || '',
      name: this.loan.name,
      manager: this.manager.toJSON(),
      financialOpsManager: this.financialOpsManager.toJSON(),
    };

    //localStorage.setItem(key, JSON.stringify(loanData));
    await this.indexedDbService.saveLoan(key, loanData);

    // Reset loanModified
    this.loanModified = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Loan "${this.currentLoanName}" saved successfully`,
    });

    this.showSaveLoanDialog = false;
  }

  exportData() {
    // Code to export data
    console.log('Exporting data', this.loan.json);
    console.log('Exporting data', JSON.stringify(this.loan.json));
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
    this.loan.periodsSchedule.reset();
    // console.log('Loan repayment plan removed');
    this.submitLoan();
  }

  deletePlan(index: number) {
    this.loan.periodsSchedule.periods.splice(index, 1);
    // console.log('Plan deleted at index:', index);
    this.submitLoan();
  }

  repaymentPlanEndDateChange(index: number) {
    // when end date is changed following start date should be updated
    const selectedRow = this.loan.periodsSchedule.periods[index];
    const endDate = dayjs(selectedRow.endDate);
    const startDate = endDate;
    this.loan.periodsSchedule.periods[index + 1].startDate =
      selectedRow.endDate;
    this.submitLoan();
  }

  // Handle deposit updated event (e.g., to recalculate loan details)
  onDepositUpdated() {
    this.applyPayments();
    this.submitLoan();
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

  determineBalanceModificationDate(deposit: DepositRecord): Date {
    const excessAppliedDate =
      deposit.excessAppliedDate || deposit.effectiveDate;

    // Ensure excessAppliedDate is not null
    if (!excessAppliedDate) {
      throw new Error(
        `Deposit ${deposit.id} has no effective date or excess applied date.`,
      );
    }

    // Find open bills at the time of the deposit's effective date
    const depositEffectiveDayjs = dayjs(deposit.effectiveDate);
    const openBillsAtDepositDate = this.bills.all.filter(
      (bill) =>
        !bill.isPaid &&
        bill.isOpen &&
        dayjs(bill.dueDate).isSameOrAfter(depositEffectiveDayjs),
    );

    let balanceModificationDate: Dayjs;

    if (openBillsAtDepositDate.length > 0) {
      // There are open bills; apply excess at the beginning of the next term
      const latestBill = openBillsAtDepositDate.reduce((latest, bill) =>
        dayjs(bill.dueDate).isAfter(dayjs(latest.dueDate)) ? bill : latest,
      );
      const nextTermStartDate = dayjs(
        latestBill.amortizationEntry.periodEndDate,
      );

      // Ensure the date is after the excessAppliedDate
      balanceModificationDate = nextTermStartDate.isAfter(
        dayjs(excessAppliedDate),
      )
        ? nextTermStartDate
        : dayjs(excessAppliedDate).startOf('day');
    } else {
      // No open bills; use the effective date or excessAppliedDate
      balanceModificationDate = depositEffectiveDayjs.isAfter(
        dayjs(excessAppliedDate),
      )
        ? depositEffectiveDayjs
        : dayjs(excessAppliedDate).startOf('day');
    }

    return balanceModificationDate.toDate();
  }

  balanceModificationChanged = false;

  generateUniqueId(): string {
    return uuidv4();
  }

  cleanupBalanceModifications() {
    // remove any existing balance modifications that were associated with deposits
    // but deposits are no longer present
    const filteredBalanceModifications: BalanceModifications =
      new BalanceModifications();

    this.loan.balanceModifications.all.forEach((balanceModification) => {
      if (balanceModification.metadata?.depositId) {
        const deposit = this.deposits.getById(
          balanceModification.metadata.depositId,
        );
        if (!deposit) {
          // Deposit not found; remove this balance modification
          // console.log('Removing balance modification', balanceModification);

          this.balanceModificationChanged = true;
          return;
        }

        if (deposit.active !== true) {
          // Deposit is not active; remove this balance modification
          // console.log('Removing balance modification', balanceModification);
          this.balanceModificationChanged = true;

          return;
        }

        if (deposit.effectiveDate.isAfter(this.snapshotDate)) {
          // Deposit is before snapshot date; remove this balance modification
          // console.log('Removing balance modification', balanceModification);
          this.balanceModificationChanged = true;

          return;
        }
      }
      filteredBalanceModifications.addBalanceModification(balanceModification);
    });

    this.loan.balanceModifications = filteredBalanceModifications;
  }

  applyPayments() {
    console.log('running applyPayments');

    // 1) Clear usageDetails from each deposit
    this.deposits.clearHistory();

    // regenerate bills
    this.generateBills();

    // 2) Build PaymentApplication & process
    const allocationStrategy = PaymentApplication.getAllocationStrategyFromName(
      this.paymentAllocationStrategy,
    );
    const paymentPriority = this.paymentPriority;
    const paymentApp = new PaymentApplication(this.bills, this.deposits, {
      allocationStrategy,
      paymentPriority,
    });
    this.paymentApplicationResults = paymentApp.processDeposits(
      this.snapshotDate,
    );

    // 3) Loop over results
    this.paymentApplicationResults.forEach((result) => {
      // Here's where we find the deposit, storing it in a local `deposit` variable
      const deposit = this.deposits.all.find((d) => d.id === result.depositId);
      if (!deposit) {
        console.error('No deposit found for', result.depositId);
        return;
      }

      // Handle balance modification etc.
      if (result.balanceModification) {
        this.loan.balanceModifications.removeBalanceModificationByDepositId(
          deposit.id,
        );

        // Add the new BM
        // console.log('Adding balance modification!', result.balanceModification);
        const addedNewBalanceModification =
          this.loan.balanceModifications.addBalanceModification(
            result.balanceModification,
          );
        if (addedNewBalanceModification) {
          deposit.balanceModificationId = result.balanceModification.id;
          this.balanceModificationChanged = true;
        }
        // this.balanceModificationChanged = true;
      } else {
        // Remove old BMs for this deposit if none returned
        this.loan.balanceModifications.removeBalanceModificationByDepositId(
          deposit.id,
        );

        deposit.balanceModificationId = undefined;
        // this.balanceModificationChanged = true;
      }

      // Update deposit's leftover
      deposit.unusedAmount = result.unallocatedAmount;

      // 4) Populate BillPaymentDetail on each Bill if needed
      //    (And now `deposit.effectiveDate` is safely in scope)
      result.allocations.forEach((allocation) => {
        const bill = this.bills.all.find((b) => b.id === allocation.billId);
        if (!bill) return;

        bill.paymentDetails = bill.paymentDetails || [];
        bill.paymentDetails.push(
          new BillPaymentDetail({
            depositId: deposit.id,
            allocatedPrincipal: allocation.allocatedPrincipal,
            allocatedInterest: allocation.allocatedInterest,
            allocatedFees: allocation.allocatedFees,
            date: deposit.effectiveDate,
          }),
        );
      });
    });

    // 5) Mark bills as paid if principalDue, interestDue, feesDue are all zero
    this.bills.bills = this.bills.all.map((bill) => {
      bill.isPaid =
        bill.principalDue.isZero() &&
        bill.interestDue.isZero() &&
        bill.feesDue.isZero();
      return bill;
    });
  }

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

  submitLoan(loanModified: boolean = false): void {
    if (loanModified) {
      this.loanModified = true;
    }
    this.cleanupBalanceModifications();

    console.log('submitting a loan', this.loan);
    // const interestRateAsDecimal = new Decimal(this.loan.annualInterestRate);

    // let uiAmortizationParams: UIAmortizationParams = {
    //   loanAmount: this.loan.principal,
    //   originationFee: this.loan.originationFee,
    //   annualInterestRate: this.loan.interestRate,
    //   term: this.loan.term,
    //   startDate: this.loan.startDate,
    //   endDate: this.loan.endDate,
    //   firstPaymentDate: this.loan.firstPaymentDate,
    //   calendarType: this.loan.calendarType,
    //   roundingMethod: this.loan.roundingMethod,
    //   flushUnbilledInterestRoundingErrorMethod: this.loan.flushMethod,
    //   roundingPrecision: this.loan.roundingPrecision,
    //   flushThreshold: this.loan.flushThreshold,
    //   termPeriodDefinition: this.loan.termPeriodDefinition,
    //   defaultPreBillDaysConfiguration:
    //     this.loan.defaultPreBillDaysConfiguration,
    //   defaultBillDueDaysAfterPeriodEndConfiguration:
    //     this.loan.defaultBillDueDaysAfterPeriodEndConfiguration,
    //   preBillDays: this.loan.preBillDays,
    //   dueBillDays: this.loan.dueBillDays,
    //   perDiemCalculationType: this.loan.perDiemCalculationType,
    //   billingModel: this.loan.billingModel,
    // };

    // if billing model is Daily Simple Interest Loan then we will remove pre bill days and due bill days
    // configurations
    // if (this.loan.billingModel === 'dailySimpleInterest') {
    //   delete uiAmortizationParams.defaultPreBillDaysConfiguration;
    //   delete uiAmortizationParams.defaultBillDueDaysAfterPeriodEndConfiguration;
    // }

    try {
      this.loan.jsGenerateSchedule();
      // forcing repayment plan refresh. This is needed because we are not updating the loan object
      this.loan.repaymentSchedule = this.loan.repaymentSchedule;

      // const engineParams = toAmortizationParams(uiAmortizationParams);
      // amortization = new Amortization(engineParams);
      // this.loan.firstPaymentDate = amortization.firstPaymentDate.toDate();
      // this.loan.endDate = amortization.endDate.toDate();
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
    // this.loan = amortization;
    this.accruedInterest = this.loan.getAccruedInterestByDate(
      this.snapshotDate,
    );
    //this.tilaDisclosures = this.loan.tila.generateTILADisclosures();

    console.log('updated loan', this.loan);
    // this.repaymentPlanEndDates = this.loan.repaymentSchedule.map((entry) => {
    //   // mm/dd/yy
    //   return entry.periodEndDate.format('MM/DD/YY');
    // });

    // this.rebuildRepaymentPlan();

    this.showTable = true;
    // after balance modifications are applied amortization will add usage values and
    // it is possible that modification amount exceeds the principal amount
    // this will show user how much was unused

    this.generateBills();
    this.applyPayments();

    if (this.balanceModificationChanged === true) {
      this.balanceModificationChanged = false;
      //return this.submitLoan();
      this.loan.jsGenerateSchedule();
      // this.rebuildRepaymentPlan();
    }

    // if (this.manager.hasNewInputChanges(this.previousChanges)) {
    //   console.log('re-running submit loan because facts were changed');
    //   // there could be changes to a loan since generation, like adding a new
    //   // balance modifications. This will rerun the submit loan until
    //   // we no longer have modifications
    //   this.previousChanges = this.manager.previewChanges().inputChanges;
    //   return this.submitLoan();
    // }

    //console.log('change payment dates', this.loan.changePaymentDates);

    this.loanModified = true; // Mark as modified

    this.loanSummary = this.loan.summary.calculateLoanSummaryAsOfDate(
      dayjs(this.snapshotDate),
    );

    this.actualLoanSummary = this.getActualLoanSummary(); // If already implemented
    this.pastDueSummary = this.getPastDueSummary();

    this.accruedInterestToDate = this.loan.getAccruedInterestByDate(
      this.snapshotDate,
    );
    this.payoffAmount = this.loan.getCurrentPayoffAmount(
      dayjs(this.snapshotDate),
    );
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

    for (const bill of this.bills.all) {
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
          this.manager.rollback(versionId, `Rollback to version ${versionId}`);
          // After rollback, the manager has a new version at the top referencing the old version
          // Re-sync the loan in your UI
          this.loan = this.manager.getAmortization();
          this.loanModified = true; // or false, depending on your logic
          // Then re-run the schedule if needed
          this.submitLoan();
          this.messageService.add({
            severity: 'success',
            summary: 'Rollback Successful',
            detail: `Rolled back to version ${versionId}`,
          });
          this.versionHistoryRefresh.emit(this.manager);
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
    if (!this.loan || this.loan.repaymentSchedule.entries.length === 0) return;

    const snapshot = dayjs(this.snapshotDate).startOf('day');

    // Find the last period due on or before snapshot date
    let lastDueIndex = -1;
    for (let i = this.loan.repaymentSchedule.entries.length - 1; i >= 0; i--) {
      const plan = this.loan.repaymentSchedule.entries[i];
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
    return this.loan.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.fees.toNumber(),
      0,
    );
  }

  get amortizationInterestTotal(): number {
    return this.loan.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.dueInterestForTerm.toNumber(),
      0,
    );
  }

  get amortizationPrincipalTotal(): number {
    return this.loan.repaymentSchedule.entries.reduce(
      (total, entry) => total + entry.principal.toNumber(),
      0,
    );
  }

  get amortizationTotal(): number {
    return this.loan.repaymentSchedule.entries.reduce(
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

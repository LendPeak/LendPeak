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
import { Deposit, DepositRecord } from 'lendpeak-engine/models/Deposit';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import {
  PaymentApplication,
  PaymentApplicationResult,
  PaymentComponent,
  PaymentAllocationStrategyName,
} from 'lendpeak-engine/models/PaymentApplication';
import { Bill } from 'lendpeak-engine/models/Bill';
import { Bills } from 'lendpeak-engine/models/Bills';
import { BillPaymentDetail } from 'lendpeak-engine/models/Bill/BillPaymentDetail';
import { BillGenerator } from 'lendpeak-engine/models/BillGenerator';
import { Currency, RoundingMethod } from 'lendpeak-engine/utils/Currency';
import Decimal from 'decimal.js';
import { XaiSummarizeService } from './services/xai-summarize-service';

import { CalendarType } from 'lendpeak-engine/models/Calendar';

import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import {
  PastDueSummary,
  ActualLoanSummary,
} from 'lendpeak-engine/models/UIInterfaces';
import { UsageDetail } from 'lendpeak-engine/models/Bill/Deposit/UsageDetail';
import { __await } from 'tslib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [MessageService, ConfirmationService],
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

  summarize() {
    // Example changes object
    // const changes = {
    //   loanAmount: { oldValue: 1000, newValue: 1200 },
    //   originationFee: { oldValue: 50, newValue: 75 },
    // };

    const changes = this.manager.previewChanges();
    const inputChanges = changes.inputChanges;

    this.xaiService.summarizeLoanChanges(inputChanges).subscribe({
      next: (summaryText) => {
        this.changesSummary = summaryText;
      },
      error: (err) => {
        console.error('Error from XAI summary:', err);
        this.changesSummary = '';
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
    history: 6,
  };

  tabNames: string[] = [
    'basicInfo',
    'overrides',
    'advancedSettings',
    'customPeriodsSchedule',
    'deposits',
    'bills',
    'history',
  ];

  onTabChange(tabIndex: any) {
    console.log('tab changed:', tabIndex);
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
    console.log('generating bills');
    const repaymentSchedule = this.loan.repaymentSchedule;
    this.bills = BillGenerator.generateBills(
      repaymentSchedule,
      this.snapshotDate,
    );
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
          loanAmount: row.data.loan?.principal ?? 0,
          startDate: row.data.loan?.startDate ?? '',
          endDate: row.data.loan?.endDate ?? '',
          interestRate: row.data.loan?.interestRate ?? 0,
        };
      });
      console.log('loadSavedLoans:', this.savedLoans);
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
      //this.loan = new Amortization(loanData.loan);
      this.deposits = new DepositRecords(loanData.deposits);
      this.manager = AmortizationVersionManager.fromJSON(loanData.manager);
      this.loan = this.manager.getAmortization();
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
    this.manager.commitTransaction(this.changesSummary || 'Initial Version');
    this.versionHistoryRefresh.emit(this.manager);

    const loanData = {
      loan: this.loan.toJSON(),
      bills: this.bills.toJSON(),
      deposits: this.deposits.toJSON(),
      description: this.loan.description || '',
      name: this.loan.name,
      manager: this.manager.toJSON(),
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

  lockedRepaymentPlan: any[] = [];

  repaymentPlan: any[] = [
    // {
    //   period: 1,
    //   periodStartDate: '2023-01-01',
    //   periodEndDate: '2023-02-01',
    //   periodInterestRate: 7,
    //   principal: 116.48,
    //   totalInterestForPeriod: 17.835616438356166,
    //   interest: 17.84,
    //   realInterest: 17.835616438356166,
    //   interestRoundingError: -0.004383561643835616,
    //   totalPayment: 134.32,
    //   perDiem: 0.58,
    //   daysInPeriod: 31,
    //   startBalance: 3000,
    //   endBalance: 2883.52,
    //   unbilledInterestDueToRounding: -0.004383561643835616,
    //   //    metadata: '{"unbilledInterestAmount":-0.004383561643835616}',
    // }
  ];
  repaymentPlanEndDates: string[] = [];
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

  // Handle deposits change event
  onDepositsChange(updatedDeposits: DepositRecords) {
    this.deposits = updatedDeposits;
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

  balanceModificationRemoved = false;

  generateUniqueId(): string {
    return uuidv4();
  }

  cleanupBalanceModifications() {
    // remove any existing balance modifications that were associated with deposits
    // but deposits are no longer present
    const filteredBalanceModifications: BalanceModification[] = [];
    this.loan.balanceModifications.all.forEach((balanceModification) => {
      if (balanceModification.metadata?.depositId) {
        const deposit = this.deposits.all.find(
          (d) => d.id === balanceModification.metadata.depositId,
        );
        if (!deposit) {
          // Deposit not found; remove this balance modification
          // console.log('Removing balance modification', balanceModification);
          this.balanceModificationRemoved = true;
          return;
        }
      }
      filteredBalanceModifications.push(balanceModification);
    });
    this.loan.balanceModifications.balanceModifications =
      filteredBalanceModifications;
  }

  applyPayments() {
    console.log('running applyPayments');
    // Reset usageDetails and related fields for each deposit
    this.deposits.clearHistory();
    // Apply payments to the loan
    const deposits: DepositRecords = this.deposits;

    const bills: Bills = this.bills;

    // Build the allocation strategy based on user selection
    let allocationStrategy = PaymentApplication.getAllocationStrategyFromName(
      this.paymentAllocationStrategy,
    );

    // Build the payment priority
    const paymentPriority = this.paymentPriority;

    const paymentApp = new PaymentApplication(bills, deposits, {
      allocationStrategy: allocationStrategy,
      paymentPriority: paymentPriority,
    });

    // Process deposits
    this.paymentApplicationResults = paymentApp.processDeposits();

    // Update bills and deposits based on payment results
    this.paymentApplicationResults.forEach((result) => {
      const depositId = result.depositId;
      const deposit = this.deposits.all.find((d) => d.id === depositId);
      if (!deposit) {
        console.error(`Deposit with id ${depositId} not found`);
        return;
      }

      deposit.usageDetails = deposit.usageDetails || [];

      if (result.balanceModification) {
        console.log(
          'Applying balance modification',
          result.balanceModification,
        );

        // 1) Remove existing UI modifications for this deposit
        this.loan.balanceModifications.balanceModifications =
          this.loan.balanceModifications.all.filter(
            (uiMod) =>
              !(uiMod.metadata && uiMod.metadata.depositId === deposit.id),
          );

        // 2) Push the new UI object
        this.loan.balanceModifications.addBalanceModification(
          result.balanceModification,
        );

        // 3) Also store the ID
        deposit.balanceModificationId = result.balanceModification.id;
      } else {
        // Remove any existing UI modifications for this deposit
        this.loan.balanceModifications.balanceModifications =
          this.loan.balanceModifications.all.filter(
            (uiMod) =>
              !(uiMod.metadata && uiMod.metadata.depositId === deposit.id),
          );
        deposit.balanceModificationId = undefined;
      }

      // Update deposit's unused amount
      deposit.unusedAmount = result.unallocatedAmount;

      // Process allocations to update bills
      result.allocations.forEach((allocation) => {
        const billId = allocation.billId;
        const bill = this.bills.all.find((b) => b.id === billId);
        if (!bill) {
          console.info(`Bill with id ${billId} not found`);
          return;
        }

        bill.paymentDetails = bill.paymentDetails || [];
        bill.paymentDetails.push(
          new BillPaymentDetail({
            depositId: depositId,
            allocatedPrincipal: allocation.allocatedPrincipal,
            allocatedInterest: allocation.allocatedInterest,
            allocatedFees: allocation.allocatedFees,
            date: deposit.effectiveDate,
          }),
        );

        deposit.usageDetails.push(
          new UsageDetail({
            billId: billId,
            period: bill.amortizationEntry?.term || 0,
            billDueDate: bill.dueDate.toDate(),
            allocatedPrincipal: allocation.allocatedPrincipal.toNumber(),
            allocatedInterest: allocation.allocatedInterest.toNumber(),
            allocatedFees: allocation.allocatedFees.toNumber(),
            date: deposit.effectiveDate,
          }),
        );
      });
    });

    // Update bills with new payment details
    this.bills.bills = this.bills.all.map((bill) => {
      const updatedBill = this.paymentApplicationResults
        .flatMap((result) => result.allocations)
        .find((allocation) => allocation.billId === bill.id);

      if (updatedBill) {
        bill.isPaid =
          bill.principalDue.isZero() &&
          bill.interestDue.isZero() &&
          bill.feesDue.isZero();
      }

      return bill;
    });

    // console.log('Payments applied');
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

  submitLoan(loanModified: boolean = false) {
    if (loanModified) {
      this.loanModified = true;
    }
    this.cleanupBalanceModifications();

    console.log('submitting a loan');
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

    // this.repaymentPlanEndDates = this.loan.repaymentSchedule.map((entry) => {
    //   // mm/dd/yy
    //   return entry.periodEndDate.format('MM/DD/YY');
    // });

    this.repaymentPlan = this.loan.repaymentSchedule.entries.map(
      (entry, index) => {
        return {
          period: entry.term,
          zeroPeriod: entry.zeroPeriod,
          periodStartDate: entry.periodStartDate.format('YYYY-MM-DD'),
          periodEndDate: entry.periodEndDate.format('YYYY-MM-DD'),
          prebillDaysConfiguration: entry.prebillDaysConfiguration,
          billDueDaysAfterPeriodEndConfiguration:
            entry.billDueDaysAfterPeriodEndConfiguration,
          periodBillOpenDate: entry.periodBillOpenDate.format('YYYY-MM-DD'),
          periodBillDueDate: entry.periodBillDueDate.format('YYYY-MM-DD'),
          periodInterestRate: entry.periodInterestRate.times(100).toNumber(),
          principal: entry.principal.toNumber(),
          fees: entry.fees.toNumber(),
          // interest transactions
          accruedInterestForPeriod: entry.accruedInterestForPeriod.toNumber(), // track accrued interest for the period
          billedInterestForTerm: entry.billedInterestForTerm.toNumber(), // tracks total accrued interest along with any deferred interest from previous periods
          dueInterestForTerm: entry.dueInterestForTerm.toNumber(), // tracks total interest that is due for the term
          dueInterestForTermError: entry.dueInterestForTerm
            .getRoundingError()
            .toNumber(), // tracks total interest that is due for the term
          billedDeferredInterest: entry.billedDeferredInterest.toNumber(),
          unbilledTotalDeferredInterest:
            entry.unbilledTotalDeferredInterest.toNumber(), // tracks deferred interest

          totalInterestForPeriod: entry.billedInterestForTerm.toNumber(),
          //  realInterest: entry.unroundedInterestForPeriod.toNumber(),
          interestRoundingError: entry.interestRoundingError.toNumber(),
          totalPayment: entry.totalPayment.toNumber(),
          perDiem: entry.perDiem,
          daysInPeriod: entry.daysInPeriod,
          startBalance: entry.startBalance.toNumber(),
          endBalance: entry.endBalance.toNumber(),
          balanceModificationAmount: entry.balanceModificationAmount.toNumber(),
          unbilledInterestDueToRounding:
            entry.unbilledInterestDueToRounding.toNumber(),
          totalDeferredInterest: entry.unbilledTotalDeferredInterest.toNumber(),
          metadata: entry.metadata,
        };
      },
    );

    this.showTable = true;
    // after balance modifications are applied amortization will add usage values and
    // it is possible that modification amount exceeds the principal amount
    // this will show user how much was unused

    this.loan.balanceModifications = this.loan.balanceModifications;

    this.generateBills();
    this.applyPayments();
    if (this.balanceModificationRemoved === true) {
      this.balanceModificationRemoved = false;
      this.submitLoan();
    }

    // change payment dates will get updated with term number if only original date
    // is passed and term is set to zero.
    this.loan.changePaymentDates = this.loan.changePaymentDates;

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

  public handleRollback(versionId: string) {
    // Possibly confirm with user
    const confirmed = confirm(
      `Are you sure you want to rollback to version ${versionId}?`,
    );
    if (!confirmed) return;

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
    } catch (err) {
      console.error('Rollback error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Rollback Failed',
        detail: 'Error rolling back loan: ' + err,
      });
    }
  }

  scrollToLastDueLine(): void {
    if (!this.repaymentPlan || this.repaymentPlan.length === 0) return;

    const snapshot = dayjs(this.snapshotDate).startOf('day');

    // Find the last period due on or before snapshot date
    let lastDueIndex = -1;
    for (let i = this.repaymentPlan.length - 1; i >= 0; i--) {
      const plan = this.repaymentPlan[i];
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

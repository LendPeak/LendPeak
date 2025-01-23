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
} from '@angular/core';

import {
  DropDownOptionString,
  DropDownOptionNumber,
} from './models/common.model';

import { IndexedDbService } from './services/indexed-db.service';

import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  TILADisclosures,
  Fee,
  LoanSummary,
} from 'lendpeak-engine/models/Amortization';
import {
  UIAmortizationParams,
  toAmortizationParams,
  UIBalanceModification,
  LoanFeePerTerm,
} from 'lendpeak-engine/factories/UIFactories';

import { AmortizationEntry } from 'lendpeak-engine/models/Amortization/AmortizationEntry';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { Deposit, DepositRecord } from 'lendpeak-engine/models/Deposit';
import {
  PaymentApplication,
  PaymentApplicationResult,
  PaymentComponent,
  PaymentAllocationStrategyName,
} from 'lendpeak-engine/models/PaymentApplication';
import { Bill } from 'lendpeak-engine/models/Bill';
import { BillPaymentDetail } from 'lendpeak-engine/models/Bill/BillPaymentDetail';
import { BillGenerator } from 'lendpeak-engine/models/BillGenerator';
import { Currency, RoundingMethod } from 'lendpeak-engine/utils/Currency';
import Decimal from 'decimal.js';
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
  UILoan,
  PastDueSummary,
  ActualLoanSummary,
} from 'lendpeak-engine/models/UIInterfaces';
import { UsageDetail } from 'lendpeak-engine/models/Bill/Deposit/UsageDetail';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private indexedDbService: IndexedDbService,
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

  showConnectorManagementDialog: boolean = false;
  showLoanImportDialog: boolean = false;

  selectedVersion: string = this.currentVersion;
  selectedReleaseNotes: any;

  snapshotDate: Date = new Date();

  loanName = 'Loan 1';

  CURRENT_OBJECT_VERSION = 9;

  showFullNumbers: boolean = false;

  defaultLoan: UILoan = {
    objectVersion: this.CURRENT_OBJECT_VERSION,
    principal: 10000,
    originationFee: 0,
    interestRate: 10,
    term: 12,
    feesForAllTerms: [],
    feesPerTerm: [],
    startDate: new Date(),
    firstPaymentDate: dayjs().add(1, 'month').toDate(),
    endDate: dayjs().add(12, 'month').toDate(),
    calendarType: 'THIRTY_360',
    roundingMethod: 'ROUND_HALF_EVEN',
    flushMethod: 'at_threshold',
    perDiemCalculationType: 'AnnualRateDividedByDaysInYear',
    roundingPrecision: 2,
    flushThreshold: 0.01,
    ratesSchedule: [],
    termPaymentAmountOverride: [],
    termPaymentAmount: undefined,
    defaultBillDueDaysAfterPeriodEndConfiguration: 3,
    defaultPreBillDaysConfiguration: 5,
    allowRateAbove100: false,
    periodsSchedule: [],
    changePaymentDates: [],
    dueBillDays: [],
    preBillDays: [],
    deposits: [],
    termPeriodDefinition: {
      unit: 'month',
      count: [1],
    },
    balanceModifications: [],
    billingModel: 'amortized',
    paymentAllocationStrategy: 'FIFO',
  };

  loan: UILoan = { ...this.defaultLoan };

  tilaDisclosures: TILADisclosures = {
    amountFinanced: Currency.of(0),
    financeCharge: Currency.of(0),
    totalOfPayments: Currency.of(0),
    annualPercentageRate: new Decimal(0),
    paymentSchedule: [],
  };

  bills: Bill[] = [];

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

  onLoanImported(loanData: UILoan | UILoan[]) {
    if (Array.isArray(loanData)) {
      // Multiple loans imported
      // For example, save each loan individually under its own name
      loanData.forEach((singleLoan) => {
        this.saveLoanWithoutLoading(singleLoan);
      });
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `${loanData.length} loans imported and saved successfully.`,
      });
    } else {
      // Single loan imported
      this.saveAndLoadLoan(loanData);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loan "${loanData.name}" imported successfully`,
      });
    }

    this.showLoanImportDialog = false;
  }

  // A helper function to avoid repeating code:
  private saveAndLoadLoan(loanData: UILoan) {
    this.saveLoanWithoutLoading(loanData);
    this.executeLoadLoan(this.loanName);
  }

  private saveLoanWithoutLoading(loanData: UILoan) {
    this.loan = loanData;
    this.loanModified = true;
    this.loanName = this.loan.name || 'Imported Loan';
    this.currentLoanName = this.loanName;
    this.currentLoanId = this.loan.id || '';
    this.currentLoanDescription =
      this.loan.description || 'Imported from LoanPro';

    this.saveLoan();
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
    for (const bill of this.bills) {
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
    const unpaidBills = this.bills.filter((b) => !b.isPaid);
    let nextBillDate: Date | undefined = undefined;
    if (unpaidBills.length > 0) {
      // sort by dueDate
      unpaidBills.sort((a, b) => (a.dueDate.isAfter(b.dueDate) ? 1 : -1));
      nextBillDate = unpaidBills[0].dueDate.toDate();
    }

    const originalPrincipal = Currency.of(this.loan.principal).add(
      this.loan.originationFee,
    );
    const actualRemainingPrincipal =
      originalPrincipal.subtract(actualPrincipalPaid);

    const accruedInterestNow = this.amortization
      ? this.amortization.getAccruedInterestByDate(this.snapshotDate)
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
    this.loan = { ...this.defaultLoan };

    // Reset other properties
    this.currentLoanName = 'New Loan';
    this.loanModified = false;

    // Reset bills and deposits
    this.bills = [];

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
    this.loanModified = true; // Mark as modified
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
  };

  tabNames: string[] = [
    'basicInfo',
    'overrides',
    'advancedSettings',
    'customPeriodsSchedule',
    'deposits',
    'bills',
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

  getNextTermNumber(): number {
    if (this.loan.feesPerTerm.length === 0) {
      return 1;
    } else {
      const termNumbers = this.loan.feesPerTerm.map((tf) => tf.termNumber);
      return Math.max(...termNumbers) + 1;
    }
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
    this.loan = { ...this.defaultLoan };
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

  parseLoanData(loan: UILoan) {
    // Parse dates
    loan.startDate = new Date(loan.startDate);
    loan.firstPaymentDate = new Date(loan.firstPaymentDate);
    loan.endDate = new Date(loan.endDate);

    // Set default if not present
    loan.perDiemCalculationType =
      loan.perDiemCalculationType || 'AnnualRateDividedByDaysInYear';

    // Parse deposits
    if (loan.deposits.length > 0) {
      loan.deposits = loan.deposits.map((deposit: DepositRecord) => {
        return DepositRecord.rehydrateFromJSON(deposit);
      });
    }

    // Parse feesForAllTerms
    if (loan.feesForAllTerms) {
      loan.feesForAllTerms = loan.feesForAllTerms.map((fee) => ({
        type: fee.type,
        amount: fee.amount,
        percentage: fee.percentage,
        basedOn: fee.basedOn,
        description: fee.description,
        metadata: fee.metadata,
      }));
    } else {
      loan.feesForAllTerms = [];
    }

    // Parse feesPerTerm
    if (loan.feesPerTerm) {
      loan.feesPerTerm = loan.feesPerTerm.map((fee) => ({
        termNumber: fee.termNumber,
        type: fee.type,
        amount: fee.amount,
        percentage: fee.percentage,
        basedOn: fee.basedOn,
        description: fee.description,
        metadata: fee.metadata,
      }));
    } else {
      loan.feesPerTerm = [];
    }

    // Parse ratesSchedule
    loan.ratesSchedule = loan.ratesSchedule.map((rate) => ({
      startDate: new Date(rate.startDate),
      endDate: new Date(rate.endDate),
      annualInterestRate: rate.annualInterestRate,
    }));

    // Parse periodsSchedule
    loan.periodsSchedule = loan.periodsSchedule.map((period) => ({
      period: period.period,
      startDate: new Date(period.startDate),
      endDate: new Date(period.endDate),
      interestRate: period.interestRate,
      paymentAmount: period.paymentAmount,
    }));

    // Parse changePaymentDates
    loan.changePaymentDates = loan.changePaymentDates.map(
      (changePaymentDate) => ({
        termNumber: changePaymentDate.termNumber,
        newDate: new Date(changePaymentDate.newDate),
        originalDate: changePaymentDate.originalDate
          ? new Date(changePaymentDate.originalDate)
          : undefined,
      }),
    );

    // Parse termPaymentAmountOverride
    loan.termPaymentAmountOverride = loan.termPaymentAmountOverride.map(
      (termPaymentAmountOverride) => ({
        termNumber: termPaymentAmountOverride.termNumber,
        paymentAmount: termPaymentAmountOverride.paymentAmount,
      }),
    );

    // Parse preBillDays
    loan.preBillDays = loan.preBillDays.map((preBillDay) => ({
      termNumber: preBillDay.termNumber,
      preBillDays: preBillDay.preBillDays,
    }));

    // Parse dueBillDays
    loan.dueBillDays = loan.dueBillDays.map((dueBillDay) => ({
      termNumber: dueBillDay.termNumber,
      daysDueAfterPeriodEnd: dueBillDay.daysDueAfterPeriodEnd,
    }));

    loan.balanceModifications = BalanceModification.parseJSONArray(
      loan.balanceModifications,
    );

    this.submitLoan();
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
    const repaymentSchedule = this.repaymentSchedule;
    this.bills = BillGenerator.generateBills(
      repaymentSchedule,
      this.snapshotDate,
    );
  }

  downloadRepaymentPlanAsCSV() {
    const repaymentPlanCSV = this.amortization?.exportRepaymentScheduleToCSV();
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
    const repaymentPlanCSV = this.amortization?.exportRepaymentScheduleToCSV();
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

  termPeriodDefinitionChange() {
    const termUnit =
      this.loan.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.loan.termPeriodDefinition.unit;
    this.loan.endDate = dayjs(this.loan.startDate)
      .add(this.loan.term * this.loan.termPeriodDefinition.count[0], termUnit)
      .toDate();

    this.loan.firstPaymentDate = dayjs(this.loan.startDate)
      .add(this.loan.termPeriodDefinition.count[0], termUnit)
      .toDate();
    this.loanModified = true;
    this.submitLoan();
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
  loanToEdit = {
    name: '',
    description: '',
  };

  openEditLoanDialog() {
    // Initialize the dialog fields with current loan details
    this.loanToEdit = {
      name: this.currentLoanName,
      description: this.currentLoanDescription || '',
    };
    this.showEditLoanDialog = true;
  }

  saveEditedLoanDetails() {
    // Validate the new loan name
    if (!this.loanToEdit.name) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Loan name is required',
      });
      return;
    }

    // Check if the new name conflicts with an existing loan (excluding the current loan)
    const newKey = `loan_${this.loanToEdit.name}`;
    const oldKey = `loan_${this.currentLoanName}`;

    if (newKey !== oldKey && localStorage.getItem(newKey)) {
      if (
        !confirm(
          `A loan named "${this.loanToEdit.name}" already exists. Do you want to overwrite it?`,
        )
      ) {
        return;
      } else {
        // Remove the existing loan with the new name
        localStorage.removeItem(newKey);
      }
    }

    // Update the loan data in localStorage
    const loanData = {
      loan: this.loan,
      bills: this.bills,
      deposits: this.loan.deposits,
      description: this.loanToEdit.description,
      name: this.loanToEdit.name,
    };

    // Remove the old key if the name has changed
    if (newKey !== oldKey) {
      localStorage.removeItem(oldKey);
    }

    localStorage.setItem(newKey, JSON.stringify(loanData));

    // Update the current loan name and description
    this.currentLoanName = this.loanToEdit.name;
    this.currentLoanDescription = this.loanToEdit.description;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Loan details updated successfully`,
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
    if (!this.amortization) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Amortization Data',
        detail: 'Please calculate the amortization schedule first.',
      });
      return;
    }
    const explainer = new AmortizationExplainer(this.amortization);
    this.loanExplanationText = explainer.getFullExplanation();
    this.showExplanationDialog = true;
  }

  getLineNumbers(code: string): number[] {
    return Array.from({ length: code.split('\n').length }, (_, i) => i + 1);
  }

  openCodeDialog() {
    if (this.amortization) {
      this.generatedCode = this.amortization.toCode();
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
    if (this.currentLoanName && this.currentLoanName !== 'New Loan') {
      // Existing loan, save directly
      this.saveLoan();
    } else {
      // New loan, prompt for name
      this.loanToSave = {
        name: '',
        description: '',
      };
      this.showSaveLoanDialog = true;
    }
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
          description: row.data.description || '',
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
      this.loan = loanData.loan;
      // this.bills = loanData.bills;
      this.loan.deposits = loanData.deposits;
      this.parseLoanData(this.loan);

      // Set the current loan name
      this.currentLoanName = loanData.name || 'Loaded Loan';
      this.currentLoanDescription = loanData.loan.description || '';
      this.currentLoanId = loanData.loan.id || '';

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
    if (!this.currentLoanName || this.currentLoanName === 'New Loan') {
      // New loan, prompt for name
      if (!this.loanToSave.name) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Loan name is required',
        });
        return;
      }

      const key = `loan_${this.loanToSave.name}`;
      //const existingLoan = localStorage.getItem(key);

      // if (existingLoan) {
      //   // Inform the user that the loan will overwrite existing data
      //   if (
      //     !confirm(
      //       `A loan named "${this.loanToSave.name}" already exists. Do you want to overwrite it?`,
      //     )
      //   ) {
      //     return;
      //   }
      // }

      // Save the loan
      const loanData = {
        loan: this.loan,
        bills: this.bills,
        deposits: this.loan.deposits,
        description: this.loanToSave.description,
        name: this.loanToSave.name,
      };

      //localStorage.setItem(key, JSON.stringify(loanData));
      await this.indexedDbService.saveLoan(key, loanData);

      // Update the current loan name and reset loanModified
      this.currentLoanName = this.loanToSave.name;
      this.loanModified = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loan "${
          this.currentLoanName
        }" saved successfully. Access it directly via: ${
          window.location.origin
        }/?loan=${encodeURIComponent(this.currentLoanName)}`,
      });
    } else {
      // Existing loan, save to the same key
      const key = `loan_${this.currentLoanName}`;

      const loanData = {
        loan: this.loan,
        bills: this.bills,
        deposits: this.loan.deposits,
        description: this.loanToSave.description || '',
        name: this.currentLoanName,
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
    }

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
  repaymentSchedule: AmortizationEntry[] = [];
  repaymentPlanEndDates: string[] = [];
  amortization: Amortization | undefined = undefined;
  loanSummary?: LoanSummary;

  createLoanRepaymentPlan() {
    // we will reset current schedule and
    // copy over this.loanRepaymentPlan values to this.loan.periodsSchedule
    // which will become a base for user to modify values
    this.loan.periodsSchedule = this.repaymentSchedule.map((entry) => {
      return {
        period: entry.term,
        startDate: entry.periodStartDate.toDate(),
        endDate: entry.periodEndDate.toDate(),
        interestRate: entry.periodInterestRate.times(100).toNumber(),
        paymentAmount: entry.totalPayment.toNumber(),
      };
    });

    //console.log('Loan repayment plan refreshed', this.loan.periodsSchedule);
    this.submitLoan();
  }

  removeLoanRepaymentPlan() {
    // Logic to remove schedule override
    this.loan.periodsSchedule = [];
    // console.log('Loan repayment plan removed');
    this.submitLoan();
  }

  deletePlan(index: number) {
    this.loan.periodsSchedule.splice(index, 1);
    // console.log('Plan deleted at index:', index);
    this.submitLoan();
  }

  repaymentPlanEndDateChange(index: number) {
    // when end date is changed following start date should be updated
    const selectedRow = this.loan.periodsSchedule[index];
    const endDate = dayjs(selectedRow.endDate);
    const startDate = endDate;
    this.loan.periodsSchedule[index + 1].startDate = selectedRow.endDate;
    this.submitLoan();
  }

  // Handle deposits change event
  onDepositsChange(updatedDeposits: DepositRecord[]) {
    this.loan.deposits = updatedDeposits;
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
    const openBillsAtDepositDate = this.bills.filter(
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
    this.loan.balanceModifications.forEach((balanceModification) => {
      if (balanceModification.metadata?.depositId) {
        const deposit = this.loan.deposits.find(
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
    this.loan.balanceModifications = filteredBalanceModifications;
  }

  applyPayments() {
    console.log('running applyPayments');
    // Reset usageDetails and related fields for each deposit
    this.loan.deposits.forEach((deposit) => {
      deposit.clearHistory();
    });

    // Apply payments to the loan
    const deposits: DepositRecord[] = this.loan.deposits.map((deposit) => {
      return new DepositRecord(deposit);
    });

    const bills: Bill[] = this.bills;

    // Build the allocation strategy based on user selection
    let allocationStrategy = PaymentApplication.getAllocationStrategyFromName(
      this.loan.paymentAllocationStrategy,
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
      const deposit = this.loan.deposits.find((d) => d.id === depositId);
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
        this.loan.balanceModifications = this.loan.balanceModifications.filter(
          (uiMod) =>
            !(uiMod.metadata && uiMod.metadata.depositId === deposit.id),
        );

        // 2) Push the new UI object
        this.loan.balanceModifications.push(result.balanceModification);

        // 3) Also store the ID
        deposit.balanceModificationId = result.balanceModification.id;
      } else {
        // Remove any existing UI modifications for this deposit
        this.loan.balanceModifications = this.loan.balanceModifications.filter(
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
        const bill = this.bills.find((b) => b.id === billId);
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
    this.bills = this.bills.map((bill) => {
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

    const interestRateAsDecimal = new Decimal(this.loan.interestRate);

    let uiAmortizationParams: UIAmortizationParams = {
      loanAmount: this.loan.principal,
      originationFee: this.loan.originationFee,
      annualInterestRate: this.loan.interestRate,
      term: this.loan.term,
      startDate: this.loan.startDate,
      endDate: this.loan.endDate,
      firstPaymentDate: this.loan.firstPaymentDate,
      calendarType: this.loan.calendarType,
      roundingMethod: this.loan.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.loan.flushMethod,
      roundingPrecision: this.loan.roundingPrecision,
      flushThreshold: this.loan.flushThreshold,
      termPeriodDefinition: this.loan.termPeriodDefinition,
      defaultPreBillDaysConfiguration:
        this.loan.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration:
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration,
      preBillDays: this.loan.preBillDays,
      dueBillDays: this.loan.dueBillDays,
      perDiemCalculationType: this.loan.perDiemCalculationType,
      billingModel: this.loan.billingModel,
    };

    // if billing model is Daily Simple Interest Loan then we will remove pre bill days and due bill days
    // configurations
    if (this.loan.billingModel === 'dailySimpleInterest') {
      delete uiAmortizationParams.defaultPreBillDaysConfiguration;
      delete uiAmortizationParams.defaultBillDueDaysAfterPeriodEndConfiguration;
    }

    if (this.loan.termPaymentAmount) {
      uiAmortizationParams.termPaymentAmount = this.loan.termPaymentAmount;
    }

    if (this.loan.changePaymentDates.length > 0) {
      uiAmortizationParams.changePaymentDates = this.loan.changePaymentDates;
    }

    if (this.loan.ratesSchedule.length > 0) {
      uiAmortizationParams.ratesSchedule = this.loan.ratesSchedule;
    }

    if (this.loan.termPaymentAmountOverride.length > 0) {
      uiAmortizationParams.termPaymentAmountOverride =
        this.loan.termPaymentAmountOverride;
    }

    if (this.loan.periodsSchedule.length > 0) {
      uiAmortizationParams.periodsSchedule = this.loan.periodsSchedule;
    }

    if (this.loan.balanceModifications.length > 0) {
      uiAmortizationParams.balanceModifications =
        this.loan.balanceModifications;
    }

    if (this.loan.feesForAllTerms.length > 0) {
      uiAmortizationParams.feesForAllTerms = this.loan.feesForAllTerms;
    }

    if (this.loan.feesPerTerm.length > 0) {
      // Group fees by term number
      // const feesGroupedByTerm = this.loan.feesPerTerm.reduce(
      //   (acc, fee) => {
      //     const termNumber = fee.termNumber;
      //     if (!acc[termNumber]) {
      //       acc[termNumber] = [];
      //     }
      //     acc[termNumber].push(fee);
      //     return acc;
      //   },
      //   {} as { [key: number]: LoanFeePerTerm[] },
      // );

      // Build amortizationParams.feesPerTerm
      uiAmortizationParams.feesPerTerm = this.loan.feesPerTerm;
    }

    if (
      this.loan.termInterestOverride &&
      this.loan.termInterestOverride.length > 0
    ) {
      uiAmortizationParams.termInterestOverride =
        this.loan.termInterestOverride;
    }

    if (
      this.loan.termInterestRateOverride &&
      this.loan.termInterestRateOverride.length > 0
    ) {
      uiAmortizationParams.termInterestRateOverride =
        this.loan.termInterestRateOverride;
    }

    let amortization: Amortization;

    try {
      const engineParams = toAmortizationParams(uiAmortizationParams);
      amortization = new Amortization(engineParams);
      this.loan.firstPaymentDate = amortization.firstPaymentDate.toDate();
      this.loan.endDate = amortization.endDate.toDate();
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
    this.amortization = amortization;
    this.accruedInterest = amortization.getAccruedInterestByDate(
      this.snapshotDate,
    );
    this.tilaDisclosures = amortization.generateTILADisclosures();
    this.repaymentSchedule = amortization.repaymentSchedule;

    this.repaymentPlanEndDates = this.repaymentSchedule.map((entry) => {
      // mm/dd/yy
      return entry.periodEndDate.format('MM/DD/YY');
    });

    this.repaymentPlan = this.repaymentSchedule.map((entry, index) => {
      return {
        period: entry.term,
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
    });

    this.showTable = true;
    // after balance modifications are applied amortization will add usage values and
    // it is possible that modification amount exceeds the principal amount
    // this will show user how much was unused

    this.loan.balanceModifications = this.amortization.balanceModifications;

    this.generateBills();
    this.applyPayments();
    if (this.balanceModificationRemoved === true) {
      this.balanceModificationRemoved = false;
      this.submitLoan();
    }

    // change payment dates will get updated with term number if only original date
    // is passed and term is set to zero.
    this.loan.changePaymentDates = this.amortization.changePaymentDates.map(
      (cpd) => {
        return {
          termNumber: cpd.termNumber,
          newDate: cpd.newDate.toDate(),
        };
      },
    );

    this.loan.termInterestOverride = [];
    this.amortization.termInterestOverrideMap.forEach((value, key) => {
      this.loan.termInterestOverride!.push({
        termNumber: key,
        interestAmount: value.toNumber(),
      });
    });

    this.loanModified = true; // Mark as modified

    this.loanSummary = this.amortization.getLoanSummary(
      dayjs(this.snapshotDate),
    );

    this.actualLoanSummary = this.getActualLoanSummary(); // If already implemented
    this.pastDueSummary = this.getPastDueSummary();

    this.accruedInterestToDate = this.amortization.getAccruedInterestByDate(
      this.snapshotDate,
    );
    this.payoffAmount = this.amortization.getCurrentPayoffAmount(
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

    for (const bill of this.bills) {
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
}

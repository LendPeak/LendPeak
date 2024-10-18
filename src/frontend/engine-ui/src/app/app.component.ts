import { appVersion } from '../environments/version';
import { MessageService } from 'primeng/api';

import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import {
  DropDownOptionString,
  DropDownOptionNumber,
} from './models/common.model';

import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  AmortizationSchedule,
  TILADisclosures,
  Fee,
} from 'lendpeak-engine/models/Amortization';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { Deposit, DepositRecord } from 'lendpeak-engine/models/Deposit';
import {
  PaymentApplication,
  PaymentApplicationResult,
  PaymentComponent,
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

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import {
  LoanDeposit,
  LoanFeeForAllTerms,
  LoanFeePerTerm,
  UILoan,
} from './models/loan.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [MessageService], // Add MessageService to the component providers
})
export class AppComponent implements OnChanges {
  constructor(private messageService: MessageService) {}

  currentVersion = appVersion;
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
  ];

  selectedVersion: string = this.currentVersion;
  selectedReleaseNotes: any;

  snapshotDate: Date = new Date();

  CURRENT_OBJECT_VERSION = 9;
  loan: UILoan = {
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
    calendarType: 'THIRTY_360', // Default value
    roundingMethod: 'ROUND_HALF_EVEN', // Default value
    flushMethod: 'at_threshold', // Default value
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
  };
  tilaDisclosures: TILADisclosures = {
    amountFinanced: Currency.of(0),
    financeCharge: Currency.of(0),
    totalOfPayments: Currency.of(0),
    annualPercentageRate: new Decimal(0),
    paymentSchedule: [],
  };

  bills: Bill[] = [];

  // Handle any actions emitted by the bills component
  onBillAction() {
    // Implement any logic needed when a bill action occurs
  }

  // Handle loan change event
  onLoanChange(updatedLoan: any) {
    this.loan = updatedLoan;
    this.saveUIState(); // Save state if necessary
  }

  paymentApplicationResults: PaymentApplicationResult[] = [];

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

  selectedDepositForEdit: LoanDeposit | null = null;
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

  saveUIState() {
    // store UI state in the local storage that captures the state of the advanced options, rate overrides, and term payment amount overrides
    localStorage.setItem(
      'uiState',
      JSON.stringify({
        advancedSettingsCollapsed: this.advancedSettingsCollapsed,
        termPaymentAmountOverrideCollapsed:
          this.termPaymentAmountOverrideCollapsed,
        rateOverrideCollapsed: this.rateOverrideCollapsed,
        customPeriodsScheduleCollapsed: this.customPeriodsScheduleCollapsed,
        changePaymentDateCollapsed: this.changePaymentDateCollapsed,
        preBillDayTermOverrideCollapsed: this.preBillDayTermOverrideCollapsed,
        dueBillDayTermOverrideCollapsed: this.dueBillDayTermOverrideCollapsed,
        balanceModificationsCollapsed: this.balanceModificationsCollapsed,
      })
    );

    // store this.loan in local storage
    localStorage.setItem('loan', JSON.stringify(this.loan));
  }

  getNextTermNumber(): number {
    if (this.loan.feesPerTerm.length === 0) {
      return 1;
    } else {
      const termNumbers = this.loan.feesPerTerm.map((tf) => tf.termNumber);
      return Math.max(...termNumbers) + 1;
    }
  }

  resetUIState() {
    // remove loacal storage
    localStorage.removeItem('uiState');
    localStorage.removeItem('loan');
    // refresh the page
    // window.location.reload();
  }

  showTooltip(event: Event, tooltipRef: OverlayPanel) {
    tooltipRef.toggle(event);
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
    this.submitLoan();
    // this.updateDataForSnapshotDate();
  }

  closeNewVersionModal() {
    this.showNewVersionModal = false;
  }

  showCurrentReleaseNotes() {
    this.showNewVersionModal = true;

    this.selectedReleaseNotes = this.releaseNotes.find(
      (note) => note.version === this.selectedVersion
    );
  }

  onVersionChange(event: any) {
    this.selectedVersion = event.value;
    this.selectedReleaseNotes = this.releaseNotes.find(
      (note) => note.version === this.selectedVersion
    );
  }

  ngOnInit(): void {
    const storedVersion = localStorage.getItem('appVersion');
    if (storedVersion !== this.currentVersion) {
      this.showCurrentReleaseNotes();
      localStorage.setItem('appVersion', this.currentVersion);
    }

    this.snapshotDate = new Date();
    // Retrieve loan from local storage if exists
    try {
      const loan = localStorage.getItem('loan');

      if (loan) {
        this.loan = JSON.parse(loan);
        // all types are stored as strings in local storage, we need to convert them back to their original types

        if (this.loan.objectVersion !== this.CURRENT_OBJECT_VERSION) {
          // we have outdated cached object, lets just clear it and start fresh
          return this.resetUIState();
        }

        this.loan.startDate = new Date(this.loan.startDate);
        this.loan.firstPaymentDate = new Date(this.loan.firstPaymentDate);
        this.loan.endDate = new Date(this.loan.endDate);

        if (this.loan.deposits.length > 0) {
          this.loan.deposits = this.loan.deposits.map((deposit) => {
            return {
              id: deposit.id,
              amount: deposit.amount,
              currency: deposit.currency,
              createdDate: new Date(deposit.createdDate),
              insertedDate: new Date(deposit.insertedDate),
              effectiveDate: new Date(deposit.effectiveDate),
              clearingDate: deposit.clearingDate
                ? new Date(deposit.clearingDate)
                : undefined,
              systemDate: new Date(deposit.systemDate),
              paymentMethod: deposit.paymentMethod,
              depositor: deposit.depositor,
              depositLocation: deposit.depositLocation,
              usageDetails: [],
              applyExcessToPrincipal: deposit.applyExcessToPrincipal,
              excessAppliedDate: deposit.excessAppliedDate
                ? new Date(deposit.excessAppliedDate)
                : undefined,
            };
          });
        }

        // Parse feesForAllTerms
        if (this.loan.feesForAllTerms) {
          this.loan.feesForAllTerms = this.loan.feesForAllTerms.map((fee) => {
            return {
              type: fee.type,
              amount: fee.amount,
              percentage: fee.percentage,
              basedOn: fee.basedOn,
              description: fee.description,
              metadata: fee.metadata,
            } as LoanFeeForAllTerms;
          });
        } else {
          this.loan.feesForAllTerms = [];
        }

        // Parse feesPerTerm
        if (this.loan.feesPerTerm) {
          this.loan.feesPerTerm = this.loan.feesPerTerm.map((fee) => {
            return {
              termNumber: fee.termNumber,
              type: fee.type,
              amount: fee.amount,
              percentage: fee.percentage,
              basedOn: fee.basedOn,
              description: fee.description,
              metadata: fee.metadata,
            } as LoanFeePerTerm;
          });
        } else {
          this.loan.feesPerTerm = [];
        }

        this.loan.ratesSchedule = this.loan.ratesSchedule.map((rate) => {
          return {
            startDate: new Date(rate.startDate),
            endDate: new Date(rate.endDate),
            annualInterestRate: rate.annualInterestRate,
          };
        });
        this.loan.periodsSchedule = this.loan.periodsSchedule.map((period) => {
          return {
            period: period.period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            interestRate: period.interestRate,
            paymentAmount: period.paymentAmount,
          };
        });
        this.loan.changePaymentDates = this.loan.changePaymentDates.map(
          (changePaymentDate) => {
            return {
              termNumber: changePaymentDate.termNumber,
              newDate: new Date(changePaymentDate.newDate),
            };
          }
        );
        this.loan.termPaymentAmountOverride =
          this.loan.termPaymentAmountOverride.map(
            (termPaymentAmountOverride) => {
              return {
                termNumber: termPaymentAmountOverride.termNumber,
                paymentAmount: termPaymentAmountOverride.paymentAmount,
              };
            }
          );
        this.loan.preBillDays = this.loan.preBillDays.map((preBillDay) => {
          return {
            termNumber: preBillDay.termNumber,
            preBillDays: preBillDay.preBillDays,
          };
        });
        this.loan.dueBillDays = this.loan.dueBillDays.map((dueBillDay) => {
          return {
            termNumber: dueBillDay.termNumber,
            daysDueAfterPeriodEnd: dueBillDay.daysDueAfterPeriodEnd,
          };
        });
        this.loan.balanceModifications = this.loan.balanceModifications.map(
          (balanceModification) => {
            return new BalanceModification(balanceModification);
          }
        );
      }

      // Retrieve UI state from local storage if exists
      const uiState = localStorage.getItem('uiState');
      if (uiState) {
        const uiStateParsed = JSON.parse(uiState);
        this.advancedSettingsCollapsed =
          uiStateParsed.advancedSettingsCollapsed;
        this.termPaymentAmountOverrideCollapsed =
          uiStateParsed.termPaymentAmountOverrideCollapsed;
        this.rateOverrideCollapsed = uiStateParsed.rateOverrideCollapsed;
        this.customPeriodsScheduleCollapsed =
          uiStateParsed.customPeriodsScheduleCollapsed;
        this.changePaymentDateCollapsed =
          uiStateParsed.changePaymentDateCollapsed;
        this.preBillDayTermOverrideCollapsed =
          uiStateParsed.preBillDayTermOverrideCollapsed;
        this.dueBillDayTermOverrideCollapsed =
          uiStateParsed.dueBillDayTermOverrideCollapsed;
        this.balanceModificationsCollapsed =
          uiStateParsed.balanceModificationsCollapsed;
      }
      this.submitLoan();
    } catch (e) {
      console.error('Error while loading loan from local storage:', e);
      this.resetUIState();
    }

    try {
      this.generateBills();
    } catch (e) {
      console.error('Error while generating bills:', e);
    }

    try {
      this.applyPayments();
    } catch (e) {
      console.error('Error while applying payments:', e);
    }

    this.updateTermOptions();
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
    const repaymentSchedule = this.repaymentSchedule;
    if (repaymentSchedule) {
      this.bills = BillGenerator.generateBills(
        repaymentSchedule,
        this.snapshotDate
      );
    } else {
      console.error('Repayment schedule not available');
    }
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

  onTermPaymentAmountChange(value: any) {
    // if (!value) {
    //   this.loan.termPaymentAmount = undefined;
    // } else {
    //   this.loan.termPaymentAmount = parseFloat(this.loan.termPaymentAmount);
    // }
    this.submitLoan();
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
    this.submitLoan();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Changes detected:', changes);
  }

  currencyOptions = [
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    // Add more currencies as needed
  ];

  toolbarActions = [
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
      label: 'Current Release Notes',
      icon: 'pi pi-sparkles',
      command: () => this.showCurrentReleaseNotes(),
    },
  ];

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
  repaymentSchedule: AmortizationSchedule[] = [];
  repaymentPlanEndDates: string[] = [];
  amortization: Amortization | undefined = undefined;

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

    console.log('Loan repayment plan refreshed', this.loan.periodsSchedule);
    this.submitLoan();
  }

  removeLoanRepaymentPlan() {
    // Logic to remove schedule override
    this.loan.periodsSchedule = [];
    console.log('Loan repayment plan removed');
    this.submitLoan();
  }

  deletePlan(index: number) {
    this.loan.periodsSchedule.splice(index, 1);
    console.log('Plan deleted at index:', index);
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
  onDepositsChange(updatedDeposits: LoanDeposit[]) {
    this.loan.deposits = updatedDeposits;
    this.saveUIState(); // Save state if necessary
  }

  // Handle deposit updated event (e.g., to recalculate loan details)
  onDepositUpdated() {
    this.submitLoan();
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  // Payment Allocation Strategy Options
  paymentAllocationStrategy: string = 'FIFO'; // Default value
  paymentAllocationStrategies = [
    { label: 'First In First Out (FIFO)', value: 'FIFO' },
    { label: 'Last In First Out (LIFO)', value: 'LIFO' },
    { label: 'Equal Distribution', value: 'EqualDistribution' },
    { label: 'Proportional', value: 'Proportional' },
  ];

  // Payment Priority Options
  paymentPriorityOptions = ['interest', 'fees', 'principal'];
  paymentPriority: PaymentComponent[] = ['interest', 'fees', 'principal'];

  determineBalanceModificationDate(deposit: LoanDeposit): Date {
    const excessAppliedDate =
      deposit.excessAppliedDate || deposit.effectiveDate;

    // Ensure excessAppliedDate is not null
    if (!excessAppliedDate) {
      throw new Error(
        `Deposit ${deposit.id} has no effective date or excess applied date.`
      );
    }

    // Find open bills at the time of the deposit's effective date
    const depositEffectiveDayjs = dayjs(deposit.effectiveDate);
    const openBillsAtDepositDate = this.bills.filter(
      (bill) =>
        !bill.isPaid &&
        bill.isOpen &&
        dayjs(bill.dueDate).isSameOrAfter(depositEffectiveDayjs)
    );

    let balanceModificationDate: Dayjs;

    if (openBillsAtDepositDate.length > 0) {
      // There are open bills; apply excess at the beginning of the next term
      const latestBill = openBillsAtDepositDate.reduce((latest, bill) =>
        dayjs(bill.dueDate).isAfter(dayjs(latest.dueDate)) ? bill : latest
      );
      const nextTermStartDate = dayjs(
        latestBill.amortizationEntry.periodEndDate
      );

      // Ensure the date is after the excessAppliedDate
      balanceModificationDate = nextTermStartDate.isAfter(
        dayjs(excessAppliedDate)
      )
        ? nextTermStartDate
        : dayjs(excessAppliedDate).startOf('day');
    } else {
      // No open bills; use the effective date or excessAppliedDate
      balanceModificationDate = depositEffectiveDayjs.isAfter(
        dayjs(excessAppliedDate)
      )
        ? depositEffectiveDayjs
        : dayjs(excessAppliedDate).startOf('day');
    }

    return balanceModificationDate.toDate();
  }

  addBalanceModification(balanceModification: BalanceModification) {
    this.loan.balanceModifications.push(balanceModification);
    this.submitLoan();
  }

  removeBalanceModificationForDeposit(deposit: LoanDeposit) {
    // // Remove any balance modifications associated with this deposit
    // this.loan.balanceModifications = this.loan.balanceModifications.filter(
    //   (bm) => !(bm.metadata && bm.metadata.depositId === deposit.id)
    // );

    // loop through this.loan.balanceModifications and remove the balance modification
    // if it is associated with the deposit
    const filteredBalanceModifications: BalanceModification[] = [];
    this.loan.balanceModifications.forEach((balanceModification) => {
      if (balanceModification.metadata?.depositId !== deposit.id) {
        filteredBalanceModifications.push(balanceModification);
      } else {
        console.log(
          `Balance modification with id ${balanceModification.id} removed`
        );
        this.balanceModificationRemoved = true;
      }
    });
    this.loan.balanceModifications = filteredBalanceModifications;

    deposit.balanceModificationId = undefined;
  }

  balanceModificationRemoved = false;

  createOrUpdateBalanceModificationForDeposit(
    deposit: LoanDeposit,
    excessAmount: number
  ) {
    // Find existing balance modification linked to this deposit
    let balanceModification = this.loan.balanceModifications.find(
      (bm) => bm.metadata && bm.metadata.depositId === deposit.id
    );

    // Determine the date to apply the balance modification
    const dateToApply = this.determineBalanceModificationDate(deposit);

    if (balanceModification) {
      // Update existing balance modification
      balanceModification.amount = Currency.of(excessAmount);
      balanceModification.date = dayjs(dateToApply);
      // Update other properties if needed
    } else {
      // Create new balance modification
      const newBalanceModification = new BalanceModification({
        id: this.generateUniqueId(),
        amount: excessAmount,
        date: dateToApply,
        isSystemModification: true,
        type: 'decrease',
        description: `Excess funds applied to principal from deposit ${deposit.id}`,
        metadata: {
          depositId: deposit.id,
        },
      });
      this.addBalanceModification(newBalanceModification);
      deposit.balanceModificationId = newBalanceModification.id;
    }

    deposit.usageDetails.push({
      billId: 'Principal Prepayment',
      period: 0,
      billDueDate: dateToApply,
      allocatedPrincipal: excessAmount,
      allocatedInterest: 0,
      allocatedFees: 0,
      date: dateToApply,
    });
  }

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
          (d) => d.id === balanceModification.metadata.depositId
        );
        if (!deposit) {
          this.balanceModificationRemoved = true;
          return;
        }
      }
      filteredBalanceModifications.push(balanceModification);
    });
    this.loan.balanceModifications = filteredBalanceModifications;
  }

  applyPayments() {
    // Apply payments to the loan
    const deposits: DepositRecord[] = this.loan.deposits.map((deposit) => {
      return new DepositRecord(deposit);
    });

    const bills: Bill[] = this.bills;

    // Build the allocation strategy based on user selection
    let allocationStrategy = PaymentApplication.getAllocationStrategyFromName(
      this.paymentAllocationStrategy
    );

    // Build the payment priority
    const paymentPriority = this.paymentPriority;

    const paymentApp = new PaymentApplication(bills, deposits, {
      allocationStrategy: allocationStrategy,
      paymentPriority: paymentPriority,
    });

    // Process deposits
    this.paymentApplicationResults = paymentApp.processDeposits();

    // Map payment results back to bills and deposits
    this.paymentApplicationResults.forEach((result) => {
      // console.log('Processing deposit', result.depositId);
      // console.log(`results from payment application`, result);
      const depositId = result.depositId;
      const deposit = this.loan.deposits.find((d) => d.id === depositId);
      if (!deposit) {
        console.error(`Deposit with id ${depositId} not found`);
        return;
      }
      // console.log(`Processing deposit ${depositId}`, deposit);

      // Initialize usage details for deposit
      // if (!deposit.usageDetails) {
      deposit.usageDetails = [];
      // }

      // Go through each allocation in the result
      result.allocations.forEach((allocation) => {
        const billId = allocation.billId;
        const bill = this.bills.find((b) => b.id === billId);
        if (!bill) {
          console.info(`Bill with id ${billId} not found`);
          return;
        }

        // Initialize payment details for bill
        if (!bill.paymentDetails) {
          bill.paymentDetails = [];
        }

        // Create payment detail object
        const paymentDetail = new BillPaymentDetail({
          depositId: depositId,
          allocatedPrincipal: allocation.allocatedPrincipal,
          allocatedInterest: allocation.allocatedInterest,
          allocatedFees: allocation.allocatedFees,
          date: deposit.effectiveDate,
        });

        // Add to bill's payment details
        bill.paymentDetails.push(paymentDetail);

        // Create usage detail object for deposit
        const usageDetail = {
          billId: billId,
          period: bill.amortizationEntry?.term || 0,
          billDueDate: bill.dueDate.toDate(),
          allocatedPrincipal: allocation.allocatedPrincipal.toNumber(),
          allocatedInterest: allocation.allocatedInterest.toNumber(),
          allocatedFees: allocation.allocatedFees.toNumber(),
          date: deposit.effectiveDate,
        };

        // Add to deposit's usage details
        deposit.usageDetails.push(usageDetail);
      });

      // Set the unallocated amount (unused amount)
      deposit.unusedAmount = result.unallocatedAmount.toNumber();

      // Handle excess amount to be applied to principal
      if (
        deposit.applyExcessToPrincipal &&
        result.unallocatedAmount.getValue().greaterThan(0)
      ) {
        const excessAmount = result.unallocatedAmount.toNumber();
        this.createOrUpdateBalanceModificationForDeposit(deposit, excessAmount);
      } else {
        // Remove any existing balance modification for this deposit
        this.removeBalanceModificationForDeposit(deposit);
      }
    });

    // Update bills
    this.bills = bills
      .map((bill) => {
        // Find corresponding payment details
        const uiBill = this.bills.find((b) => b.id === bill.id);

        if (!uiBill) {
          console.info(`Bill with id ${bill.id} not found`);
          return null;
        }

        // now we need to pam the details from new bills to old bill that was
        // used for UI

        // return {
        //   ...uiBill,
        //   principalDue: bill.principalDue.toNumber(),
        //   interestDue: bill.interestDue.toNumber(),
        //   feesDue: bill.feesDue.toNumber(),
        //   totalDue: bill.totalDue.toNumber(),
        //   isPaid: bill.isPaid,
        //   paymentMetadata: bill.paymentMetadata,
        //   paymentDetails: uiBill?.paymentDetails || [],
        // };

        const newModifiedBill = new Bill({
          id: uiBill.id,
          period: uiBill.period,
          amortizationEntry: uiBill.amortizationEntry,
          dueDate: uiBill.dueDate,
          openDate: uiBill.openDate,
          daysPastDue: uiBill.daysPastDue,
          isDue: uiBill.isDue,
          isOpen: uiBill.isOpen,
          isPastDue: uiBill.isPastDue,
          paymentDetails: uiBill?.paymentDetails || [],
          // from new bill
          principalDue: bill.principalDue,
          interestDue: bill.interestDue,
          feesDue: bill.feesDue,
          totalDue: bill.totalDue,
          isPaid: bill.isPaid,
          paymentMetadata: bill.paymentMetadata,
        });
        console.log(`new modified bill`, newModifiedBill);
        return newModifiedBill;
      })
      .filter((bill) => bill !== null);

    // Update deposits in the loan object
    this.loan.deposits = this.loan.deposits.map((deposit) => {
      return {
        ...deposit,
        usageDetails: deposit.usageDetails || [],
        unusedAmount: deposit.unusedAmount || 0,
      };
    });

    console.log('Payments applied');
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

  submitLoan() {
    this.cleanupBalanceModifications();

    let calendarType: CalendarType;
    switch (this.loan.calendarType) {
      case 'ACTUAL_ACTUAL':
        calendarType = CalendarType.ACTUAL_ACTUAL;
        break;
      case 'ACTUAL_360':
        calendarType = CalendarType.ACTUAL_360;
        break;
      case 'ACTUAL_365':
        calendarType = CalendarType.ACTUAL_365;
        break;
      case 'THIRTY_360':
        calendarType = CalendarType.THIRTY_360;
        break;
      case 'THIRTY_ACTUAL':
        calendarType = CalendarType.THIRTY_ACTUAL;
        break;
      default:
        calendarType = CalendarType.THIRTY_360;
    }

    let roundingMethod: RoundingMethod;
    switch (this.loan.roundingMethod) {
      case 'ROUND_UP':
        roundingMethod = RoundingMethod.ROUND_UP;
        break;
      case 'ROUND_DOWN':
        roundingMethod = RoundingMethod.ROUND_DOWN;
        break;
      case 'ROUND_HALF_UP':
        roundingMethod = RoundingMethod.ROUND_HALF_UP;
        break;
      case 'ROUND_HALF_DOWN':
        roundingMethod = RoundingMethod.ROUND_HALF_DOWN;
        break;
      case 'ROUND_HALF_EVEN':
        roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
        break;
      case 'ROUND_HALF_CEIL':
        roundingMethod = RoundingMethod.ROUND_HALF_CEIL;
        break;
      case 'ROUND_HALF_FLOOR':
        roundingMethod = RoundingMethod.ROUND_HALF_FLOOR;
        break;
      default:
        roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
    }

    let flushMethod: FlushUnbilledInterestDueToRoundingErrorType;
    switch (this.loan.flushMethod) {
      case 'none':
        flushMethod = FlushUnbilledInterestDueToRoundingErrorType.NONE;
        break;
      case 'at_end':
        flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_END;
        break;
      case 'at_threshold':
        flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
        break;
      default:
        flushMethod = FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
    }

    const interestRateAsDecimal = new Decimal(this.loan.interestRate);

    console.log({
      loanAmount: this.loan.principal,
      interestRate: interestRateAsDecimal.toNumber(),
      term: this.loan.term,
      startDate: this.loan.startDate,
      calendarType: this.loan.calendarType,
      roundingMethod: this.loan.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.loan.flushMethod,
      roundingPrecision: this.loan.roundingPrecision,
      flushThreshold: this.loan.flushThreshold,
      firstPaymentDate: this.loan.firstPaymentDate,
      endDate: this.loan.endDate,
    });

    let amortizationParams: AmortizationParams = {
      loanAmount: Currency.of(this.loan.principal),
      originationFee: Currency.of(this.loan.originationFee),
      annualInterestRate: interestRateAsDecimal.dividedBy(100),
      term: this.loan.term,
      startDate: dayjs(this.loan.startDate),
      endDate: dayjs(this.loan.endDate),
      firstPaymentDate: dayjs(this.loan.firstPaymentDate),
      calendarType: calendarType,
      roundingMethod: roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: flushMethod,
      roundingPrecision: this.loan.roundingPrecision,
      flushThreshold: Currency.of(this.loan.flushThreshold),
      termPeriodDefinition: this.loan.termPeriodDefinition,
      defaultPreBillDaysConfiguration:
        this.loan.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration:
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration,
      preBillDays: this.loan.preBillDays,
      dueBillDays: this.loan.dueBillDays,
    };

    if (this.loan.termPaymentAmount) {
      console.log('Term payment amount:', this.loan.termPaymentAmount);
      amortizationParams.termPaymentAmount = Currency.of(
        this.loan.termPaymentAmount
      );
    }

    if (this.loan.changePaymentDates.length > 0) {
      amortizationParams.changePaymentDates = this.loan.changePaymentDates.map(
        (changePaymentDate) => {
          return {
            termNumber: changePaymentDate.termNumber,
            newDate: dayjs(changePaymentDate.newDate),
          };
        }
      );
    }

    if (this.loan.ratesSchedule.length > 0) {
      amortizationParams.ratesSchedule = this.loan.ratesSchedule.map((rate) => {
        const interestAsDecimal = new Decimal(rate.annualInterestRate);
        return {
          startDate: dayjs(rate.startDate),
          endDate: dayjs(rate.endDate),
          annualInterestRate: interestAsDecimal.dividedBy(100),
        };
      });
    }

    if (this.loan.termPaymentAmountOverride.length > 0) {
      amortizationParams.termPaymentAmountOverride =
        this.loan.termPaymentAmountOverride.map(
          (termPaymentAmountConfiguration) => {
            return {
              termNumber: termPaymentAmountConfiguration.termNumber,
              paymentAmount: Currency.of(
                termPaymentAmountConfiguration.paymentAmount
              ),
            };
          }
        );
    }

    if (this.loan.periodsSchedule.length > 0) {
      amortizationParams.periodsSchedule = this.loan.periodsSchedule.map(
        (period) => {
          const interestAsDecimal = new Decimal(period.interestRate);
          return {
            period: period.period,
            startDate: dayjs(period.startDate),
            endDate: dayjs(period.endDate),
            interestRate: interestAsDecimal.dividedBy(100),
            paymentAmount: Currency.of(period.paymentAmount),
          };
        }
      );
    }

    if (this.loan.balanceModifications.length > 0) {
      console.log('Balance modifications:', this.loan.balanceModifications);
      amortizationParams.balanceModifications = this.loan.balanceModifications;
    }
    // Process feesForAllTerms
    if (this.loan.feesForAllTerms.length > 0) {
      amortizationParams.feesForAllTerms = this.loan.feesForAllTerms.map(
        (fee) => {
          return {
            type: fee.type,
            amount:
              fee.amount !== undefined ? Currency.of(fee.amount) : undefined,
            percentage:
              fee.percentage !== undefined
                ? new Decimal(fee.percentage).dividedBy(100)
                : undefined,
            basedOn: fee.basedOn,
            description: fee.description,
            metadata: fee.metadata,
          } as Fee;
        }
      );
    }

    // Process feesPerTerm
    if (this.loan.feesPerTerm.length > 0) {
      // Group fees by term number
      const feesGroupedByTerm = this.loan.feesPerTerm.reduce((acc, fee) => {
        const termNumber = fee.termNumber;
        if (!acc[termNumber]) {
          acc[termNumber] = [];
        }
        acc[termNumber].push(fee);
        return acc;
      }, {} as { [key: number]: LoanFeePerTerm[] });

      // Build amortizationParams.feesPerTerm
      amortizationParams.feesPerTerm = Object.keys(feesGroupedByTerm).map(
        (termNumberStr) => {
          const termNumber = parseInt(termNumberStr, 10);
          const feesForTerm = feesGroupedByTerm[termNumber];

          return {
            termNumber: termNumber,
            fees: feesForTerm.map(
              (fee) =>
                ({
                  type: fee.type,
                  amount:
                    fee.amount !== undefined
                      ? Currency.of(fee.amount)
                      : undefined,
                  percentage:
                    fee.percentage !== undefined
                      ? new Decimal(fee.percentage).dividedBy(100)
                      : undefined,
                  basedOn: fee.basedOn,
                  description: fee.description,
                  metadata: fee.metadata,
                } as Fee)
            ),
          };
        }
      );
    }

    const amortization = new Amortization(amortizationParams);
    this.amortization = amortization;
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
        perDiem: entry.perDiem.toNumber(),
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

    this.generateBills();
    this.applyPayments();
    if (this.balanceModificationRemoved === true) {
      this.balanceModificationRemoved = false;
      this.submitLoan();
    }
    this.saveUIState();
  }
}

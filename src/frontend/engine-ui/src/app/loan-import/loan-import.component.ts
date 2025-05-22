import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { ConnectorService } from '../services/connector.service';
import { Connector } from '../models/connector.model';
import { ConnectorImportService } from '../services/connector-import.service';
import { MessageService } from 'primeng/api';
import {
  Amortization,
  AmortizationParams,
} from 'lendpeak-engine/models/Amortization';
import { TermInterestAmountOverride } from 'lendpeak-engine/models/TermInterestAmountOverride';
import { TermInterestAmountOverrides } from 'lendpeak-engine/models/TermInterestAmountOverrides';
import { Payment } from '../models/loanpro.model';
import dayjs from 'dayjs';
import { Subscription, from } from 'rxjs';
import { mergeMap, tap, finalize, first } from 'rxjs/operators';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';
import {
  FlushUnbilledInterestDueToRoundingErrorType,
  BillingModel,
} from 'lendpeak-engine/models/Amortization';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';
import { ChangePaymentDates } from 'lendpeak-engine/models/ChangePaymentDates';
import { LoanResponse, DueDateChange } from '../models/loanpro.model';
import { CLSDataResponse } from '../models/cls.model';
import { DepositRecord } from 'lendpeak-engine/models/DepositRecord';
import { FeesPerTerm } from 'lendpeak-engine/models/FeesPerTerm';
import { PeriodSchedules } from 'lendpeak-engine/models/PeriodSchedules';
import { BalanceModifications } from 'lendpeak-engine/models/Amortization/BalanceModifications';
import { BillDueDaysConfigurations } from 'lendpeak-engine/models/BillDueDaysConfigurations';
import { PreBillDaysConfigurations } from 'lendpeak-engine/models/PreBillDaysConfigurations';
import { PreBillDaysConfiguration } from 'lendpeak-engine/models/PreBillDaysConfiguration';
import { TermPaymentAmounts } from 'lendpeak-engine/models/TermPaymentAmounts';
import { TermPaymentAmount } from 'lendpeak-engine/models/TermPaymentAmount';
import { RateSchedules } from 'lendpeak-engine/models/RateSchedules';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { PeriodSchedule } from 'lendpeak-engine/models/PeriodSchedule';
import { TermCalendars } from 'lendpeak-engine/models/TermCalendars';
import { TermCalendar } from 'lendpeak-engine/models/TermCalendar';
import { Calendar, CalendarType } from 'lendpeak-engine/models/Calendar';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { LocalDate, ZoneId } from '@js-joda/core';
import { RoundingMethod } from 'lendpeak-engine/utils/Currency';
import { ClsParser } from '../parsers/cls/cls.parser';
import { ClsToLendPeakMapper } from '../mappers/cls-to-lendpeak.mapper';
import { DEMO_LOANS, DemoLoanDescriptor } from './demo-loan.catalogue';
import { TreeNode } from 'primeng/api';
import { DemoLoanFactory } from './demo-loan.factory';

@Component({
  selector: 'app-loan-import',
  templateUrl: './loan-import.component.html',
  styleUrls: ['./loan-import.component.css'],
  standalone: false,
})
export class LoanImportComponent implements OnInit, OnDestroy {
  connectors: Connector[] = [];
  selectedConnectorId: string = '';

  searchType: 'displayId' | 'systemId' | 'systemIdRange' = 'displayId';
  searchValue: string = '';
  fromSystemId: string = '';
  toSystemId: string = '';

  isLoading: boolean = false;
  showPreviewDialog: boolean = false;
  previewLoans: LoanResponse[] | any = [];
  errorMsg: string = '';

  demoLoanTree: TreeNode[] = [];
  selectedTreeNode?: TreeNode; // bound to <p-tree> selection
  selectedDemoLoan?: DemoLoanDescriptor;

  @Output() loanImported = new EventEmitter<
    { loan: Amortization; deposits: DepositRecords }[]
  >();

  private connectorsSubscription!: Subscription;

  // NEW: Add these three properties for parallel progress
  loansLoaded: number = 0;
  totalLoans: number = 0;
  progressValue: number = 0; // 0–100

  constructor(
    private connectorService: ConnectorService,
    private importService: ConnectorImportService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadConnectors();
  }

  /** Helper: true when Demo connector chosen */
  get isDemoSelected(): boolean {
    return this.getSelectedConnector()?.type === 'Demo';
  }

  ngOnDestroy(): void {
    if (this.connectorsSubscription) {
      this.connectorsSubscription.unsubscribe();
    }
  }

  loadConnectors() {
    this.connectorsSubscription = this.connectorService.connectors$.subscribe(
      (connectors: Connector[]) => {
        this.connectors = connectors;

        // If no connector is currently selected, auto-select the default (if any)
        if (!this.selectedConnectorId) {
          const defaultConnector = connectors.find((c) => c.isDefault);
          if (defaultConnector) {
            this.selectedConnectorId = defaultConnector.id;
          }
        }
      },
    );
  }

  onPreview() {
    // Validate inputs
    if (!this.validateInputs()) return;

    const connector = this.getSelectedConnector();
    if (!connector) return;

    if (connector.type === 'Mongo') {
      this.isLoading = true;
      this.importService
        .importLoan(connector, 'systemId', this.searchValue) // displayId works too
        .subscribe({
          next: (mongoRaw: CLSDataResponse) => {
            this.isLoading = false;

            /** 🔗 convert raw CLS → LendPeak objects */
            const parser = new ClsParser(mongoRaw);
            const { loan } = ClsToLendPeakMapper.map(parser);

            /* Show something meaningful in the preview dialog.
           (You can style this any way you like in the template) */
            this.previewLoans = [{ id: loan.id, name: loan.name }];
            this.showPreviewDialog = true;
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error fetching loan(s) for preview:', error);
            this.errorMsg = 'Failed to fetch loan(s). Please check inputs.';
          },
        });
      return; // <<< keep the early-return
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.previewLoans = [];

    this.importService
      .importLoan(
        connector,
        this.searchType,
        this.searchType === 'systemIdRange'
          ? this.fromSystemId
          : this.searchValue,
        this.searchType === 'systemIdRange' ? this.toSystemId : undefined,
      )
      .subscribe({
        next: (loanData) => {
          this.isLoading = false;
          let previewLoans = Array.isArray(loanData) ? loanData : [loanData];
          // filter out loans that do not have any data
          previewLoans = previewLoans.filter((loan) => loan.d);

          for (let loan of previewLoans) {
            // convert payment dates
            loan.d.Payments.filter((payment: any) => payment.active === 1).map(
              (payment: any) => {
                payment.date = DateUtil.parseLoanProDateToLocalDate(
                  payment.date,
                );
                payment.created = DateUtil.parseLoanProDateToLocalDate(
                  payment.created,
                );
              },
            );
            // convert contractDate to string for display
            loan.d.LoanSetup.contractDate =
              DateUtil.parseLoanProDateToLocalDate(
                loan.d.LoanSetup.contractDate,
              ).toString();
          }

          this.previewLoans = previewLoans;
          if (this.previewLoans.length === 0) {
            this.errorMsg = 'No loans found for the given criteria.';
          }
          this.showPreviewDialog = true;
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error fetching loan(s) for preview:', error);
          this.errorMsg = 'Failed to fetch loan(s). Please check inputs.';
        },
      });
  }

  /**
   * Import the loan chosen in the Demo-Loans tree.
   * Assumes each leaf node's data object exposes a `factory()` that
   * yields { loan: Amortization, deposits: DepositRecords }.
   */

  importDemoLoan(): void {
    const demo = this.selectedDemoLoan;
    const demoId = demo?.id ?? '';

    const factory = DemoLoanFactory[demoId];
    if (!factory) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No loan selected',
        detail: 'Please choose a demo loan in the library first.',
      });
      return;
    }

    this.isLoading = true;
    try {
      const built = factory(); // { loan, deposits }
      this.handleImportedLoans([{ ...built, rawImportData: `demo:${demoId}` }]);
    } catch (err) {
      console.error('Failed to load demo loan:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Import Error',
        detail: `Demo loan ${demoId} is not available yet.`,
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * The main import method.
   * If the user picked systemIdRange, we fetch loans in parallel
   * (browser-limited concurrency) instead of one-by-one.
   */
  importLoan() {
    // Validate inputs
    if (!this.validateInputs()) return;

    const connector = this.getSelectedConnector();
    if (!connector) return;

    if (connector.type === 'Mongo') {
      this.isLoading = true;
      this.importService
        .importLoan(connector, 'systemId', this.searchValue) // displayId works too
        .subscribe({
          next: (mongoRaw: CLSDataResponse) => {
            /** 🔗 Parse & map the CLS payload */
            const parser = new ClsParser(mongoRaw);
            const mapped = ClsToLendPeakMapper.map(parser); // { loan, deposits }

            this.isLoading = false;
            /* 🔔 hand off to the existing emitter */
            this.handleImportedLoans([mapped]);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error importing CLS loan:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to import loan.',
            });
          },
        });
      return; // <<< keep the early-return
    }

    // If NOT systemIdRange => same approach as before (single or multi call).
    if (this.searchType !== 'systemIdRange') {
      this.isLoading = true;
      this.importService
        .importLoan(connector, this.searchType, this.searchValue)
        .subscribe({
          next: (loanData) => {
            this.isLoading = false;

            this.handleImportedLoans([
              this.mapToUILoan(loanData as LoanResponse),
            ]);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error importing loan(s):', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to import loan(s).',
            });
          },
        });

      return;
    }

    const start = parseInt(this.fromSystemId, 10);
    const end = parseInt(this.toSystemId, 10);

    // Prepare to track total & loaded
    this.totalLoans = end - start + 1;
    this.loansLoaded = 0;
    this.progressValue = 0;

    // We'll accumulate the fetched loans in this array
    let loadedLoans: LoanResponse[] = [];

    // Make an array of all system IDs in the range
    const systemIds = Array.from(
      { length: this.totalLoans },
      (_, i) => start + i,
    );

    this.isLoading = true;
    this.errorMsg = '';

    // We'll load them in parallel so the browser fetches as many as it can
    from(systemIds)
      .pipe(
        // You can specify a concurrency limit in mergeMap's 2nd argument, e.g. mergeMap(fn, 5)
        // to fetch 5 at a time. By default, concurrency = Infinity => as many as browser permits.
        mergeMap((id: number) => {
          return this.importService
            .importLoan(connector, 'systemId', id.toString())
            .pipe(
              tap((res: LoanResponse | LoanResponse[]) => {
                this.loansLoaded++;
                this.progressValue = Math.floor(
                  (this.loansLoaded / this.totalLoans) * 100,
                );
                // console.log('Progress:', this.progressValue, this.loansLoaded);
                if (Array.isArray(res)) {
                  loadedLoans.push(...res);
                } else {
                  loadedLoans.push(res);
                }
              }),
            );
        }),
        finalize(() => {
          // Called once everything completes or errors
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: () => {
          // We don't do anything here because it's handled in tap()
        },
        error: (error) => {
          console.error('Error importing some loan(s):', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to import some loan(s).',
          });
        },
        complete: () => {
          // All done => handle the final array of loans
          let loans = loadedLoans.filter((loan) => loan.d);
          if (loans.length === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Loans Found',
              detail: 'No loans found to import.',
            });
            return;
          }

          // Convert them to UILoan and emit
          const uiLoans = loans.map((l) => this.mapToUILoan(l));
          // const deposits = loans.map((l) => this.mapDeposits(l));
          this.handleImportedLoans(uiLoans);
        },
      });
  }

  /**
   * Takes raw LoanResponse | LoanResponse[] | UILoan[] and performs the final
   * "imported" logic => i.e. filter empty, convert to UI objects, and emit.
   */
  private async handleImportedLoans(
    loanData: {
      loan: Amortization;
      deposits: DepositRecords;
      rawImportData: string;
    }[],
  ) {
    try {
      await this.loanImported.emit(loanData);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `${loanData.length} loans imported successfully.`,
      });
    } catch (e) {
      console.error('Error importing loan(s):', e);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to import loan(s).',
      });
    }
  }

  private validateInputs(): boolean {
    if (this.isDemoSelected) {
      if (!this.selectedDemoLoan) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please pick a demo loan in the tree.',
        });
        return false;
      }
      return true;
    }

    if (!this.selectedConnectorId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a connector.',
      });
      return false;
    }

    if (this.searchType === 'displayId' || this.searchType === 'systemId') {
      if (!this.searchValue) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please enter a search value.',
        });
        return false;
      }
    }

    if (this.searchType === 'systemIdRange') {
      if (!this.fromSystemId || !this.toSystemId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please enter both from and to system ID values.',
        });
        return false;
      }
    }

    return true;
  }

  patchInterestOverrideDates(overrides: TermInterestAmountOverride[]) {
    // 1. Sort overrides chronologically, handling undefined dates
    overrides.sort((a, b) => {
      const aEpoch = a.date ? a.date.toEpochDay() : 0;
      const bEpoch = b.date ? b.date.toEpochDay() : 0;
      return aEpoch - bEpoch;
    });

    // 2. First pass: Add one day if the date is before Feb 28
    for (let i = 0; i < overrides.length; i++) {
      if (!overrides[i].date) continue;

      const currentDate = overrides[i].date;
      if (currentDate === undefined) {
        console.log('Date is undefined, skipping');
        continue;
      }
      if (currentDate.monthValue() === 2 && currentDate.dayOfMonth() < 28) {
        const patched = currentDate.plusDays(1);
        console.log(
          `Adding one day because it's before Feb 28. Changing ${currentDate} to ${patched}`,
        );
        overrides[i].date = patched;
      }
    }

    // 3. Second pass: End-of-month patch logic
    for (let i = 1; i < overrides.length; i++) {
      if (!overrides[i - 1].date || !overrides[i].date) continue;

      const prevDate = overrides[i - 1].date;
      if (prevDate === undefined) {
        console.log('Previous date is undefined, skipping');
        continue;
      }
      const currDate = overrides[i].date;
      if (currDate === undefined) {
        console.log('Current date is undefined, skipping');
        continue;
      }

      // Check if previous day was the 28th and the current month is next month with day 27
      const isPrev28 = prevDate.dayOfMonth() === 28;
      const isCurr27 = currDate.dayOfMonth() === 27;
      const isNextMonth =
        prevDate.plusMonths(1).monthValue() === currDate.monthValue() &&
        prevDate.plusMonths(1).year() === currDate.year();

      if (isPrev28 && isCurr27 && isNextMonth) {
        const fixedDate = currDate.withDayOfMonth(28);
        console.log(
          `Patching interest override date from ${currDate} to ${fixedDate}`,
        );
        overrides[i].date = fixedDate;
      }
    }
  }
  private getSelectedConnector(): Connector | null {
    const connector = this.connectorService.getConnectorById(
      this.selectedConnectorId,
    );
    if (!connector) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Selected connector not found.',
      });
      return null;
    }
    return connector;
  }

  private mapToUILoan(loanData: LoanResponse): {
    loan: Amortization;
    deposits: DepositRecords;
    rawImportData: string;
  } {
    let perDiemCalculationType: PerDiemCalculationType =
      'AnnualRateDividedByDaysInYear';
    // if (loanData.d.LoanSetup.calcType === 'loan.calcType.simpleInterest') {
    //   perDiemCalculationType = 'MonthlyRateDividedByDaysInMonth';
    // }

    let calendarType = CalendarType.ACTUAL_365;
    // if (loanData.d.LoanSetup.daysInYear === 'loan.daysInYear.frequency') {
    //   calendarType = 'ACTUAL_360';
    // }

    let billingModel: BillingModel = 'amortized';

    let flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType =
      FlushUnbilledInterestDueToRoundingErrorType.NONE;

    console.log('loanData', loanData);

    // 1. Filter duplicates
    const rawInterestAdjustments = loanData.d.Transactions.filter(
      (tr) => tr.type === 'intAdjustment',
    ).filter(
      (tr, index, self) =>
        index ===
        self.findIndex(
          (t) => t.date === tr.date && t.infoDetails === tr.infoDetails,
        ),
    );

    // 2. Convert them
    const interestOverrides = rawInterestAdjustments.map((tr) => {
      const infoDetail = JSON.parse(tr.infoDetails);
      const amount = infoDetail.type === 'increase' ? infoDetail.amount : '0';

      return new TermInterestAmountOverride({
        termNumber: -1,
        interestAmount: parseFloat(amount),
        date: DateUtil.parseLoanProDateToLocalDate(tr.date),
      });
    });

    // 3. Patch them if needed
    this.patchInterestOverrideDates(interestOverrides);

    const deposits = this.mapDeposits(loanData);
    console.log('adding deposits', deposits);

    // find all scheduled periods by looking at Transactions and getting entries matching title that starts with "Scheduled Payment"
    // and sort it by period from 0 to n
    const scheduledPayments = loanData.d.Transactions.filter(
      (tr) => tr.type === 'scheduledPayment',
    ).sort((a, b) => a.period - b.period);
    const lastScheduledPeriod = scheduledPayments[scheduledPayments.length - 1];
    let endDate: LocalDate | undefined = undefined;
    if (lastScheduledPeriod) {
      // console.trace(
      //   'lastScheduledPeriod.periodEnd',
      //   lastScheduledPeriod.periodEnd,
      // );
      // const lastScheduledPeriodEndDate = DateUtil.normalizeDate(
      //   parseODataDate(lastScheduledPeriod.periodEnd, true),
      // ).plusDays(1);
      const lastScheduledPeriodEndDate = DateUtil.parseLoanProDateToLocalDate(
        lastScheduledPeriod.periodEnd,
      ).plusDays(1);
      endDate = lastScheduledPeriodEndDate;
    }

    // check if there is a payoff transaction, in that instance that becomes end date
    const payoffTransaction = loanData.d.Transactions.find(
      (tr) =>
        tr.type === 'payment' &&
        tr.title.toLocaleLowerCase().includes('payoff'),
    );
    if (payoffTransaction) {
      endDate = DateUtil.parseLoanProDateToLocalDate(payoffTransaction.date);
    }

    const firstPaymentDate = DateUtil.parseLoanProDateToLocalDate(
      loanData.d.LoanSetup.firstPaymentDate,
    );
    const startDate = DateUtil.parseLoanProDateToLocalDate(
      loanData.d.LoanSetup.contractDate,
    );

    // if first payment due day is not the same as start date day, we need to set hasCustomFirstPaymentDate to true
    const hasCustomFirstPaymentDate =
      firstPaymentDate.dayOfMonth() !== startDate.dayOfMonth();
    const uiLoan: AmortizationParams = {
      // objectVersion: 9,
      id: loanData.d.id.toString(),
      name: loanData.d.displayId,
      description: 'Imported from LoanPro',
      loanAmount: parseFloat(loanData.d.LoanSetup.tilLoanAmount),
      originationFee: parseFloat(loanData.d.LoanSetup.underwriting),
      annualInterestRate: parseFloat(loanData.d.LoanSetup.loanRate) / 100,
      //term: parseFloat(loanData.d.LoanSetup.loanTerm),
      // we will set term to the number of scheduled payments
      term: scheduledPayments.length,
      //   feesForAllTerms: [],
      feesPerTerm: FeesPerTerm.empty(),
      startDate: startDate,
      firstPaymentDate: DateUtil.parseLoanProDateToLocalDate(
        loanData.d.LoanSetup.firstPaymentDate,
      ),
      hasCustomFirstPaymentDate: hasCustomFirstPaymentDate,
      // endDate: parseODataDate(loanData.d.LoanSetup.origFinalPaymentDate, true),
      endDate: endDate,
      payoffDate: payoffTransaction
        ? DateUtil.parseLoanProDateToLocalDate(payoffTransaction.date)
        : undefined,
      calendars: new TermCalendars({ primary: calendarType }),
      roundingMethod: RoundingMethod.ROUND_HALF_EVEN,
      billingModel: billingModel,
      perDiemCalculationType: perDiemCalculationType,
      roundingPrecision: 2,
      flushUnbilledInterestRoundingErrorMethod:
        flushUnbilledInterestRoundingErrorMethod,
      flushThreshold: 0.01,
      ratesSchedule: new RateSchedules(),
      interestAccruesFromDayZero: true,
      termPaymentAmountOverride: new TermPaymentAmounts(
        loanData.d.Transactions.filter(
          (tr) =>
            tr.type === 'scheduledPayment' &&
            tr.chargeAmount !== loanData.d.LoanSetup.payment,
        ).map((row) => {
          return new TermPaymentAmount({
            termNumber: row.period,
            paymentAmount: parseFloat(row.chargeAmount),
          });
        }),
      ),
      //  termPaymentAmount: undefined,
      equitedMonthlyPayment: parseFloat(loanData.d.LoanSetup.payment),
      defaultBillDueDaysAfterPeriodEndConfiguration: 0,
      defaultPreBillDaysConfiguration: 0,
      allowRateAbove100: false,
      periodsSchedule: new PeriodSchedules(),
      termInterestAmountOverride: new TermInterestAmountOverrides(
        interestOverrides,
      ),
      changePaymentDates: new ChangePaymentDates(
        loanData.d.DueDateChanges.map((change: DueDateChange) => {
          // console.log('native change', change);
          // console.log('CPD:', {
          //   termNumber: -1,
          //   originalDate: parseODataDate(change.changedDate, true),
          //   newDate: parseODataDate(change.newDate, true),
          // });
          return new ChangePaymentDate({
            termNumber: -1,
            originalDate: DateUtil.parseLoanProDateToLocalDate(
              change.changedDate,
            ),
            newDate: DateUtil.parseLoanProDateToLocalDate(change.newDate),
          });
        }),
      ),
      dueBillDays: new BillDueDaysConfigurations(),
      preBillDays: new PreBillDaysConfigurations(),
      termPeriodDefinition: {
        unit: 'month',
        count: [1],
      },
      balanceModifications: new BalanceModifications(),
      //   paymentAllocationStrategy: 'FIFO',

      // deposits: loanData.d.Payments.results
      //   // .filter((payment: any) => payment.active === 1)
      //   .map((payment: any) => {
      //     return new DepositRecord({
      //       amount: parseFloat(payment.amount),
      //       active: payment.active === 1,
      //       currency: 'USD',
      //       effectiveDate: parseODataDate(payment.date, true),
      //       clearingDate: parseODataDate(payment.date, true),
      //       systemDate: parseODataDate(payment.created, true),
      //       id: `(${payment.id}) ${payment.info}`,
      //     });
      //   }),
    };
    const amortization = new Amortization(uiLoan);

    // for this demo connector we will set 30/360 calendars for periods that
    // have interest adjustments

    // get last term of the override and backtrack from that to add calendar overrides to 30/360
    const lastTerm = amortization.termInterestAmountOverride.all.slice(-1)[0];
    if (lastTerm) {
      const lastTermNumber = lastTerm.termNumber;
      for (let i = 0; i <= lastTermNumber; i++) {
        amortization.calendars.addCalendar(
          new TermCalendar({
            termNumber: i,
            calendar: new Calendar(CalendarType.THIRTY_360_US),
          }),
        );

        amortization.preBillDays.addConfiguration(
          new PreBillDaysConfiguration({
            termNumber: i,
            preBillDays: 28,
          }),
        );
      }
    }

    return {
      loan: amortization,
      deposits: deposits,
      rawImportData: JSON.stringify(loanData),
    };
  }

  /** true when the currently-selected connector is MongoDB */
  get isMongoSelected(): boolean {
    return (
      this.connectors.find((c) => c.id === this.selectedConnectorId)?.type ===
      'Mongo'
    );
  }

  /** adjust searchType whenever the connector changes */
  onConnectorChange(): void {
    const connector = this.getSelectedConnector();
    if (connector?.type === 'Mongo') {
      // force System-ID search & clear any range inputs
      this.searchType = 'systemId';
      this.fromSystemId = '';
      this.toSystemId = '';
    }
  }

  private mapDeposits(loanData: LoanResponse): DepositRecords {
    return new DepositRecords(
      loanData.d.Payments.filter(
        (payment: any) => payment.childId === null,
      ).map((payment: any) => {
        console.log('adding payment', payment);
        const depositRecord = new DepositRecord({
          amount: parseFloat(payment.amount),
          active: payment.active === 1,
          currency: 'USD',
          effectiveDate: DateUtil.parseLoanProDateToLocalDate(payment.date),
          clearingDate: DateUtil.parseLoanProDateToLocalDate(payment.date),
          systemDate: DateUtil.parseLoanProDateToLocalDateTime(payment.created),
          id: `(${payment.id}) ${payment.info}`,
          // LPTs had excess applied to principal
          applyExcessToPrincipal: payment.info.includes('LPT') ? true : false,
          applyExcessAtTheEndOfThePeriod: payment.info.includes('LPT')
            ? true
            : false,
          excessAppliedDate: payment.info.includes('LPT')
            ? DateUtil.parseLoanProDateToLocalDate(payment.date)
            : undefined,
        });

        if (payment.customApplication && payment.active === 1) {
          // custom application is a JSON string with the following format:
          // '{"discount":0,"interest":88.01,"payoffFees":0,"principal":39.99,"fees":0,"escrow":{"1":0}}')
          try {
            // check if payment.customApplication is a string, if it is, lets parse that json string
            let customApplication: any;
            if (typeof payment.customApplication === 'string') {
              //console.log('parsing string', payment.customApplication);
              customApplication = JSON.parse(payment.customApplication);
            } else {
              customApplication = payment.customApplication;
            }

            depositRecord.staticAllocation = {
              principal: customApplication.principal,
              interest: customApplication.interest,
              fees: 0,
              prepayment: 0,
            };
          } catch (e) {
            console.error(
              'unable to deserialize customApplication string',
              payment.customApplication,
              e,
            );
          }
        }
        if (
          payment.info
            .toLowerCase()
            .includes('remediation principal adjustment')
        ) {
          // switch to manual allocation and apply all of the payment as a pre-payment
          depositRecord.staticAllocation = {
            principal: 0,
            interest: 0,
            fees: 0,
            prepayment: depositRecord.amount,
          };
          depositRecord.applyExcessToPrincipal = true;
          depositRecord.excessAppliedDate =
            depositRecord.effectiveDate.plusDays(1);
        }
        return depositRecord;
      }),
    );
  }
}

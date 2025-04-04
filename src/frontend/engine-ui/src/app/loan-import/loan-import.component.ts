import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { ConnectorService } from '../services/connector.service';
import { Connector } from '../models/connector.model';
import { LoanProService } from '../services/loanpro.service';
import { MessageService } from 'primeng/api';
import {
  Amortization,
  AmortizationParams,
} from 'lendpeak-engine/models/Amortization';
import { TermInterestAmountOverride } from 'lendpeak-engine/models/TermInterestAmountOverride';
import { TermInterestAmountOverrides } from 'lendpeak-engine/models/TermInterestAmountOverrides';
import { parseODataDate, Payment } from '../models/loanpro.model';
import dayjs from 'dayjs';
import { Subscription, from } from 'rxjs';
import { mergeMap, tap, finalize } from 'rxjs/operators';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';
import {
  FlushUnbilledInterestDueToRoundingErrorType,
  BillingModel,
} from 'lendpeak-engine/models/Amortization';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';
import { ChangePaymentDates } from 'lendpeak-engine/models/ChangePaymentDates';
import { LoanResponse, DueDateChange } from '../models/loanpro.model';
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
import { Calendar } from 'lendpeak-engine/models/Calendar';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';

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
  previewLoans: LoanResponse[] = [];
  errorMsg: string = '';

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
    private loanProService: LoanProService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadConnectors();
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

    this.isLoading = true;
    this.errorMsg = '';
    this.previewLoans = [];

    this.loanProService
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
                payment.date = parseODataDate(payment.date, true);
                payment.created = parseODataDate(payment.created, true);
              },
            );
            // convert contractDate to string for display
            loan.d.LoanSetup.contractDate = parseODataDate(
              loan.d.LoanSetup.contractDate,
              true,
            ).toDateString();
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
   * The main import method.
   * If the user picked systemIdRange, we fetch loans in parallel
   * (browser-limited concurrency) instead of one-by-one.
   */
  importLoan() {
    // Validate inputs
    if (!this.validateInputs()) return;

    const connector = this.getSelectedConnector();
    if (!connector) return;

    // If NOT systemIdRange => same approach as before (single or multi call).
    if (this.searchType !== 'systemIdRange') {
      this.isLoading = true;
      this.loanProService
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
          return this.loanProService
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
    loanData: { loan: Amortization; deposits: DepositRecords }[],
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
    // 1. Sort them chronologically
    overrides.sort(
      (a, b) => (a.date?.valueOf() ?? 0) - (b.date?.valueOf() ?? 0),
    );

    // 2. First pass: if it’s February and day < 28 => add 1 day
    for (let i = 0; i < overrides.length; i++) {
      const currentDate = dayjs(overrides[i].date);

      // Day.js months are zero-based: January=0, February=1, ...
      if (currentDate.month() === 1 && currentDate.date() < 28) {
        const patched = currentDate.add(1, 'day');
        console.log(
          `Adding one day because it's before Feb 28. Changing ${currentDate.format('MM/DD/YYYY')} to ${patched.format('MM/DD/YYYY')}`,
        );
        overrides[i].date = patched; // or overrides[i].date = patched.toDate() if your code expects a JS Date
      }
    }

    // 3. Second pass: your existing “end of month” patch logic
    for (let i = 1; i < overrides.length; i++) {
      const prevDate = dayjs(overrides[i - 1].date);
      const currDate = dayjs(overrides[i].date);

      // If the previous date = 28, and the current is 27 in the very next month => patch current to 28
      if (
        prevDate.date() === 28 &&
        prevDate.add(1, 'month').month() === currDate.month() &&
        currDate.date() === 27
      ) {
        const fixedDate = currDate.date(28);
        console.log(
          `Patching interest override date from ${currDate.format('MM/DD/YYYY')} to ${fixedDate.format('MM/DD/YYYY')}`,
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
  } {
    let perDiemCalculationType: PerDiemCalculationType =
      'AnnualRateDividedByDaysInYear';
    // if (loanData.d.LoanSetup.calcType === 'loan.calcType.simpleInterest') {
    //   perDiemCalculationType = 'MonthlyRateDividedByDaysInMonth';
    // }

    let calendarType = 'ACTUAL_ACTUAL';
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
        date: parseODataDate(tr.date, true),
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
    let endDate: dayjs.Dayjs | undefined = undefined;
    if (lastScheduledPeriod) {
      const lastScheduledPeriodEndDate = dayjs(
        parseODataDate(lastScheduledPeriod.periodEnd, true),
      ).add(1, 'day');
      endDate = lastScheduledPeriodEndDate;
    }

    // check if there is a payoff transaction, in that instance that becomes end date
    const payoffTransaction = loanData.d.Transactions.find(
      (tr) =>
        tr.type === 'payment' &&
        tr.title.toLocaleLowerCase().includes('payoff'),
    );
    if (payoffTransaction) {
      endDate = dayjs(parseODataDate(payoffTransaction.date, true));
    }

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
      startDate: parseODataDate(loanData.d.LoanSetup.contractDate, true),
      firstPaymentDate: parseODataDate(
        loanData.d.LoanSetup.firstPaymentDate,
        true,
      ),
      // endDate: parseODataDate(loanData.d.LoanSetup.origFinalPaymentDate, true),
      endDate: endDate,
      payoffDate: payoffTransaction
        ? dayjs(parseODataDate(payoffTransaction.date, true))
        : undefined,
      calendars: new TermCalendars({ primary: calendarType }),
      roundingMethod: 'ROUND_HALF_EVEN',
      billingModel: billingModel,
      perDiemCalculationType: perDiemCalculationType,
      roundingPrecision: 2,
      flushUnbilledInterestRoundingErrorMethod:
        flushUnbilledInterestRoundingErrorMethod,
      flushThreshold: 0.01,
      ratesSchedule: new RateSchedules(),
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
            originalDate: parseODataDate(change.changedDate, true),
            newDate: parseODataDate(change.newDate, true),
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
    amortization.termInterestAmountOverride.all.forEach((override) => {
      //console.log('adding calendar for term', override.termNumber);
      amortization.calendars.addCalendar(
        new TermCalendar({
          termNumber: override.termNumber,
          calendar: new Calendar('THIRTY_360'),
        }),
      );

      // we will also change prebill day cycle to 28 from default zero under DSI
      amortization.preBillDays.addConfiguration(
        new PreBillDaysConfiguration({
          termNumber: override.termNumber,
          preBillDays: 28,
        }),
      );
    });

    return { loan: amortization, deposits: deposits };
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
          effectiveDate: parseODataDate(payment.date, true),
          clearingDate: parseODataDate(payment.date, true),
          systemDate: parseODataDate(payment.created, true),
          id: `(${payment.id}) ${payment.info}`,
          // LPTs had excess applied to principal
          applyExcessToPrincipal: payment.info.includes('LPT') ? true : false,
          applyExcessAtTheEndOfThePeriod: payment.info.includes('LPT')
            ? true
            : false,
          excessAppliedDate: payment.info.includes('LPT')
            ? parseODataDate(payment.date, true)
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
          depositRecord.excessAppliedDate = depositRecord.effectiveDate.add(
            1,
            'day',
          );
        }
        return depositRecord;
      }),
    );
  }
}

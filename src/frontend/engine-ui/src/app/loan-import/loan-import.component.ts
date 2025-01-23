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
import { UILoan } from 'lendpeak-engine/models/UIInterfaces';
import { parseODataDate, Payment } from '../models/loanpro.model';
import dayjs from 'dayjs';
import { Subscription, from } from 'rxjs';
import { mergeMap, tap, finalize } from 'rxjs/operators';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';
import {
  FlushUnbilledInterestDueToRoundingErrorType,
  BillingModel,
} from 'lendpeak-engine/models/Amortization';
import { LoanResponse, DueDateChange } from '../models/loanpro.model';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';

@Component({
  selector: 'app-loan-import',
  templateUrl: './loan-import.component.html',
  styleUrls: ['./loan-import.component.css'],
  standalone: false,
})
export class LoanImportComponent implements OnInit, OnDestroy {
  connectors: Connector[] = [];
  selectedConnectorId: string = '';

  searchType: 'displayId' | 'systemId' | 'systemIdRange' = 'systemId';
  searchValue: string = '';
  fromSystemId: string = '';
  toSystemId: string = '';

  isLoading: boolean = false;
  showPreviewDialog: boolean = false;
  previewLoans: LoanResponse[] = [];
  errorMsg: string = '';

  @Output() loanImported = new EventEmitter<UILoan | UILoan[]>();

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
            loan.d.Payments.results
              .filter((payment: any) => payment.active === 1)
              .map((payment: any) => {
                payment.date = parseODataDate(payment.date, true);
                payment.created = parseODataDate(payment.created, true);
              });
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
            this.handleImportedLoans(loanData);
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

    // -------------------------------------------------
    // NEW LOGIC for systemIdRange => parallel imports
    // -------------------------------------------------
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
          this.handleImportedLoans(uiLoans);
        },
      });
  }

  /**
   * Takes raw LoanResponse | LoanResponse[] | UILoan[] and performs the final
   * "imported" logic => i.e. filter empty, convert to UI objects, and emit.
   */
  private handleImportedLoans(
    loanData: LoanResponse | LoanResponse[] | UILoan[],
  ) {
    // unify them into array
    let loansArray = Array.isArray(loanData) ? loanData : [loanData];

    // console.log('Imported loans:', loansArray);

    // If they’re still raw LoanResponse, convert them to UILoan
    if (loansArray.length > 0 && (loansArray[0] as any).d) {
      // Filter out empties
      loansArray = (loansArray as LoanResponse[]).filter((loan) => loan.d);
      if (loansArray.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Loans Found',
          detail: 'No loans found to import.',
        });
        return;
      }
      loansArray = loansArray.map((l) => this.mapToUILoan(l));
    }

    const uiLoans = loansArray as UILoan[];

    if (uiLoans.length > 1) {
      // multiple
      try {
        this.loanImported.emit(uiLoans);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${uiLoans.length} loans imported successfully.`,
        });
      } catch (e) {
        console.error('Error importing loan(s):', e);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to import loan(s).',
        });
      }
    } else {
      // single
      this.loanImported.emit(uiLoans[0]);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Loan imported successfully.',
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

  private mapToUILoan(loanData: LoanResponse): UILoan {
    let perDiemCalculationType: PerDiemCalculationType =
      'AnnualRateDividedByDaysInYear';
    if (loanData.d.LoanSetup.calcType === 'loan.calcType.simpleInterest') {
      perDiemCalculationType = 'MonthlyRateDividedByDaysInMonth';
    }

    let calendarType = 'THIRTY_360';
    if (loanData.d.LoanSetup.daysInYear === 'loan.daysInYear.frequency') {
      calendarType = 'ACTUAL_360';
    }

    let billingModel: BillingModel = "dailySimpleInterest";
    

    let flushMethod: FlushUnbilledInterestDueToRoundingErrorType =
      FlushUnbilledInterestDueToRoundingErrorType.NONE;

    const uiLoan: UILoan = {
      objectVersion: 9,
      id: loanData.d.id.toString(),
      name: loanData.d.displayId,
      description: 'Imported from LoanPro',
      principal: parseFloat(loanData.d.LoanSetup.tilLoanAmount),
      originationFee: parseFloat(loanData.d.LoanSetup.underwriting),
      interestRate: parseFloat(loanData.d.LoanSetup.loanRate),
      term: parseFloat(loanData.d.LoanSetup.loanTerm),
      feesForAllTerms: [],
      feesPerTerm: [],
      startDate: parseODataDate(loanData.d.LoanSetup.contractDate, true),
      firstPaymentDate: parseODataDate(
        loanData.d.LoanSetup.firstPaymentDate,
        true,
      ),
      endDate: parseODataDate(loanData.d.LoanSetup.origFinalPaymentDate, true),
      calendarType: calendarType,
      roundingMethod: 'ROUND_HALF_EVEN',
      billingModel: billingModel,
      perDiemCalculationType: perDiemCalculationType,
      roundingPrecision: 2,
      flushMethod: flushMethod,
      flushThreshold: 0.01,
      ratesSchedule: [],
      termPaymentAmountOverride: [],
      termPaymentAmount: undefined,
      defaultBillDueDaysAfterPeriodEndConfiguration: 3,
      defaultPreBillDaysConfiguration: 5,
      allowRateAbove100: false,
      periodsSchedule: [],
      termInterestOverride: loanData.d.Transactions.results
        .filter((tr) => tr.type === 'intAdjustment')
        .map((tr) => {
          // "infoDetails": "{\"type\":\"increase\",\"amount\":\"273.47\"}",

          const infoDetail = JSON.parse(tr.infoDetails);
          let amount = '0';
          if (infoDetail.type == 'increase') {
            amount = infoDetail.amount;
          } else {
            amount = '0';
            console.error('Unknown interest adjustment type:', infoDetail.type);
          }
          return {
            termNumber: 0,
            interestAmount: parseFloat(amount),
            date: parseODataDate(tr.date, true),
          };
        }),
      changePaymentDates: loanData.d.DueDateChanges.results.map(
        (change: DueDateChange) => {
          return {
            termNumber: 0,
            originalDate: parseODataDate(change.originalDate, true),
            newDate: parseODataDate(change.newDate, true),
          };
        },
      ),
      dueBillDays: [],
      preBillDays: [],
      termPeriodDefinition: {
        unit: 'month',
        count: [1],
      },
      balanceModifications: [],
      paymentAllocationStrategy: 'FIFO',

      deposits: loanData.d.Payments.results
        // .filter((payment: any) => payment.active === 1)
        .map((payment: any) => {
          return new DepositRecord({
            amount: parseFloat(payment.amount),
            active: payment.active === 1,
            currency: 'USD',
            effectiveDate: parseODataDate(payment.date, true),
            clearingDate: parseODataDate(payment.date, true),
            systemDate: parseODataDate(payment.created, true),
            id: `(${payment.id}) ${payment.info}`,
          });
        }),
    };

    return uiLoan;
  }
}

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
import { Subscription } from 'rxjs';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';
import { FlushUnbilledInterestDueToRoundingErrorType } from 'lendpeak-engine/models/Amortization';
import { LoanResponse } from '../models/loanpro.model';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';

@Component({
    selector: 'app-loan-import',
    templateUrl: './loan-import.component.html',
    styleUrls: ['./loan-import.component.css'],
    standalone: false
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

          for (let loan of previewLoans) {
            loan.d.Payments.results
              .filter((payment: any) => payment.active === 1)
              .map((payment: any) => {
                payment.date = parseODataDate(payment.date, true);
                payment.created = parseODataDate(payment.created, true);
              });
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

  importLoan() {
    // Validate inputs
    if (!this.validateInputs()) return;

    const connector = this.getSelectedConnector();
    if (!connector) return;

    this.isLoading = true;
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
          // loanData can be single or multiple loans
          const loans = Array.isArray(loanData) ? loanData : [loanData];

          if (loans.length === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Loans Found',
              detail: 'No loans found to import.',
            });
            return;
          }

          const uiLoans = loans.map((l) => this.mapToUILoan(l));

          if (uiLoans.length > 1) {
            // Emit an array of UILoans
            this.loanImported.emit(uiLoans);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${uiLoans.length} loans imported successfully.`,
            });
          } else {
            // Just one loan
            this.loanImported.emit(uiLoans[0]);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Loan imported successfully.',
            });
          }
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

  private mapToUILoan(loanData: any): UILoan {
    let perDiemCalculationType: PerDiemCalculationType =
      'AnnualRateDividedByDaysInYear';
    if (loanData.d.LoanSetup.calcType === 'loan.calcType.simpleInterest') {
      perDiemCalculationType = 'MonthlyRateDividedByDaysInMonth';
    }

    let calendarType = 'THIRTY_360';
    if (loanData.d.LoanSetup.daysInYear === 'loan.daysInYear.frequency') {
      calendarType = 'ACTUAL_360';
    }

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
      changePaymentDates: [],
      dueBillDays: [],
      preBillDays: [],
      termPeriodDefinition: {
        unit: 'month',
        count: [1],
      },
      balanceModifications: [],
      billingModel: 'amortized',
      paymentAllocationStrategy: 'FIFO',
      deposits: loanData.d.Payments.results
        .filter((payment: any) => payment.active === 1)
        .map((payment: any) => {
          return new DepositRecord({
            amount: parseFloat(payment.amount),
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

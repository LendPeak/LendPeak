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
import { UILoan } from '../models/loan.model';
import { parseODataDate } from '../models/loanpro.model';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { DepositRecord } from 'lendpeak-engine/models/Deposit';
import { Subscription } from 'rxjs';
import { PerDiemCalculationType } from 'lendpeak-engine/models/InterestCalculator';
import { FlushUnbilledInterestDueToRoundingErrorType } from 'lendpeak-engine/models/Amortization';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

@Component({
  selector: 'app-loan-import',
  templateUrl: './loan-import.component.html',
  styleUrls: ['./loan-import.component.css'],
})
export class LoanImportComponent implements OnInit, OnDestroy {
  connectors: Connector[] = [];
  selectedConnectorId: string = '';
  searchType: 'displayId' | 'systemId' = 'systemId';
  searchValue: string = '';
  isLoading: boolean = false;

  @Output() loanImported = new EventEmitter<UILoan>();

  private connectorsSubscription!: Subscription;

  // State for preview
  showPreviewDialog: boolean = false;
  previewLoanData: UILoan | null = null; // Store loan data for preview

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

  importLoan() {
    if (!this.selectedConnectorId || !this.searchValue) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a connector and enter a search value.',
      });
      return;
    }

    const connector = this.connectorService.getConnectorById(
      this.selectedConnectorId,
    );

    if (!connector) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Selected connector not found.',
      });
      return;
    }

    this.isLoading = true;

    if (connector.type === 'LoanPro') {
      this.loanProService
        .importLoan(connector, this.searchType, this.searchValue)
        .subscribe(
          (loanData) => {
            this.isLoading = false;
            const uiLoan = this.mapLoanProDataToUILoan(loanData);
            this.loanImported.emit(uiLoan);
          },
          (error) => {
            this.isLoading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to import loan.',
            });
          },
        );
    }
  }

  previewLoan() {
    if (!this.selectedConnectorId || !this.searchValue) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a connector and enter a search value.',
      });
      return;
    }

    const connector = this.connectorService.getConnectorById(
      this.selectedConnectorId,
    );

    if (!connector) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Selected connector not found.',
      });
      return;
    }

    this.isLoading = true;

    if (connector.type === 'LoanPro') {
      this.loanProService
        .importLoan(connector, this.searchType, this.searchValue)
        .subscribe(
          (loanData) => {
            this.isLoading = false;
            const uiLoan = this.mapLoanProDataToUILoan(loanData);
            this.previewLoanData = uiLoan;
            this.showPreviewDialog = true;
          },
          (error) => {
            this.isLoading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to load loan preview.',
            });
          },
        );
    }
  }

  mapLoanProDataToUILoan(loanData: any): UILoan {
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

  closePreview() {
    this.showPreviewDialog = false;
    this.previewLoanData = null;
  }

  confirmImportFromPreview() {
    if (this.previewLoanData) {
      this.loanImported.emit(this.previewLoanData);
      this.showPreviewDialog = false;
      this.previewLoanData = null;
    }
  }
}

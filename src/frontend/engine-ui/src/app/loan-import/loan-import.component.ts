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
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Loan imported successfully.',
            });

            // Map LoanPro data to internal model and emit
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
              startDate: parseODataDate(loanData.d.LoanSetup.contractDate),

              firstPaymentDate: parseODataDate(
                loanData.d.LoanSetup.firstPaymentDate,
              ),

              endDate: parseODataDate(
                loanData.d.LoanSetup.origFinalPaymentDate,
              ),

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
              termPeriodDefinition: {
                unit: 'month',
                count: [1],
              },
              balanceModifications: [],
              billingModel: 'amortized',
              paymentAllocationStrategy: 'FIFO',
              deposits: loanData.d.Payments.results
                .filter((payment) => payment.active === 1)
                .map((payment) => {
                  return new DepositRecord({
                    amount: parseFloat(payment.amount),
                    currency: 'USD',
                    effectiveDate: parseODataDate(payment.date),
                    clearingDate: parseODataDate(payment.date),
                    systemDate: parseODataDate(payment.created),
                    id: `(${payment.id}) ${payment.info}`,
                  });
                }),
            };

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
}

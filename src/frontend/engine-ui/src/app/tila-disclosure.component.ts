import { Component, Input } from '@angular/core';
import {
  TILADisclosures,
  PaymentScheduleEntry,
} from 'lendpeak-engine/models/Amortization';

import { Currency } from 'lendpeak-engine/utils/Currency';

import Decimal from 'decimal.js';

@Component({
    selector: 'app-tila-disclosure',
    templateUrl: './tila-disclosure.component.html',
    styleUrls: ['./tila-disclosure.component.css'],
    standalone: false
})
export class TilaDisclosureComponent {
  @Input() tilaDisclosures: TILADisclosures = {
    amountFinanced: Currency.of(0),
    financeCharge: Currency.of(0),
    totalOfPayments: Currency.of(0),
    annualPercentageRate: new Decimal(0),
    paymentSchedule: [],
  };

  @Input() showTitle: boolean = true;

  // Additional inputs for the agreement
  @Input() lenderName: string = 'LendPeak';
  @Input() borrowerName: string = 'John Doe';
  @Input() loanDate: Date = new Date();
  @Input() loanNumber: string = '123456';
  @Input() collateralDescription: string = 'None';

  // New inputs for terms and conditions
  @Input() prepaymentPenalty: boolean = false;
  @Input() latePaymentGracePeriod: number = 15; // Days
  @Input() latePaymentFee: Currency = Currency.of(25); // Default late fee
  @Input() assumable: boolean = false;

  // Utility functions for formatting
  formatCurrency(value: Currency): string {
    return `$${value.toCurrencyString()}`;
  }

  formatPercentage(value: Decimal): string {
    return `${value.toFixed(2)}%`;
  }
}

import { Component } from '@angular/core';
import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
} from 'lendpeak-engine/models/Amortization';
import { Currency, RoundingMethod } from 'lendpeak-engine/utils/Currency';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { CalendarType } from 'lendpeak-engine/models/Calendar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  loan: {
    principal: number;
    interestRate: number;
    term: number;
    startDate: Date;
    calendarType: string;
    roundingMethod: string;
    flushMethod: string;
    roundingPrecision: number;
    flushThreshold: number;
    ratesSchedule: {
      startDate: Date;
      endDate: Date;
      annualInterestRate: number;
    }[];
  } = {
    principal: 10000,
    interestRate: 0.1,
    term: 12,
    startDate: new Date(),
    calendarType: 'THIRTY_360', // Default value
    roundingMethod: 'ROUND_HALF_EVEN', // Default value
    flushMethod: 'at_threshold', // Default value
    roundingPrecision: 2,
    flushThreshold: 0.01,
    ratesSchedule: [],
  };

  showTable = false;
  showAdvancedTable: boolean = false; // Default is simple view

  showAdvancedOptions = false;

  toggleAdvancedTable() {
    this.showAdvancedTable = !this.showAdvancedTable;
  }

  calendarTypes = [
    { label: 'Actual/Actual', value: 'ACTUAL_ACTUAL' },
    { label: 'Actual/360', value: 'ACTUAL_360' },
    { label: 'Actual/365', value: 'ACTUAL_365' },
    { label: '30/360', value: 'THIRTY_360' },
    { label: '30/Actual', value: 'THIRTY_ACTUAL' },
  ];

  roundingMethods = [
    { label: 'Round Up', value: 'ROUND_UP' },
    { label: 'Round Down', value: 'ROUND_DOWN' },
    { label: 'Round Half Up', value: 'ROUND_HALF_UP' },
    { label: 'Round Half Down', value: 'ROUND_HALF_DOWN' },
    { label: 'Round Half Even (Bankers Rounding)', value: 'ROUND_HALF_EVEN' },
    { label: 'Round Half Ceiling', value: 'ROUND_HALF_CEIL' },
    { label: 'Round Half Floor', value: 'ROUND_HALF_FLOOR' },
  ];

  flushMethods = [
    { label: 'None', value: 'none' },
    { label: 'At End', value: 'at_end' },
    { label: 'At Threshold', value: 'at_threshold' },
  ];

  repaymentPlan = [
    {
      period: 1,
      periodStartDate: '2023-01-01',
      periodEndDate: '2023-02-01',
      periodInterestRate: 0.07,
      principal: 116.48,
      totalInterestForPeriod: 17.835616438356166,
      interest: 17.84,
      realInterest: 17.835616438356166,
      interestRoundingError: -0.004383561643835616,
      totalPayment: 134.32,
      perDiem: 0.58,
      daysInPeriod: 31,
      startBalance: 3000,
      endBalance: 2883.52,
      unbilledInterestDueToRounding: -0.004383561643835616,
      //    metadata: '{"unbilledInterestAmount":-0.004383561643835616}',
    },
    // Add more rows as needed
  ];

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  // Add new rate override
  addRateOverride() {
    const ratesSchedule = this.loan.ratesSchedule;
    let startDate: Date;
    let endDate: Date;

    if (ratesSchedule.length === 0) {
      // First entry: use loan's start date
      startDate = this.loan.startDate;
    } else {
      // Following entries: use end date from previous row as start date
      startDate = ratesSchedule[ratesSchedule.length - 1].endDate;
    }

    // End date is 1 month from start date
    endDate = dayjs(startDate).add(1, 'month').toDate();

    ratesSchedule.push({
      startDate: startDate,
      endDate: endDate,
      annualInterestRate: 0.1,
    });
  }

  // Remove rate override by index
  removeRateOverride(index: number) {
    if (this.loan.ratesSchedule.length > 0) {
      this.loan.ratesSchedule.splice(index, 1);
    }
  }

  submitLoan() {
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

    console.log({
      loanAmount: this.loan.principal,
      interestRate: this.loan.interestRate,
      term: this.loan.term,
      startDate: this.loan.startDate,
      calendarType: this.loan.calendarType,
      roundingMethod: this.loan.roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: this.loan.flushMethod,
      roundingPrecision: this.loan.roundingPrecision,
      flushThreshold: this.loan.flushThreshold,
    });

    const amortizationParams: AmortizationParams = {
      loanAmount: Currency.of(this.loan.principal),
      annualInterestRate: new Decimal(this.loan.interestRate),
      term: this.loan.term,
      startDate: dayjs(this.loan.startDate),
      calendarType: calendarType,
      roundingMethod: roundingMethod,
      flushUnbilledInterestRoundingErrorMethod: flushMethod,
      roundingPrecision: this.loan.roundingPrecision,
      flushThreshold: Currency.of(this.loan.flushThreshold),
    };

    if (this.loan.ratesSchedule.length > 0) {
      amortizationParams.ratesSchedule = this.loan.ratesSchedule.map((rate) => {
        return {
          startDate: dayjs(rate.startDate),
          endDate: dayjs(rate.endDate),
          annualInterestRate: new Decimal(rate.annualInterestRate),
        };
      });
    }

    const amortization = new Amortization(amortizationParams);

    const repaymentPlan = amortization.generateSchedule();
    this.repaymentPlan = repaymentPlan.map((entry, index) => {
      return {
        period: entry.period,
        periodStartDate: entry.periodStartDate.format('YYYY-MM-DD'),
        periodEndDate: entry.periodEndDate.format('YYYY-MM-DD'),
        periodInterestRate: entry.periodInterestRate.toNumber() * 100,
        principal: entry.principal.toNumber(),
        totalInterestForPeriod: entry.totalInterestForPeriod.toNumber(),
        interest: entry.interest.toNumber(),
        realInterest: entry.realInterest.toNumber(),
        interestRoundingError: entry.interestRoundingError.toNumber(),
        totalPayment: entry.totalPayment.toNumber(),
        perDiem: entry.perDiem.toNumber(),
        daysInPeriod: entry.daysInPeriod,
        startBalance: entry.startBalance.toNumber(),
        endBalance: entry.endBalance.toNumber(),
        unbilledInterestDueToRounding:
          entry.unbilledInterestDueToRounding.toNumber(),
        metadata: entry.metadata,
      };
    });

    this.showTable = true;
  }
}

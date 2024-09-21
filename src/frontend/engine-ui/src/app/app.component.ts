import { Component, OnChanges, SimpleChanges } from '@angular/core';
import {
  Amortization,
  AmortizationParams,
  FlushUnbilledInterestDueToRoundingErrorType,
  TermPaymentAmount,
  AmortizationSchedule,
  TermPeriodDefinition,
  PreBillDaysConfiguration,
  BillDueDaysConfiguration,
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
export class AppComponent implements OnChanges {
  CURRENT_OBJECT_VERSION = 5;
  loan: {
    objectVersion: number;
    principal: number;
    originationFee: number;
    interestRate: number;
    term: number;
    startDate: Date;
    firstPaymentDate: Date;
    endDate: Date;
    calendarType: string;
    roundingMethod: string;
    flushMethod: string;
    roundingPrecision: number;
    flushThreshold: number;
    termPaymentAmount: number | undefined;
    allowRateAbove100: boolean;
    defaultPreBillDaysConfiguration: number;
    defaultBillDueDaysAfterPeriodEndConfiguration: number;
    dueBillDays: BillDueDaysConfiguration[];
    preBillDays: PreBillDaysConfiguration[];
    changePaymentDates: {
      termNumber: number;
      newDate: Date;
    }[];
    ratesSchedule: {
      startDate: Date;
      endDate: Date;
      annualInterestRate: number;
    }[];
    termPaymentAmountOverride: { termNumber: number; paymentAmount: number }[];
    periodsSchedule: {
      period: number;
      startDate: Date;
      endDate: Date;
      interestRate: number;
      paymentAmount: number;
    }[];
    termPeriodDefinition: TermPeriodDefinition;
  } = {
    objectVersion: this.CURRENT_OBJECT_VERSION,
    principal: 10000,
    originationFee: 0,
    interestRate: 10,
    term: 12,
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
    termPeriodDefinition: {
      unit: 'month',
      count: [1],
    },
  };

  advancedSettingsCollapsed = true;
  termPaymentAmountOverrideCollapsed = true;
  rateOverrideCollapsed = true;
  customPeriodsScheduleCollapsed = true;
  changePaymentDateCollapsed = true;
  preBillDayTermOverrideCollapsed = true;
  dueBillDayTermOverrideCollapsed = true;

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
      })
    );

    // store this.loan in local storage
    localStorage.setItem('loan', JSON.stringify(this.loan));
  }

  resetUIState() {
    // remove loacal storage
    localStorage.removeItem('uiState');
    localStorage.removeItem('loan');
    // refresh the page
    window.location.reload();
  }

  ngOnInit(): void {
    // Retrieve loan from local storage if exists
    try {
      const loan = localStorage.getItem('loan');
      if (loan) {
        this.loan = JSON.parse(loan);
        if (this.loan.objectVersion !== this.CURRENT_OBJECT_VERSION) {
          // we have outdated cached object, lets just clear it and start fresh
          return this.resetUIState();
        }
        this.loan.startDate = new Date(this.loan.startDate);
        this.loan.firstPaymentDate = new Date(this.loan.firstPaymentDate);
        this.loan.endDate = new Date(this.loan.endDate);
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
      }
      this.submitLoan();
    } catch (e) {
      console.error('Error while loading loan from local storage:', e);
      this.resetUIState();
    }
  }
  showTable = false;
  showAdvancedTable: boolean = false; // Default is simple view

  showAdvancedOptions = false;

  toggleAdvancedTable() {
    this.showAdvancedTable = !this.showAdvancedTable;
  }

  onTermPaymentAmountChange(value: string) {
    if (!value) {
      this.loan.termPaymentAmount = undefined;
    } else {
      this.loan.termPaymentAmount = parseFloat(value);
    }
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

  updateTerm() {
    this.termPeriodDefinitionChange();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Changes detected:', changes);
  }

  termPeriodUnits = [
    { label: 'Year', value: 'year' },
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
  ];

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
  loanRepaymentPlan: AmortizationSchedule[] = [];
  repaymentPlanEndDates: string[] = [];
  amortization: Amortization | undefined = undefined;

  createLoanRepaymentPlan() {
    // we will reset current schedule and
    // copy over this.loanRepaymentPlan values to this.loan.periodsSchedule
    // which will become a base for user to modify values
    this.loan.periodsSchedule = this.loanRepaymentPlan.map((entry) => {
      return {
        period: entry.period,
        startDate: entry.periodStartDate.toDate(),
        endDate: entry.periodEndDate.toDate(),
        interestRate: entry.periodInterestRate.times(100).toNumber(),
        paymentAmount: entry.totalPayment.toNumber(),
      };
    });

    console.log('Loan repayment plan refreshed', this.loan.periodsSchedule);
  }

  removeLoanRepaymentPlan() {
    // Logic to remove schedule override
    this.loan.periodsSchedule = [];
  }

  deletePlan(index: number) {
    this.loan.periodsSchedule.splice(index, 1);
    console.log('Plan deleted at index:', index);
  }

  repaymentPlanEndDateChange(index: number) {
    // when end date is changed following start date should be updated
    const selectedRow = this.loan.periodsSchedule[index];
    const endDate = dayjs(selectedRow.endDate);
    const startDate = endDate;
    this.loan.periodsSchedule[index + 1].startDate = selectedRow.endDate;
    this.submitLoan();
  }

  updateStartDate() {
    // find days in a period
    const daysInAPeriod = this.loan.termPeriodDefinition.count[0];
    const periodUnit =
      this.loan.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.loan.termPeriodDefinition.unit;

    // adjust first payment date based on start date
    this.loan.firstPaymentDate = dayjs(this.loan.startDate)
      .add(daysInAPeriod, periodUnit)
      .toDate();

    // adjust end date based on start date and term
    this.loan.endDate = dayjs(this.loan.startDate)
      .add(this.loan.term * daysInAPeriod, periodUnit)
      .toDate();

    this.submitLoan();
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  addNewChangePaymentTermRow() {
    const changePaymentDates = this.loan.changePaymentDates;

    if (changePaymentDates.length === 0) {
      // First entry: use loan's start date
      changePaymentDates.push({
        termNumber: 1,
        newDate: this.loanRepaymentPlan[0].periodEndDate.toDate(),
      });
    } else {
      // Following entries: use end date from previous row as start date
      const termNumber =
        changePaymentDates[changePaymentDates.length - 1].termNumber + 1;
      changePaymentDates.push({
        termNumber: termNumber,
        newDate: this.loanRepaymentPlan[termNumber].periodEndDate.toDate(),
      });
    }

    this.loan.changePaymentDates = changePaymentDates;
    this.submitLoan();
  }

  addTermPaymentAmountOverride() {
    const termPaymentAmountOveride = this.loan.termPaymentAmountOverride;
    let termNumber: number;
    let paymentAmount: number;

    if (termPaymentAmountOveride.length === 0) {
      // First entry: use loan's start date
      termNumber = 1;
      paymentAmount = 0;
    } else {
      // Following entries: use end date from previous row as start date
      termNumber =
        termPaymentAmountOveride[termPaymentAmountOveride.length - 1]
          .termNumber + 1;
      paymentAmount =
        termPaymentAmountOveride[termPaymentAmountOveride.length - 1]
          .paymentAmount;
    }

    termPaymentAmountOveride.push({
      termNumber: termNumber,
      paymentAmount: paymentAmount,
    });

    this.loan.termPaymentAmountOverride = termPaymentAmountOveride;
    this.submitLoan();
  }

  addPrebillDayTermRow() {
    const preBillDaysConfiguration = this.loan.preBillDays;
    let termNumber: number;
    let preBillDays: number;

    if (preBillDaysConfiguration.length === 0) {
      // First entry: use loan's start date
      termNumber = 1;
      preBillDays = this.loan.defaultPreBillDaysConfiguration;
    } else {
      // Following entries: use end date from previous row as start date
      termNumber =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .termNumber + 1;
      preBillDays =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .preBillDays;
    }

    preBillDaysConfiguration.push({
      termNumber: termNumber,
      preBillDays: preBillDays,
    });

    this.loan.preBillDays = preBillDaysConfiguration;
    this.submitLoan();
  }

  addDueBillDayTermRow() {
    const dueBillDaysConfiguration = this.loan.dueBillDays;
    let termNumber: number;
    let daysDueAfterPeriodEnd: number;

    if (dueBillDaysConfiguration.length === 0) {
      // First entry: use loan's start date
      termNumber = 1;
      daysDueAfterPeriodEnd =
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      // Following entries: use end date from previous row as start date
      termNumber =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .termNumber + 1;
      daysDueAfterPeriodEnd =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .daysDueAfterPeriodEnd;
    }

    dueBillDaysConfiguration.push({
      termNumber: termNumber,
      daysDueAfterPeriodEnd: daysDueAfterPeriodEnd,
    });

    this.loan.dueBillDays = dueBillDaysConfiguration;
    this.submitLoan();
  }

  removeChangePaymentDate(index: number) {
    if (this.loan.changePaymentDates.length > 0) {
      this.loan.changePaymentDates.splice(index, 1);
    }
    this.submitLoan();
  }

  removePreBillDayTerm(index: number) {
    if (this.loan.preBillDays.length > 0) {
      this.loan.preBillDays.splice(index, 1);
    }
    this.submitLoan();
  }

  removeDueBillDayTerm(index: number) {
    if (this.loan.dueBillDays.length > 0) {
      this.loan.dueBillDays.splice(index, 1);
    }
    this.submitLoan();
  }
  removeTermPaymentAmountOverride(index: number) {
    if (this.loan.termPaymentAmountOverride.length > 0) {
      this.loan.termPaymentAmountOverride.splice(index, 1);
    }
    this.submitLoan();
  }

  updateTermForCPD(index: number, termNumber: number) {
    this.loan.changePaymentDates[index].newDate =
      this.loanRepaymentPlan[termNumber - 1].periodEndDate.toDate();
    //this.submitLoan();
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
      annualInterestRate: 10,
    });
    this.submitLoan();
  }

  // Remove rate override by index
  removeRateOverride(index: number) {
    if (this.loan.ratesSchedule.length > 0) {
      this.loan.ratesSchedule.splice(index, 1);
    }
    this.submitLoan();
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

    const amortization = new Amortization(amortizationParams);
    this.amortization = amortization;

    this.loanRepaymentPlan = amortization.generateSchedule();
    this.repaymentPlanEndDates = this.loanRepaymentPlan.map((entry) => {
      // mm/dd/yy
      return entry.periodEndDate.format('MM/DD/YY');
    });
    this.repaymentPlan = this.loanRepaymentPlan.map((entry, index) => {
      return {
        period: entry.period,
        periodStartDate: entry.periodStartDate.format('YYYY-MM-DD'),
        periodEndDate: entry.periodEndDate.format('YYYY-MM-DD'),
        prebillDaysConfiguration: entry.prebillDaysConfiguration,
        billDueDaysAfterPeriodEndConfiguration:
          entry.billDueDaysAfterPeriodEndConfiguration,
        periodBillOpenDate: entry.periodBillOpenDate.format('YYYY-MM-DD'),
        periodBillDueDate: entry.periodBillDueDate.format('YYYY-MM-DD'),
        periodInterestRate: entry.periodInterestRate.times(100).toNumber(),
        principal: entry.principal.toNumber(),
        totalInterestForPeriod: entry.totalInterestForPeriod.toNumber(),
        interest: entry.interest.toNumber(),
        billedDeferredInterest: entry.billedDeferredInterest.toNumber(),
        realInterest: entry.realInterest.toNumber(),
        interestRoundingError: entry.interestRoundingError.toNumber(),
        totalPayment: entry.totalPayment.toNumber(),
        perDiem: entry.perDiem.toNumber(),
        daysInPeriod: entry.daysInPeriod,
        startBalance: entry.startBalance.toNumber(),
        endBalance: entry.endBalance.toNumber(),
        unbilledInterestDueToRounding:
          entry.unbilledInterestDueToRounding.toNumber(),
        totalDeferredInterest: entry.unbilledTotalDeferredInterest.toNumber(),
        deferredInterestFromCurrentPeriod:
          entry.unbilledDeferredInterestFromCurrentPeriod.toNumber(),
        metadata: entry.metadata,
      };
    });

    this.showTable = true;

    this.saveUIState();
  }
}

import { Currency, RoundingMethod } from './utils/Currency';
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from './models/Amortization';
import { ChangePaymentDate } from './models/ChangePaymentDate';
import { TermExtensions } from './models/TermExtensions';
import { CalendarType } from './models/Calendar';
import Decimal from 'decimal.js';
import { LocalDate } from '@js-joda/core';

const loanAmount = Currency.of(1000);
const interestRate = new Decimal(0.05); // 5% annual interest rate
const term = 12; // 12 months
const startDate = LocalDate.parse('2023-01-01');

const amortization = new Amortization({
  loanAmount: loanAmount,
  annualInterestRate: interestRate,
  term: term,
  startDate: startDate,
});

const termExtensions = new TermExtensions([{ quantity: 2, date: '2023-06-01', description: 'Hardship', active: true }]);

amortization.termExtensions = termExtensions;

amortization.calculateAmortizationPlan();

amortization.printShortAmortizationSchedule();

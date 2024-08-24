import dayjs, { Dayjs } from "dayjs";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import { InterestCalculator } from "./InterestCalculator";

export interface AmortizationSchedule {
  period: number;
  paymentDate: Dayjs;
  principal: Currency;
  interest: Currency;
  totalPayment: Currency;
  endBalance: Currency;
  startBalance: Currency;
  perDiem: Currency;
  daysInPeriod: number;
  roundingError: Currency;
  cummulativeRoundError: Currency;
}

export class Amortization {
  loanAmount: Currency;
  interestRate: number;
  term: number; // in months
  startDate: Dayjs;
  calendar: Calendar;
  roundingMethod: RoundingMethod;
  interestCalculator: InterestCalculator;

  constructor(loanAmount: Currency, interestRate: number, term: number, startDate: Dayjs, calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL, roundingMethod: RoundingMethod = RoundingMethod.ROUND_HALF_UP) {
    this.loanAmount = loanAmount;
    this.interestRate = interestRate;
    this.term = term;
    this.startDate = startDate;
    this.calendar = new Calendar(calendarType);
    this.roundingMethod = roundingMethod;
    this.interestCalculator = new InterestCalculator(interestRate, calendarType);
  }

  printAmortizationSchedule(): void {
    const amortization = this.generateSchedule();
    console.table(
      amortization.map((row) => {
        return {
          period: row.period,
          paymentDate: row.paymentDate.format("YYYY-MM-DD"),
          principal: row.principal.getRoundedValue().toNumber(),
          interest: row.interest.getRoundedValue().toNumber(),
          totalPayment: row.totalPayment.getRoundedValue().toNumber(),
          perDiem: row.perDiem.getRoundedValue().toNumber(),
          daysInPeriod: row.daysInPeriod,
          startBalance: row.startBalance.getRoundedValue().toNumber(),
          endBalance: row.endBalance.getRoundedValue().toNumber(),
          roundingError: row.roundingError.getValue().toNumber(),
          cummulativeRoundError: row.cummulativeRoundError.getValue().toNumber(),
        };
      })
    );
  }

  generateSchedule(): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    let startBalance = this.loanAmount;
    const fixedMonthlyPayment = this.calculateFixedMonthlyPayment();

    let cummulativeRoundError = Currency.of(0);

    for (let period = 1; period <= this.term; period++) {
      const paymentDate = this.calendar.addMonths(this.startDate, period);
      const daysInMonth = this.calendar.daysInMonth(paymentDate);

      const unroundedInterest = this.interestCalculator.calculateInterestForDays(startBalance, daysInMonth);
      const unroundedPrincipal = fixedMonthlyPayment.subtract(unroundedInterest);

      const balanceBeforePayment = Currency.of(startBalance);
      const balanceAfterPayment = startBalance.subtract(unroundedPrincipal);

      const roundedInterest = this.round(unroundedInterest);
      const roundedPrincipal = this.round(unroundedPrincipal);
      const roundedBalanceAfterPayment = startBalance.subtract(roundedPrincipal);
      const perDiem = this.round(unroundedInterest.divide(daysInMonth));

      // we always collect correct amount of interest because we do not round it
      // and we subtract from montly payment that interest to find principal
      // rounding error would be in resulting balance after payment

      const roundingError = roundedBalanceAfterPayment.subtract(balanceAfterPayment);
      cummulativeRoundError = cummulativeRoundError.add(roundingError);

      startBalance = roundedBalanceAfterPayment;

      schedule.push({
        period,
        paymentDate,
        principal: roundedPrincipal,
        interest: roundedInterest,
        endBalance: roundedBalanceAfterPayment,
        startBalance: balanceBeforePayment,
        totalPayment: fixedMonthlyPayment,
        perDiem,
        daysInPeriod: daysInMonth,
        roundingError,
        cummulativeRoundError,
      });
    }

    // Adjust the last payment to ensure the balance is zero and incorporate rounding error
    if (startBalance.getValue().toNumber() !== 0) {
      const lastPayment = schedule[schedule.length - 1];
      lastPayment.principal = this.round(lastPayment.principal.add(startBalance));
      lastPayment.totalPayment = this.round(lastPayment.principal.add(lastPayment.interest));
      lastPayment.endBalance = Currency.of(0);
      lastPayment.perDiem = this.round(lastPayment.interest.divide(this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term))));
      lastPayment.daysInPeriod = this.calendar.daysInMonth(this.calendar.addMonths(this.startDate, this.term));
      lastPayment.roundingError = this.round(lastPayment.totalPayment.subtract(lastPayment.principal.add(lastPayment.interest)));
    }

    return schedule;
  }

  private calculateFixedMonthlyPayment(): Currency {
    const monthlyRate = this.interestRate / 12;
    const numerator = this.loanAmount.multiply(monthlyRate);
    const denominator = Currency.of(1).subtract(Currency.of(1).divide((1 + monthlyRate) ** this.term));
    return this.round(numerator.divide(denominator));
  }

  private round(value: Currency): Currency {
    return value.round(2, this.roundingMethod);
  }
}

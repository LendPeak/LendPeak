export interface AmortizationSchedule {
  period: number;
  paymentDate: Date;
  principal: number;
  interest: number;
  balance: number;
}

export class Amortization {
  loanAmount: number;
  interestRate: number;
  term: number; // in months

  constructor(loanAmount: number, interestRate: number, term: number) {
    this.loanAmount = loanAmount;
    this.interestRate = interestRate;
    this.term = term;
  }

  generateSchedule(): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    let balance = this.loanAmount;
    for (let period = 1; period <= this.term; period++) {
      const interest = this.calculateMonthlyInterest(balance);
      const principal = this.calculateMonthlyPrincipal(interest);
      balance -= principal;

      schedule.push({
        period,
        paymentDate: this.calculatePaymentDate(period),
        principal,
        interest,
        balance,
      });
    }
    return schedule;
  }

  private calculateMonthlyInterest(balance: number): number {
    return balance * (this.interestRate / 12);
  }

  private calculateMonthlyPrincipal(interest: number): number {
    const payment = this.loanAmount / this.term; // Simple calculation for demo
    return payment - interest;
  }

  private calculatePaymentDate(period: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + period);
    return date;
  }
}

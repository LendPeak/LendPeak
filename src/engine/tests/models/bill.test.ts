import { Bill } from "../../models/Bill";
import { Currency } from "../../utils/Currency";
import { LocalDate } from "@js-joda/core";
import { AmortizationEntry } from "../../models/Amortization/AmortizationEntry";
import { Calendar, CalendarType } from "../../models/Calendar";

describe('Bill basic behaviors', () => {
  const entry = new AmortizationEntry({
    term: 1,
    periodStartDate: LocalDate.parse('2023-01-01'),
    periodEndDate: LocalDate.parse('2023-02-01'),
    prebillDaysConfiguration: 0,
    billDueDaysAfterPeriodEndConfiguration: 0,
    billablePeriod: true,
    periodBillOpenDate: LocalDate.parse('2023-02-01'),
    periodBillDueDate: LocalDate.parse('2023-02-01'),
    periodInterestRate: 0.05,
    principal: Currency.of(500),
    dueInterestForTerm: Currency.of(10),
    accruedInterestForPeriod: Currency.of(10),
    billedInterestForTerm: Currency.of(10),
    billedDeferredInterest: Currency.zero,
    unbilledTotalDeferredInterest: Currency.zero,
    fees: Currency.zero,
    billedDeferredFees: Currency.zero,
    unbilledTotalDeferredFees: Currency.zero,
    totalPayment: Currency.of(510),
    endBalance: Currency.of(500),
    startBalance: Currency.of(1000),
    balanceModificationAmount: Currency.zero,
    perDiem: Currency.zero,
    daysInPeriod: 31,
    calendar: new Calendar(CalendarType.ACTUAL_365),
    interestRoundingError: Currency.zero,
    unbilledInterestDueToRounding: Currency.zero,
  });

  const bill = new Bill({
    id: 'b1',
    period: 1,
    dueDate: LocalDate.parse('2023-02-01'),
    openDate: LocalDate.parse('2023-02-01'),
    principalDue: Currency.of(500),
    interestDue: Currency.of(10),
    feesDue: Currency.zero,
    totalDue: Currency.of(510),
    amortizationEntry: entry,
  });

  it('identifies past due and paid status correctly', () => {
    const checkDate = LocalDate.parse('2023-02-05');
    expect(bill.isPastDue(checkDate)).toBe(true);
    expect(bill.getDaysPastDue(checkDate)).toBe(4);
    expect(bill.isPaid()).toBe(false);

    bill.reducePrincipalDueBy(Currency.of(500));
    bill.reduceInterestDueBy(Currency.of(10));
    expect(bill.isPaid()).toBe(true);
  });
});

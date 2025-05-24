import { LendPeak } from "../../LendPeak";
import { Amortization } from "../../Amortization";
import { DepositRecords } from "../../DepositRecords";
import { DepositRecord } from "../../DepositRecord";
import { DateUtil } from "../../../utils/DateUtil";
import { LocalDate, ChronoUnit, TemporalAdjusters } from "@js-joda/core";
import { TermCalendars } from "../../TermCalendars";
import { RefundRecord } from "../../RefundRecord";
import { Calendar, CalendarType } from "../../Calendar";
import { FeesPerTerm } from "../../FeesPerTerm";
import { TermFees } from "../../TermFees";
import { Fee } from "../../Fee";

const today = LocalDate.now().minus(5, ChronoUnit.DAYS);

export class DemoA5 {
  static LendPeakObject(): LendPeak {
    return new LendPeak({
      amortization: new Amortization({
        id: "DEMO-A05",
        name: "DEMO-A05",
        description: "Refund > payment (fee defer)",
        startDate: today.minus(13, ChronoUnit.MONTHS),
        originationFee: 100,
        loanAmount: 19_900,
        interestAccruesFromDayZero: true,
        annualInterestRate: 0.1355,
        term: 12,
        calendars: new TermCalendars({
          primary: new Calendar(CalendarType.ACTUAL_365),
        }),
        defaultPreBillDaysConfiguration: 28,
        feesPerTerm: new FeesPerTerm({
          termFees: [
            new TermFees({
              termNumber: 6,
              fees: [
                new Fee({
                  type: "fixed",
                  amount: 2_500,
                  description: "Penalty fee",
                }),
              ],
            }),
          ],
        }),
      }),
      depositRecords: new DepositRecords([
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(12, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-1",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(11, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-2",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(10, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-3",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(9, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-4",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(8, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-5",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(7, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-6",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(6, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-7",
          currency: "USD",
          refunds: [
            new RefundRecord({
              id: "REFUND-A05-1",
              amount: 2_000,
              currency: "USD",
              effectiveDate: today.minus(6, ChronoUnit.MONTHS),
              active: true,
            }),
          ],
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(5, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-8",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(4, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-9",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(3, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-10",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_791.51,
          effectiveDate: today.minus(2, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-11",
          currency: "USD",
        }),
        new DepositRecord({
          amount: 1_795.29,
          effectiveDate: today.minus(1, ChronoUnit.MONTHS),
          id: "DEPOSIT-A05-12",
          currency: "USD",
        }),
      ]),
    });
  }

  static ImportObject(): { loan: Amortization; deposits: DepositRecords } {
    const lendPeak = DemoA5.LendPeakObject();
    return {
      loan: lendPeak.amortization,
      deposits: lendPeak.depositRecords,
    };
  }
}

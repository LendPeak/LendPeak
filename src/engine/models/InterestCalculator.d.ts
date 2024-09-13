import { Dayjs } from "dayjs";
import { Currency } from "../utils/Currency";
import { CalendarType } from "./Calendar";
import Decimal from "decimal.js";
export interface PaymentSplit {
    principal: Currency;
    interest: Currency;
    remainingDeferredInterest: Currency;
}
export interface rateScheduleRow {
    startDate: Dayjs;
    endDate: Dayjs;
    annualInterestRate: number;
}
export declare class InterestCalculator {
    private calendar;
    private annualInterestRate;
    constructor(annualInterestRate: Decimal, calendarType?: CalendarType);
    /**
     * Calculate the interest for a period between two dates.
     * @param principal - The principal amount on which interest is calculated (Currency).
     * @param startDate - The start date of the period.
     * @param endDate - The end date of the period.
     * @returns {Currency} - The interest amount as a Currency object.
     */
    calculateInterest(principal: Currency, startDate: Dayjs, endDate: Dayjs): Currency;
    /**
     * Calculate the daily interest value based on the principal and annual interest rate.
     * @param principal - The principal amount on which daily interest is calculated (Currency).
     * @returns {Currency} - The daily interest amount as a Currency object.
     */
    calculateDailyInterest(principal: Currency, customAnnualInterestRate?: Decimal): Currency;
    /**
     * Calculate the interest for a specified number of days.
     * @param principal - The principal amount on which interest is calculated (Currency).
     * @param days - The number of days for which to calculate interest.
     * @param customAnnualInterestRate - (Optional) A custom annual interest rate to use for the calculation.
     * @returns {Currency} - The interest amount as a Currency object.
     */
    calculateInterestForDays(principal: Currency, days: number, customAnnualInterestRate?: Decimal): Currency;
    /**
     * Calculate the principal and interest split based on the EMI or max payment amount.
     * @param principal - The principal amount (Currency).
     * @param startDate - The start date of the interest period.
     * @param endDate - The end date of the interest period.
     * @param emi - The equated monthly installment or maximum payment amount (Currency).
     * @param deferredInterest - (Optional) The deferred interest that needs to be paid off first (Currency).
     * @returns {PaymentSplit} - The split of principal and interest, and any remaining deferred interest.
     */
    calculatePaymentSplit(principal: Currency, startDate: Dayjs, endDate: Dayjs, emi: Currency, deferredInterest?: Currency): PaymentSplit;
}

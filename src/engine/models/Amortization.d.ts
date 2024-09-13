import { Dayjs } from "dayjs";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Calendar, CalendarType } from "./Calendar";
import Decimal from "decimal.js";
export interface AmortizationScheduleMetadata {
    splitInterestPeriod?: boolean;
    unbilledInterestApplied?: boolean;
    unbilledInterestAppliedAmount?: number;
    interestLessThanOneCent?: boolean;
    unbilledInterestAmount?: number;
    actualInterestValue?: number;
    finalAdjustment?: boolean;
}
/**
 * Represents a single entry in the amortization schedule.
 */
export interface AmortizationSchedule {
    period: number;
    periodStartDate: Dayjs;
    periodEndDate: Dayjs;
    periodInterestRate: Decimal;
    principal: Currency;
    interest: Currency;
    realInterest: Currency;
    totalInterestForPeriod: Currency;
    totalPayment: Currency;
    endBalance: Currency;
    startBalance: Currency;
    perDiem: Currency;
    daysInPeriod: number;
    interestRoundingError: Currency;
    unbilledInterestDueToRounding: Currency;
    metadata: AmortizationScheduleMetadata;
}
export interface PeriodSchedule {
    startDate: Dayjs;
    endDate: Dayjs;
}
export interface RateSchedule {
    annualInterestRate: Decimal;
    startDate: Dayjs;
    endDate: Dayjs;
}
/**
 * Enum for flush cumulative rounding error types.
 */
export declare enum FlushUnbilledInterestDueToRoundingErrorType {
    NONE = "none",
    AT_END = "at_end",
    AT_THRESHOLD = "at_threshold"
}
/**
 * Amortization class to generate an amortization schedule for a loan.
 */
export declare class Amortization {
    loanAmount: Currency;
    annualInterestRate: Decimal;
    term: number;
    startDate: Dayjs;
    endDate: Dayjs;
    calendar: Calendar;
    roundingMethod: RoundingMethod;
    flushUnbilledInterestRoundingErrorMethod: FlushUnbilledInterestDueToRoundingErrorType;
    cumulativeInterestWithoutRounding: Currency;
    totalChargedInterestRounded: Currency;
    totalChargedInterestUnrounded: Currency;
    unbilledInterestDueToRounding: Currency;
    roundingPrecision: number;
    flushThreshold: Currency;
    periodsSchedule: PeriodSchedule[];
    rateSchedules: RateSchedule[];
    constructor(params: {
        loanAmount: Currency;
        interestRate: Decimal;
        term: number;
        startDate: Dayjs;
        endDate?: Dayjs;
        calendarType?: CalendarType;
        roundingMethod?: RoundingMethod;
        flushUnbilledInterestRoundingErrorMethod?: FlushUnbilledInterestDueToRoundingErrorType;
        roundingPrecision?: number;
        flushThreshold?: Currency;
        periodsSchedule?: PeriodSchedule[];
        ratesSchedule?: RateSchedule[];
    });
    /**
     * Validate the schedule rates.
     */
    validateRatesSchedule(): void;
    /**
     * Validate the schedule periods.
     */
    verifySchedulePeriods(): void;
    /**
     * Generate schedule periods based on the term and start date.
     */
    generatePeriodicSchedule(): void;
    /**
     * Generate schedule rates based on the term and start date.
     */
    generateRatesSchedule(): void;
    /**
     * Prints the amortization schedule to the console.
     */
    printAmortizationSchedule(): void;
    /**
     * Get interest rates between the specified start and end dates.
     *
     * Passed start and end date not necessarily spawn a single rate schedule row,
     * so we will return new rate schedules for this range of dates.
     * For example, if the passed start date is 01-13-2023 and the end date is 02-13-2023,
     * and we have rate schedules for 01-01-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-28-2023 at 6%,
     * then we will return two rate schedules for the passed range of dates:
     * 01-13-2023 to 01-31-2023 at 5% and 02-01-2023 to 02-13-2023 at 6%.
     *
     * @param startDate The start date of the range.
     * @param endDate The end date of the range.
     * @returns An array of rate schedules within the specified date range.
     */
    getInterestRatesBetweenDates(startDate: Dayjs, endDate: Dayjs): RateSchedule[];
    /**
     * Generates the amortization schedule.
     * @returns An array of AmortizationSchedule entries.
     */
    generateSchedule(): AmortizationSchedule[];
    /**
     * Calculates the fixed monthly payment for the loan.
     * @returns The fixed monthly payment as a Currency object.
     */
    private calculateFixedMonthlyPayment;
    /**
     * Rounds a Currency value to the specified precision using the specified rounding method.
     * @param value The Currency value to round.
     * @returns The rounded Currency value.
     */
    private round;
}

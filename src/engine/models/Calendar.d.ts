import { Dayjs } from "dayjs";
/**
 * Enum representing different calendar types.
 *
 * - `ACTUAL_ACTUAL`: Uses actual days between two dates.
 * - `ACTUAL_360`: Scales the actual number of days to a 360-day year.
 * - `ACTUAL_365`: Uses actual days between two dates, assuming a 365-day year.
 * - `THIRTY_360`: Assumes 30 days per month and 360 days per year.
 * - `THIRTY_ACTUAL`: Uses 30 days per month when over 30 days, otherwise actual days.
 */
export declare enum CalendarType {
    ACTUAL_ACTUAL = 0,
    ACTUAL_360 = 1,
    ACTUAL_365 = 2,
    THIRTY_360 = 3,
    THIRTY_ACTUAL = 4
}
/**
 * Calendar class for performing date arithmetic according to different calendar conventions.
 *
 * This class uses dayjs for date manipulations and can calculate the number of days between two dates
 * according to various calendar types like 30/360, 30/Actual, etc.
 */
export declare class Calendar {
    calendarType: CalendarType;
    /**
     * Creates an instance of the Calendar class with a specified calendar type.
     *
     * @param calendarType - The type of calendar convention to use. Defaults to `ACTUAL_ACTUAL`.
     */
    constructor(calendarType?: CalendarType);
    /**
     * Sets the calendar type for the instance.
     *
     * @param type - The calendar type to set.
     */
    setCalendarType(type: CalendarType): void;
    /**
     * Gets the current calendar type of the instance.
     *
     * @returns {CalendarType} - The current calendar type.
     */
    getCalendarType(): CalendarType;
    /**
     * Calculates the number of days between two dates according to the current calendar type.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The number of days between the two dates based on the calendar type.
     */
    daysBetween(date1: Dayjs, date2: Dayjs): number;
    /**
     * Adds a specified number of months to a date.
     *
     * @param date - The date to add months to.
     * @param months - The number of months to add.
     * @returns {Dayjs} - The new date with the added months.
     */
    addMonths(date: Dayjs, months: number): Dayjs;
    /**
     * Gets the number of days in the month of a given date according to the current calendar type.
     *
     * @param date - The date to get the number of days in its month.
     * @returns {number} - The number of days in the month based on the calendar type.
     */
    daysInMonth(date: Dayjs): number;
    /**
     * Gets the number of days in a year according to the current calendar type.
     *
     * @returns {number} - The number of days in the year based on the calendar type.
     */
    daysInYear(): number;
    /**
     * Calculates the number of days between two dates using the Actual/Actual convention.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The actual number of days between the two dates.
     */
    private daysBetweenActual_Actual;
    /**
     * Calculates the number of days between two dates using the Actual/360 convention.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The number of days, scaled to a 360-day year.
     */
    private daysBetweenActual_360;
    /**
     * Calculates the number of days between two dates using the Actual/365 convention.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The actual number of days between the two dates, assuming a 365-day year.
     */
    private daysBetweenActual_365;
    /**
     * Calculates the number of days between two dates using the 30/360 convention.
     * Assumes 30 days per month and 360 days per year.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The number of days based on 30/360 convention.
     */
    private daysBetween30_360;
    /**
     * Calculates the number of days between two dates using the 30/Actual convention.
     * Uses 30 days per month when over 30 days, otherwise actual days.
     *
     * @param date1 - The start date.
     * @param date2 - The end date.
     * @returns {number} - The number of days based on 30/Actual convention.
     */
    private daysBetween30_Actual;
    /**
     * Adjusts a date for the 30/360 convention by changing the day of the month to 30 if it is 31.
     *
     * @param date - The date to adjust.
     * @returns {Dayjs} - The adjusted date.
     */
    private adjustDate30_360;
    /**
     * Checks if a date is between two other dates.
     *
     * @param date - The date to check.
     * @param startDate - The start date.
     * @param endDate - The end date.
     * @returns {boolean} - `true` if the date is between the two dates, `false` otherwise.
     */
    isDateBetween(date: Dayjs, startDate: Dayjs, endDate: Dayjs): boolean;
}

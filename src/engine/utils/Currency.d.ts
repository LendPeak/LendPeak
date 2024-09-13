import Decimal from "decimal.js";
/**
 * Enum representing the available rounding methods.
 */
export declare enum RoundingMethod {
    ROUND_UP = 0,
    ROUND_DOWN = 1,
    ROUND_HALF_UP = 2,
    ROUND_HALF_DOWN = 3,
    ROUND_HALF_EVEN = 4,// aka Bankers Rounding
    ROUND_HALF_CEIL = 5,
    ROUND_HALF_FLOOR = 6
}
/**
 * A class that represents a currency amount with precision handling using Decimal.js.
 * The class supports various rounding methods and tracks rounding errors.
 */
export declare class Currency {
    private value;
    private roundingError;
    constructor(amount: number | string | Decimal | Currency);
    static Zero(): Currency;
    static of(amount: number | string | Decimal | Currency): Currency;
    toNumber(): number;
    getValue(): Decimal;
    getRoundingError(): Decimal;
    getRoundingErrorAsCurrency(): Currency;
    round(decimalPlaces?: number, method?: RoundingMethod): Currency;
    /**
     * Returns the value rounded to the specified number of decimal places.
     * Defaults to two decimal places.
     * @param decimalPlaces - The number of decimal places to round to. Defaults to 2.
     * @param method - The rounding method to use. Defaults to ROUND_HALF_UP.
     * @returns {Decimal} - The rounded Decimal value.
     */
    getRoundedValue(decimalPlaces?: number, method?: RoundingMethod): Decimal;
    private getRoundingMode;
    add(amount: number | string | Decimal | Currency): Currency;
    subtract(amount: number | string | Decimal | Currency): Currency;
    multiply(amount: number | string | Decimal | Currency): Currency;
    divide(amount: number | string | Decimal | Currency): Currency;
    toCurrencyString(): string;
    toJson(): string;
}

import Decimal from "decimal.js";

/**
 * Enum representing the available rounding methods.
 */
enum RoundingMethod {
  ROUND_UP,
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_HALF_DOWN,
  ROUND_HALF_EVEN,
  ROUND_HALF_CEIL,
  ROUND_HALF_FLOOR,
}

/**
 * A class that represents a currency amount with precision handling using Decimal.js.
 * The class supports various rounding methods and tracks rounding errors.
 */
class Currency {
  private value: Decimal;
  private roundingError: Decimal;

  /**
   * Creates an instance of Currency.
   * @param amount - The initial amount for the currency. Can be a number, string, or Decimal.
   */
  constructor(amount: number | string | Decimal) {
    this.value = new Decimal(amount);
    this.roundingError = new Decimal(0);
  }

  /**
   * Creates a Currency object initialized to zero.
   * @returns {Currency} - A zero-initialized Currency object.
   */
  static Zero(): Currency {
    return new Currency(0);
  }

  /**
   * Creates a Currency object with a specified amount.
   * This is a shortcut method to create an instance without using the new keyword.
   * @param amount - The initial amount for the currency.
   * @returns {Currency} - A Currency object initialized with the specified amount.
   */
  static of(amount: number | string | Decimal): Currency {
    return new Currency(amount);
  }

  /**
   * Gets the current value of the Currency object.
   * @returns {Decimal} - The current value.
   */
  getValue(): Decimal {
    return this.value;
  }

  /**
   * Gets the rounding error after the last rounding operation.
   * @returns {Decimal} - The rounding error.
   */
  getRoundingError(): Decimal {
    return this.roundingError;
  }

  /**
   * Rounds the value to the specified number of decimal places using the provided rounding method.
   * @param decimalPlaces - The number of decimal places to round to.
   * @param method - The rounding method to use. Defaults to ROUND_HALF_UP.
   * @returns {Currency} - The Currency object with the rounded value.
   */
  round(decimalPlaces: number, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Currency {
    const originalValue = this.value;

    switch (method) {
      case RoundingMethod.ROUND_UP:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_UP);
        break;
      case RoundingMethod.ROUND_DOWN:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN);
        break;
      case RoundingMethod.ROUND_HALF_UP:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
        break;
      case RoundingMethod.ROUND_HALF_DOWN:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_DOWN);
        break;
      case RoundingMethod.ROUND_HALF_EVEN:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_EVEN);
        break;
      case RoundingMethod.ROUND_HALF_CEIL:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_CEIL);
        break;
      case RoundingMethod.ROUND_HALF_FLOOR:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_FLOOR);
        break;
      default:
        this.value = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
    }

    this.roundingError = originalValue.minus(this.value);
    return this;
  }

  /**
   * Adds the specified amount to the current value.
   * @param amount - The amount to add.
   * @returns {Currency} - The updated Currency object.
   */
  add(amount: number | string | Decimal): Currency {
    this.value = this.value.plus(amount);
    return this;
  }

  /**
   * Subtracts the specified amount from the current value.
   * @param amount - The amount to subtract.
   * @returns {Currency} - The updated Currency object.
   */
  subtract(amount: number | string | Decimal): Currency {
    this.value = this.value.minus(amount);
    return this;
  }

  /**
   * Multiplies the current value by the specified amount.
   * @param amount - The amount to multiply by.
   * @returns {Currency} - The updated Currency object.
   */
  multiply(amount: number | string | Decimal): Currency {
    this.value = this.value.times(amount);
    return this;
  }

  /**
   * Divides the current value by the specified amount.
   * @param amount - The amount to divide by.
   * @returns {Currency} - The updated Currency object.
   */
  divide(amount: number | string | Decimal): Currency {
    this.value = this.value.div(amount);
    return this;
  }

  /**
   * Returns the value formatted as a string in currency format with two decimal places.
   * @returns {string} - The formatted currency string.
   */
  toCurrencyString(): string {
    return this.value.toFixed(2);
  }
}

export { Currency, RoundingMethod };

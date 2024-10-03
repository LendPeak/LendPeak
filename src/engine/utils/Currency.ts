import Decimal from "decimal.js";

/**
 * Enum representing the available rounding methods.
 */
export enum RoundingMethod {
  ROUND_UP,
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_HALF_DOWN,
  ROUND_HALF_EVEN, // aka Bankers Rounding
  ROUND_HALF_CEIL,
  ROUND_HALF_FLOOR,
}

/**
 * A class that represents a currency amount with precision handling using Decimal.js.
 * The class supports various rounding methods and tracks rounding errors.
 */
export class Currency {
  private value: Decimal;
  private roundingError: Decimal;

  constructor(amount: number | string | Decimal | Currency) {
    if (amount instanceof Currency) {
      this.value = amount.getValue();
    } else {
      this.value = new Decimal(amount);
    }
    this.roundingError = new Decimal(0);
  }

  static Zero(): Currency {
    return new Currency(0);
  }

  static of(amount: number | string | Decimal | Currency): Currency {
    return new Currency(amount);
  }

  /**
   * Returns the smaller of two Currency instances.
   * @param a - First Currency instance.
   * @param b - Second Currency instance.
   * @returns The Currency instance with the smaller value.
   */
  static min(a: Currency, b: Currency): Currency {
    return a.getValue().lessThanOrEqualTo(b.getValue()) ? a : b;
  }

  negated(): Currency {
    return Currency.of(this.value.negated());
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  getValue(): Decimal {
    return this.value;
  }

  getRoundingError(): Decimal {
    return this.roundingError;
  }

  getRoundingErrorAsCurrency(): Currency {
    return Currency.of(this.roundingError);
  }

  round(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Currency {
    const originalValue = this.value;
    let roundedValue: Decimal;
    switch (method) {
      case RoundingMethod.ROUND_UP:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_UP);
        break;
      case RoundingMethod.ROUND_DOWN:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN);
        break;
      case RoundingMethod.ROUND_HALF_UP:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
        break;
      case RoundingMethod.ROUND_HALF_DOWN:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_DOWN);
        break;
      case RoundingMethod.ROUND_HALF_EVEN:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_EVEN);
        break;
      case RoundingMethod.ROUND_HALF_CEIL:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_CEIL);
        break;
      case RoundingMethod.ROUND_HALF_FLOOR:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_FLOOR);
        break;
      default:
        roundedValue = this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
    }

    const roundingError = originalValue.minus(roundedValue);
    const roundedCurrency = Currency.of(roundedValue);
    roundedCurrency.roundingError = roundingError;
    return roundedCurrency;
  }

  /**
   * Returns the value rounded to the specified number of decimal places.
   * Defaults to two decimal places.
   * @param decimalPlaces - The number of decimal places to round to. Defaults to 2.
   * @param method - The rounding method to use. Defaults to ROUND_HALF_UP.
   * @returns {Decimal} - The rounded Decimal value.
   */
  getRoundedValue(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Decimal {
    return this.value.toDecimalPlaces(decimalPlaces, this.getRoundingMode(method));
  }

  private getRoundingMode(method: RoundingMethod): Decimal.Rounding {
    switch (method) {
      case RoundingMethod.ROUND_UP:
        return Decimal.ROUND_UP;
      case RoundingMethod.ROUND_DOWN:
        return Decimal.ROUND_DOWN;
      case RoundingMethod.ROUND_HALF_UP:
        return Decimal.ROUND_HALF_UP;
      case RoundingMethod.ROUND_HALF_DOWN:
        return Decimal.ROUND_HALF_DOWN;
      case RoundingMethod.ROUND_HALF_EVEN:
        return Decimal.ROUND_HALF_EVEN;
      case RoundingMethod.ROUND_HALF_CEIL:
        return Decimal.ROUND_CEIL;
      case RoundingMethod.ROUND_HALF_FLOOR:
        return Decimal.ROUND_FLOOR;
      default:
        return Decimal.ROUND_HALF_UP;
    }
  }

  add(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      return Currency.of(this.value.plus(amount.value));
    } else {
      return Currency.of(this.value.plus(amount));
    }
  }

  subtract(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      return Currency.of(this.value.minus(amount.value));
    } else {
      return Currency.of(this.value.minus(amount));
    }
  }

  multiply(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      return Currency.of(this.value.times(amount.value));
    } else {
      return Currency.of(this.value.times(amount));
    }
  }

  divide(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      return Currency.of(this.value.dividedBy(amount.value));
    } else {
      return Currency.of(this.value.dividedBy(amount));
    }
  }

  toCurrencyString(): string {
    return this.value.toFixed(2);
  }

  toJson(): string {
    return this.toCurrencyString();
  }

  /**
   * Checks if the value is equal to another Currency's value.
   * @param other - The other Currency instance to compare with.
   * @returns True if values are equal, false otherwise.
   */
  equals(other: Currency): boolean {
    return this.value.equals(other.getValue());
  }

  greaterThan(other: Currency): boolean {
    return this.value.greaterThan(other.getValue());
  }

  lessThan(other: Currency): boolean {
    return this.value.lessThan(other.getValue());
  }

  greaterThanOrEqualTo(other: Currency): boolean {
    return this.value.greaterThanOrEqualTo(other.getValue());
  }

  lessThanOrEqualTo(other: Currency): boolean {
    return this.value.lessThanOrEqualTo(other.getValue());
  }
}

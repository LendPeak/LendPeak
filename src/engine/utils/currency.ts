import Decimal from "decimal.js";

/**
 * Enum representing the available rounding methods.
 */
export enum RoundingMethod {
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
export class Currency {
  private value: Decimal;
  private roundingError: Decimal;

  constructor(amount: number | string | Decimal) {
    this.value = new Decimal(amount);
    this.roundingError = new Decimal(0);
  }

  static Zero(): Currency {
    return new Currency(0);
  }

  static of(amount: number | string | Decimal): Currency {
    return new Currency(amount);
  }

  getValue(): Decimal {
    return this.value;
  }

  getRoundingError(): Decimal {
    return this.roundingError;
  }

  round(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Currency {
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
      this.value = this.value.plus(amount.value);
    } else {
      this.value = this.value.plus(amount);
    }
    return this;
  }

  subtract(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      this.value = this.value.minus(amount.value);
    } else {
      this.value = this.value.minus(amount);
    }
    return this;
  }

  multiply(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      this.value = this.value.times(amount.value);
    } else {
      this.value = this.value.times(amount);
    }
    return this;
  }

  divide(amount: number | string | Decimal | Currency): Currency {
    if (amount instanceof Currency) {
      this.value = this.value.div(amount.value);
    } else {
      this.value = this.value.div(amount);
    }
    return this;
  }

  toCurrencyString(): string {
    return this.value.toFixed(2);
  }
}

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
  private _value!: Decimal;
  private roundingError!: Decimal;
  jsValue!: number;

  constructor(amount: number | string | Decimal | Currency, roundingError?: Decimal | number | string) {
    if (amount === undefined || amount === null) {
      this.value = new Decimal(0);
      this.roundingError = new Decimal(0);
    } else if (amount instanceof Currency) {
      this.value = amount.getValue();
      this.roundingError = amount.getRoundingError();
    } else if (typeof amount === "object" && "value" in amount && "roundingError" in amount) {
      return Currency.fromJSON(amount);
    } else {
      this.value = new Decimal(amount);
      if (roundingError !== undefined) {
        this.roundingError = new Decimal(roundingError);
      } else {
        this.roundingError = new Decimal(0);
      }
    }
  }

  clone() {
    return new Currency(this.value, this.roundingError);
  }

  /** Allows JS/TS to treat Currency like a plain number */
  valueOf(): number {
    return this.toNumber();
  }

  get value(): Decimal {
    return this._value;
  }

  set value(value: Decimal | number | Currency | string) {
    if (value instanceof Currency) {
      this._value = value.getValue();
    } else if (value instanceof Decimal) {
      this._value = value;
    } else {
      this._value = new Decimal(value);
    }
    this.jsValue = this._value.toNumber();
    this.roundingError = new Decimal(0);
  }

  syncJsToValues(): void {
    this.value = this.jsValue;
  }

  get json() {
    return {
      value: this.value.toString(),
      roundingError: this.roundingError.toString(),
    };
  }

  static RoundingMethodFromString(roundingMethodString: string): RoundingMethod {
    let roundingMethod: RoundingMethod;
    switch (roundingMethodString) {
      case "ROUND_UP":
        roundingMethod = RoundingMethod.ROUND_UP;
        break;
      case "ROUND_DOWN":
        roundingMethod = RoundingMethod.ROUND_DOWN;
        break;
      case "ROUND_HALF_UP":
        roundingMethod = RoundingMethod.ROUND_HALF_UP;
        break;
      case "ROUND_HALF_DOWN":
        roundingMethod = RoundingMethod.ROUND_HALF_DOWN;
        break;
      case "ROUND_HALF_EVEN":
        roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
        break;
      case "ROUND_HALF_CEIL":
        roundingMethod = RoundingMethod.ROUND_HALF_CEIL;
        break;
      case "ROUND_HALF_FLOOR":
        roundingMethod = RoundingMethod.ROUND_HALF_FLOOR;
        break;
      default:
        roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
    }
    return roundingMethod;
  }

  static fromJSON(data: any): Currency {
    if (!data) {
      console.trace("Currency.fromJSON: No data provided");
      return Currency.Zero();
    }
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    if (!data.value) {
      console.warn("Currency.fromJSON: No value found in data", data);
      return Currency.Zero();
    }
    const value = new Decimal(data.value);
    const roundingError = new Decimal(data.roundingError || 0);
    return new Currency(value, roundingError);
  }

  static Zero(): Currency {
    return new Currency(0);
  }

  static get zero(): Currency {
    return Currency.Zero();
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

  isPositive(): boolean {
    return this.value.isPositive();
  }

  negated(): Currency {
    return Currency.of(this.value.negated());
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  abs(): Currency {
    return Currency.of(this.value.abs());
  }

  getValue(): Decimal {
    return this.value;
  }

  get decimal(): Decimal {
    return this.value;
  }

  isZero(): boolean {
    return this.value.isZero();
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

  getRoundedNumber(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): number {
    return this.value.toDecimalPlaces(decimalPlaces, this.getRoundingMode(method)).toNumber();
  }

  private getRoundingMode(method: RoundingMethod) {
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
    // Check for division by zero
    let divisor: Decimal;
    if (amount instanceof Currency) {
      divisor = amount.value;
    } else {
      divisor = new Decimal(amount);
    }
    
    if (divisor.isZero()) {
      throw new Error("Division by zero is not allowed");
    }
    
    if (amount instanceof Currency) {
      return Currency.of(this.value.dividedBy(amount.value));
    } else {
      return Currency.of(this.value.dividedBy(amount));
    }
  }

  toCurrencyString(): string {
    return this.value.toFixed(2);
  }

  toJSON(): string {
    return this.toCurrencyString();
  }

  /**
   * @deprecated Use toJSON instead.
   */
  toJson(): string {
    return this.toJSON();
  }

  /**
   * Checks if the value is equal to another Currency's value.
   * @param other - The other Currency instance to compare with.
   * @returns True if values are equal, false otherwise.
   */
  equals(other: Currency): boolean {
    return this.value.equals(other.getValue());
  }

  greaterThan(other: number | string | Decimal | Currency): boolean {
    if (other instanceof Currency) {
      return this.value.greaterThan(other.getValue());
    } else {
      return this.value.greaterThan(other);
    }
  }

  lessThan(other: number | string | Decimal | Currency): boolean {
    if (other instanceof Currency) {
      return this.value.lessThan(other.getValue());
    } else {
      return this.value.lessThan(other);
    }
  }

  greaterThanOrEqualTo(other: number | string | Decimal | Currency): boolean {
    if (other instanceof Currency) {
      return this.value.greaterThanOrEqualTo(other.getValue());
    } else {
      return this.value.greaterThanOrEqualTo(other);
    }
  }

  lessThanOrEqualTo(other: number | string | Decimal | Currency): boolean {
    if (other instanceof Currency) {
      return this.value.lessThanOrEqualTo(other.getValue());
    } else {
      return this.value.lessThanOrEqualTo(other);
    }
  }
}

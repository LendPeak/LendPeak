import { Currency, RoundingMethod } from "@utils/Currency";
import Decimal from "decimal.js";

describe("Currency Class", () => {
  it("should initialize with the correct value", () => {
    const amount = Currency.of(100.25);
    expect(amount.getValue().toString()).toBe("100.25");
  });

  it("should create a zero-initialized currency object", () => {
    const zeroAmount = Currency.Zero();
    expect(zeroAmount.getValue().toString()).toBe("0");
  });

  it("should correctly round the value using ROUND_HALF_UP", () => {
    const amount = Currency.of(123.456789);
    const roundedValue = amount.round(2, RoundingMethod.ROUND_HALF_UP);
    expect(roundedValue.getValue().toString()).toBe("123.46");
    expect(roundedValue.getRoundingError().toString()).toBe("-0.003211");
  });

  it("should correctly round the value using ROUND_DOWN", () => {
    const amount = Currency.of(123.456789);
    const roundedValue = amount.round(2, RoundingMethod.ROUND_DOWN);
    expect(roundedValue.getValue().toString()).toBe("123.45");
    expect(roundedValue.getRoundingError().toString()).toBe("0.006789");
  });

  it("should add amounts correctly", () => {
    const amount = Currency.of(100);
    const result = amount.add(50.25);
    expect(result.getValue().toString()).toBe("150.25");
  });

  it("should subtract amounts correctly", () => {
    const amount = Currency.of(100);
    const result = amount.subtract(25.5);
    expect(result.getValue().toString()).toBe("74.5");
  });

  it("should multiply amounts correctly", () => {
    const amount = Currency.of(100);
    const result = amount.multiply(1.5);
    expect(result.getValue().toString()).toBe("150");
  });

  it("should divide amounts correctly", () => {
    const amount = Currency.of(100);
    const result = amount.divide(4);
    expect(result.getValue().toString()).toBe("25");
  });

  it("should track rounding error correctly", () => {
    const amount = Currency.of(123.456);
    const result = amount.round(2, RoundingMethod.ROUND_HALF_UP);
    expect(result.getValue().toString()).toBe("123.46");
    expect(result.getRoundingError().toString()).toBe("-0.004");
  });

  it("should handle Decimal.js inputs correctly", () => {
    const decimalValue = new Decimal("123.456789");
    const amount = Currency.of(decimalValue);
    expect(amount.getValue().toString()).toBe("123.456789");
  });

  it("should handle string inputs correctly", () => {
    const amount = Currency.of("100.50");
    expect(amount.getValue().toString()).toBe("100.5");
  });

  it("should return a new Currency instance using of() method", () => {
    const amount = Currency.of(200);
    expect(amount.getValue().toString()).toBe("200");
  });

  it("should return the value formatted as a string with two decimal places", () => {
    const amount1 = Currency.of(123.456);
    expect(amount1.toCurrencyString()).toBe("123.46");

    const amount2 = Currency.of(100);
    expect(amount2.toCurrencyString()).toBe("100.00");

    const amount3 = Currency.of(0);
    expect(amount3.toCurrencyString()).toBe("0.00");

    const amount4 = Currency.of("45.5");
    expect(amount4.toCurrencyString()).toBe("45.50");
  });
});

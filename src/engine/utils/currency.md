# Currency Class Documentation

The `Currency` class is a utility for handling currency amounts with high precision using `decimal.js`. It supports various rounding methods, tracks rounding errors, and provides a set of arithmetic operations.

## Table of Contents

1. [Installation](#installation)
2. [Class Overview](#class-overview)
3. [Enum: RoundingMethod](#enum-roundingmethod)
4. [Class: Currency](#class-currency)
   - [Constructor](#constructor)
   - [Static Methods](#static-methods)
   - [Instance Methods](#instance-methods)
5. [Usage Examples](#usage-examples)

## Installation

First, ensure you have `decimal.js` installed in your project:

```bash
npm install decimal.js
```

## Class Overview

### Enum: `RoundingMethod`

The `RoundingMethod` enum defines different rounding strategies:

- **`ROUND_UP`**: Round towards positive infinity.
- **`ROUND_DOWN`**: Round towards zero.
- **`ROUND_HALF_UP`**: Round towards the nearest neighbor. If equidistant, round up.
- **`ROUND_HALF_DOWN`**: Round towards the nearest neighbor. If equidistant, round down.
- **`ROUND_HALF_EVEN`**: Round towards the nearest neighbor. If equidistant, round towards the even neighbor.
- **`ROUND_HALF_CEIL`**: Round towards the nearest neighbor. If equidistant, round towards positive infinity.
- **`ROUND_HALF_FLOOR`**: Round towards the nearest neighbor. If equidistant, round towards negative infinity.

### Class: `Currency`

The `Currency` class handles currency amounts using `decimal.js` for precision and supports various rounding methods.

#### Constructor

```typescript
constructor(amount: number | string | Decimal)
```

- **`amount`**: The initial amount for the currency. Can be a number, string, or `Decimal`.

#### Static Methods

##### `Currency.Zero()`

Creates a `Currency` object initialized to zero.

```typescript
static Zero(): Currency
```

##### `Currency.of(amount)`

Creates a `Currency` object with a specified amount. This is a shortcut method to create an instance without using the `new` keyword.

```typescript
static of(amount: number | string | Decimal): Currency
```

- **`amount`**: The initial amount for the currency.

#### Instance Methods

##### `getValue()`

Gets the current value of the `Currency` object.

```typescript
getValue(): Decimal
```

##### `getRoundingError()`

Gets the rounding error after the last rounding operation.

```typescript
getRoundingError(): Decimal
```

##### `round(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP)`

Rounds the value to the specified number of decimal places using the provided rounding method. Defaults to rounding to two decimal places using the `ROUND_HALF_UP` method.

```typescript
round(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Currency
```

- **`decimalPlaces`**: The number of decimal places to round to. Defaults to 2.
- **`method`**: The rounding method to use. Defaults to `ROUND_HALF_UP`.

##### `getRoundedValue(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP)`

Returns the value rounded to the specified number of decimal places. Defaults to two decimal places.

```typescript
getRoundedValue(decimalPlaces: number = 2, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Decimal
```

- **`decimalPlaces`**: The number of decimal places to round to. Defaults to 2.
- **`method`**: The rounding method to use. Defaults to `ROUND_HALF_UP`.

##### `add(amount: number | string | Decimal)`

Adds the specified amount to the current value.

```typescript
add(amount: number | string | Decimal): Currency
```

- **`amount`**: The amount to add.

##### `subtract(amount: number | string | Decimal)`

Subtracts the specified amount from the current value.

```typescript
subtract(amount: number | string | Decimal): Currency
```

- **`amount`**: The amount to subtract.

##### `multiply(amount: number | string | Decimal)`

Multiplies the current value by the specified amount.

```typescript
multiply(amount: number | string | Decimal): Currency
```

- **`amount`**: The amount to multiply by.

##### `divide(amount: number | string | Decimal)`

Divides the current value by the specified amount.

```typescript
divide(amount: number | string | Decimal): Currency
```

- **`amount`**: The amount to divide by.

##### `toCurrencyString()`

Returns the value formatted as a string in currency format with two decimal places.

```typescript
toCurrencyString(): string
```

- **Returns**: A string representing the currency value formatted to two decimal places (e.g., `100` becomes `"100.00"`).

## Usage Examples

### Example 1: Creating a Currency Object

```typescript
import { Currency } from "@utils/currency";

const amount = Currency.of(123.456);
console.log(amount.getValue().toString()); // "123.456"
```

### Example 2: Rounding a Currency Value

```typescript
import { Currency, RoundingMethod } from "@utils/currency";

const amount = Currency.of(123.456);
amount.round(); // Defaults to 2 decimal places with ROUND_HALF_UP
console.log(`Rounded Value: ${amount.getValue().toString()}`); // Output: "123.46"

const roundedValue = amount.getRoundedValue();
console.log(`Rounded Value: ${roundedValue.toString()}`); // Output: "123.46"
```

### Example 3: Arithmetic Operations

```typescript
import { Currency } from "@utils/currency";

const amount = Currency.of(100);
amount.add(50.25);
console.log(`New Value after Addition: ${amount.getRoundedValue().toString()}`); // Output: "150.25"

amount.subtract(20);
console.log(`New Value after Subtraction: ${amount.getRoundedValue().toString()}`); // Output: "130.25"

amount.multiply(2);
console.log(`New Value after Multiplication: ${amount.getRoundedValue().toString()}`); // Output: "260.50"

amount.divide(4);
console.log(`New Value after Division: ${amount.getRoundedValue().toString()}`); // Output: "65.12"
```

### Example 4: Creating a Zero-Initialized Currency Object

```typescript
import { Currency } from "@utils/currency";

const zeroAmount = Currency.Zero();
console.log(`Zero Value: ${zeroAmount.getRoundedValue().toString()}`); // Output: "0.00"
```

### Example 5: Formatting a Value as a Currency String

```typescript
import { Currency } from "@utils/currency";

const amount = Currency.of(100);
console.log(amount.toCurrencyString()); // Output: "100.00"

const amount2 = Currency.of(45.5);
console.log(amount2.toCurrencyString()); // Output: "45.50"
```

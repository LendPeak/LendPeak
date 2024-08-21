# Currency Class Documentation

The `Currency` class is a utility for handling currency amounts with high precision using `decimal.js`. It supports various rounding methods, tracks rounding errors, and provides a set of arithmetic operations.

## Table of Contents

1. [Installation](#installation)
2. [Class Overview](#class-overview)
3. [Static Methods](#static-methods)
4. [Instance Methods](#instance-methods)
5. [Usage Examples](#usage-examples)
6. [Rounding Methods](#rounding-methods)

## Installation

First, ensure you have `decimal.js` installed in your project:

```bash
npm install decimal.js
```

## Class Overview

### `Currency`

A class that represents a currency amount with precision handling using `decimal.js`. The class supports various rounding methods and tracks rounding errors.

### Constructor

```typescript
constructor(amount: number | string | Decimal)
```

- **amount**: The initial amount for the currency. Can be a number, string, or `Decimal`.

## Static Methods

### `Currency.Zero()`

Creates a `Currency` object initialized to zero.

```typescript
static Zero(): Currency
```

### `Currency.of(amount)`

Creates a `Currency` object with a specified amount. This is a shortcut method to create an instance without using the `new` keyword.

```typescript
static of(amount: number | string | Decimal): Currency
```

- **amount**: The initial amount for the currency.

## Instance Methods

### `getValue()`

Gets the current value of the `Currency` object.

```typescript
getValue(): Decimal
```

### `getRoundingError()`

Gets the rounding error after the last rounding operation.

```typescript
getRoundingError(): Decimal
```

### `round(decimalPlaces, method)`

Rounds the value to the specified number of decimal places using the provided rounding method.

```typescript
round(decimalPlaces: number, method: RoundingMethod = RoundingMethod.ROUND_HALF_UP): Currency
```

- **decimalPlaces**: The number of decimal places to round to.
- **method**: The rounding method to use. Defaults to `ROUND_HALF_UP`.

### `add(amount)`

Adds the specified amount to the current value.

```typescript
add(amount: number | string | Decimal): Currency
```

- **amount**: The amount to add.

### `subtract(amount)`

Subtracts the specified amount from the current value.

```typescript
subtract(amount: number | string | Decimal): Currency
```

- **amount**: The amount to subtract.

### `multiply(amount)`

Multiplies the current value by the specified amount.

```typescript
multiply(amount: number | string | Decimal): Currency
```

- **amount**: The amount to multiply by.

### `divide(amount)`

Divides the current value by the specified amount.

```typescript
divide(amount: number | string | Decimal): Currency
```

- **amount**: The amount to divide by.

## Usage Examples

### Example 1: Creating a Currency Object

```typescript
import { Currency } from "./Currency";

const amount = Currency.of(123.456);
console.log(amount.getValue().toString()); // "123.456"
```

### Example 2: Rounding a Currency Value

```typescript
import { Currency, RoundingMethod } from "./Currency";

const amount = Currency.of(123.456);
amount.round(2, RoundingMethod.ROUND_HALF_UP);
console.log(`Rounded Value: ${amount.getValue().toString()}`); // Output: "123.46"
console.log(`Rounding Error: ${amount.getRoundingError().toString()}`); // Output: "-0.004"
```

### Example 3: Arithmetic Operations

```typescript
import { Currency } from "./Currency";

const amount = Currency.of(100);
amount.add(50.25);
console.log(`New Value after Addition: ${amount.getValue().toString()}`); // Output: "150.25"

amount.subtract(20);
console.log(`New Value after Subtraction: ${amount.getValue().toString()}`); // Output: "130.25"

amount.multiply(2);
console.log(`New Value after Multiplication: ${amount.getValue().toString()}`); // Output: "260.50"

amount.divide(4);
console.log(`New Value after Division: ${amount.getValue().toString()}`); // Output: "65.125"
```

### Example 4: Creating a Zero-Initialized Currency Object

```typescript
import { Currency } from "./Currency";

const zeroAmount = Currency.Zero();
console.log(`Zero Value: ${zeroAmount.getValue().toString()}`); // Output: "0"
```

## Rounding Methods

The `Currency` class supports the following rounding methods:

- **ROUND_UP**: Round towards positive infinity.
- **ROUND_DOWN**: Round towards zero.
- **ROUND_HALF_UP**: Round towards nearest neighbor. If equidistant, round up.
- **ROUND_HALF_DOWN**: Round towards nearest neighbor. If equidistant, round down.
- **ROUND_HALF_EVEN**: Round towards nearest neighbor. If equidistant, round towards the even neighbor.
- **ROUND_HALF_CEIL**: Round towards nearest neighbor. If equidistant, round towards positive infinity.
- **ROUND_HALF_FLOOR**: Round towards nearest neighbor. If equidistant, round towards negative infinity.

To use these methods, import the `RoundingMethod` enum from the `Currency` class.

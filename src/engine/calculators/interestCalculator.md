# InterestCalculator Class Documentation

The `InterestCalculator` class is a utility for performing interest calculations on loan amounts. It supports various calendar conventions, can handle deferred interest, and provides principal and interest splits based on equated monthly installment (EMI) or maximum payment amounts. The class uses the `Currency` class for all monetary values, ensuring precise handling and rounding to two decimal places by default.

## Table of Contents

1. [Installation](#installation)
2. [Class Overview](#class-overview)
3. [Interfaces](#interfaces)
4. [Class: InterestCalculator](#class-interestcalculator)
   - [Constructor](#constructor)
   - [Methods](#methods)
5. [Usage Examples](#usage-examples)

## Installation

Ensure you have the `Currency` and `Calendar` classes properly set up, as well as any dependencies like `dayjs` and `decimal.js`:

```bash
npm install dayjs decimal.js
```

## Class Overview

The `InterestCalculator` class is designed to handle the following:

- **Interest Calculation**: Calculate interest over a period between two dates using different calendar conventions.
- **Daily Interest Calculation**: Compute daily interest based on a given principal.
- **Principal and Interest Split**: Split a payment amount into principal and interest components, accounting for deferred interest if necessary.

## Interfaces

### Interface: `PaymentSplit`

Represents the result of a payment split operation, containing the principal, interest, and any remaining deferred interest.

```typescript
interface PaymentSplit {
  principal: Currency;
  interest: Currency;
  remainingDeferredInterest: Currency;
}
```

- **`principal`**: The portion of the payment applied to the principal.
- **`interest`**: The portion of the payment applied to the interest.
- **`remainingDeferredInterest`**: Any remaining deferred interest that wasn't covered by the payment.

## Class: `InterestCalculator`

The `InterestCalculator` class performs interest calculations and splits payments into principal and interest components. It relies on the `Currency` class for all monetary operations and the `Calendar` class for handling date differences.

### Constructor

```typescript
constructor(annualInterestRate: number, calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL)
```

- **`annualInterestRate`**: The annual interest rate as a percentage.
- **`calendarType`**: (Optional) The calendar type to use for date calculations. Defaults to `ACTUAL_ACTUAL`.

### Methods

#### `calculateInterest(principal: Currency, startDate: Dayjs, endDate: Dayjs): Currency`

Calculates the interest accrued between two dates based on the principal and the annual interest rate.

```typescript
calculateInterest(principal: Currency, startDate: Dayjs, endDate: Dayjs): Currency
```

- **`principal`**: The principal amount as a `Currency` object.
- **`startDate`**: The start date of the period.
- **`endDate`**: The end date of the period.
- **Returns**: The interest amount as a `Currency` object, rounded to two decimal places by default.

#### `calculateDailyInterest(principal: Currency): Currency`

Calculates the daily interest value based on the principal and the annual interest rate.

```typescript
calculateDailyInterest(principal: Currency): Currency
```

- **`principal`**: The principal amount as a `Currency` object.
- **Returns**: The daily interest amount as a `Currency` object, rounded to two decimal places by default.

#### `calculatePaymentSplit(principal: Currency, startDate: Dayjs, endDate: Dayjs, emi: Currency, deferredInterest: Currency = Currency.Zero()): PaymentSplit`

Calculates the principal and interest split based on the EMI or maximum payment amount, considering any deferred interest.

```typescript
calculatePaymentSplit(
  principal: Currency,
  startDate: Dayjs,
  endDate: Dayjs,
  emi: Currency,
  deferredInterest: Currency = Currency.Zero()
): PaymentSplit
```

- **`principal`**: The principal amount as a `Currency` object.
- **`startDate`**: The start date of the interest period.
- **`endDate`**: The end date of the interest period.
- **`emi`**: The equated monthly installment or maximum payment amount as a `Currency` object.
- **`deferredInterest`**: (Optional) The deferred interest that needs to be paid off first. Defaults to zero.
- **Returns**: A `PaymentSplit` object containing the split of principal and interest, and any remaining deferred interest, all rounded to two decimal places by default.

## Usage Examples

### Example 1: Calculating Interest Between Two Dates

```typescript
import dayjs from "dayjs";
import { InterestCalculator } from "@calculators/interestCalculator";
import { Currency } from "@utils/currency";

const startDate = dayjs("2024-01-01");
const endDate = dayjs("2024-02-01");
const principal = Currency.of(100000); // $100,000 principal
const annualInterestRate = 5; // 5% annual interest rate

const interestCalculator = new InterestCalculator(annualInterestRate);

const interest = interestCalculator.calculateInterest(principal, startDate, endDate);
console.log(`Interest: ${interest.toCurrencyString()}`); // Output: Interest: 430.56
```

### Example 2: Calculating Daily Interest

```typescript
import { InterestCalculator } from "@calculators/interestCalculator";
import { Currency } from "@utils/currency";

const principal = Currency.of(100000); // $100,000 principal
const annualInterestRate = 5; // 5% annual interest rate

const interestCalculator = new InterestCalculator(annualInterestRate);

const dailyInterest = interestCalculator.calculateDailyInterest(principal);
console.log(`Daily Interest: ${dailyInterest.toCurrencyString()}`); // Output: Daily Interest: 13.89
```

### Example 3: Calculating Principal and Interest Split with Deferred Interest

```typescript
import dayjs from "dayjs";
import { InterestCalculator } from "@calculators/interestCalculator";
import { Currency } from "@utils/currency";

const startDate = dayjs("2024-01-01");
const endDate = dayjs("2024-02-01");
const principal = Currency.of(100000); // $100,000 principal
const annualInterestRate = 5; // 5% annual interest rate
const emi = Currency.of(1500); // $1,500 EMI
const deferredInterest = Currency.of(200); // $200 deferred interest

const interestCalculator = new InterestCalculator(annualInterestRate);

const paymentSplit = interestCalculator.calculatePaymentSplit(principal, startDate, endDate, emi, deferredInterest);

console.log(`Principal: ${paymentSplit.principal.toCurrencyString()}`); // Output: Principal: 869.44
console.log(`Interest: ${paymentSplit.interest.toCurrencyString()}`); // Output: Interest: 430.56
console.log(`Remaining Deferred Interest: ${paymentSplit.remainingDeferredInterest.toCurrencyString()}`); // Output: Remaining Deferred Interest: 0.00
```

### Example 4: Using a Different Calendar Type

```typescript
import dayjs from "dayjs";
import { InterestCalculator } from "@calculators/interestCalculator";
import { Currency } from "@utils/currency";
import { CalendarType } from "@utils/calendar";

const startDate = dayjs("2024-01-01");
const endDate = dayjs("2024-02-01");
const principal = Currency.of(100000); // $100,000 principal
const annualInterestRate = 5; // 5% annual interest rate

const interestCalculator = new InterestCalculator(annualInterestRate, CalendarType.THIRTY_360);

const interest = interestCalculator.calculateInterest(principal, startDate, endDate);
console.log(`Interest (30/360): ${interest.toCurrencyString()}`); // Output: Interest (30/360): 416.67
```

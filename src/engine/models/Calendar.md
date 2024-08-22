# Calendar Class Documentation

The `Calendar` class is a utility for performing date arithmetic according to various calendar conventions, such as 30/360, Actual/360, Actual/365, etc. It uses `dayjs` for date manipulation and provides flexibility in calculating the number of days between two dates based on the specified calendar type.

## Table of Contents

1. [Installation](#installation)
2. [Class Overview](#class-overview)
3. [Enum: CalendarType](#enum-calendartype)
4. [Class: Calendar](#class-calendar)
   - [Constructor](#constructor)
   - [Methods](#methods)
5. [Usage Examples](#usage-examples)
6. [Test Cases](#test-cases)

## Installation

First, ensure you have `dayjs` installed in your project:

```bash
npm install dayjs
```

## Class Overview

### Enum: `CalendarType`

The `CalendarType` enum defines different calendar types:

- **`ACTUAL_ACTUAL`**: Uses the actual number of days between two dates.
- **`ACTUAL_360`**: Scales the actual number of days to a 360-day year.
- **`ACTUAL_365`**: Uses the actual number of days, assuming a 365-day year.
- **`THIRTY_360`**: Assumes 30 days per month and 360 days per year.
- **`THIRTY_ACTUAL`**: Uses 30 days per month when over 30 days, otherwise uses the actual number of days.

### Class: `Calendar`

The `Calendar` class performs date arithmetic according to the specified `CalendarType`. It provides methods to calculate the number of days between two dates using different calendar conventions.

#### Constructor

```typescript
constructor(calendarType: CalendarType = CalendarType.ACTUAL_ACTUAL)
```

- **`calendarType`**: (Optional) The calendar type to use. Defaults to `ACTUAL_ACTUAL`.

#### Methods

##### `setCalendarType(type: CalendarType)`

Sets the calendar type for the `Calendar` instance.

```typescript
setCalendarType(type: CalendarType): void
```

- **`type`**: The calendar type to set.

##### `getCalendarType()`

Gets the current calendar type of the instance.

```typescript
getCalendarType(): CalendarType
```

- **Returns**: The current `CalendarType`.

##### `daysBetween(date1: Dayjs, date2: Dayjs)`

Calculates the number of days between two dates according to the current calendar type.

```typescript
daysBetween(date1: Dayjs, date2: Dayjs): number
```

- **`date1`**: The start date.
- **`date2`**: The end date.
- **Returns**: The number of days between the two dates based on the calendar type.

## Usage Examples

### Example 1: Calculating Days Using the 30/360 Convention

```typescript
import dayjs from "dayjs";
import { Calendar, CalendarType } from "./Calendar";

// Create a Calendar instance using the 30/360 calendar type
const calendar = new Calendar(CalendarType.THIRTY_360);

// Define two dates
const date1 = dayjs("2024-01-01");
const date2 = dayjs("2024-02-01");

// Calculate the number of days between the two dates using the 30/360 convention
console.log(`Days between using 30/360: ${calendar.daysBetween(date1, date2)}`);
// Output: "Days between using 30/360: 30"
```

### Example 2: Changing the Calendar Type to Actual/Actual

```typescript
import dayjs from "dayjs";
import { Calendar, CalendarType } from "./Calendar";

// Create a Calendar instance
const calendar = new Calendar();

// Define two dates
const date1 = dayjs("2024-01-01");
const date2 = dayjs("2024-02-01");

// Calculate the number of days using the default Actual/Actual convention
console.log(`Days between using Actual/Actual: ${calendar.daysBetween(date1, date2)}`);
// Output: "Days between using Actual/Actual: 31"

// Change the calendar type to Actual/360
calendar.setCalendarType(CalendarType.ACTUAL_360);

// Calculate the number of days between the two dates using the Actual/360 convention
console.log(`Days between using Actual/360: ${calendar.daysBetween(date1, date2)}`);
// Output: "Days between using Actual/360: 30"
```

### Example 3: Calculating Days Using the Actual/365 Convention

```typescript
import dayjs from "dayjs";
import { Calendar, CalendarType } from "./Calendar";

// Create a Calendar instance using the Actual/365 calendar type
const calendar = new Calendar(CalendarType.ACTUAL_365);

// Define two dates
const date1 = dayjs("2024-01-01");
const date2 = dayjs("2024-12-31");

// Calculate the number of days between the two dates using the Actual/365 convention
console.log(`Days between using Actual/365: ${calendar.daysBetween(date1, date2)}`);
// Output: "Days between using Actual/365: 365"
```

## Test Cases

Here are some test cases to validate the functionality of the `Calendar` class:

```typescript
import dayjs from "dayjs";
import { Calendar, CalendarType } from "./Calendar";

describe("Calendar Class", () => {
  const date1 = dayjs("2024-01-01");
  const date2 = dayjs("2024-02-01");

  it("should calculate days between using 30/360", () => {
    const calendar = new Calendar(CalendarType.THIRTY_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // Expected 30 days as per 30/360 convention
  });

  it("should calculate days between using Actual/Actual", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_ACTUAL);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31); // Expected 31 actual days
  });

  it("should calculate days between using Actual/360", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_360);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // Expected 31 actual days scaled to 360-day year
  });

  it("should calculate days between using Actual/365", () => {
    const calendar = new Calendar(CalendarType.ACTUAL_365);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(31); // Expected 31 actual days
  });

  it("should calculate days between using 30/Actual", () => {
    const calendar = new Calendar(CalendarType.THIRTY_ACTUAL);
    const days = calendar.daysBetween(date1, date2);
    expect(days).toBe(30); // Expected 30 days as per 30/Actual convention
  });
});
```

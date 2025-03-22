# Demo Loan Scenarios Library

## Introduction

This document provides a comprehensive library of **loan scenarios** designed to test the full breadth of functionality in a lending system. Each scenario introduces different real-world complexities—ranging from basic amortization to multi-phase rate changes, from negative amortization to various day-count conventions, from partial payments to principal forgiveness, and much more.

Use these scenarios as a **reference** or **test suite** when:

- **Developing** new lending features to ensure coverage of a wide range of edge cases.
- **Validating** that recent changes in the codebase do not break existing functionality.
- **Onboarding** new testers and developers who need ready-made examples of loans, schedules, fees, and restructuring events.
- **Demonstrating** application behavior to stakeholders (e.g., product owners, compliance teams) by walking through realistic, but controlled, loan scenarios.
- **Ensuring** that your system handles corner cases such as leap years, partial payments, multiple modifications, regulatory caps on interest, or daily penalty fees.

Each section below groups several scenarios by theme—**Payment Schedule Variations**, **Interest & Rate Changes**, **Fees & Charges**, etc. Within these categories, you’ll find **numbered scenarios** (e.g., “(#1) Basic Fixed-Rate”), each describing its unique configuration and the specific functionalities it exercises.

By implementing or instantiating these scenarios in your codebase (using the appropriate `AmortizationParams`, deposit records, balance modifications, etc.), you can quickly spin up “demo loans” in your application interface. This ensures a uniform testing approach and makes it easier to analyze differences in results or debug unexpected calculations.

---

## Library of Loan Scenarios

Here is the **nested menu** for all the scenarios, organized by major category.

1. **Basic & Standard Loans**  
   - **(#1) Basic Fixed-Rate, Monthly-Amortized**  
   - **(#2) Daily Simple Interest (DSI), One-Year**  
   - **(#3) Custom First Payment Date**  
   - **(#4) Loan with Pre-Bill and Due-Bill Days**  
   - **(#5) Loan with Balloon (Custom End Date)**  
   - **(#6) Semi-Monthly Terms (Non-Standard Period)**  

2. **Payment Schedule Variations**  
   - **(#14) Partial Payments with Excess**  
   - **(#20) Negative Amortization (Deferred Interest)**  
   - **(#22) Overpay / Lumpsum Payment with Rounding**  
   - **(#29) Lumpsum Payment with Static Allocation**  
   - **(#30) Zero Payment in a Period (Skipped Payment)**  
   - **(#32) “Payment Holiday” for First N Months**  
   - **(#33) Multiple Partial Lumpsum Prepayments**  
   - **(#34) Interest-Only for Half the Term**  
   - **(#35) Weekly Periods**  
   - **(#36) Payment Reversal / Refund Mid-Stream**  
   - **(#39) Single Long Period (Bullet) or Just 2–3 Extended Terms**  
   - **(#40) “Re-amortization” After Big Mid-Term Payment**  
   - **(#41) Multiple Draws (Open-End/Line of Credit)**  
   - **(#55) Very Short Loan (15 Days)**  
   - **(#56) Overlapping or Gapped Periods (Custom Schedule Error)**  
   - **(#60) Multiple (Staggered) Partial Payments in One Bill**  

3. **Interest & Rate Changes**  
   - **(#7) Custom Rate Schedule (Multiple Mid-Loan Changes)**  
   - **(#8) Term Interest Rate Override**  
   - **(#9) Term Interest Amount Override**  
   - **(#10) Allow Rate Above 100%**  
   - **(#37) Negative Interest Rate**  
   - **(#38) Equated Monthly Payment (EMI) with Forced Rounding**  
   - **(#47) Monthly Rate Changes Every Single Month**  
   - **(#50) Late Payment Penalty Rate Kicks In**  

4. **Rounding & Interest Flush**  
   - **(#11) Rounding Error Flush at End**  
   - **(#12) Rounding Error Flush at Threshold**  

5. **Fees & Charges**  
   - **(#13) Complex Fee Structures**  
   - **(#21) Zero Percent Interest, Only Fees**  
   - **(#44) Monthly Fee Based on Outstanding Principal**  
   - **(#45) Daily Penalty Fee for Late Payment**  
   - **(#52) Recurring Additional Fees Each Quarter**  
   - **(#59) Collateral Release Fee (Early Release Event)**  

6. **Balance Modifications / Restructures**  
   - **(#16) Principal Forgiveness Mid-Loan**  
   - **(#17) Principal Increase Mid-Loan**  
   - **(#31) Multi-Restructure (Increase + Forgive + Payment Skip)**  
   - **(#48) Multiple Restructure Events (Extend Terms, Rate Adjust)**  
   - **(#49) Negative Principal Edge Case**  

7. **Early Payoff & Payoff Logic**  
   - **(#15) Early Payoff Mid-Term**  

8. **Payment Allocation & Priorities**  
   - **(#27) Different Payment Allocation Strategies (e.g. FIFO)**  
   - **(#28) Custom Payment Priority**  
   - **(#53) Inverse Payment Priority (Principal → Fees → Interest)**  

9. **Calendar & Day-Count Variations**  
   - **(#18) MonthlyRateDividedByDaysInMonth**  
   - **(#23) End-of-Month Alignment**  
   - **(#24) 30/360 Calendar**  
   - **(#25) Actual/360 Calendar**  
   - **(#26) Crossing a Leap Year**  
   - **(#43) Daily Actual/365 Over a Period**  

10. **Advanced / Large / Special Cases**  
    - **(#19) Complex Payment Date Changes Mid-Stream**  
    - **(#42) Long-Term (30-Year Mortgage)**  
    - **(#46) Retroactive (“Backdate”) Changes to Past Periods**  
    - **(#51) TILA Calculation Cases**  
    - **(#54) Two Periods with Same Due Date**  
    - **(#57) Extremely Large Principal & Very Small Payment**  
    - **(#58) Regulatory Maximum APR (e.g., 36% Cap)**  

---


## 1. Basic Fixed-Rate, Monthly-Amortized Loan

- **Purpose**: Tests a simple, vanilla amortization with a single, constant annual interest rate.
- **Key Features**:
  - Standard monthly term structure (e.g. 12 months, no special day-count).
  - No fees, no lumpsum payments, no restructured amounts.
  - Uses `billingModel = "amortized"`.
- **Parameters**:
  - **loanAmount**: 10,000
  - **annualInterestRate**: 0.10 (10%)
  - **term**: 12
  - **startDate**: 1/1/2025 (for example)
  - **termPeriodDefinition**: \{ unit: "month", count: [1] \}
- **Complexities Tested**: Verifies that the “most standard” case is handled properly.

---

## 2. Daily Simple Interest (DSI) Loan, One-Year Term

- **Purpose**: Tests the `billingModel = "dailySimpleInterest"` approach, ensuring daily accrual and no pre-bill/due-bill day logic.
- **Key Features**:
  - Single-year term (12 months) but interest is accrued daily.
  - Pre-bill and due-bill days not applicable (must be zero).
- **Parameters**:
  - **loanAmount**: 5,000
  - **annualInterestRate**: 0.08 (8%)
  - **term**: 12 (but effectively you’d note DSI doesn’t break out monthly in the same way)
  - **billingModel**: "dailySimpleInterest"
  - **defaultPreBillDaysConfiguration** = 0, **defaultBillDueDaysAfterPeriodEndConfiguration** = 0
- **Complexities Tested**: Per-diem calculations, ensures no conflict with pre/due-bill days.

---

## 3. Custom First Payment Date Loan

- **Purpose**: Tests the ability to set a **different** first payment date that doesn’t align exactly with the monthly cycle.
- **Key Features**:
  - The first payment might happen 45 days from loan start, and the rest are monthly.
  - Checks partial period calculation for first term, with the rest standard.
- **Parameters**:
  - **loanAmount**: 15,000
  - **annualInterestRate**: 0.12 (12%)
  - **term**: 12
  - **startDate**: 2/15/2025
  - **firstPaymentDate**: 4/1/2025 (about 45 days out)
  - **termPeriodDefinition**: \{ unit: "month", count: [1] \}
  - **hasCustomFirstPaymentDate**: true
- **Complexities Tested**: Handling of partial first period and verifying correct interest accrual in that partial window.

---

## 4. Loan with Pre-Bill and Due-Bill Days

- **Purpose**: Ensures that “prebillDays” and “dueBillDays” logic is honored, shifting open/due dates around each monthly boundary.
- **Key Features**:
  - 2 pre-bill days, 5 due-bill days after each period end.
  - Simple monthly interest, but verifying those day shifts for the open/due dates.
- **Parameters**:
  - **loanAmount**: 8,000
  - **annualInterestRate**: 0.09 (9%)
  - **term**: 12
  - **defaultPreBillDaysConfiguration** = 2
  - **defaultBillDueDaysAfterPeriodEndConfiguration** = 5
  - Possibly we keep the rest standard.
- **Complexities Tested**: Bill generation with pre/due day offsets, ensuring the schedule includes correct open/due dates.

---

## 5. Loan with a Balloon (Custom End Date)

- **Purpose**: Tests “hasCustomEndDate” scenario, e.g. a large final balloon payment.
- **Key Features**:
  - Payment schedule might pay interest-only for each month, with the principal mostly due in the balloon.
  - The “endDate” is forced to be a certain date, overriding standard term logic.
- **Parameters**:
  - **loanAmount**: 20,000
  - **annualInterestRate**: 0.07 (7%)
  - **term**: 12 (but in practice, we might keep interest-only until a final balloon).
  - **startDate**: 3/10/2025
  - **endDate**: 9/10/2026 (just for demonstration)
  - **hasCustomEndDate**: true
  - Possibly set `equitedMonthlyPayment` to a smaller, interest-only figure, plus the big final payoff at the end.
- **Complexities Tested**: Overriding the standard “term \* periodDefinition” approach with a custom date.

---

## 6. Semi-Monthly Terms (Non-Standard Term Period Definition)

- **Purpose**: Tests a period definition that splits each month into two payment periods.
- **Key Features**:
  - **termPeriodDefinition**: \{ unit: "complex", count: [15] \} or something similar to reflect 24 payments across 12 months.
  - Possibly a 6-month total to keep it simpler.
- **Parameters**:
  - **loanAmount**: 4,000
  - **annualInterestRate**: 0.13 (13%)
  - **term**: 12 if each “term” is actually half a month. Or a “complex” approach.
- **Complexities Tested**: Handling multiple short periods in a month, verifying daily count for each half-month.

---

## 7. Custom Rate Schedule (Multiple Rate Changes Over Time)

- **Purpose**: Demonstrates a scenario where the interest rate changes mid-loan.
- **Key Features**:
  - **rateSchedules** with, e.g., 6% for first 6 months, then 8% for last 6 months.
  - Possibly bridging across a year boundary to see if leaps or day counts come into play.
- **Parameters**:
  - **loanAmount**: 12,000
  - **term**: 12
  - **startDate**: 10/15/2025 (so that part of it runs into 2026).
  - **ratesSchedule**:
    - 10/15/2025–4/14/2026 at 0.06
    - 4/15/2026–10/14/2026 at 0.08
- **Complexities Tested**: Splitting interest calculations for multiple subperiods.

---

## 8. Term Interest Rate Override (One-Off High Rate in a Single Term)

- **Purpose**: Check the ability to override a single term’s rate with a special rate, ignoring the main annual rate or schedule.
- **Key Features**:
  - E.g. Term #3 has an “interestRate” of 20%.
  - The rest follow the base 10% annual rate.
- **Parameters**:
  - **loanAmount**: 2,000
  - **annualInterestRate**: 0.10
  - **term**: 6
  - **termInterestRateOverride**: override termNumber=3 => 0.20 (20%)
- **Complexities Tested**: Overriding only a single term. Also test whether that override is properly bounded to term #3’s date window.

---

## 9. Term Interest Amount Override (Static Dollars Instead of Rate)

- **Purpose**: Check scenario where a given term charges a “flat interest amount” (maybe a penalty or promotional).
- **Key Features**:
  - E.g. Term #2 always charges $75 interest, ignoring standard formula.
  - System must recalculate if actual interest is less or more.
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.05 (5%)
  - **term**: 6
  - **termInterestAmountOverride**: override termNumber=2 => 75
  - Possibly also set `acceptableRateVariance` so that the system doesn’t complain if it’s “off.”
- **Complexities Tested**: Handling static interest vs. normal calculations.

---

## 10. Allow Rate Above 100% (Edge Case Testing)

- **Purpose**: Check that the system can handle a scenario with a very high interest rate if `allowRateAbove100 = true`.
- **Key Features**:
  - 150% annual interest, short term to see big interest.
  - Also test rounding.
- **Parameters**:
  - **loanAmount**: 500
  - **annualInterestRate**: 1.50 (150%)
  - **allowRateAbove100**: true
  - **term**: 3
  - Possibly monthly or weekly.
- **Complexities Tested**: Very high interest, verifying no thrown errors if `allowRateAbove100` is set.

---

## 11. Rounding Error Flush at End

- **Purpose**: Tests `flushUnbilledInterestRoundingErrorMethod = "at_end"`.
- **Key Features**:
  - Rounding to 2 decimals each period might produce small leftover interest that’s carried forward until final period.
  - At final period, system flushes the leftover.
- **Parameters**:
  - **loanAmount**: 999.99
  - **annualInterestRate**: 0.12345 (approx 12.345% to force some rounding complexities)
  - **term**: 5
  - **flushUnbilledInterestRoundingErrorMethod**: "at_end"
  - Possibly set a small **flushThreshold** like $0.01.
- **Complexities Tested**: Accumulating small leftover interest, final “flush” in last period.

---

## 12. Rounding Error Flush at Threshold

- **Purpose**: Tests `flushUnbilledInterestRoundingErrorMethod = "at_threshold"`.
- **Key Features**:
  - If the leftover rounding accumulates beyond a threshold (e.g., $0.05), it flushes mid-loan.
- **Parameters**:
  - **loanAmount**: 1,234
  - **annualInterestRate**: 0.0575
  - **term**: 4
  - **flushUnbilledInterestRoundingErrorMethod**: "at_threshold"
  - **flushThreshold**: 0.04
- **Complexities Tested**: Mid-loan flush, ensuring partial flush logic works as intended.

---

## 13. Loan with Complex Fee Structures

- **Purpose**: Exercises `feesForAllTerms` (e.g. monthly service fee) plus `feesPerTerm` (maybe a one-time charge on the 2nd period).
- **Key Features**:
  - A fixed $10 fee each period, plus a $50 “custom” fee in term #3.
  - Possibly also uses a small “percentage-based fee” on interest.
- **Parameters**:
  - **loanAmount**: 5,000
  - **annualInterestRate**: 0.10
  - **term**: 5
  - **feesForAllTerms**: \[ { type: "fixed", amount: 10 } \]
  - **feesPerTerm**: [ { termNumber:3, type:"fixed", amount:50 }, { termNumber:4, type:"percentage", percentage:0.05, basedOn:"interest" } ]
- **Complexities Tested**: Summation of multiple fees, partial/percentage-based fees, verifying that leftover fees can also become deferred if not fully covered by the payment.

---

## 14. Partial Payments with Excess Carryover

- **Purpose**: A loan that receives partial payments each month, deferring interest, or carrying principal.
- **Key Features**:
  - Some deposit records cover only half the needed amount.
  - Some deposit records might overpay, creating an “excess” that applies to next period.
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.08
  - **term**: 6
  - Payment flows might be:
    1. Month 1 deposit = 50% of bill
    2. Month 2 deposit = 150% of bill
    3. etc.
- **Complexities Tested**: Payment application priorities, leftover amounts, and verifying that future interest might be reduced or that partial interest defers.

---

## 15. Early Payoff Mid-Term

- **Purpose**: Tests logic if a borrower pays the entire balance in term #3 of 12.
- **Key Features**:
  - We see how the system calculates the payoff figure, how it short-circuits the remainder, how it logs “earlyRepayment.”
- **Parameters**:
  - **loanAmount**: 6,000
  - **annualInterestRate**: 0.10
  - **term**: 12
  - **payoffDate**: Let’s say 7/1/2025 (which might be after the 3rd payment).
  - Then deposit record lumpsum for the entire payoff on that date.
- **Complexities Tested**: Early payoff logic, final interest accrual up to payoff date.

---

## 16. Balance Modifications: Principal Forgiveness in Mid-Loan

- **Purpose**: Tests scenario where part of the principal is “forgiven,” e.g. a restructured or partial write-off.
- **Key Features**:
  - A `BalanceModification` entry that reduces principal by $500 on date X.
  - The rest of interest calculations proceed from the new (smaller) principal.
- **Parameters**:
  - **loanAmount**: 10,000
  - **annualInterestRate**: 0.08
  - **balanceModifications**: \[ { date: "some midpoint", type:"decrease", amount:500 } \]
  - The rest is standard monthly.
- **Complexities Tested**: Verifying that from the modification date forward, interest is on the reduced principal.

---

## 17. Balance Modifications: Adding to Principal (Additional Advance)

- **Purpose**: Contrasts the above scenario, now we do a “principal increase” mid-loan.
- **Key Features**:
  - Another `BalanceModification` entry with type:"increase", e.g. $1,000.
  - Possibly lumpsum is advanced in the 2nd month.
- **Parameters**:
  - **loanAmount**: 2,000 initially
  - **balanceModifications**: \[ { date: "2nd month start", type:"increase", amount:1,000 } \].
- **Complexities Tested**: Additional draws after loan opening.

---

## 18. Loan with MonthlyRateDividedByDaysInMonth (Alternate Per-Diem Calculation)

- **Purpose**: Tests **perDiemCalculationType** = "MonthlyRateDividedByDaysInMonth".
- **Key Features**:
  - Each monthly chunk calculates daily interest by `(annualRate/12)/daysInMonth`.
- **Parameters**:
  - **loanAmount**: 2,500
  - **annualInterestRate**: 0.1
  - **perDiemCalculationType**: "MonthlyRateDividedByDaysInMonth"
  - Possibly 3-month or 4-month term for quick validation.
- **Complexities Tested**: Alternative per-diem approach. Especially bridging months with 30, 31, or 28/29 days.

---

## 19. Complex Payment Date Changes Mid-Stream

- **Purpose**: Tests `ChangePaymentDates` where a future due date is moved earlier or later.
- **Key Features**:
  - Term #2 originally ends 5/15, but we shift it to 5/20. Another we shift from 6/15 to 6/10.
- **Parameters**:
  - **loanAmount**: 7,500
  - **annualInterestRate**: 0.09
  - **term**: 4
  - **changePaymentDates**: \[
    - { termNumber:2, originalDate: "5/15/2025", newDate: "5/20/2025" },
    - { termNumber:3, newDate: "6/10/2025" }
      \]
- **Complexities Tested**: Overriding the standard period boundaries, verifying partial interest or shortened/lengthened windows.

---

## 20. Negative Amortization (Deferred Interest Repeatedly)

- **Purpose**: Tests repeated partial payments that are insufficient to cover the interest, so interest defers.
- **Key Features**:
  - Payment might be intentionally set below interest due.
  - By final period, a large chunk of interest is unbilled or deferred.
- **Parameters**:
  - **loanAmount**: 4,000
  - **annualInterestRate**: 0.15 (somewhat high so partial payment never covers it)
  - **equitedMonthlyPayment**: A smaller amount than the interest each month, e.g. $40 (less than monthly interest).
- **Complexities Tested**: Accumulating deferred interest, fees, and ensuring the schedule can handle big final payoff.

---

## 21. Zero Percent Loan with Fees

- **Purpose**: Tests scenario where interest is 0% but we do have fees each term.
- **Key Features**:
  - Checks that no interest accumulates but fees do.
- **Parameters**:
  - **loanAmount**: 1,000
  - **annualInterestRate**: 0.0
  - **term**: 4
  - **feesForAllTerms**: \[ { type: "fixed", amount: 15 } \]
- **Complexities Tested**: No interest, only fees, verifying the system’s logic in that scenario.

---

## 22. Over-100% Rate + Lump-Sum Payment + Rounding

- **Purpose**: Combines high interest, lumpsum partial repayment mid-term, and see how rounding accumulates.
- **Key Features**:
  - 120% annual interest.
  - Lump-sum deposit in the 2nd month.
- **Parameters**:
  - **loanAmount**: 800
  - **annualInterestRate**: 1.20
  - **term**: 4
  - Midway deposit of $500 after 1 month.
  - Possibly daily or monthly approach.
- **Complexities Tested**: Large interest scenario plus lumpsum partial payoff, checking that subsequent interest is drastically reduced.

---

## 23. End-of-Month Alignment (Last Day Behavior)

- **Purpose**: Tests scheduling that always tries to align on “last day of the month” if the start date was a 31st.
- **Key Features**:
  - Start date = 1/31, each monthly period ends on 2/28 (or 2/29 if leap year), 3/31, 4/30, etc.
- **Parameters**:
  - **loanAmount**: 2,500
  - **annualInterestRate**: 0.10
  - **term**: 4
  - **startDate**: 1/31/2025
- **Complexities Tested**: Gracefully handling short/long months around the 31st or 29th of Feb.

---

## 24. Non-Standard Calendar: 30/360

- **Purpose**: Tests `calendars` or a single `CalendarType.THIRTY_360`.
- **Key Features**:
  - 30/360 convention for day counts.
- **Parameters**:
  - **loanAmount**: 1,000
  - **annualInterestRate**: 0.08
  - **term**: 3
  - **calendars**: { primary: "THIRTY_360" }
- **Complexities Tested**: Confirm that the daysBetween logic uses 30/360.

---

## 25. Non-Standard Calendar: Actual/360

- **Purpose**: Tests `CalendarType.ACTUAL_360`.
- **Key Features**:
  - Real date difference, but scaled to 360.
- **Parameters**:
  - **loanAmount**: 10,000
  - **annualInterestRate**: 0.06
  - **term**: 6
  - **calendars**: { primary: "ACTUAL_360" }
- **Complexities Tested**: Checking day counting for interest with actual days but 360-year basis.

---

## 26. Odd Start/End with Leap Year Crossing

- **Purpose**: Test how leap-year day counts or partial periods are handled.
- **Key Features**:
  - Start date 11/1/2023, end date 2/29/2024, bridging a leap day.
  - Possibly daily or monthly approach.
- **Parameters**:
  - **loanAmount**: 5,000
  - **annualInterestRate**: 0.10
  - **term**: 4
  - **startDate**: 11/1/2023
  - (No custom end date, so we rely on monthly, but the last period might end 3/1/2024 or 2/29, depending on day-of-month alignment).
- **Complexities Tested**: February in a leap year, verifying correct day counts, verifying whether a final period includes Feb 29.

---

## 27. Payment Allocation Strategy: FIFO vs. Another

- **Purpose**: Specifically tests different `allocationStrategy` (e.g. FIFO vs. pro-rata, etc.).
- **Key Features**:
  - Have multiple bills open at once (simulate the situation with a multi-week schedule).
  - Payment deposit lumpsum that partially covers Bill #1 and Bill #2.
- **Parameters**:
  - **loanAmount**: 2,500
  - **annualInterestRate**: 0.10
  - **term**: 3
  - Multiple bills open if they overlap.
  - Then a deposit that covers them in the chosen priority.
- **Complexities Tested**: Payment application differences.

---

## 28. Custom Payment Priority (Interest + Fees → Principal)

- **Purpose**: Tests your ability to reorder the standard interest-fees-principal priority.
- **Key Features**:
  - Payment priority might be “interest, then principal, then fees” or something unusual.
  - The system should follow that custom order.
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.12
  - **term**: 4
  - Payment priority = [ "interest", "principal", "fees" ].
- **Complexities Tested**: Ensures the partial payment hits interest first, then principal, fees last.

---

## 29. Lumpsum Payment with Static Allocation

- **Purpose**: Tests usage of a `staticAllocation` on a deposit record, overriding the normal strategy.
- **Key Features**:
  - A deposit is assigned to specifically pay only fees on Bill #2, then the remainder to Bill #5’s principal.
  - System shouldn’t auto-allocate in normal priority but must follow the static instructions.
- **Parameters**:
  - **loanAmount**: 2,000
  - **term**: 5
  - Large deposit around the 2nd or 3rd month, with a manual/explicit `staticAllocation` map.
- **Complexities Tested**: Overriding standard allocation, ensuring leftover is allocated as declared.

---

## 30. Zero Payment in a Period (Skipped Payment)

- **Purpose**: Tests scenario where a borrower pays nothing in a certain period, leading to accrued interest, fees, or delinquencies.
- **Key Features**:
  - The deposit record for, say, term #2 is missing or zero.
- **Parameters**:
  - **loanAmount**: 4,000
  - **annualInterestRate**: 0.08
  - **term**: 4
  - Payment #2 is zero.
- **Complexities Tested**: Confirm that the system defers or flags the outstanding amounts. Next period’s interest might reflect that.

---

## 31. (Extra Example) Multi-Restructure Points: Increase + Forgive + Payment Skip

- **Purpose**: Extra advanced scenario layering multiple modifications across the timeline.
- **Key Features**:
  1. Principal increased by $300 at the end of term #1.
  2. Principal decreased (forgiveness) by $500 at the end of term #3.
  3. Payment is skipped in term #4, leading to deferral of interest/fees.
- **Parameters**:
  - **loanAmount**: 2,000
  - **annualInterestRate**: 0.15
  - **term**: 6
  - **balanceModifications**: multiple.
  - Partial deposits in each period so we can see deferrals stack up.
- **Complexities Tested**: Ultimate stress test: multiple modifications, partial pays, etc.

---

## 32. “Payment Holiday” for the First N Months

- **Purpose**: Tests logic where no payments are collected for an initial “holiday” period, possibly deferring interest or principal.
- **Key Features**:
  - First 3 months: no required payment (interest accrues, or possibly capitalizes).
  - Normal monthly payments start afterwards.
  - Could be implemented by either skipping Bill generation for these first months or by forcing $0 payment while interest accumulates as deferred.
- **Parameters**:
  - **loanAmount**: 5,000
  - **annualInterestRate**: 0.07
  - **term**: 12 months total
  - Payment schedule:
    1. Months 1–3: Payment = $0 (interest defers)
    2. Months 4–12: Standard monthly payments, including the deferred interest.
- **Complexities Tested**: Deferral of interest, partial re-amortization once “holiday” ends, ensuring the schedule handles consecutive zero-pay periods.

---

## 33. Multiple Partial Lumpsum Prepayments

- **Purpose**: Tests repeating unscheduled partial paydowns that reduce principal mid-loan.
- **Key Features**:
  - Borrower makes random lumpsum deposits (e.g., $500 in month 2, $300 in month 5) in addition to normal monthly installments.
  - Verifies the system recalculates or continues with a lower principal but the same schedule (depending on approach).
- **Parameters**:
  - **loanAmount**: 8,000
  - **annualInterestRate**: 0.10
  - **term**: 10
  - Deposits:
    - Normal monthly payment each period
    - Month 2: +$500 lumpsum
    - Month 5: +$300 lumpsum
- **Complexities Tested**: Payment application strategy, leftover interest, ensuring partial lumpsum properly reduces principal.

---

## 34. Interest-Only for Half the Term, Then Fully Amortizing

- **Purpose**: A “hybrid” schedule: first 6 months interest-only, final 6 months amortize principal + interest.
- **Key Features**:
  - For terms #1–#6, each payment is interest only.
  - From term #7–#12, “normal” principal + interest installments.
- **Parameters**:
  - **loanAmount**: 10,000
  - **annualInterestRate**: 0.08
  - **term**: 12
  - Potential approach:
    - **equitedMonthlyPayment** = interest-only for first 6 months, then recast or handle a different approach for the next 6.
    - Or set a custom schedule with minimal principal in the first half.
- **Complexities Tested**: Proper handling of partial vs. full principal payments across different segments of the loan.

---

## 35. Weekly Periods (Term Period Definition = 1 week)

- **Purpose**: Tests a short, high-frequency schedule to confirm weekly periods are correct, including day counting.
- **Key Features**:
  - 12 weeks total (essentially 3 months).
  - Each period is 7 days of interest.
- **Parameters**:
  - **loanAmount**: 1,200
  - **annualInterestRate**: 0.20 (a bit higher to see noticeable interest each week)
  - **term**: 12
  - **termPeriodDefinition**: \{ unit: "week", count: [1] \}
- **Complexities Tested**: Day-based schedule, verifying partial weeks if the start date is mid-week, correct interest for each 7-day chunk.

---

## 36. Payment Reallocation Mid-Month (Refund/Reversal of a Payment)

- **Purpose**: Tests a scenario where a payment was allocated, then reversed, requiring reapplication.
- **Key Features**:
  - Deposit record #1 arrives, partially allocated across bills.
  - Then deposit #1 is reversed (say it bounced).
  - Another deposit #2 arrives a few days later.
- **Parameters**:
  - **loanAmount**: 2,000
  - **annualInterestRate**: 0.08
  - **term**: 4
  - Payment #1 is posted, then reversed. Payment #2 is posted.
- **Complexities Tested**: Rolling back an allocation, re-opening previously paid bills or re-applying them if the deposit is canceled.

---

## 37. Negative Interest Rate (Promotional/Edge Case)

- **Purpose**: Tests how the system behaves if the interest rate is negative (like a promotional or an unusual scenario).
- **Key Features**:
  - **annualInterestRate**: -0.02 (–2%). Borrower effectively pays less than principal if no fees.
  - Possibly we allow negative rate because “allowRateAbove100” is about capping, not negativity.
- **Parameters**:
  - **loanAmount**: 5,000
  - **annualInterestRate**: -0.02
  - **term**: 6
- **Complexities Tested**: If the code can handle negative interest without error, e.g., applying “credit interest” to reduce principal.

---

## 38. Equated Monthly Installments with Forced Rounding at Each Term

- **Purpose**: A typical EMI (like a standard amortization) but explicitly track rounding each month.
- **Key Features**:
  - Each month’s principal/interest is split in a set ratio that might require rounding.
  - Possibly we set rounding to 3 or 4 decimals to highlight differences.
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.075
  - **term**: 12
  - **roundingPrecision**: 4
  - **flushUnbilledInterestRoundingErrorMethod**: “none” or “at_end” (to see how the leftover accumulates).
- **Complexities Tested**: High-precision EMI calculations each term.

---

## 39. Single Long Period (60 or 120 days)

- **Purpose**: Tests a single bullet payment or just 2–3 “long” periods.
- **Key Features**:
  - Possibly a 2-term loan, each term is 60 days or 120 days.
- **Parameters**:
  - **loanAmount**: 1,000
  - **annualInterestRate**: 0.09
  - **term**: 2
  - **termPeriodDefinition**: \{ unit: "day", count: [60] \} for the first, [60] for the second, etc.
- **Complexities Tested**: Big chunk of interest in fewer but longer periods.

---

## 40. “Re-amortization” or “Re-cast” After a Big Mid-term Payment

- **Purpose**: Tests a scenario where a lumpsum partial payoff triggers a **new** amortization schedule for the remaining balance.
- **Key Features**:
  - In month #4, the borrower pays a large lumpsum, then the system “re-casts” the remaining principal over the last X terms.
  - This is slightly different from typical partial prepayment.
- **Parameters**:
  - **loanAmount**: 10,000
  - **annualInterestRate**: 0.06
  - **term**: 12
  - Big lumpsum in month #4 triggers a new schedule for months #5–#12.
- **Complexities Tested**: Recomputing future installments after an unscheduled principal reduction.

---

## 41. Open-End “Line of Credit” Style with Multiple Draws

- **Purpose**: Tests a scenario that starts with a $0 or small principal, draws up to a limit in multiple increments.
- **Key Features**:
  - E.g., initial $500 draw, month #2 another $1,000, month #3 $500 more, etc.
  - Payment schedule tries to cover interest on outstanding amounts each term.
- **Parameters**:
  - **loanAmount**: 2,000 (the max / limit).
  - **balanceModifications**: multiple “increases” at set dates to reflect draws.
  - Possibly monthly or daily interest.
- **Complexities Tested**: “Draw” logic where principal can expand, plus partial interest coverage each period.

---

## 42. Long-Term (10-Year or 30-Year) Mortgage-Style Loan

- **Purpose**: Stress-test with a large number of periods (120 or 360 months).
- **Key Features**:
  - A typical mortgage scenario with moderate interest (e.g., 5%).
  - Check performance on a large schedule.
- **Parameters**:
  - **loanAmount**: 200,000
  - **annualInterestRate**: 0.05
  - **term**: 360 (30 years)
- **Complexities Tested**: Large iteration, ensuring the schedule creation remains performant, stable, and accurate.

---

## 43. Daily Calculation with “Actual/365” Over 90 Days

- **Purpose**: Precisely verifying day-by-day interest in a 3-month window, crossing at least one month boundary.
- **Key Features**:
  - **calendars**: { primary: "ACTUAL_365" }.
  - Possibly the start date is mid-month so partial days accumulate.
- **Parameters**:
  - **loanAmount**: 1,500
  - **annualInterestRate**: 0.09
  - **term**: 3 if monthly, or specify daily.
  - Payment each 30 days or so.
- **Complexities Tested**: Actual/365 day counting across partial months, verifying correct daily interest accrual.

---

## 44. Monthly Fee as Percentage of Outstanding Principal

- **Purpose**: Tests a dynamic fee each month that is a percentage of that period’s opening principal.
- **Key Features**:
  - E.g. a 2% monthly fee on principal, plus normal interest.
  - Must ensure the code calculates that fee each period based on principal at that period’s start.
- **Parameters**:
  - **loanAmount**: 2,500
  - **annualInterestRate**: 0.06
  - **term**: 6
  - **feesForAllTerms**: [ { type:"percentage", percentage:0.02, basedOn:"principal" } ]
- **Complexities Tested**: Properly recomputing fee each period as principal decreases.

---

## 45. Daily Penalty Fee for Late Payment

- **Purpose**: Tests scenario where once a payment is past due, each day accumulates a penalty or fee.
- **Key Features**:
  - If a bill is not paid by due date, add a daily late fee until it’s paid.
  - Could be done with a custom approach: each new day of delinquency adds X to “fees.”
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.08
  - Payment for the 2nd term is missed. Each day after due date until paid accrues an extra $2.
- **Complexities Tested**: Updating fees dynamically for daily delinquency, ensuring partial or late payments reduce future penalty.

---

## 46. “Concurrency” or “Backdate” Changes

- **Purpose**: Tests if the user modifies something retroactively (e.g., changes an interest override or deposit date).
- **Key Features**:
  - The user goes back and changes the deposit date from 3/10 to 3/05, or the interest override from 10% to 12%.
  - Then re-runs the schedule.
- **Parameters**:
  - Could be any mid-level scenario but repeated with a retroactive “edit.”
- **Complexities Tested**: Recalculation logic, verifying prior periods (and subsequent) are updated accordingly.

---

## 47. Interest Rate Changes Every Single Month (Multiple Custom RateSchedules)

- **Purpose**: Extreme test of a multi-step rate schedule, each month having a different rate.
- **Key Features**:
  - e.g. Jan = 6%, Feb = 6.5%, Mar = 7%, Apr = 7.2%, etc.
- **Parameters**:
  - **loanAmount**: 3,600
  - **term**: 6 or 12
  - **rateSchedules**: 6 or 12 line items, each for a separate month.
- **Complexities Tested**: Rapid changes in rate, verifying correct partial month calculations if the period starts in the middle of a month.

---

## 48. Multiple Restructure Events (Term Extension or Rate Reduction)

- **Purpose**: Goes beyond principal modifications to also shift out the loan’s end date.
- **Key Features**:
  - After missing a payment, the lender extends the total term by 1 month, adjusts rate.
  - Then later extends again or changes the interest rate again.
- **Parameters**:
  - **loanAmount**: 6,000
  - **annualInterestRate**: 0.1
  - Initially term=12, but after term #3 is missed, restructure to term=13, new interest=0.09.
- **Complexities Tested**: Slicing out the old schedule, building a new extended schedule mid-loan, and ensuring continuity of deferred amounts.

---

## 49. Negative Principal Modification (Refund to Borrower) Just for Testing

- **Purpose**: Another unusual scenario: The system might see a “principal negative” if you do multiple write-offs or offsets.
- **Key Features**:
  - The loan is small; partial payments plus a negative modification or large deposit might push principal below zero.
- **Parameters**:
  - **loanAmount**: 500
  - **annualInterestRate**: 0.08
  - **balanceModifications**: a large decrease.
- **Complexities Tested**: Confirm the schedule gracefully handles negative or zero principal instead of erroring.

---

## 50. Late Payment Penalty Rate “Kicks In”

- **Purpose**: Tests scenario where the interest rate itself increases if a prior payment is not made on time.
- **Key Features**:
  - If the borrower is late on term #2, term #3+ jumps from 6% to 10%.
  - Possibly you’d implement with a rate override or a new partial RateSchedule triggered by delinquency.
- **Parameters**:
  - **loanAmount**: 2,000
  - **annualInterestRate**: 0.06
  - **term**: 4
  - If Bill #2 is paid after its due date, override termInterestRate = 0.10 for subsequent terms.
- **Complexities Tested**: Conditional rate changes based on delinquency events.

---

## 51. TILA Calculation Cases

- **Purpose**: Thorough testing of TILA disclosures, APR, finance charge, etc.
- **Key Features**:
  - Various fees considered “finance charges.”
  - Possibly certain fees are excluded from TILA.
  - Validate final TILA calculations (APR, total interest, total finance charge).
- **Parameters**:
  - **loanAmount**: 1,500
  - **annualInterestRate**: 0.10
  - **term**: 6
  - Some monthly fees that are TILA-included, some are not.
- **Complexities Tested**: TILA-specific logic (the “tila” object in your code) for properly including or excluding fees from the APR calculation.

---

## 52. Recurring Additional Fees Each Quarter

- **Purpose**: Test a scenario with base monthly interest but a bigger “quarterly fee” every 3rd payment.
- **Key Features**:
  - Possibly $100 every 3rd period.
  - Or a percentage of the interest or principal due each 3rd term.
- **Parameters**:
  - **loanAmount**: 4,000
  - **annualInterestRate**: 0.09
  - **term**: 12
  - **feesPerTerm**:
    - term #3 => $100,
    - term #6 => $100,
    - term #9 => $100,
    - term #12 => $100.
- **Complexities Tested**: Non-uniform periodic fees, verifying scheduled lumps appear only on specified terms.

---

## 53. Inverse Payment Priority (Principal > Fees > Interest)

- **Purpose**: Tests an extreme re-ordering of the standard payment priority.
- **Key Features**:
  - The deposit first knocks out principal, then fees, finally interest.
- **Parameters**:
  - **loanAmount**: 3,000
  - **annualInterestRate**: 0.1
  - Payment priority = [ "principal", "fees", "interest" ].
- **Complexities Tested**: Negative amortization might occur if not enough funds remain to cover interest, verifying correct deferral.

---

## 54. Bill Grouping: Two Periods Have the Same Due Date

- **Purpose**: Test if you group periods or produce multiple bills simultaneously.
- **Key Features**:
  - Terms #2 and #3 both have a due date on 7/15/2025 for some reason. Possibly from custom changes or short bridging term #2.
- **Parameters**:
  - **loanAmount**: 2,500
  - **annualInterestRate**: 0.11
  - **term**: 4
  - **changePaymentDates** so that #2 ends 7/15 and #3 also ends 7/15.
- **Complexities Tested**: Two open bills with the same due date, ensuring no confusion in payment allocation.

---

## 55. Very Short Loan: 15 Days

- **Purpose**: Tests a micro-loan or short-term bridging scenario with a single or two periods.
- **Key Features**:
  - Possibly a single-lump sum due at day 15.
  - Or 2 periods each 7–8 days.
- **Parameters**:
  - **loanAmount**: 500
  - **annualInterestRate**: 0.20
  - **termPeriodDefinition**: \{ unit: "day", count: [7, 8] \} or just 2 terms.
- **Complexities Tested**: Very short durations, verifying partial daily interest.

---

## 56. Overlapping Next Period Start (User-Defined Partial Overlap?)

- **Purpose**: Odd test where a custom period schedule might cause partial overlap or a gap if incorrectly configured.
- **Key Features**:
  - Period #1 ends 5/30, period #2 starts 5/28 (overlap), or 6/02 (gap).
  - Should typically be disallowed or produce an error.
- **Parameters**:
  - **loanAmount**: 2,500
  - **periodsSchedule**: manual custom periods with an overlap.
- **Complexities Tested**: Validation errors—ensuring the system flags or corrects overlapping or gapped periods.

---

## 57. Very Large Principal & Very Small Payment (Testing Edge)

- **Purpose**: Check that the system can handle very large numbers and extremely small payment amounts that never fully pay interest.
- **Key Features**:
  - **loanAmount**: 1,000,000,000 (one billion)
  - Payment each month = $1,000, which might not even cover interest.
- **Parameters**:
  - **annualInterestRate**: 0.01 (1%) or something that still might dwarf the small payment.
  - Possibly 12 or 24 term.
- **Complexities Tested**: Handling big principal, ensuring no overflow in decimal operations, ensuring negative amortization logic is stable.

---

## 58. Local Regulation: Max Allowed APR = 36%

- **Purpose**: Tests a regulatory cap scenario where interest must not exceed 36%.
- **Key Features**:
  - If user tries to set 48%, the system either errors or automatically reduces to 36%.
  - (Implementation may vary, but it’s a common real-world test.)
- **Parameters**:
  - **loanAmount**: 2,000
  - Attempt to set **annualInterestRate**= 0.48 (48%)
  - The system might either throw an error or clip at 0.36.
- **Complexities Tested**: Validation constraints beyond just “> 100%.” Ensures compliance logic or error handling is triggered.

---

## 59. Collateralized Loan with Custom Fees if Collateral is Released Early

- **Purpose**: A scenario where an extra fee is triggered if the user requests collateral release prior to final payoff.
- **Key Features**:
  - Additional fee is added to the schedule once the “event” occurs, e.g., a date triggers a line item.
- **Parameters**:
  - **loanAmount**: 4,000
  - **annualInterestRate**: 0.08
  - Some “collateral release event” after term #2, adding a new “early release fee” in term #3.
- **Complexities Tested**: On-the-fly new fee insertion.

---

## 60. Multiple (Staggered) Partial Payments in a Single Bill

- **Purpose**: One bill might be paid off with 2 or 3 separate deposits.
- **Key Features**:
  - e.g. Bill #2 is $400. Borrower pays $100 on 5/10, $150 on 5/20, $150 on 5/25.
- **Parameters**:
  - **loanAmount**: 1,000
  - **annualInterestRate**: 0.12
  - **term**: 3
  - DepositRecords: multiple small deposits in a single term.
- **Complexities Tested**: Summation across multiple partial deposits, verifying no leftover shortfall or double-count.

Absolutely! Here’s a **step-by-step implementation plan** for an AI agent (or a developer) to follow, with a checklist table for tracking progress. Each step is broken down into actionable tasks, with clear dependencies and completion criteria.

---

# DSI Implementation Checklist for AI Agent

| Step | Task Description                     | Subtasks / Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Status |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | **Billing Model Refactor**           | 1.1 Add `billingModel` to loan object (default + term-based overrides)<br>1.2 Implement sticky override logic (get billing model for any term)<br>1.3 Add tests for override logic                                                                                                                                                                                                                                                                                                                                                                                                                            | ✅      |
| 2    | **Amortization Module Enhancements** | 2.1 Accept optional DSI payments array as input<br>2.2 Store DSI payments internally for independent operation<br>2.3 Generate projected schedule as usual<br>2.4 After main loop, run DSI adjustment loop:<br> - For each DSI payment, recalc interest as of payment date<br> - Patch amortization entries with DSI fields (`actualDSIPrincipal`, `actualDSIInterest`, `actualDSIFees`)<br> - For late/early payments, update next term’s balance and show savings/penalties<br>2.5 Extend `AmortizationEntry` to include DSI fields and usage details/receipts<br>2.6 Add tests for DSI schedule generation | ✅      |
| 3    | **Bill Generation**                  | 3.1 Use billing model for term to determine DSI logic<br>3.2 Include both projected and DSI splits in bill<br>3.3 Mark bill as DSI if applicable<br>3.4 Attach usage details/receipts for each payment<br>3.5 Indicate savings/penalties in bill<br>3.6 Add tests for bill generation                                                                                                                                                                                                                                                                                                                         | ✅      |
| 4    | **Payment Application**              | 4.1 Enforce FIFO payment application<br>4.2 For DSI terms, recalc interest as of payment date<br>4.3 Apply payment to interest, then principal, then fees (or configured order)<br>4.4 Allow partial payments<br>4.5 Record usage details/receipts for each payment<br>4.6 For late payments, update next term’s balance<br>4.7 For early payments, show savings<br>4.8 Add tests for payment application                                                                                                                                                                                                     | ✅      |
| 5    | **Usage Details / Receipts**         | 5.1 Extend `UsageDetails` to capture DSI-specific info (projected vs. actual splits, savings, delinquencies)<br>5.2 Ensure usage details are attached to amortization entries, bills, and deposit records<br>5.3 Add tests for usage details/receipts                                                                                                                                                                                                                                                                                                                                                         | ✅      |
| 6    | **UI/Reporting**                     | 6.1 Update repayment schedule and bill views to show projected and DSI-adjusted values<br>6.2 Indicate DSI terms, savings, and penalties<br>6.3 Clearly explain differences to users<br>6.4 Add tests for UI/reporting output                                                                                                                                                                                                                                                                                                                                                                                 | ✅      |
| 7    | **Testing & Documentation**          | 7.1 Add comprehensive tests for all new DSI features<br>7.2 Ensure backwards compatibility<br>7.3 Update documentation for new features and flows                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ✅      |

---

## **How to Use This Table**

- The agent (or developer) should work through each step in order.
- For each step, complete all subtasks/acceptance criteria before marking the step as done.
- After each step, run the relevant tests to ensure correctness.
- Only move to the next step when the current one is fully checked off.
- At the end, ensure all steps are marked as complete and all tests pass.

---

# DSI (Daily Simple Interest) Integration — Comprehensive Requirements

## 1. **General Principles**

- The system must support both **amortized** and **DSI** (Daily Simple Interest) billing models, with the ability to switch between them at specific terms.
- The **billing model** is defined at the loan level, with support for term-based overrides. Once overridden at a term, the new model persists for all subsequent terms until the next override.
- All features must be **backwards compatible** with existing amortized loans and payment flows.

---

## 2. **Billing Model Logic**

- The loan object must have a `billingModel` property:
  - A default value (e.g., 'amortized').
  - An array of term-based overrides:  
    Example: `[{ term: 5, model: 'DSI' }, { term: 10, model: 'amortized' }]`
- The system must provide a method to determine the billing model for any given term, following the "sticky" override logic:
  - If a term has an override, use it.
  - Otherwise, use the most recent override before that term, or the default if none.

---

## 3. **Amortization Module**

- The amortization module must:
  - Generate a **projected schedule** as usual for all terms.
  - Accept an **optional DSI payments array** as input, structured as:  
    `[{ term, paymentDate, principalPaid, interestPaid, feesPaid }]`
    - This array is reset and constructed by the LendPeak module during schedule recalculation, using either bills or deposit records.
    - The array is also stored internally for independent operation and testing.
  - After generating the projected schedule, run a **DSI adjustment loop**:
    - For each DSI payment, recalculate interest as of payment date and update splits for that term.
    - Patch amortization entries with DSI-equivalent fields:
      - `actualDSIPrincipal`, `actualDSIInterest`, `actualDSIFees`
    - If no DSI payment for a term, leave projected values.
    - For late payments, the next term starts with the actual remaining balance and accrues interest on that balance.
    - For early payments, show savings in interest.
  - Extend `AmortizationEntry` to include:
    - DSI-adjusted fields.
    - Usage details/receipts for each payment (see below).
    - Both projected and actual splits, and savings or additional interest due to delinquencies.

---

## 4. **Usage Details / Receipts**

- The system must use or extend the existing `UsageDetails` structure to:
  - Track how payments are applied and what splits are used (principal, interest, fees).
  - Serve as a "receipt" for both amortization entries and deposit records.
  - Capture DSI-specific information:
    - Projected vs. actual splits.
    - Savings (if paid early) or additional interest (if paid late).
    - Delinquency status and its impact on future terms.
  - Attach usage details/receipts to:
    - Amortization entries.
    - Bills.
    - Deposit records.

---

## 5. **Bill Generation**

- When generating a bill:
  - Use the billing model for the term to determine if DSI logic applies.
  - Include both projected and DSI-adjusted splits in the bill.
  - Mark the bill as DSI if applicable.
  - Attach usage details/receipts for each payment applied to the bill.
  - Indicate savings or additional interest due to early/late payment.
  - Support multiple payments per bill, with receipts for each.

---

## 6. **Payment Application**

- Payments must always be applied **FIFO** (oldest unpaid bill first).
- **Partial payments** are always allowed.
- The **waterfall/payment priority** (interest, principal, fees, etc.) is defined at the loan level and must be respected.
- For DSI terms:
  - On each payment, recalculate interest as of payment date.
  - Apply payment to interest, then principal, then fees (or configured order).
  - If payment is partial, update bill and amortization entry accordingly.
  - Record a usage detail/receipt for each payment, capturing date, amount, and split.
  - For late payments, the next term starts with the actual remaining balance.
  - For early payments, show savings in interest.
- For **early payments**:
  - There must be a safeguard on how many terms ahead a borrower can pay (default: 1 term ahead, configurable).
  - Payments scheduled for the future must specify an effective date.
  - Principal-only payments that do not satisfy any bills are allowed, as per current logic.

---

## 7. **UI/Reporting**

- The UI and reporting must:
  - Show both projected (scheduled) and DSI-adjusted (actual) values for principal, interest, and fees in the repayment schedule and bills.
  - Clearly indicate DSI terms and explain differences to users.
  - Show savings (if paid early) or additional interest (if paid late).
  - Display usage details/receipts for each bill/payment.
  - Indicate delinquency status and its impact on future terms.

---

## 8. **Testing & Documentation**

- Add comprehensive tests for all new DSI features, including:
  - Multiple payments per bill.
  - Early/late payments.
  - Term-based billing model switches.
  - Partial payments.
  - FIFO payment application.
  - Usage details/receipts.
- Ensure backwards compatibility with existing amortized loans.
- Update documentation to cover:
  - Billing model logic and overrides.
  - DSI payment and adjustment logic.
  - Usage details/receipts.
  - UI/reporting changes.

---

## 9. **Edge Cases & Safeguards**

- If a payment is made before the bill is due, interest is calculated only for the days elapsed.
- If a payment is made after the bill is due, interest is calculated for all days up to the payment date, and the next term starts with the actual remaining balance.
- If a payment is made for more than one term ahead, enforce the safeguard (default: 1 term ahead).
- If a payment is principal-only, it does not satisfy any bill but reduces the outstanding principal.
- If a term switches billing model, the new model applies for all subsequent terms until the next override.

---

## 10. **Glossary**

- **Projected Schedule**: The original amortization schedule, assuming payments are made on due dates.
- **DSI Payments Array**: An array of actual payments (with splits and dates) used to adjust the schedule for DSI terms.
- **Usage Details/Receipts**: Records showing how each payment was applied, including splits, dates, and any savings or penalties.
- **FIFO**: First-In, First-Out; payments are always applied to the oldest unpaid bill first.
- **Waterfall/Payment Priority**: The order in which payment is applied (interest, principal, fees, etc.).
- **Delinquency**: When a payment is late, resulting in additional interest and a higher starting balance for the next term.

---

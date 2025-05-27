# DSI Re-amortization Requirements

## Overview
Enhance the amortization system to provide three distinct views of loan amortization for Daily Simple Interest (DSI) loans:
1. Standard/Original Amortization
2. DSI Actual View (Historical)
3. DSI Re-amortized View (Historical + Re-projected Future)

## Three Views Detailed Description

### 1. Standard Amortization (Existing)
- The original amortization schedule calculated at loan origination
- Assumes all payments are made on time
- Currently represented by fields like `startBalance`, `endBalance`, `dueInterestForTerm`, `principal`

### 2. DSI Actual View (Existing)
- Shows what actually happened for payments that were made
- Currently tracked with fields:
  - `actualDSIStartBalance`
  - `actualDSIEndBalance`
  - `actualDSIInterest`
  - `actualDSIPrincipal`
  - `dsiInterestDays`
  - `dsiPreviousPaymentDate`

### 3. DSI Re-amortized View (New)
- Combines actual DSI history with re-projected future
- Uses prefix `reAmortized` for new fields
- Logic:
  - **Past paid terms**: Use actual DSI values
  - **Unpaid/delinquent terms**: Use last paid DSI end balance
  - **Future terms (after current active term)**: Re-amortize assuming catch-up

## Key Concepts

### Current Active Term
- Determined by comparing the current date (from amortization) with term periods
- The term that contains the current date is the "current active term"
- Used to distinguish between delinquent terms and future terms

### Delinquent Terms
- Terms that are past due but before or at the current active term
- Maintain the last paid DSI end balance as the start balance
- No principal reduction occurs
- Interest continues to accrue on the unpaid balance

### Future Terms
- Terms after the current active term
- Assume borrower will catch up on all delinquent payments
- Re-amortize based on the actual remaining balance

## DSI Interest Days Calculation for Re-amortization

### Rules:
1. **First unpaid term after a payment**:
   - Calculate DSI days from the last payment date to the term's end date
   - Example: If last payment was 5 days early, and term is 30 days, DSI days = 35

2. **Subsequent unpaid terms**:
   - Use standard term days (e.g., 30 days)
   - Balance remains the same as previous unpaid term

3. **After catch-up (future terms)**:
   - Return to normal DSI calculation based on payment dates

### Example Sequence:
- Term 0: Paid 5 days early → 25 DSI days
- Term 1: Unpaid → 35 DSI days (30 standard + 5 from early payment)
- Term 2: Unpaid → 30 DSI days (standard term days)
- Term 3: Unpaid → 30 DSI days (continues at standard)

## New Fields for AmortizationEntry

### Re-amortized Balance Fields:
- `reAmortizedStartBalance: Currency`
- `reAmortizedEndBalance: Currency`

### Re-amortized Payment Breakdown:
- `reAmortizedInterest: Currency`
- `reAmortizedPrincipal: Currency`
- `reAmortizedFees: Currency` (if applicable)
- `reAmortizedTotalPayment: Currency`

### Re-amortized DSI Tracking:
- `reAmortizedDsiInterestDays: number`
- `reAmortizedPerDiem: Currency`

### Status Flags:
- `isCurrentActiveTerm: boolean` - True if this term contains the current date
- `isDelinquent: boolean` - True if term is past due but <= current active term
- `lastPaymentDate: LocalDate` - Date of the last payment made (for tracking)

## Implementation Steps

1. **Add new fields to AmortizationEntry model**
2. **Update Amortization.calculateAmortizationPlan() to:**
   - Identify current active term based on current date
   - Track last payment information
   - Calculate re-amortized values for each term
3. **Add re-amortized fields to repayment-plan component**
4. **Create tests for re-amortization scenarios**

## Business Logic for Re-amortization Calculation

### For Each Term:
1. **Determine term status**:
   - Is it paid? (has DSI payment history)
   - Is it the current active term?
   - Is it delinquent? (past due but <= current active term)
   - Is it future? (> current active term)

2. **Calculate re-amortized values**:
   - **Paid terms**: Copy actual DSI values to re-amortized fields
   - **Delinquent terms**: 
     - Start balance = last paid DSI end balance
     - End balance = start balance (no reduction)
     - Interest = balance × daily rate × DSI days
     - Principal = 0
   - **Future terms**:
     - Re-amortize remaining balance over remaining terms
     - Use standard amortization calculation

3. **DSI days calculation**:
   - Track the last payment date
   - First unpaid term: days from last payment date to term end
   - Subsequent unpaid terms: standard term days
   - Future terms after catch-up: normal calculation

## Edge Cases to Consider

1. **No payments made**: All terms use original balance
2. **Partial payments**: Pro-rate the balance reduction
3. **Overpayments**: Reduce future term balances accordingly
4. **Current date before first term**: No current active term
5. **Current date after last term**: Last term is current active term

## Testing Requirements

1. **Unit tests for**:
   - Current active term identification
   - Re-amortization calculation logic
   - DSI interest days calculation for various scenarios

2. **Integration tests for**:
   - Full loan lifecycle with various payment patterns
   - Delinquency scenarios
   - Early/late payment impacts on re-amortization

## UI Considerations

1. **Repayment Plan Component**:
   - Add columns for all re-amortized fields
   - Visual indicators for current active term and delinquent terms
   - Option to toggle between three views

2. **Export Functionality**:
   - Include re-amortized fields in CSV exports
   - Clear labeling of which view is being exported

## Future Enhancements

1. **Configurable catch-up assumptions**:
   - Option to assume partial catch-up
   - Different re-amortization strategies

2. **Historical re-amortization tracking**:
   - Store snapshots of re-amortization at different points in time
   - Track how projections changed over time

## Acceptance Criteria

1. All three views (original, actual DSI, re-amortized) are correctly calculated
2. Current active term is accurately identified based on system date
3. Delinquent terms maintain proper balance without reduction
4. Future terms are re-amortized based on actual remaining balance
5. DSI interest days follow the specified rules for each scenario
6. All new fields are visible in the repayment plan UI
7. Comprehensive test coverage for all scenarios
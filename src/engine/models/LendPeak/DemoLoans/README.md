## Common Demo Loans

| ID           | Name                    | Tags                             | Notes                              |
| ------------ | ----------------------- | -------------------------------- | ---------------------------------- |
| **DEMO-C01** | Vanilla 24-mo amortised | `payments`                       | Simple on-schedule repayment       |
| **DEMO-C02** | Brand-new today         | `no-payments`                    | Originated today, no history       |
| **DEMO-C03** | 20 days old, no pays    | `no-payments`, `missed-payments` | Shows first delinquency path       |
| **DEMO-C04** | 12-mo loan, over-pay    | `payments`, `over-payments`      | Two principal pre-payments         |
| **DEMO-C05** | Includes refund         | `payments`, `refunds`            | Partial refund mid-term            |
| **DEMO-C06** | Rate mod month 6        | `payments`, `mods`               | Single rate reduction              |
| **DEMO-C07** | CPD change              | `payments`, `mods`               | Change-payment-date mid-stream     |
| **DEMO-C08** | Custom calendar 30/360  | `payments`, `custom-calendar`    | Alt day-count basis                |
| **DEMO-C09** | — slot reserved —       | `edge`                           | Intentional gap for future sample  |
| **DEMO-C10** | Early payoff (simple)   | `payments`, `over-payments`      | Lump-sum in month 18 zeros balance |

---

## Advanced Demo Loans

| ID           | Name                             | Tags                                        | Notes                                   |
| ------------ | -------------------------------- | ------------------------------------------- | --------------------------------------- |
| **DEMO-A01** | Hardship: zero-interest skip     | `mods`, `missed-payments`                   | Terms 4-6 at 0 % interest               |
| **DEMO-A02** | Hardship: interest-accruing skip | `mods`, `missed-payments`, `edge`           | Skip pays, interest accrues & defers    |
| **DEMO-A03** | Variable-rate ladder             | `mods`, `custom-calendar`, `edge`           | Five rate segments, 30/Actual           |
| **DEMO-A04** | Balloon maturity                 | `mods`, `edge`                              | Interest-only then 90 % balloon         |
| **DEMO-A05** | Refund > payment (fee defer)     | `refunds`, `edge`                           | Scheduled pay smaller than fees         |
| **DEMO-A06** | Negative-amort starter           | `mods`, `edge`, `custom-calendar`           | First 6 terms negative-am               |
| **DEMO-A07** | IO → amortised flip              | `mods`                                      | 12 × IO then step-up to EMI             |
| **DEMO-A08** | Re-amort after principal mod     | `mods`, `payments`                          | Balance drop triggers schedule rebuild  |
| **DEMO-A09** | Aggressive over-pay payoff       | `over-payments`, `early-payoff`, `payments` | Escalating extras → payoff month 9      |
| **DEMO-A10** | Auto-close waiver (< threshold)  | `auto-close`, `early-payoff`, `edge`        | Tolerance triggers synthetic waiver row |
| **DEMO-A11** | Hardship: zero-interest skip (with term extension) | `mods`, `missed-payments`, `term-extension` | Terms 4-6 at 0% interest, with 3-term extension |
| **DEMO-A12** | Hardship: interest-accruing skip (with term extension) | `mods`, `missed-payments`, `edge`, `term-extension` | Skip pays, interest accrues & defers, with 3-term extension |

---

## Tag Legend

| Tag               | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| `payments`        | Normal scheduled payments present               |
| `no-payments`     | No payments have been made yet                  |
| `missed-payments` | One or more scheduled payments skipped          |
| `mods`            | Any kind of loan modification (rate, CPD, etc.) |
| `over-payments`   | Extra principal or advance payments             |
| `refunds`         | Outbound refund transactions included           |
| `custom-calendar` | Uses non-default day-count conventions          |
| `early-payoff`    | Loan terminates ahead of original schedule      |
| `auto-close`      | Balance w/in tolerance triggers auto-closure    |
| `edge`            | Edge-case scenario for stress-testing           |
| `term-extension`  | Loan uses term extension                        |

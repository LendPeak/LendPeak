// -----------------------------------------------------------------------------
// demo-loan.catalogue.ts   – single source of truth for sample descriptors
// -----------------------------------------------------------------------------

export type Tag =
  | 'payments'
  | 'no-payments'
  | 'missed-payments'
  | 'mods'
  | 'over-payments'
  | 'refunds'
  | 'custom-calendar'
  | 'early-payoff'
  | 'auto-close'
  | 'edge';

/** categories must match the four tabs: everyday | hardship | edge | regression */
export interface DemoLoanDescriptor {
  id: string;
  title: string;
  subtitle: string;
  category: 'everyday' | 'hardship' | 'edge' | 'regression';
  tags: Tag[];
  notes: string;
}

export const DEMO_LOANS: DemoLoanDescriptor[] = [
  // ─── Everyday ──────────────────────────────────────────────────────────
  {
    id: 'DEMO-C01',
    title: 'Vanilla 24-mo amortised',
    subtitle: 'Standard 2-year equal-payment schedule',
    category: 'everyday',
    tags: ['payments'],
    notes: 'Simple on-schedule repayment',
  },
  {
    id: 'DEMO-C02',
    title: 'Brand-new today',
    subtitle: 'Originated today • no payment history',
    category: 'everyday',
    tags: ['no-payments'],
    notes: 'Originated today, no history',
  },
  {
    id: 'DEMO-C03',
    title: '20 days old, no pays',
    subtitle: 'First instalment already delinquent',
    category: 'everyday',
    tags: ['no-payments', 'missed-payments'],
    notes: 'Shows first delinquency path',
  },
  {
    id: 'DEMO-C04',
    title: '12-mo loan, over-pay',
    subtitle: 'Two early principal pre-payments',
    category: 'everyday',
    tags: ['payments', 'over-payments'],
    notes: 'Two principal pre-payments',
  },
  {
    id: 'DEMO-C05',
    title: 'Includes refund',
    subtitle: 'Partial refund midway through term',
    category: 'everyday',
    tags: ['payments', 'refunds'],
    notes: 'Partial refund mid-term',
  },
  {
    id: 'DEMO-C06',
    title: 'Rate mod month 6',
    subtitle: 'Single interest-rate reduction',
    category: 'everyday',
    tags: ['payments', 'mods'],
    notes: 'Single rate reduction',
  },
  {
    id: 'DEMO-C07',
    title: 'CPD change',
    subtitle: 'Mid-stream change-payment-date',
    category: 'everyday',
    tags: ['payments', 'mods'],
    notes: 'Change-payment-date mid-stream',
  },
  {
    id: 'DEMO-C08',
    title: 'Custom calendar 30/360',
    subtitle: 'Alternate 30/360 day-count basis',
    category: 'everyday',
    tags: ['payments', 'custom-calendar'],
    notes: 'Alt day-count basis',
  },
  {
    id: 'DEMO-C09',
    title: '— slot reserved —',
    subtitle: 'Placeholder sample loan',
    category: 'everyday',
    tags: ['edge'],
    notes: 'Intentional gap for future sample',
  },
  {
    id: 'DEMO-C10',
    title: 'Early payoff (simple)',
    subtitle: 'Lump-sum in month 18 clears balance',
    category: 'everyday',
    tags: ['payments', 'over-payments'],
    notes: 'Lump-sum in month 18 zeros balance',
  },

  // ─── Hardship ──────────────────────────────────────────────────────────
  {
    id: 'DEMO-A01',
    title: 'Hardship: zero-interest skip',
    subtitle: 'Interest-free payment holiday',
    category: 'hardship',
    tags: ['mods', 'missed-payments'],
    notes: 'Terms 4-6 at 0 % interest',
  },
  {
    id: 'DEMO-A02',
    title: 'Hardship: interest-accruing skip',
    subtitle: 'Payments skipped, interest still accrues',
    category: 'hardship',
    tags: ['mods', 'missed-payments', 'edge'],
    notes: 'Skip pays, interest accrues & defers',
  },

  // ─── Edge-cases / Advanced ────────────────────────────────────────────
  {
    id: 'DEMO-A03',
    title: 'Variable-rate ladder',
    subtitle: 'Five-segment rate ladder (30/Actual)',
    category: 'edge',
    tags: ['mods', 'custom-calendar', 'edge'],
    notes: 'Five rate segments, 30/Actual',
  },
  {
    id: 'DEMO-A04',
    title: 'Balloon maturity',
    subtitle: 'Interest-only then 90 % balloon',
    category: 'edge',
    tags: ['mods', 'edge'],
    notes: 'Interest-only then 90 % balloon',
  },
  {
    id: 'DEMO-A05',
    title: 'Refund > payment (fee defer)',
    subtitle: 'Refund exceeds payment; fees deferred',
    category: 'edge',
    tags: ['refunds', 'edge'],
    notes: 'Scheduled pay smaller than fees',
  },
  {
    id: 'DEMO-A06',
    title: 'Negative-amort starter',
    subtitle: 'First 6 terms negative-amortisation',
    category: 'edge',
    tags: ['mods', 'edge', 'custom-calendar'],
    notes: 'First 6 terms negative-am',
  },
  {
    id: 'DEMO-A07',
    title: 'IO → amortised flip',
    subtitle: '12 × IO then step-up to EMI',
    category: 'edge',
    tags: ['mods'],
    notes: '12 × IO then step-up to EMI',
  },
  {
    id: 'DEMO-A08',
    title: 'Re-amort after principal mod',
    subtitle: 'Balance drop triggers schedule rebuild',
    category: 'edge',
    tags: ['mods', 'payments'],
    notes: 'Balance drop triggers schedule rebuild',
  },
  {
    id: 'DEMO-A09',
    title: 'Aggressive over-pay payoff',
    subtitle: 'Escalating extras → payoff month 9',
    category: 'edge',
    tags: ['over-payments', 'early-payoff', 'payments'],
    notes: 'Escalating extras → payoff month 9',
  },
  {
    id: 'DEMO-A10',
    title: 'Auto-close waiver (< threshold)',
    subtitle: 'Tolerance waiver closes tiny balance',
    category: 'edge',
    tags: ['auto-close', 'early-payoff', 'edge'],
    notes: 'Tolerance triggers synthetic waiver row',
  },

  // ─── Regression ───────────────────────────────────────────────────────
  // Populate as you add regression-specific samples
];

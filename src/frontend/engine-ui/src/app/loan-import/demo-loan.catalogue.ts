// -----------------------------------------------------------------------------
// demo-loan.catalogue.ts  – single source of truth for sample descriptors
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

export interface DemoLoanDescriptor {
  id: string; // e.g. "DEMO-C01"
  name: string; // display label
  category: 'common' | 'advanced';
  tags: Tag[]; // see Tag union
  notes: string; // human‑friendly explanation (tooltip)
}

export const DEMO_LOANS: DemoLoanDescriptor[] = [
  // ─── Common ───────────────────────────────────────────────────────────
  {
    id: 'DEMO-C01',
    name: 'Vanilla 24‑mo amortised',
    category: 'common',
    tags: ['payments'],
    notes: 'Simple on‑schedule repayment',
  },
  {
    id: 'DEMO-C02',
    name: 'Brand‑new today',
    category: 'common',
    tags: ['no-payments'],
    notes: 'Originated today, no history',
  },
  {
    id: 'DEMO-C03',
    name: '20 days old, no pays',
    category: 'common',
    tags: ['no-payments', 'missed-payments'],
    notes: 'Shows first delinquency path',
  },
  {
    id: 'DEMO-C04',
    name: '12‑mo loan, over‑pay',
    category: 'common',
    tags: ['payments', 'over-payments'],
    notes: 'Two principal pre‑payments',
  },
  {
    id: 'DEMO-C05',
    name: 'Includes refund',
    category: 'common',
    tags: ['payments', 'refunds'],
    notes: 'Partial refund mid‑term',
  },
  {
    id: 'DEMO-C06',
    name: 'Rate mod month 6',
    category: 'common',
    tags: ['payments', 'mods'],
    notes: 'Single rate reduction',
  },
  {
    id: 'DEMO-C07',
    name: 'CPD change',
    category: 'common',
    tags: ['payments', 'mods'],
    notes: 'Change‑payment‑date mid‑stream',
  },
  {
    id: 'DEMO-C08',
    name: 'Custom calendar 30/360',
    category: 'common',
    tags: ['payments', 'custom-calendar'],
    notes: 'Alt day‑count basis',
  },
  {
    id: 'DEMO-C09',
    name: '— slot reserved —',
    category: 'common',
    tags: ['edge'],
    notes: 'Intentional gap for future sample',
  },
  {
    id: 'DEMO-C10',
    name: 'Early payoff (simple)',
    category: 'common',
    tags: ['payments', 'over-payments'],
    notes: 'Lump‑sum in month 18 zeros balance',
  },

  // ─── Advanced ────────────────────────────────────────────────────────
  {
    id: 'DEMO-A01',
    name: 'Hardship: zero‑interest skip',
    category: 'advanced',
    tags: ['mods', 'missed-payments'],
    notes: 'Terms 4‑6 at 0 % interest',
  },
  {
    id: 'DEMO-A02',
    name: 'Hardship: interest‑accruing skip',
    category: 'advanced',
    tags: ['mods', 'missed-payments', 'edge'],
    notes: 'Skip pays, interest accrues & defers',
  },
  {
    id: 'DEMO-A03',
    name: 'Variable‑rate ladder',
    category: 'advanced',
    tags: ['mods', 'custom-calendar', 'edge'],
    notes: 'Five rate segments, 30/Actual',
  },
  {
    id: 'DEMO-A04',
    name: 'Balloon maturity',
    category: 'advanced',
    tags: ['mods', 'edge'],
    notes: 'Interest‑only then 90 % balloon',
  },
  {
    id: 'DEMO-A05',
    name: 'Refund > payment (fee defer)',
    category: 'advanced',
    tags: ['refunds', 'edge'],
    notes: 'Scheduled pay smaller than fees',
  },
  {
    id: 'DEMO-A06',
    name: 'Negative‑amort starter',
    category: 'advanced',
    tags: ['mods', 'edge', 'custom-calendar'],
    notes: 'First 6 terms negative‑am',
  },
  {
    id: 'DEMO-A07',
    name: 'IO → amortised flip',
    category: 'advanced',
    tags: ['mods'],
    notes: '12 × IO then step‑up to EMI',
  },
  {
    id: 'DEMO-A08',
    name: 'Re‑amort after principal mod',
    category: 'advanced',
    tags: ['mods', 'payments'],
    notes: 'Balance drop triggers schedule rebuild',
  },
  {
    id: 'DEMO-A09',
    name: 'Aggressive over‑pay payoff',
    category: 'advanced',
    tags: ['over-payments', 'early-payoff', 'payments'],
    notes: 'Escalating extras → payoff month 9',
  },
  {
    id: 'DEMO-A10',
    name: 'Auto‑close waiver (< threshold)',
    category: 'advanced',
    tags: ['auto-close', 'early-payoff', 'edge'],
    notes: 'Tolerance triggers synthetic waiver row',
  },
];

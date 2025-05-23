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
    title: 'Standard 24-Month Installment',
    subtitle: 'Equal principal + interest payments for two years',
    category: 'everyday',
    tags: ['payments'],
    notes: 'Straight “happy-path” amortisation',
  },
  {
    id: 'DEMO-C02',
    title: 'Just Originated – No History',
    subtitle: 'Loan created today; first payment not yet due',
    category: 'everyday',
    tags: ['no-payments'],
    notes: 'Useful for “new-loan” UI and ledger tests',
  },
  {
    id: 'DEMO-C03',
    title: 'First Payment Missed (Day 20)',
    subtitle: 'Borrower already delinquent on first installment',
    category: 'everyday',
    tags: ['no-payments', 'missed-payments'],
    notes: 'Shows early delinquency workflow',
  },
  {
    id: 'DEMO-C04',
    title: 'Early Principal Pre-Payments',
    subtitle: '12-month term with two extra payments ahead of schedule',
    category: 'everyday',
    tags: ['payments', 'over-payments'],
    notes: 'Demonstrates surplus-to-principal logic',
  },
  {
    id: 'DEMO-C05',
    title: 'Mid-Term Partial Refund',
    subtitle: 'Refund issued after several on-time payments',
    category: 'everyday',
    tags: ['payments', 'refunds'],
    notes: 'Tests net-deposit / available-cash maths',
  },
  {
    id: 'DEMO-C06',
    title: 'Interest-Rate Drop in Month 6',
    subtitle: 'Single rate reduction applied mid-term',
    category: 'everyday',
    tags: ['payments', 'mods'],
    notes: 'Simple “one-off” modification',
  },
  {
    id: 'DEMO-C07',
    title: 'Due-Date Change Mid-Stream',
    subtitle: 'Payment date moved to a new day of month',
    category: 'everyday',
    tags: ['payments', 'mods'],
    notes: 'Classic Change-Payment-Date scenario',
  },
  {
    id: 'DEMO-C08',
    title: '30/360 Day-Count Calendar',
    subtitle: 'Interest accrual on 30/360 basis instead of Actual/365',
    category: 'everyday',
    tags: ['payments', 'custom-calendar'],
    notes: 'Alternative day-count convention',
  },
  // {
  //   id: 'DEMO-C09',
  //   title: '— slot reserved —',
  //   subtitle: 'Placeholder for future sample',
  //   category: 'everyday',
  //   tags: ['edge'],
  //   notes: 'Intentional gap',
  // },
  {
    id: 'DEMO-C10',
    title: 'Lump-Sum Payoff in Month 18',
    subtitle: 'Single extra payment retires balance early',
    category: 'everyday',
    tags: ['payments', 'early-payoff'],
    notes: 'Demonstrates payoff quote and close-out',
  },

  // ─── Hardship ──────────────────────────────────────────────────────────
  {
    id: 'DEMO-A01',
    title: 'Hardship: 3-Month Payment Holiday',
    subtitle: 'Terms 4–6 skipped with zero interest charged',
    category: 'hardship',
    tags: ['mods', 'missed-payments'],
    notes: 'Zero-rate deferral window',
  },
  {
    id: 'DEMO-A02',
    title: 'Hardship: Skip Payments, Interest Accrues',
    subtitle: 'Payments paused, interest capitalised and deferred',
    category: 'hardship',
    tags: ['mods', 'missed-payments', 'edge'],
    notes: 'Shows deferred-interest accounting',
  },

  // ─── Edge-cases / Advanced ────────────────────────────────────────────
  {
    id: 'DEMO-A03',
    title: 'Five-Step Variable-Rate Ladder',
    subtitle: 'Successive rate changes on 30/Actual calendar',
    category: 'edge',
    tags: ['mods', 'custom-calendar', 'edge'],
    notes: 'Stress-tests rate-schedule engine',
  },
  {
    id: 'DEMO-A04',
    title: 'Interest-Only → 90 % Balloon',
    subtitle: 'Interest-only period followed by balloon maturity',
    category: 'edge',
    tags: ['mods', 'edge'],
    notes: 'Classic balloon-payment case',
  },
  {
    id: 'DEMO-A05',
    title: 'Refund Larger Than Installment',
    subtitle: 'Refund exceeds scheduled payment; fees deferred',
    category: 'edge',
    tags: ['refunds', 'edge'],
    notes: 'Checks negative net-payment handling',
  },
  {
    id: 'DEMO-A06',
    title: 'Negative Amortisation Starter',
    subtitle: 'First six terms allow unpaid interest to capitalise',
    category: 'edge',
    tags: ['mods', 'edge', 'custom-calendar'],
    notes: 'Covers “neg-am” edge case',
  },
  {
    id: 'DEMO-A07',
    title: 'Flip from Interest-Only to EMI',
    subtitle: '12 interest-only payments then convert to amortising',
    category: 'edge',
    tags: ['mods'],
    notes: 'Tests schedule rebuild on mode change',
  },
  {
    id: 'DEMO-A08',
    title: 'Re-Amortise After Principal Cut',
    subtitle: 'Large principal reduction triggers new schedule',
    category: 'edge',
    tags: ['mods', 'payments'],
    notes: 'Validates balance-drop recalculation',
  },
  {
    id: 'DEMO-A09',
    title: 'Escalating Extras – Payoff Month 9',
    subtitle: 'Increasing over-payments clear loan in nine months',
    category: 'edge',
    tags: ['over-payments', 'early-payoff', 'payments'],
    notes: 'Showcases aggressive payoff strategy',
  },
  {
    id: 'DEMO-A10',
    title: 'Auto-Close on Tiny Residual',
    subtitle: 'Tolerance rule waives final few cents',
    category: 'edge',
    tags: ['auto-close', 'early-payoff', 'edge'],
    notes: 'Synthetic waiver row closes loan',
  },

  // ─── Regression ───────────────────────────────────────────────────────
  // Populate as you add regression-specific samples
];

import { Amortization } from 'lendpeak-engine/models/Amortization';

import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import {
  DemoC1,
  DemoC2,
  DemoC3,
  DemoC4,
  DemoC5,
  DemoC6,
  DemoC7,
  DemoC8,
  DemoC10,
  DemoA1,
} from 'lendpeak-engine/models/LendPeak/DemoLoans';

export interface BuiltDemoLoan {
  loan: Amortization;
  deposits: DepositRecords;
}

/* TEMP stub builders (replace once you have real ones) */
const notImplemented = (id: string) => () => {
  throw new Error(`Demo-loan builder for ${id} not implemented yet`);
};

/** One entry per DEMO-ID */
export const DemoLoanFactory: Record<string, () => BuiltDemoLoan> = {
  'DEMO-C01': DemoC1.ImportObject,
  'DEMO-C02': DemoC2.ImportObject,
  'DEMO-C03': DemoC3.ImportObject,
  'DEMO-C04': DemoC4.ImportObject,
  'DEMO-C05': DemoC5.ImportObject,
  'DEMO-C06': DemoC6.ImportObject,
  'DEMO-C07': DemoC7.ImportObject,
  'DEMO-C08': DemoC8.ImportObject,
  'DEMO-C09': notImplemented('DEMO-C09'),
  'DEMO-C10': DemoC10.ImportObject,

  'DEMO-A01': DemoA1.ImportObject,
  'DEMO-A02': notImplemented('DEMO-A02'),
  'DEMO-A03': notImplemented('DEMO-A03'),
  'DEMO-A04': notImplemented('DEMO-A04'),
  'DEMO-A05': notImplemented('DEMO-A05'),
  'DEMO-A06': notImplemented('DEMO-A06'),
  'DEMO-A07': notImplemented('DEMO-A07'),
  'DEMO-A08': notImplemented('DEMO-A08'),
  'DEMO-A09': notImplemented('DEMO-A09'),
  'DEMO-A10': notImplemented('DEMO-A10'),
};

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
  DemoA5,
  DemoA2,
  DemoA3,
  DemoA4,
  DemoA6,
  DemoA7,
  DemoA8,
  DemoA9,
  DemoA10,
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
  'DEMO-A02': DemoA2.ImportObject,
  'DEMO-A03': DemoA3.ImportObject,
  'DEMO-A04': DemoA4.ImportObject,
  'DEMO-A05': DemoA5.ImportObject,
  'DEMO-A06': DemoA6.ImportObject,
  'DEMO-A07': DemoA7.ImportObject,
  'DEMO-A08': DemoA8.ImportObject,
  'DEMO-A09': DemoA9.ImportObject,
  'DEMO-A10': DemoA10.ImportObject,
};

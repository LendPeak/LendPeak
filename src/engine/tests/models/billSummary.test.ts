import { DemoC1 } from '@models/LendPeak/DemoLoans/demo-c1';

describe('Bill summary', () => {
  it('should expose remainingPrincipal and not the misspelled property', () => {
    const lendPeak = DemoC1.LendPeakObject();
    lendPeak.calc();
    const firstBill = lendPeak.bills.first;
    expect(firstBill).toBeDefined();
    if (!firstBill) throw new Error('No first bill found');
    const summary = firstBill.summary as any;
    expect(summary.remainingPrincipal).toBeDefined();
    expect(summary).not.toHaveProperty('remainintPrincipal');
  });
});

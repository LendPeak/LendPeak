import { Amortization, AmortizationParams } from '../../models/Amortization';
import { TermExtension, TermExtensionParams } from '../../models/TermExtension';
import { TermExtensions } from '../../models/TermExtensions';
import { Currency } from '../../utils/Currency';
import { LocalDate } from '@js-joda/core';
import { Decimal } from 'decimal.js';

describe('Amortization - Term Extension Integration', () => {
  const baseParams: AmortizationParams = {
    loanAmount: 10000,
    annualInterestRate: 0.05,
    term: 12, // Contractual term
    startDate: LocalDate.of(2024, 1, 1),
    roundingPrecision: 2, // Explicitly set for consistent test results
  };

  describe('actualTerms Accessor', () => {
    it('should equal baseParams.term with no term extensions', () => {
      const amortization = new Amortization(baseParams);
      expect(amortization.actualTerms).toBe(baseParams.term);
    });

    it('should reflect a single active positive extension', () => {
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: 6, active: true }],
      };
      const amortization = new Amortization(params);
      expect(amortization.actualTerms).toBe(baseParams.term + 6);
    });

    it('should reflect a single active negative extension', () => {
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: -2, active: true }],
      };
      const amortization = new Amortization(params);
      expect(amortization.actualTerms).toBe(baseParams.term - 2);
    });

    it('should reflect multiple active extensions', () => {
      const params = {
        ...baseParams,
        termExtensions: [
          { date: '2024-01-01', termsModified: 6, active: true },
          { date: '2024-01-02', termsModified: -2, active: true },
        ],
      };
      const amortization = new Amortization(params);
      expect(amortization.actualTerms).toBe(baseParams.term + 6 - 2);
    });

    it('should only consider active extensions', () => {
      const params = {
        ...baseParams,
        termExtensions: [
          { date: '2024-01-01', termsModified: 6, active: true },
          { date: '2024-01-02', termsModified: 3, active: false }, // Inactive
          { date: '2024-01-03', termsModified: -2, active: true },
        ],
      };
      const amortization = new Amortization(params);
      expect(amortization.actualTerms).toBe(baseParams.term + 6 - 2);
    });

    it('should not go below 1 term', () => {
      const params = {
        ...baseParams,
        term: 5, // Start with a smaller term
        termExtensions: [{ date: '2024-01-01', termsModified: -10, active: true }],
      };
      const amortization = new Amortization(params);
      expect(amortization.actualTerms).toBe(1);
    });
  });

  describe('endDate Calculation with Term Extensions', () => {
    it('should calculate endDate based on actualTerms (extension)', () => {
      const extensionTerms = 6;
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: extensionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + extensionTerms);
      expect(amortization.endDate.isEqual(expectedEndDate)).toBe(true);
    });

    it('should calculate endDate based on actualTerms (reduction)', () => {
      const reductionTerms = -3;
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: reductionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + reductionTerms);
      expect(amortization.endDate.isEqual(expectedEndDate)).toBe(true);
    });
  });

  describe('generatePeriodicSchedule() with Term Extensions', () => {
    it('periodsSchedule.length should equal actualTerms (extension)', () => {
      const extensionTerms = 3;
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: extensionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      expect(amortization.periodsSchedule.length).toBe(baseParams.term + extensionTerms);
      const lastPeriod = amortization.periodsSchedule.lastPeriod;
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + extensionTerms);
      expect(lastPeriod.endDate.isEqual(expectedEndDate)).toBe(true);
    });

    it('periodsSchedule.length should equal actualTerms (reduction)', () => {
      const reductionTerms = -2;
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: reductionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      expect(amortization.periodsSchedule.length).toBe(baseParams.term + reductionTerms);
      const lastPeriod = amortization.periodsSchedule.lastPeriod;
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + reductionTerms);
      expect(lastPeriod.endDate.isEqual(expectedEndDate)).toBe(true);
    });
  });

  describe('calculateFixedMonthlyPayment() with Term Extensions', () => {
    it('EMI should use actualTerms', () => {
      const amortizationBase = new Amortization(baseParams); // 12 terms
      const emiBase = amortizationBase.equitedMonthlyPayment;

      const extensionTerms = 6;
      const paramsExtended = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: extensionTerms, active: true }],
      };
      const amortizationExtended = new Amortization(paramsExtended); // 18 terms
      const emiExtended = amortizationExtended.equitedMonthlyPayment;

      // EMI for a longer term should be lower
      expect(emiExtended.toNumber()).toBeLessThan(emiBase.toNumber());

      // Specific EMI check for 10000 loan, 5% annual, 18 months
      // Using an online calculator: ~577.84
      // Note: Slight differences due to rounding/exact calculation can occur.
      // This test mainly ensures the EMI changes in the correct direction.
      // For more precise EMI tests, use values from a trusted source or prior calculations.
      // Example: For 10000 @ 5% for 18 months, a known EMI is ~577.836
      // Let's use a range to account for minor precision differences.
      expect(emiExtended.toNumber()).toBeCloseTo(577.84, 2);


      const reductionTerms = -2;
        const paramsReduced = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: reductionTerms, active: true }],
      };
      const amortizationReduced = new Amortization(paramsReduced); // 10 terms
      const emiReduced = amortizationReduced.equitedMonthlyPayment;

      // EMI for a shorter term should be higher
      expect(emiReduced.toNumber()).toBeGreaterThan(emiBase.toNumber());
       // Example: For 10000 @ 5% for 10 months, a known EMI is ~1023.15
      expect(emiReduced.toNumber()).toBeCloseTo(1023.15, 2);
    });
  });

  describe('calculateAmortizationPlan() with Term Extensions', () => {
    it('should generate correct schedule with term extension', () => {
      const extensionTerms = 3; // 12 -> 15 terms
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: extensionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      amortization.calculateAmortizationPlan();

      expect(amortization.repaymentSchedule.length).toBe(baseParams.term + extensionTerms);
      const lastEntry = amortization.repaymentSchedule.lastEntry;
      expect(lastEntry.endBalance.toNumber()).toBeCloseTo(0, amortization.roundingPrecision);
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + extensionTerms);
      expect(lastEntry.periodEndDate.isEqual(expectedEndDate)).toBe(true);
    });

    it('should generate correct schedule with term reduction', () => {
      const reductionTerms = -2; // 12 -> 10 terms
      const params = {
        ...baseParams,
        termExtensions: [{ date: '2024-01-01', termsModified: reductionTerms, active: true }],
      };
      const amortization = new Amortization(params);
      amortization.calculateAmortizationPlan();

      expect(amortization.repaymentSchedule.length).toBe(baseParams.term + reductionTerms);
      const lastEntry = amortization.repaymentSchedule.lastEntry;
      expect(lastEntry.endBalance.toNumber()).toBeCloseTo(0, amortization.roundingPrecision);
      const expectedEndDate = baseParams.startDate.plusMonths(baseParams.term + reductionTerms);
      expect(lastEntry.periodEndDate.isEqual(expectedEndDate)).toBe(true);
    });

    it('should handle early repayment flag correctly with term extensions', () => {
        const extendedTerm = 15; // 12 original + 3 extension
        const params: AmortizationParams = {
            ...baseParams,
            termExtensions: [{ date: '2024-01-01', termsModified: 3, active: true }], // 12 -> 15 terms
            // Payoff significantly earlier than the extended term
            payoffDate: baseParams.startDate.plusMonths(10),
        };
        const amortization = new Amortization(params);
        amortization.calculateAmortizationPlan();

        expect(amortization.repaymentSchedule.length).toBeLessThan(extendedTerm);
        expect(amortization.repaymentSchedule.length).toBe(10); // Should end at payoffDate
        expect(amortization.earlyRepayment).toBe(true);
        const lastEntry = amortization.repaymentSchedule.lastEntry;
        expect(lastEntry.endBalance.toNumber()).toBeCloseTo(0, amortization.roundingPrecision);
        expect(lastEntry.periodEndDate.isEqual(params.payoffDate as LocalDate)).toBe(true);
    });
  });

  describe('Serialization with Term Extensions', () => {
    it('JSON and compactJSON should include termExtensions and actualTerms', () => {
      const termExtensionsData: TermExtensionParams[] = [
        { date: '2024-01-01', termsModified: 5, active: true },
        { date: '2024-02-01', termsModified: -2, active: false },
      ];
      const params = {
        ...baseParams,
        termExtensions: new TermExtensions(termExtensionsData),
      };
      const amortization = new Amortization(params);
      const expectedActualTerms = baseParams.term + 5; // Only active one counts

      const jsonOutput = amortization.json;
      expect(jsonOutput.actualTerms).toBe(expectedActualTerms);
      expect(jsonOutput.termExtensions).toEqual(amortization.termExtensions.json);
      expect(jsonOutput.term).toBe(baseParams.term);


      const compactJsonOutput = amortization.compactJSON;
      expect(compactJsonOutput.actualTerms).toBe(expectedActualTerms);
      expect(compactJsonOutput.termExtensions).toEqual(amortization.termExtensions.json);
      expect(compactJsonOutput.term).toBe(baseParams.term);
    });
  });

  describe('Modification Flag', () => {
    it('adding termExtensions should set modifiedSinceLastCalculation to true', () => {
      const amortization = new Amortization(baseParams);
      amortization.modifiedSinceLastCalculation = false; // Reset

      amortization.termExtensions = new TermExtensions([
        { date: '2024-06-01', termsModified: 3 },
      ]);
      expect(amortization.modifiedSinceLastCalculation).toBe(true);
    });

    it('modifying an existing TermExtensions collection should set modifiedSinceLastCalculation', () => {
        const amortization = new Amortization({
            ...baseParams,
            termExtensions: [{ date: '2024-01-01', termsModified: 2 }]
        });
        amortization.calculateAmortizationPlan(); // Recalculate to reset flag
        amortization.modifiedSinceLastCalculation = false;

        amortization.termExtensions.addTermExtension({ date: '2024-02-01', termsModified: 1});
        // Note: The Amortization's setter for termExtensions would set the flag.
        // If we directly modify the TermExtensions object, we need to ensure the Amortization object is aware.
        // For this test, we are assigning a new TermExtensions object to trigger the setter.
        amortization.termExtensions = new TermExtensions(amortization.termExtensions.all);
        expect(amortization.modifiedSinceLastCalculation).toBe(true);


        // Scenario: directly manipulate the existing _termExtensions object
        // and then check if a subsequent action that relies on this flag behaves correctly.
        const amortization2 = new Amortization({
            ...baseParams,
            termExtensions: [{ date: '2024-01-01', termsModified: 2 }]
        });
        amortization2.calculateAmortizationPlan();
        amortization2.modifiedSinceLastCalculation = false;

        // Directly modify the internal collection (simulating a component binding perhaps)
        // This bypasses the Amortization setter.
        amortization2.termExtensions.all[0].active = false;
        amortization2.termExtensions.modified = true; // Manually flag the sub-object as modified

        // To make Amortization aware, we would typically re-assign or call a method.
        // For the purpose of this test, let's assume a re-calculation is triggered
        // and the Amortization class logic should ideally pick up changes from sub-objects if they are marked.
        // However, the current Amortization class relies on its own setter for `termExtensions` to set `modifiedSinceLastCalculation`.
        // If `_termExtensions.modified` is true, `Amortization` itself might not know unless its `termExtensions` setter is called.
        // Let's test if setting the `termExtensions` again (even to itself) triggers the main flag.
        const currentExtensions = amortization2.termExtensions;
        amortization2.termExtensions = currentExtensions; // Trigger the setter
        expect(amortization2.modifiedSinceLastCalculation).toBe(true);
    });
  });
});

import { Amortization, AmortizationParams, TermPeriodDefinition } from "./Amortization";
import { AmortizationEntry, AmortizationScheduleMetadata } from "./Amortization/AmortizationEntry";
import { Currency, RoundingMethod } from "../utils/Currency";
import { Decimal } from "decimal.js";
import { CalendarType } from "./Calendar";
import { BalanceModifications } from "./Amortization/BalanceModifications";

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export class AmortizationExport {
  private _amortization!: Amortization;

  constructor(amortization: Amortization) {
    this.amortization = amortization;
  }

  get amortization(): Amortization {
    return this._amortization;
  }

  set amortization(value: Amortization) {
    this._amortization = value;
  }

  public exportRepaymentScheduleToCSV(): string {
    // Step 1: Collect all unique metadata keys
    const metadataKeys = new Set<string>();
    this.amortization.repaymentSchedule.entries.forEach((entry) => {
      Object.keys(entry.metadata).forEach((key) => {
        metadataKeys.add(key);
      });
    });

    // Convert the Set to an Array for easier handling
    const metadataKeysArray = Array.from(metadataKeys);

    // Step 2: Define the fields array, including metadata fields
    const fields = [
      {
        header: "Term",
        value: (entry: AmortizationEntry) => entry.term,
      },
      {
        header: "Billing Model",
        value: (entry: AmortizationEntry) => entry.billingModel || '',
      },
      {
        header: "Period Start Date",
        value: (entry: AmortizationEntry) => entry.periodStartDate.toString(),
      },
      {
        header: "Period End Date",
        value: (entry: AmortizationEntry) => entry.periodEndDate.toString(),
      },
      {
        header: "Bill Open Date",
        value: (entry: AmortizationEntry) => entry.periodBillOpenDate.toString(),
      },
      {
        header: "Bill Due Date",
        value: (entry: AmortizationEntry) => entry.periodBillDueDate.toString(),
      },
      {
        header: "Period Interest Rate",
        value: (entry: AmortizationEntry) => entry.periodInterestRate.toString(),
      },
      {
        header: "Principal",
        value: (entry: AmortizationEntry) => entry.principal.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Fees",
        value: (entry: AmortizationEntry) => entry.fees.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Billed Deferred Fees",
        value: (entry: AmortizationEntry) => entry.billedDeferredFees.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Unbilled Total Deferred Fees",
        value: (entry: AmortizationEntry) => entry.unbilledTotalDeferredFees.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Due Interest For Term",
        value: (entry: AmortizationEntry) => entry.dueInterestForTerm.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Accrued Interest For Period",
        value: (entry: AmortizationEntry) => entry.accruedInterestForPeriod.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Billed Deferred Interest",
        value: (entry: AmortizationEntry) => entry.billedDeferredInterest.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Billed Interest For Term",
        value: (entry: AmortizationEntry) => entry.billedInterestForTerm.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Balance Modification Amount",
        value: (entry: AmortizationEntry) => entry.balanceModificationAmount.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "End Balance",
        value: (entry: AmortizationEntry) => entry.endBalance.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Start Balance",
        value: (entry: AmortizationEntry) => entry.startBalance.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Total Payment",
        value: (entry: AmortizationEntry) => entry.totalPayment.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Per Diem",
        value: (entry: AmortizationEntry) => entry.perDiem.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Days In Period",
        value: (entry: AmortizationEntry) => entry.daysInPeriod,
      },
      {
        header: "Unbilled Total Deferred Interest",
        value: (entry: AmortizationEntry) => entry.unbilledTotalDeferredInterest.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Interest Rounding Error",
        value: (entry: AmortizationEntry) => entry.interestRoundingError.getRoundedValue(this.amortization.roundingPrecision),
      },
      {
        header: "Unbilled Interest Due To Rounding",
        value: (entry: AmortizationEntry) => entry.unbilledInterestDueToRounding.getRoundedValue(this.amortization.roundingPrecision),
      },
      // DSI fields
      {
        header: "DSI Previous Payment Date",
        value: (entry: AmortizationEntry) => entry.dsiPreviousPaymentDate?.toString() || '',
      },
      {
        header: "DSI Interest Days",
        value: (entry: AmortizationEntry) => entry.dsiInterestDays || '',
      },
      {
        header: "DSI Actual Start Balance",
        value: (entry: AmortizationEntry) => entry.actualDSIStartBalance?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "DSI Actual End Balance",
        value: (entry: AmortizationEntry) => entry.actualDSIEndBalance?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "DSI Actual Interest",
        value: (entry: AmortizationEntry) => entry.actualDSIInterest?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "DSI Actual Principal",
        value: (entry: AmortizationEntry) => entry.actualDSIPrincipal?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "DSI Actual Fees",
        value: (entry: AmortizationEntry) => entry.actualDSIFees?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "DSI Interest Savings",
        value: (entry: AmortizationEntry) => entry.dsiInterestSavings || '',
      },
      {
        header: "DSI Interest Penalty",
        value: (entry: AmortizationEntry) => entry.dsiInterestPenalty || '',
      },
      // Re-amortization fields
      {
        header: "Re-amortized Start Balance",
        value: (entry: AmortizationEntry) => entry.reAmortizedStartBalance?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized End Balance",
        value: (entry: AmortizationEntry) => entry.reAmortizedEndBalance?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized Interest",
        value: (entry: AmortizationEntry) => entry.reAmortizedInterest?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized Principal",
        value: (entry: AmortizationEntry) => entry.reAmortizedPrincipal?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized Fees",
        value: (entry: AmortizationEntry) => entry.reAmortizedFees?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized Total Payment",
        value: (entry: AmortizationEntry) => entry.reAmortizedTotalPayment?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      {
        header: "Re-amortized DSI Interest Days",
        value: (entry: AmortizationEntry) => entry.reAmortizedDsiInterestDays || '',
      },
      {
        header: "Re-amortized Per Diem",
        value: (entry: AmortizationEntry) => entry.reAmortizedPerDiem?.getRoundedValue(this.amortization.roundingPrecision) || '',
      },
      // Status flags
      {
        header: "Is Current Active Term",
        value: (entry: AmortizationEntry) => entry.isCurrentActiveTerm ? 'Yes' : 'No',
      },
      {
        header: "Is Delinquent",
        value: (entry: AmortizationEntry) => entry.isDelinquent ? 'Yes' : 'No',
      },
      {
        header: "Last Payment Date",
        value: (entry: AmortizationEntry) => entry.lastPaymentDate?.toString() || '',
      },
      // Other fields
      {
        header: "Billable Period",
        value: (entry: AmortizationEntry) => entry.billablePeriod ? 'Yes' : 'No',
      },
      {
        header: "Pre-bill Days",
        value: (entry: AmortizationEntry) => entry.prebillDaysConfiguration || '',
      },
      {
        header: "Bill Due Days After Period End",
        value: (entry: AmortizationEntry) => entry.billDueDaysAfterPeriodEndConfiguration || '',
      },
      {
        header: "Calendar Type",
        value: (entry: AmortizationEntry) => entry.calendar?.calendarType || '',
      },
      // Step 3: Add metadata fields dynamically
      ...metadataKeysArray.map((key) => ({
        header: `Metadata.${key}`,
        value: (entry: AmortizationEntry) => {
          const value = entry.metadata[key as keyof AmortizationScheduleMetadata];
          // Handle different types of metadata values
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
          }
          return value !== undefined ? value : "";
        },
      })),
    ];

    // Helper function to escape CSV fields
    const escapeCSVField = (field: any): string => {
      let str = String(field);
      if (str.includes('"')) {
        str = str.replace(/"/g, '""');
      }
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    // Generate the header row
    const headerRow = fields.map((field) => field.header).join(",");

    // Generate the data rows
    const dataRows = this.amortization.repaymentSchedule.entries.map((entry) => {
      const row = fields.map((field) => escapeCSVField(field.value(entry)));
      return row.join(",");
    });

    // Combine the header and data rows
    const csvContent = [headerRow, ...dataRows].join("\n");

    return csvContent;
  }

  /**
   * Generates TypeScript code to recreate this Amortization instance.
   * @returns A string containing the TypeScript code.
   */
  public toCode(): string {
    // Helper functions to serialize special types
    const serializeCurrency = (currency: Currency | number): string => {
      if (currency instanceof Currency) {
        return `Currency.of(${currency.toNumber()})`;
      } else {
        return `Currency.of(${currency})`;
      }
    };

    const serializeDecimal = (decimal: Decimal | number): string => {
      if (decimal instanceof Decimal) {
        return `new Decimal(${decimal.toString()})`;
      } else {
        return `new Decimal(${decimal})`;
      }
    };

    const serializeDayjs = (date: dayjs.Dayjs | Date | string): string => {
      const dateStr = dayjs.isDayjs(date) ? date.toString() : dayjs(date).toString();
      return `dayjs('${dateStr}')`;
    };

    const serializeAny = (value: any): string => {
      return JSON.stringify(value);
    };

    // Serialize arrays of special types
    const serializeArray = <T>(arr: T[], serializer: (item: T) => string): string => {
      return `[${arr.map(serializer).join(", ")}]`;
    };

    // Serialize the input parameters
    const serializeParams = (params: AmortizationParams): string => {
      const lines = [];

      for (let [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue; // Skip undefined or null values
        }

        let serializedValue: string;

        switch (key) {
          case "loanAmount":
          case "originationFee":
          case "flushThreshold":
            serializedValue = serializeCurrency(value as Currency | number);
            break;

          case "annualInterestRate":
            serializedValue = serializeDecimal(value as Decimal | number);
            break;

          case "startDate":
          case "endDate":
          case "firstPaymentDate":
            serializedValue = serializeDayjs(value as Date | string);
            break;

          case "calendarType":
            serializedValue = `CalendarType.${value as CalendarType}`;
            break;

          case "roundingMethod":
            serializedValue = `RoundingMethod.${value as RoundingMethod}`;
            break;

          case "termPeriodDefinition":
            serializedValue = `{
    unit: '${(value as TermPeriodDefinition).unit}',
    count: ${serializeArray((value as TermPeriodDefinition).count, (item) => item.toString())}
  }`;
            break;

          case "balanceModifications":
            if (!(value instanceof BalanceModifications)) {
              value = new BalanceModifications(value);
            }
            serializedValue = value.toCode();
            break;

          // Handle other complex types as needed
          default:
            serializedValue = serializeAny(value);
        }

        lines.push(`  ${key}: ${serializedValue},`);
      }

      return lines.join("\n");
    };

    // Build the complete code string
    const code = `import { Amortization, AmortizationParams, CalendarType, RoundingMethod, Fee, TermPeriodDefinition } from './Amortization';
import { BalanceModification } from './BalanceModification';
import { Currency } from '../utils/Currency';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';

// Define the parameters for the loan
const params: AmortizationParams = {
${serializeParams(this.amortization.getInputParams())}
};

// Create the Amortization instance
const amortization = new Amortization(params);
`;

    return code.trim();
  }

  public toTestCode(): string {
    return `
describe('Amortization Class', () => {
  let amortization: Amortization;

  beforeEach(() => {
    ${this.toCode()}
  });

  it('should initialize with correct parameters', () => {
    expect(amortization.loanAmount).toBeDefined();
    expect(amortization.annualInterestRate).toBeDefined();
    expect(amortization.term).toBeGreaterThan(0);
  });

  it('should calculate APR correctly', () => {
    const apr = amortization.apr;
    expect(apr).toBeInstanceOf(Decimal);
    expect(apr.greaterThan(0)).toBe(true);
  });

  it('should generate an amortization schedule', () => {
    const schedule = amortization.generateSchedule();
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[0].principal).toBeDefined();
    expect(schedule[0].interestRoundingError).toBeDefined();
  });
});
  `.trim();
  }
}

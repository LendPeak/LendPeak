import { CLSDataResponse, CLSHistoryEntry, CLSLPT, CLSLoan, CLSScheduleEntry } from '../../models/cls.model';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { LocalDate, LocalDateTime } from '@js-joda/core';
/**
 * A *thin* wrapper that inflates/normalises primitive SFDC data into
 * strongly-typed values ready for the LendPeak mapper.
 */
export declare class ClsLoan {
    readonly id: string;
    readonly name: string;
    readonly principal: Currency;
    readonly ratePct: number;
    readonly paymentAmount: Currency;
    readonly termPlanned: number;
    readonly prebillDays: number;
    readonly status: string;
    readonly disbursalDate: string;
    readonly applicationDate: string;
    readonly maturityDate: string;
    readonly dueDay: number;
    readonly accrualStartDate: string;
    readonly closedDate?: string;
    readonly lastInstallmentDate: string;
    constructor(raw: CLSLoan);
    /** 0.06 etc. */
    get annualRateDecimal(): number;
}
export declare class ClsScheduleLine {
    readonly raw: CLSScheduleEntry;
    /** sequential number of the instalment (-1 if we cannot parse it) */
    readonly periodSeq: number;
    /** contractually-due date (always normalised to LocalDate) */
    readonly dueDate: LocalDate;
    readonly principalDue: Currency;
    readonly interestDue: Currency;
    readonly totalInstallment: Currency;
    readonly isArchived: boolean;
    readonly isBilled: boolean;
    readonly isPaid: boolean;
    constructor(raw: CLSScheduleEntry);
}
export declare class ClsPaymentTxn {
    readonly raw: CLSLPT;
    readonly id: string;
    readonly receiptDate: LocalDateTime | null;
    readonly clearingDate: LocalDate | null;
    readonly transactionDate: LocalDate;
    readonly amount: Currency;
    readonly principal: Currency;
    readonly interest: Currency;
    readonly cleared: boolean;
    readonly active: boolean;
    readonly paymentType: string;
    constructor(raw: CLSLPT);
}
export declare class ClsHistory {
    readonly raw: CLSHistoryEntry;
    readonly when: LocalDate;
    readonly field: string;
    readonly oldVal: any;
    readonly newVal: any;
    constructor(raw: CLSHistoryEntry);
}
export interface PaymentReduction {
    fromPeriod: number;
    toPeriod: number;
    oldPayment: Currency;
    newPayment: Currency;
    temporary: boolean;
}
export declare class ClsParser {
    readonly loan: ClsLoan;
    readonly schedule: ClsScheduleLine[];
    readonly payments: ClsPaymentTxn[];
    readonly history: ClsHistory[];
    readonly rawImportData: string;
    constructor(raw: CLSDataResponse);
    /** Balloon if last installment > 110 % of average previous */
    get hasBalloon(): boolean;
    /** Detect payment-reduction episodes on the schedule table. */
    get reductions(): PaymentReduction[];
    get hasPaymentReduction(): boolean;
    get totalPrincipalPaid(): Currency;
    summary(): {
        id: string;
        name: string;
        status: string;
        hasBalloon: boolean;
        reductions: PaymentReduction[];
        totalPrincipalPaid: number;
    };
}

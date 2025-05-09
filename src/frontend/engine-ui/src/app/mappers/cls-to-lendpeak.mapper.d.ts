import { ClsParser } from '../parsers/cls/cls.parser';
import { Amortization } from 'lendpeak-engine/models/Amortization';
import { DepositRecords } from 'lendpeak-engine/models/DepositRecords';
export declare class ClsToLendPeakMapper {
    static map(parser: ClsParser): {
        loan: Amortization;
        deposits: DepositRecords;
        rawImportData: string;
    };
    /**
     * LPTs → DepositRecords
     * – keeps only cleared, non-archived, non-reversed txns
     * – builds a static allocation (principal / interest / fees)
     */
    private static mapPayments;
    private static deriveChangePaymentDates;
}

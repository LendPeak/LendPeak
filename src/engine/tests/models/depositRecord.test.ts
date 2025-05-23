import { DepositRecord } from "../../models/DepositRecord";
import { Currency } from "../../utils/Currency";
import { LocalDate } from "@js-joda/core";
import { DateUtil } from "../../utils/DateUtil";

describe('DepositRecord.toCode', () => {
  it('includes insertedDate in generated code', () => {
    const deposit = new DepositRecord({
      amount: Currency.of(100),
      currency: 'USD',
      effectiveDate: LocalDate.parse('2024-01-01'),
    });
    const code = deposit.toCode();
    expect(code).toContain('insertedDate');
    expect(code).toContain(DateUtil.normalizeDate(deposit.insertedDate).toString());
  });
});

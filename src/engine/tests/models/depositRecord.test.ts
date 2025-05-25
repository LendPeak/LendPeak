import { DepositRecord } from "../../models/DepositRecord";
import { Currency } from "../../utils/Currency";
import { LocalDate, LocalDateTime } from "@js-joda/core";
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

  it('serializes systemDate with time component', () => {
    const systemDate = LocalDateTime.parse('2024-01-02T14:15:16');
    const deposit = new DepositRecord({
      amount: Currency.of(50),
      currency: 'USD',
      effectiveDate: LocalDate.parse('2024-01-01'),
      systemDate: systemDate,
    });

    const code = deposit.toCode();
    expect(code).toContain(`DateUtil.normalizeDateTime("${systemDate.toString()}")`);
  });
});

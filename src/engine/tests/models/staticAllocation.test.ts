import { StaticAllocation } from "../../models/Bill/DepositRecord/StaticAllocation";

describe('StaticAllocation.toCode', () => {
  it('should serialize to executable code string', () => {
    const alloc = new StaticAllocation({
      principal: 100,
      interest: 50,
      fees: 25,
      prepayment: 0,
    });
    expect(alloc.toCode()).toBe('new StaticAllocation({"principal":100,"interest":50,"fees":25,"prepayment":0})');
  });
});

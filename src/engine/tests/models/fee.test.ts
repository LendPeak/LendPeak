import { Fee, FeeType, FeeBasedOn } from "../../models/Fee";
import { Currency } from "../../utils/Currency";
import Decimal from "decimal.js";

describe("Fee", () => {
  describe("constructor", () => {
    it("should create a fixed fee with amount", () => {
      const fee = new Fee({
        type: "fixed",
        amount: 100,
        description: "Processing fee"
      });

      expect(fee.type).toBe("fixed");
      expect(fee.amount?.toNumber()).toBe(100);
      expect(fee.description).toBe("Processing fee");
      expect(fee.active).toBe(true);
    });

    it("should create a percentage fee", () => {
      const fee = new Fee({
        type: "percentage",
        percentage: 5,
        basedOn: "principal",
        description: "Service fee"
      });

      expect(fee.type).toBe("percentage");
      expect(fee.percentage?.toNumber()).toBe(5);
      expect(fee.basedOn).toBe("principal");
      expect(fee.description).toBe("Service fee");
    });

    it("should create a fee with Currency amount", () => {
      const amount = new Currency(50.99);
      const fee = new Fee({
        type: "fixed",
        amount: amount
      });

      expect(fee.amount?.toNumber()).toBe(50.99);
    });

    it("should create a fee with Decimal percentage", () => {
      const percentage = new Decimal(2.5);
      const fee = new Fee({
        type: "percentage",
        percentage: percentage,
        basedOn: "interest"
      });

      expect(fee.percentage?.toNumber()).toBe(2.5);
    });

    it("should respect active flag", () => {
      const fee = new Fee({
        type: "fixed",
        amount: 100,
        active: false
      });

      expect(fee.active).toBe(false);
      expect(fee.jsActive).toBe(false);
    });
  });

  describe("type setter", () => {
    it("should accept valid fee types", () => {
      const fee = new Fee({ type: "fixed" });
      
      fee.type = "percentage";
      expect(fee.type).toBe("percentage");
      
      fee.type = "fixed";
      expect(fee.type).toBe("fixed");
    });

    it("should throw error for invalid fee type", () => {
      const fee = new Fee({ type: "fixed" });
      
      expect(() => {
        (fee as any).type = "invalid";
      }).toThrow("Fee type must be either 'fixed' or 'percentage'");
    });
  });

  describe("amount setter", () => {
    it("should set amount for fixed fee", () => {
      const fee = new Fee({ type: "fixed" });
      
      fee.amount = 250;
      expect(fee.amount?.toNumber()).toBe(250);
      expect(fee.jsAmount).toBe(250);
    });

    it("should accept Currency object", () => {
      const fee = new Fee({ type: "fixed" });
      const currency = new Currency(123.45);
      
      fee.amount = currency;
      expect(fee.amount?.toNumber()).toBe(123.45);
    });

    it("should accept Decimal object", () => {
      const fee = new Fee({ type: "fixed" });
      const decimal = new Decimal(999.99);
      
      fee.amount = decimal;
      expect(fee.amount?.toNumber()).toBe(999.99);
    });

    it("should allow undefined amount", () => {
      const fee = new Fee({ type: "fixed", amount: 100 });
      
      fee.amount = undefined;
      expect(fee.amount).toBeUndefined();
      expect(fee.jsAmount).toBeUndefined();
    });

    it("should throw error when setting amount on percentage fee", () => {
      const fee = new Fee({ type: "percentage" });
      
      expect(() => {
        fee.amount = 100;
      }).toThrow("Cannot set amount for a percentage-based fee");
    });
  });

  describe("percentage setter", () => {
    it("should set percentage for percentage fee", () => {
      const fee = new Fee({ type: "percentage" });
      
      fee.percentage = 3.5;
      expect(fee.percentage?.toNumber()).toBe(3.5);
      expect(fee.jsPercentage).toBe(3.5);
    });

    it("should accept Decimal object", () => {
      const fee = new Fee({ type: "percentage" });
      const decimal = new Decimal(7.25);
      
      fee.percentage = decimal;
      expect(fee.percentage?.toNumber()).toBe(7.25);
    });

    it("should allow undefined percentage", () => {
      const fee = new Fee({ type: "percentage", percentage: 5 });
      
      fee.percentage = undefined;
      expect(fee.percentage).toBeUndefined();
      expect(fee.jsPercentage).toBeUndefined();
    });

    it("should throw error when setting percentage on fixed fee", () => {
      const fee = new Fee({ type: "fixed" });
      
      expect(() => {
        fee.percentage = 5;
      }).toThrow("Cannot set percentage for a fixed amount fee");
    });
  });

  describe("basedOn setter", () => {
    it("should accept valid basedOn values", () => {
      const fee = new Fee({ type: "percentage" });
      
      fee.basedOn = "interest";
      expect(fee.basedOn).toBe("interest");
      
      fee.basedOn = "principal";
      expect(fee.basedOn).toBe("principal");
      
      fee.basedOn = "totalPayment";
      expect(fee.basedOn).toBe("totalPayment");
    });

    it("should allow undefined basedOn", () => {
      const fee = new Fee({ type: "percentage", basedOn: "principal" });
      
      fee.basedOn = undefined;
      expect(fee.basedOn).toBeUndefined();
    });

    it("should throw error for invalid basedOn value", () => {
      const fee = new Fee({ type: "percentage" });
      
      expect(() => {
        (fee as any).basedOn = "invalid";
      }).toThrow("Fee basedOn must be either 'interest', 'principal', or 'totalPayment'");
    });

    it("should handle undefined in constructor", () => {
      const fee = new Fee({ 
        type: "percentage",
        percentage: 5
        // basedOn is not specified, should be undefined
      });
      
      expect(fee.basedOn).toBeUndefined();
    });

    it("should allow setting basedOn to undefined after initialization", () => {
      const fee = new Fee({ 
        type: "percentage",
        basedOn: "principal"
      });
      
      // This should work without throwing
      expect(() => {
        fee.basedOn = undefined;
      }).not.toThrow();
      
      expect(fee.basedOn).toBeUndefined();
    });
  });

  describe("updateModelValues", () => {
    it("should update amount from jsAmount", () => {
      const fee = new Fee({ type: "fixed" });
      fee.jsAmount = 500;
      
      fee.updateModelValues();
      
      expect(fee.amount?.toNumber()).toBe(500);
    });

    it("should clear amount when jsAmount is undefined", () => {
      const fee = new Fee({ type: "fixed", amount: 100 });
      fee.jsAmount = undefined;
      
      fee.updateModelValues();
      
      expect(fee.amount).toBeUndefined();
    });

    it("should update percentage from jsPercentage", () => {
      const fee = new Fee({ type: "percentage" });
      fee.jsPercentage = 8.5;
      
      fee.updateModelValues();
      
      expect(fee.percentage?.toNumber()).toBe(8.5);
    });

    it("should clear percentage when jsPercentage is falsy", () => {
      const fee = new Fee({ type: "percentage", percentage: 5 });
      fee.jsPercentage = 0;
      
      fee.updateModelValues();
      
      expect(fee.percentage).toBeUndefined();
    });

    it("should update active from jsActive", () => {
      const fee = new Fee({ type: "fixed" });
      fee.jsActive = false;
      
      fee.updateModelValues();
      
      expect(fee.active).toBe(false);
    });
  });

  describe("updateJsValues", () => {
    it("should sync all values to js properties", () => {
      const fee = new Fee({
        type: "fixed",
        amount: 150,
        active: false
      });
      
      fee.amount = 200;
      fee.active = true;
      
      fee.updateJsValues();
      
      expect(fee.jsAmount).toBe(200);
      expect(fee.jsActive).toBe(true);
    });

    it("should handle undefined values", () => {
      const fee = new Fee({ type: "percentage" });
      
      fee.updateJsValues();
      
      expect(fee.jsAmount).toBeUndefined();
      expect(fee.jsPercentage).toBeUndefined();
    });
  });

  describe("json getter", () => {
    it("should return complete json for fixed fee", () => {
      const fee = new Fee({
        type: "fixed",
        amount: 99.99,
        description: "Test fee",
        metadata: { code: "TEST" },
        active: true
      });
      
      const json = fee.json;
      
      expect(json).toEqual({
        type: "fixed",
        amount: 99.99,
        percentage: undefined,
        basedOn: undefined,
        description: "Test fee",
        metadata: { code: "TEST" },
        active: true
      });
    });

    it("should return complete json for percentage fee", () => {
      const fee = new Fee({
        type: "percentage",
        percentage: 2.75,
        basedOn: "totalPayment",
        description: "Service charge"
      });
      
      const json = fee.json;
      
      expect(json).toEqual({
        type: "percentage",
        amount: undefined,
        percentage: 2.75,
        basedOn: "totalPayment",
        description: "Service charge",
        metadata: undefined,
        active: true
      });
    });
  });

  describe("id generation", () => {
    it("should generate unique ids for each fee", () => {
      const fee1 = new Fee({ type: "fixed" });
      const fee2 = new Fee({ type: "fixed" });
      
      expect(fee1.id).toBeDefined();
      expect(fee2.id).toBeDefined();
      expect(fee1.id).not.toBe(fee2.id);
    });
  });
});
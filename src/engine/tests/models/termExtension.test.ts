import { LocalDate } from '@js-joda/core';
import { TermExtension, TermExtensionParams } from '@models/TermExtension';
import { TermExtensions } from '@models/TermExtensions';

describe('TermExtension', () => {
  it('should create a term extension with all fields', () => {
    const params: TermExtensionParams = {
      quantity: 3,
      date: LocalDate.parse('2024-05-01'),
      description: 'Hardship extension',
      active: true,
      id: 'abc123',
      emiRecalculationMode: 'fromTerm',
      emiRecalculationTerm: 10,
    };
    const ext = new TermExtension(params);
    expect(ext.quantity).toBe(3);
    expect(ext.date.toString()).toBe('2024-05-01');
    expect(ext.description).toBe('Hardship extension');
    expect(ext.active).toBe(true);
    expect(ext.id).toBe('abc123');
    expect(ext.emiRecalculationMode).toBe('fromTerm');
    expect(ext.emiRecalculationTerm).toBe(10);
    expect(ext.json.quantity).toBe(params.quantity);
    expect(ext.json.date).toBe(params.date.toString());
    expect(ext.json.description).toBe(params.description);
    expect(ext.json.active).toBe(params.active);
    expect(ext.json.id).toBe(params.id);
    expect(ext.json.emiRecalculationMode).toBe('fromTerm');
    expect(ext.json.emiRecalculationTerm).toBe(10);
  });

  it('should update fields and sync JS values', () => {
    const ext = new TermExtension({ quantity: 1, date: '2024-01-01' });
    ext.quantity = 2;
    ext.date = LocalDate.parse('2024-02-01');
    ext.description = 'Test';
    ext.active = false;
    ext.id = 'id1';
    ext.emiRecalculationMode = 'fromStart';
    ext.emiRecalculationTerm = 5;
    ext.updateJsValues();
    expect(ext.jsQuantity).toBe(2);
    expect(ext.jsDate).toBeInstanceOf(Date);
    expect(ext.jsDescription).toBe('Test');
    expect(ext.jsActive).toBe(false);
    expect(ext.jsId).toBe('id1');
    expect(ext.jsEmiRecalculationMode).toBe('fromStart');
    expect(ext.jsEmiRecalculationTerm).toBe(5);
  });

  it('should normalize jsDate to be timezone-agnostic', () => {
    const dateWithTz = new Date('2024-03-01T10:00:00-05:00');
    const ext = new TermExtension({ quantity: 1, date: dateWithTz });
    // The date should be normalized to noon local time to avoid timezone issues
    expect(ext.jsDate.getFullYear()).toBe(2024);
    expect(ext.jsDate.getMonth()).toBe(2); // March (0-based)
    expect(ext.jsDate.getDate()).toBe(1);
    expect(ext.jsDate.getHours()).toBe(12); // Noon to avoid DST issues
    
    ext.date = '2024-04-15';
    expect(ext.jsDate.getFullYear()).toBe(2024);
    expect(ext.jsDate.getMonth()).toBe(3); // April (0-based)
    expect(ext.jsDate.getDate()).toBe(15);
    expect(ext.jsDate.getHours()).toBe(12); // Noon to avoid DST issues
  });
});

describe('TermExtensions', () => {
  it('should add, remove, and activate/deactivate extensions', () => {
    const ext1 = new TermExtension({ quantity: 1, date: '2024-01-01' });
    const ext2 = new TermExtension({ quantity: 2, date: '2024-02-01', active: false });
    const exts = new TermExtensions([ext1, ext2]);
    expect(exts.length).toBe(2);
    expect(exts.active.length).toBe(1);
    exts.deactivateAll();
    expect(exts.active.length).toBe(0);
    exts.activateAll();
    expect(exts.active.length).toBe(2);
    exts.removeExtensionAtIndex(0);
    expect(exts.length).toBe(1);
    exts.removeAll();
    expect(exts.length).toBe(0);
  });

  it('should calculate total active extension quantity', () => {
    const exts = new TermExtensions([
      { quantity: 2, date: '2024-01-01', active: true },
      { quantity: 3, date: '2024-02-01', active: false },
      { quantity: 4, date: '2024-03-01', active: true },
    ]);
    expect(exts.getTotalActiveExtensionQuantity()).toBe(6);
  });

  it('should serialize and deserialize correctly', () => {
    const exts = new TermExtensions([
      { quantity: 2, date: '2024-01-01', description: 'A', active: true, id: 'a', emiRecalculationMode: 'none' },
    ]);
    const json = exts.json;
    expect(json[0].quantity).toBe(2);
    expect(json[0].description).toBe('A');
    expect(json[0].active).toBe(true);
    expect(json[0].id).toBe('a');
    expect(json[0].emiRecalculationMode).toBe('none');
    // Re-create from JSON
    const exts2 = new TermExtensions(json);
    expect(exts2.length).toBe(1);
    expect(exts2.atIndex(0).quantity).toBe(2);
    expect(exts2.atIndex(0).emiRecalculationMode).toBe('none');
  });
});

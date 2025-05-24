import { TermExtension, TermExtensionParams } from '../../models/TermExtension';
import { TermExtensions } from '../../models/TermExtensions';
import { LocalDate } from '@js-joda/core';
import { DateUtil } from '../../utils/DateUtil';

describe('TermExtension', () => {
  describe('Constructor', () => {
    it('should create an instance with all params', () => {
      const params: TermExtensionParams = {
        date: LocalDate.of(2024, 1, 15),
        termsModified: 5,
        active: false,
      };
      const extension = new TermExtension(params);
      expect(extension).toBeInstanceOf(TermExtension);
      expect(extension.date.isEqual(LocalDate.of(2024, 1, 15))).toBe(true);
      expect(extension.jsTermsModified).toBe(5);
      expect(extension.active).toBe(false);
    });

    it('should default active to true if not provided', () => {
      const params: TermExtensionParams = {
        date: '2024-02-20',
        termsModified: -2,
      };
      const extension = new TermExtension(params);
      expect(extension.active).toBe(true);
    });

    it('should normalize date string to LocalDate', () => {
      const params: TermExtensionParams = {
        date: '2024-03-10',
        termsModified: 3,
      };
      const extension = new TermExtension(params);
      expect(extension.date).toBeInstanceOf(LocalDate);
      expect(extension.date.isEqual(LocalDate.of(2024, 3, 10))).toBe(true);
    });

    it('should normalize JS Date to LocalDate', () => {
        const jsDate = new Date(2025, 0, 20); // Month is 0-indexed
        const params: TermExtensionParams = {
          date: jsDate,
          termsModified: 1,
        };
        const extension = new TermExtension(params);
        expect(extension.date).toBeInstanceOf(LocalDate);
        expect(extension.date.isEqual(LocalDate.of(2025, 1, 20))).toBe(true);
      });

    it('should store termsModified correctly', () => {
      const params: TermExtensionParams = {
        date: LocalDate.now(),
        termsModified: 10,
      };
      const extension = new TermExtension(params);
      expect(extension.jsTermsModified).toBe(10);
    });
  });

  describe('Getters and Setters', () => {
    let extension: TermExtension;
    beforeEach(() => {
      extension = new TermExtension({
        date: '2024-01-01',
        termsModified: 6,
      });
    });

    it('should get and set active', () => {
      expect(extension.active).toBe(true);
      extension.active = false;
      expect(extension.active).toBe(false);
      expect(extension.jsActive).toBe(false);
    });

    it('should get date', () => {
      expect(extension.date.isEqual(LocalDate.of(2024, 1, 1))).toBe(true);
    });

    // termsModified is accessed via jsTermsModified in the class, let's test that
    it('should get termsModified via jsTermsModified', () => {
      expect(extension.jsTermsModified).toBe(6);
    });
  });

  describe('updateJsValues', () => {
    it('should update jsDate, jsTermsModified, and jsActive', () => {
      const extension = new TermExtension({
        date: '2023-05-05',
        termsModified: 3,
        active: true,
      });
      // Simulate model changes
      (extension as any)._date = LocalDate.of(2023, 6, 6);
      (extension as any)._termsModified = 4;
      (extension as any)._active = false;

      extension.updateJsValues();

      expect(extension.jsDate.getTime()).toBe(DateUtil.normalizeDateToJsDate(LocalDate.of(2023, 6, 6)).getTime());
      expect(extension.jsTermsModified).toBe(4);
      expect(extension.jsActive).toBe(false);
    });
  });

  describe('updateModelValues', () => {
    it('should update model properties from JS properties', () => {
      const extension = new TermExtension({
        date: '2023-07-07',
        termsModified: 1,
        active: true,
      });

      extension.jsDate = new Date(2023, 7, 8); // Aug 8, 2023
      extension.jsTermsModified = 2;
      extension.jsActive = false;

      extension.updateModelValues();

      expect(extension.date.isEqual(LocalDate.of(2023, 8, 8))).toBe(true);
      expect((extension as any)._termsModified).toBe(2);
      expect(extension.active).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should return correct JSON structure for json getter', () => {
      const date = LocalDate.of(2024, 4, 1);
      const extension = new TermExtension({
        date: date,
        termsModified: -1,
        active: false,
      });
      const json = extension.json;
      expect(json).toEqual({
        date: '2024-04-01',
        termsModified: -1,
        active: false,
      });
    });

    it('should return correct JSON structure for toJSON method', () => {
      const date = LocalDate.of(2024, 5, 15);
      const extension = new TermExtension({
        date: date,
        termsModified: 12,
        active: true,
      });
      const json = extension.toJSON();
      expect(json).toEqual({
        date: '2024-05-15',
        termsModified: 12,
        active: true,
      });
    });
  });
});

describe('TermExtensions', () => {
  describe('Constructor', () => {
    it('should create an instance with an empty array', () => {
      const extensions = new TermExtensions();
      expect(extensions).toBeInstanceOf(TermExtensions);
      expect(extensions.all.length).toBe(0);
    });

    it('should create an instance with TermExtensionParams[]', () => {
      const paramsArray: TermExtensionParams[] = [
        { date: '2024-01-01', termsModified: 2 },
        { date: '2024-02-01', termsModified: -1, active: false },
      ];
      const extensions = new TermExtensions(paramsArray);
      expect(extensions.all.length).toBe(2);
      expect(extensions.all[0]).toBeInstanceOf(TermExtension);
      expect(extensions.all[1].active).toBe(false);
    });

    it('should create an instance with TermExtension[]', () => {
      const termExt1 = new TermExtension({ date: '2023-01-01', termsModified: 1 });
      const termExt2 = new TermExtension({ date: '2023-02-01', termsModified: 2 });
      const extensions = new TermExtensions([termExt1, termExt2]);
      expect(extensions.all.length).toBe(2);
      expect(extensions.all[0]).toBe(termExt1);
    });
  });

  describe('Modification Methods', () => {
    let extensions: TermExtensions;
    beforeEach(() => {
      extensions = new TermExtensions();
    });

    it('addTermExtension should add a TermExtension instance', () => {
      const ext = new TermExtension({ date: '2024-01-01', termsModified: 3 });
      extensions.addTermExtension(ext);
      expect(extensions.length).toBe(1);
      expect(extensions.all[0]).toBe(ext);
      expect(extensions.modified).toBe(true);
    });

    it('addTermExtension should add TermExtensionParams', () => {
      extensions.addTermExtension({ date: '2024-02-01', termsModified: -2 });
      expect(extensions.length).toBe(1);
      expect(extensions.all[0]).toBeInstanceOf(TermExtension);
      expect(extensions.all[0].jsTermsModified).toBe(-2);
      expect(extensions.modified).toBe(true);
    });

    it('removeTermExtension should remove an extension', () => {
      const ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1 });
      const ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2 });
      extensions.addTermExtension(ext1);
      extensions.addTermExtension(ext2);
      extensions.modified = false; // Reset modified
      extensions.removeTermExtension(ext1);
      expect(extensions.length).toBe(1);
      expect(extensions.all[0]).toBe(ext2);
      expect(extensions.modified).toBe(true);
    });

    it('removeConfigurationAtIndex should remove an extension at index', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1 });
      extensions.addTermExtension({ date: '2024-02-01', termsModified: 2 });
      extensions.modified = false;
      extensions.removeConfigurationAtIndex(0);
      expect(extensions.length).toBe(1);
      expect(extensions.all[0].date.isEqual(LocalDate.of(2024,2,1))).toBe(true);
      expect(extensions.modified).toBe(true);
    });

     it('removeConfigurationAtIndex should do nothing for invalid index', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1 });
      extensions.modified = false;
      extensions.removeConfigurationAtIndex(1); // Index out of bounds
      expect(extensions.length).toBe(1);
      expect(extensions.modified).toBe(false);
      extensions.removeConfigurationAtIndex(-1); // Negative index
      expect(extensions.length).toBe(1);
      expect(extensions.modified).toBe(false);
    });
  });

  describe('Getters', () => {
    it('all getter should return all extensions', () => {
      const ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1 });
      const ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2 });
      const extensions = new TermExtensions([ext1, ext2]);
      expect(extensions.all.length).toBe(2);
    });

    it('active getter should return only active extensions', () => {
      const ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1, active: true });
      const ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2, active: false });
      const ext3 = new TermExtension({ date: '2024-03-01', termsModified: 3, active: true });
      const extensions = new TermExtensions([ext1, ext2, ext3]);
      const activeExtensions = extensions.active;
      expect(activeExtensions.length).toBe(2);
      expect(activeExtensions.find(e => e === ext2)).toBeUndefined();
    });
  });

  describe('Activation Methods', () => {
    let extensions: TermExtensions;
    let ext1: TermExtension, ext2: TermExtension;

    beforeEach(() => {
      ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1, active: false });
      ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2, active: false });
      extensions = new TermExtensions([ext1, ext2]);
      extensions.modified = false;
    });

    it('activateAll should activate all extensions', () => {
      extensions.activateAll();
      expect(ext1.active).toBe(true);
      expect(ext2.active).toBe(true);
      expect(extensions.modified).toBe(true);
    });

    it('deactivateAll should deactivate all extensions', () => {
      ext1.active = true;
      ext2.active = true;
      extensions.modified = false;
      extensions.deactivateAll();
      expect(ext1.active).toBe(false);
      expect(ext2.active).toBe(false);
      expect(extensions.modified).toBe(true);
    });
  });

  describe('reSort', () => {
    it('should sort extensions by date', () => {
      const ext1 = new TermExtension({ date: '2024-03-01', termsModified: 1 });
      const ext2 = new TermExtension({ date: '2024-01-15', termsModified: 2 });
      const ext3 = new TermExtension({ date: '2024-02-01', termsModified: 3 });
      const extensions = new TermExtensions([ext1, ext2, ext3]);
      extensions.reSort();
      expect(extensions.all[0].date.isEqual(LocalDate.of(2024,1,15))).toBe(true);
      expect(extensions.all[1].date.isEqual(LocalDate.of(2024,2,1))).toBe(true);
      expect(extensions.all[2].date.isEqual(LocalDate.of(2024,3,1))).toBe(true);
    });
  });

  describe('JSON Serialization', () => {
    it('should return correct JSON for json getter and toJSON', () => {
      const paramsArray: TermExtensionParams[] = [
        { date: '2024-01-01', termsModified: 2 },
        { date: '2024-02-01', termsModified: -1, active: false },
      ];
      const extensions = new TermExtensions(paramsArray);
      const expectedJson = [
        { date: '2024-01-01', termsModified: 2, active: true },
        { date: '2024-02-01', termsModified: -1, active: false },
      ];
      expect(extensions.json).toEqual(expectedJson);
      expect(extensions.toJSON()).toEqual(expectedJson);
    });
  });

  describe('Modified Flag', () => {
    let extensions: TermExtensions;
    beforeEach(() => {
      extensions = new TermExtensions();
    });

    it('should be false initially', () => {
      expect(extensions.modified).toBe(false);
    });

    it('should be true after addTermExtension', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1 });
      expect(extensions.modified).toBe(true);
    });

    it('should be true after removeTermExtension', () => {
      const ext = new TermExtension({ date: '2024-01-01', termsModified: 1 });
      extensions.addTermExtension(ext);
      extensions.modified = false;
      extensions.removeTermExtension(ext);
      expect(extensions.modified).toBe(true);
    });

    it('should be true after removeConfigurationAtIndex', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1 });
      extensions.modified = false;
      extensions.removeConfigurationAtIndex(0);
      expect(extensions.modified).toBe(true);
    });

    it('should be true after activateAll', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1, active: false });
      extensions.modified = false;
      extensions.activateAll();
      expect(extensions.modified).toBe(true);
    });

    it('should be true after deactivateAll', () => {
      extensions.addTermExtension({ date: '2024-01-01', termsModified: 1, active: true });
      extensions.modified = false;
      extensions.deactivateAll();
      expect(extensions.modified).toBe(true);
    });

    it('can be set manually', () => {
      extensions.modified = true;
      expect(extensions.modified).toBe(true);
      extensions.modified = false;
      expect(extensions.modified).toBe(false);
    });
  });

  describe('updateJsValues and updateModelValues', () => {
    it('should call updateJsValues on all child extensions', () => {
      const ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1 });
      const ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2 });
      const spy1 = jest.spyOn(ext1, 'updateJsValues');
      const spy2 = jest.spyOn(ext2, 'updateJsValues');
      const extensions = new TermExtensions([ext1, ext2]);
      extensions.updateJsValues();
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      spy1.mockRestore();
      spy2.mockRestore();
    });

    it('should call updateModelValues on all child extensions', () => {
      const ext1 = new TermExtension({ date: '2024-01-01', termsModified: 1 });
      const ext2 = new TermExtension({ date: '2024-02-01', termsModified: 2 });
      const spy1 = jest.spyOn(ext1, 'updateModelValues');
      const spy2 = jest.spyOn(ext2, 'updateModelValues');
      const extensions = new TermExtensions([ext1, ext2]);
      extensions.updateModelValues();
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      spy1.mockRestore();
      spy2.mockRestore();
    });
  });
});

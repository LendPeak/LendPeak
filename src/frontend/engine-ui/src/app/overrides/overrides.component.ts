// overrides.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import dayjs from 'dayjs';
import { AmortizationEntry } from 'lendpeak-engine/models/Amortization/AmortizationEntry';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';
import { Amortization } from 'lendpeak-engine/models/Amortization';
import { TermInterestAmountOverride } from 'lendpeak-engine/models/TermInterestAmountOverride';
import { TermInterestRateOverride } from 'lendpeak-engine/models/TermInterestRateOverride';
import { OverrideSettingsService } from '../services/override-settings.service';
import { OverrideSettings } from '../models/override-settings.model';
import { v4 as uuidv4 } from 'uuid';
import { Popover } from 'primeng/popover';
import { Dayjs } from 'dayjs';
import { ChangePaymentDate } from 'lendpeak-engine/models/ChangePaymentDate';
import { ChangePaymentDates } from 'lendpeak-engine/models/ChangePaymentDates';
import { FeesPerTerm } from 'lendpeak-engine/models/FeesPerTerm';
import { TermFees, FlatTermFees } from 'lendpeak-engine/models/TermFees';
import { Fee } from 'lendpeak-engine/models/Fee';
import { Fees } from 'lendpeak-engine/models/Fees';
import { RateSchedule } from 'lendpeak-engine/models/RateSchedule';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { BalanceModifications } from 'lendpeak-engine/models/Amortization/BalanceModifications';
import { TermPaymentAmount } from 'lendpeak-engine/models/TermPaymentAmount';
import { PreBillDaysConfiguration } from 'lendpeak-engine/models/PreBillDaysConfiguration';
import { PreBillDaysConfigurations } from 'lendpeak-engine/models/PreBillDaysConfigurations';
import { BillDueDaysConfiguration } from 'lendpeak-engine/models/BillDueDaysConfiguration';
import { BillDueDaysConfigurations } from 'lendpeak-engine/models/BillDueDaysConfigurations';
import { TermPaymentAmounts } from 'lendpeak-engine/models/TermPaymentAmounts';
import { TermExtensions } from 'lendpeak-engine/models/TermExtensions'; // Added import
import { RateSchedules } from 'lendpeak-engine/models/RateSchedules';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { TermInterestAmountOverrides } from 'lendpeak-engine/models/TermInterestAmountOverrides';
import { TermCalendar } from 'lendpeak-engine/models/TermCalendar';
import { Calendar, CalendarType } from 'lendpeak-engine/models/Calendar';
import {
  DropDownOptionNumber,
  DropDownOptionString,
} from '../models/common.model';
import { LocalDate, ZoneId } from '@js-joda/core';
@Component({
  selector: 'app-overrides',
  templateUrl: './overrides.component.html',
  styleUrls: ['./overrides.component.css'],
  standalone: false,
})
export class OverridesComponent implements OnInit {
  @Input({ required: true }) lendPeak?: LendPeak;
  @Input() termOptions: { label: string; value: number }[] = [];
  @Input() balanceIncreaseType: { label: string; value: string }[] = [];

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();
  openPanels: string[] = [];
  savedSettings: OverrideSettings[] = [];
  selectedSettingId: string | null = null;
  isModified: boolean = false;
  currentSettingVersion: number | null = null;

  showSaveSettingsDialog: boolean = false;
  showLoadSettingsDialog: boolean = false;
  showPreviewSettingsDialog: boolean = false;

  // For saving settings
  newSetting: OverrideSettings = {
    id: '',
    name: '',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: false,
    settings: {},
  };

  loadedSettingName: string = '';
  originalSettings: any = {};

  selectedSetting: OverrideSettings | null = null;

  calendarTypes: DropDownOptionNumber[] = [
    { label: 'Actual/Actual', value: CalendarType.ACTUAL_ACTUAL },
    { label: 'Actual/360', value: CalendarType.ACTUAL_360 },
    { label: 'Actual/365', value: CalendarType.ACTUAL_365 },
    { label: 'Actual/365 (No-Leap)', value: CalendarType.ACTUAL_365_NL },
    { label: '30/360 (European)', value: CalendarType.THIRTY_360 },
    { label: '30/Actual', value: CalendarType.THIRTY_ACTUAL },
    { label: '30/360 (U.S.)', value: CalendarType.THIRTY_360_US },
  ];

  constructor(private overrideSettingsService: OverrideSettingsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // This will fire whenever an @Input changes.
    // If 'loan' has changed, you can re-run your initialization logic or
    // re-apply defaults etc.
    //this.balanceModifications = this.lendPeak.amortization.balanceModifications;
    // this.refreshOpenTabs();
  }

  ngOnInit() {
    this.loadSavedSettings();

    // Check for default settings
    const defaultSetting = this.overrideSettingsService.getDefaultSetting();
    if (defaultSetting) {
      this.applySettings(defaultSetting);
      this.selectedSettingId = defaultSetting.id;
      this.loadedSettingName = defaultSetting.name;
      this.currentSettingVersion = defaultSetting.version;
      this.originalSettings = JSON.parse(
        JSON.stringify(defaultSetting.settings),
      );
    } else {
      // Store the current settings as original
      this.originalSettings = JSON.parse(
        JSON.stringify(this.getCurrentSettings()),
      );
    }

    //this.refreshOpenTabs();
  }

  onAmortizationModified() {
    this.isModified = true;
    this.emitLoanChange();
  }

  /* deep snapshots keyed by term number */
  private cpdSnapshots: Record<number, any> = {};

  /* master toggle helper */
  get cpdMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.changePaymentDates.all.every(
      (c) => c.active,
    );
  }
  set cpdMasterActive(val: boolean) {
    this.toggleAllChangePaymentDates({ checked: val });
  }

  /* ✏️ Edit */
  onCpdEditInit(row: ChangePaymentDate) {
    this.cpdSnapshots[row.termNumber] = row.json; // deep clone
  }

  /* ✔ Save */
  onCpdEditSave(row: ChangePaymentDate) {
    delete this.cpdSnapshots[row.termNumber];
    this.lendPeak!.amortization.changePaymentDates.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖ Cancel */
  onCpdEditCancel(row: ChangePaymentDate, ri: number) {
    const saved = this.cpdSnapshots[row.termNumber];
    if (!saved) return;

    const restored = new ChangePaymentDate(saved);
    Object.assign(row, restored); // rollback
    delete this.cpdSnapshots[row.termNumber];
  }

  /* deep snapshots keyed by term number */
  private dbdSnapshots: Record<number, any> = {};

  /* master toggle for Due-Bill table */
  get dbdMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.dueBillDays.allCustom.every(
      (c) => c.active,
    );
  }
  set dbdMasterActive(val: boolean) {
    this.toggleAllDueBillDays({ checked: val });
  }

  /* ✏️ Edit */
  onDbdEditInit(row: BillDueDaysConfiguration) {
    this.dbdSnapshots[row.termNumber] = row.json; // deep clone
  }

  /* ✔ Save */
  onDbdEditSave(row: BillDueDaysConfiguration) {
    delete this.dbdSnapshots[row.termNumber];
    this.lendPeak!.amortization.dueBillDays.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖ Cancel */
  onDbdEditCancel(row: BillDueDaysConfiguration, ri: number) {
    const saved = this.dbdSnapshots[row.termNumber];
    if (!saved) return;

    const restored = new BillDueDaysConfiguration(saved);
    Object.assign(row, restored); // rollback
    delete this.dbdSnapshots[row.termNumber];
  }

  /* deep snapshots keyed by term number */
  private pbdSnapshots: Record<number, any> = {};

  /* master-toggle helper */
  get pbdMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.preBillDays.allCustom.every(
      (c) => c.active,
    );
  }
  set pbdMasterActive(val: boolean) {
    this.toggleAllPreBillDays({ checked: val });
  }

  /* ✏️ Edit */
  onPbdEditInit(row: PreBillDaysConfiguration) {
    this.pbdSnapshots[row.termNumber] = row.json; // deep clone via .json
  }

  /* ✔ Save */
  onPbdEditSave(row: PreBillDaysConfiguration) {
    delete this.pbdSnapshots[row.termNumber];
    this.lendPeak!.amortization.preBillDays.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖ Cancel */
  onPbdEditCancel(row: PreBillDaysConfiguration, ri: number) {
    const saved = this.pbdSnapshots[row.termNumber];
    if (!saved) return;

    const restored = new PreBillDaysConfiguration(saved);
    Object.assign(row, restored); // rollback
    delete this.pbdSnapshots[row.termNumber];
  }

  /* deep snapshots keyed by term # */
  private tpaSnapshots: Record<number, any> = {};
  private ffaSnapshots: Record<string, any> = {};
  private fptSnapshots: Record<string, any> = {};

  /* master-toggle helper */
  get tpaMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.termPaymentAmountOverride.all.every(
      (p) => p.active,
    );
  }
  set tpaMasterActive(val: boolean) {
    /* re-use your existing bulk-toggle method */
    this.toggleAllTermPaymentAmountOverrides({ checked: val });
  }

  get ffaMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.feesForAllTerms.all.every((f) => f.active);
  }
  set ffaMasterActive(val: boolean) {
    this.toggleAllFeesForAllTerms({ checked: val });
  }

  get fptMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.feesPerTerm.all.every((tf) =>
      tf.fees.every((f) => f.active),
    );
  }
  set fptMasterActive(val: boolean) {
    this.toggleAllFeesPerTerm({ checked: val });
  }

  /* ─── Fees For All Terms row editing ────────── */
  onFfaEditInit(row: Fee) {
    this.ffaSnapshots[row.id] = row.json;
  }

  onFfaEditSave(row: Fee) {
    delete this.ffaSnapshots[row.id];
    this.lendPeak?.amortization.feesForAllTerms.updateModelValues();
    this.isModified = true;
    this.emitLoanChange();
  }

  onFfaEditCancel(row: Fee, ri: number) {
    const saved = this.ffaSnapshots[row.id];
    if (!saved) return;
    Object.assign(row, new Fee(saved));
    delete this.ffaSnapshots[row.id];
  }

  /* ─── Fees Per Term row editing ─────────────── */
  onFptEditInit(row: FlatTermFees) {
    this.fptSnapshots[row.fee.id] = {
      termNumber: row.termNumber,
      fee: row.fee.json,
    };
  }

  onFptEditSave(row: FlatTermFees) {
    const saved = this.fptSnapshots[row.fee.id];
    delete this.fptSnapshots[row.fee.id];

    if (saved && saved.termNumber !== row.termNumber && this.lendPeak) {
      const fpt = this.lendPeak.amortization.feesPerTerm;
      const oldTf = fpt.termFees.find((tf) => tf.termNumber === saved.termNumber);
      const newTf = fpt.termFees.find((tf) => tf.termNumber === row.termNumber);
      oldTf?.removeFeeById(row.fee.id);
      if (newTf) {
        newTf.addFee(row.fee);
      } else {
        fpt.addFee(new TermFees({ termNumber: row.termNumber, fees: [row.fee] }));
      }
    }

    this.lendPeak?.amortization.feesPerTerm.updateModelValues();
    this.isModified = true;
    this.emitLoanChange();
  }

  onFptEditCancel(row: FlatTermFees, ri: number) {
    const saved = this.fptSnapshots[row.fee.id];
    if (!saved) return;

    row.termNumber = saved.termNumber;
    Object.assign(row.fee, new Fee(saved.fee));
    delete this.fptSnapshots[row.fee.id];
  }

  /* ✏️ Edit */
  onTpaEditInit(row: TermPaymentAmount) {
    this.tpaSnapshots[row.jsTermNumber] = row.json; // deep clone
  }

  /* ✔ Save */
  onTpaEditSave(row: TermPaymentAmount) {
    delete this.tpaSnapshots[row.jsTermNumber];
    this.lendPeak!.amortization.termPaymentAmountOverride.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖ Cancel */
  onTpaEditCancel(row: TermPaymentAmount, rowIndex: number) {
    const saved = this.tpaSnapshots[row.jsTermNumber];
    if (!saved) return;

    const restored = new TermPaymentAmount(saved); // re-hydrate
    Object.assign(row, restored); // rollback in place
    delete this.tpaSnapshots[row.jsTermNumber];
  }

  // deep snapshots for Term Calendar Override
  private tcoSnapshots: Record<number, any> = {};

  /* ✏️ Edit  */
  onTcoEditInit(row: TermCalendar) {
    this.tcoSnapshots[row.jsTermNumber] = row.json; // deep clone
  }

  /* ✔ Save */
  onTcoEditSave(row: TermCalendar) {
    delete this.tcoSnapshots[row.jsTermNumber];
    this.lendPeak!.amortization.calendars.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖ Cancel */
  onTcoEditCancel(row: TermCalendar, rowIndex: number) {
    const saved = this.tcoSnapshots[row.jsTermNumber];
    if (!saved) return;

    const restored = new TermCalendar(saved); // re-hydrate
    Object.assign(row, restored); // rollback in place
    delete this.tcoSnapshots[row.jsTermNumber];
  }

  /* ─── Term-Calendar master toggle (header switch) ──────────────── */
  get tcoMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.calendars.all.every((c) => c.active);
  }
  set tcoMasterActive(val: boolean) {
    /* re-use your existing bulk-toggle handler */
    this.toggleAllTermCalendarOverrides({ checked: val });
  }

  // deep snapshots keyed by term number
  private tiaoSnapshots: Record<number, any> = {};

  /* ✏️  — user enters edit mode */
  onTiaoEditInit(row: TermInterestAmountOverride) {
    this.tiaoSnapshots[row.jsTermNumber] = row.json; // deep, detached
  }

  /* ✔️  — user saves changes */
  onTiaoEditSave(row: TermInterestAmountOverride) {
    delete this.tiaoSnapshots[row.jsTermNumber];
    this.lendPeak!.amortization.termInterestAmountOverride.reSort();
    this.isModified = true;
    this.emitLoanChange();
  }

  /* ✖️  — user cancels, revert the row */
  onTiaoEditCancel(row: TermInterestAmountOverride, rowIndex: number) {
    const saved = this.tiaoSnapshots[row.jsTermNumber];
    if (!saved) {
      return;
    }

    // Re-hydrate a fresh override from JSON
    const restored = new TermInterestAmountOverride(saved);

    // Overwrite the live row in place so the UI refreshes
    Object.assign(row, restored);

    delete this.tiaoSnapshots[row.jsTermNumber];
  }

  /* ─────────  helper getter / setter ───────── */
  get tiaoMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.termInterestAmountOverride.all.every(
      (o) => o.active,
    );
  }
  set tiaoMasterActive(val: boolean) {
    // fired when user clicks the header switch
    this.toggleAllTiao(val);
  }

  /* ─────────  actual toggler used by template ───────── */
  toggleAllTiao(enable: boolean) {
    if (!this.lendPeak) return;

    const tiao = this.lendPeak.amortization.termInterestAmountOverride;
    enable ? tiao.activateAll() : tiao.deactivateAll();

    this.isModified = true; // mark form dirty
    this.emitLoanChange(); // run recalcs / notify parent
  }

  expandAllUsedTabs() {
    this.refreshOpenTabs();
  }

  collapseAllTabs() {
    this.openPanels = [];
  }

  refreshOpenTabs() {
    if (!this.lendPeak) {
      return;
    }
    // Clear or initialize the array each time
    this.openPanels = [];

    // Panel: Interest Rate
    if (this.lendPeak.amortization?.rateSchedules?.hasCustom) {
      this.openPanels.push('interestRate');
    }

    if (this.lendPeak.amortization.payoffDate) {
      this.openPanels.push('payoffConfiguration');
    }
    // Panel: Payment Settings (EIP)
    // You might open this if a certain condition is met, e.g., loan.termPaymentAmount > 0
    if (this.lendPeak.amortization.hasCustomEquitedMonthlyPayment) {
      this.openPanels.push('paymentSettings');
    }

    // Panel: Term Payment Amount
    if (this.lendPeak.amortization?.termPaymentAmountOverride?.length > 0) {
      this.openPanels.push('termPaymentAmount');
    }

    // Panel: Term Interest Override
    if (
      this.lendPeak.amortization.termInterestAmountOverride &&
      this.lendPeak.amortization.termInterestAmountOverride?.length > 0
    ) {
      this.openPanels.push('termInterestOverride');
    }

    // Panel: Term Calendar Override
    if (
      this.lendPeak.amortization.calendars &&
      this.lendPeak.amortization.calendars.length > 0
    ) {
      this.openPanels.push('termCalendarOverride');
    }

    // Panel: Change Payment Date
    if (this.lendPeak.amortization?.changePaymentDates?.length > 0) {
      this.openPanels.push('changePaymentDates');
    }

    // Panel: Pre Bill Day Term
    if (this.lendPeak.amortization?.preBillDays?.hasCustom) {
      this.openPanels.push('preBillDayTerm');
    }

    // Panel: Due Bill Day Term
    if (this.lendPeak.amortization?.dueBillDays?.hasCustom) {
      this.openPanels.push('dueBillDayTerm');
    }

    // Panel: Balance Modifications
    if (this.lendPeak.amortization?.balanceModifications?.length > 0) {
      this.openPanels.push('balanceModifications');
    }

    // Panel: Fees That Apply to All Terms
    if (this.lendPeak.amortization?.feesForAllTerms?.length > 0) {
      this.openPanels.push('feesForAllTerms');
    }

    // Panel: Fees Per Term
    if (this.lendPeak.amortization?.feesPerTerm?.length > 0) {
      this.openPanels.push('feesPerTerm');
    }

    // Panel: Term Extensions
    if (this.lendPeak.amortization?.termExtensions?.length > 0) { // Added for Term Extensions
      this.openPanels.push('termExtensions');
    }
  }

  startWithNewSettings() {
    if (this.isModified) {
      if (
        !confirm(
          'You have unsaved changes. Do you want to discard them and start with default settings?',
        )
      ) {
        return;
      }
    }
    this.selectedSettingId = null;
    this.loadedSettingName = '';
    this.currentSettingVersion = null;
    this.applyDefaultSettings(); // applyDefaultSettings will set originalSettings
    this.isModified = false;
  }

  applyDefaultSettings() {
    if (!this.lendPeak) {
      return;
    }
    // Reset overrides to default values
    this.lendPeak.amortization.termPaymentAmountOverride = new TermPaymentAmounts();
    this.lendPeak.amortization.rateSchedules = new RateSchedules();
    this.lendPeak.amortization.changePaymentDates = new ChangePaymentDates();
    this.lendPeak.amortization.preBillDays = new PreBillDaysConfigurations();
    this.lendPeak.amortization.dueBillDays = new BillDueDaysConfigurations();
    this.lendPeak.amortization.balanceModifications = new BalanceModifications();
    this.lendPeak.amortization.feesForAllTerms = new Fees();
    this.lendPeak.amortization.feesPerTerm = FeesPerTerm.empty();
    this.lendPeak.amortization.termInterestAmountOverride = new TermInterestAmountOverrides();
    this.lendPeak.amortization.termExtensions = new TermExtensions(); // Added for Term Extensions
    // Add other properties as needed

    // Store as original settings
    this.originalSettings = JSON.parse(
      JSON.stringify(this.getCurrentSettings()),
    );

    this.emitLoanChange();
  }

  resetToOriginalSettings() {
    if (!this.lendPeak) {
      return;
    }
    if (this.selectedSettingId) {
      const originalSettingToLoad = this.overrideSettingsService.getSettingById(
        this.selectedSettingId,
      );
      if (originalSettingToLoad) {
        this.applySettings(originalSettingToLoad); // This sets originalSettings too
        this.isModified = false;
      }
    } else {
      // Reset to stored original settings if no specific setting was loaded
      const settings = this.originalSettings;
      this.lendPeak.amortization.termPaymentAmountOverride = new TermPaymentAmounts(settings.termPaymentAmountOverride || []);
      this.lendPeak.amortization.rateSchedules = new RateSchedules(settings.rateSchedules || []); // Assuming RateSchedules can take array
      this.lendPeak.amortization.changePaymentDates = new ChangePaymentDates(settings.changePaymentDates || []);
      this.lendPeak.amortization.preBillDays = new PreBillDaysConfigurations(settings.preBillDays || []);
      this.lendPeak.amortization.dueBillDays = new BillDueDaysConfigurations(settings.dueBillDays || []);
      this.lendPeak.amortization.balanceModifications = new BalanceModifications(settings.balanceModifications || []);
      this.lendPeak.amortization.feesForAllTerms = new Fees(settings.feesForAllTerms || []);
      this.lendPeak.amortization.feesPerTerm = FeesPerTerm.fromJSON(settings.feesPerTerm || { termFees: [] }); // Ensure proper instantiation
      this.lendPeak.amortization.termInterestAmountOverride = new TermInterestAmountOverrides(settings.termInterestAmountOverride || []);
      this.lendPeak.amortization.termExtensions = new TermExtensions(settings.termExtensions || []); // Added for Term Extensions
      // Reset other properties as needed

      this.emitLoanChange();
      this.isModified = false;
    }
  }

  // Save the current settings
  saveCurrentSettings() {
    const newSetting: OverrideSettings = {
      id: uuidv4(),
      name: '', // Prompt user for a name in the UI
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
      settings: this.getCurrentSettings(),
    };
    // Open a dialog to get the name and isDefault flag
    this.openSaveSettingsDialog(newSetting);
  }

  // Update an existing setting
  updateCurrentSettings() {
    if (this.selectedSettingId) {
      const existingSetting = this.overrideSettingsService.getSettingById(
        this.selectedSettingId,
      );
      if (existingSetting) {
        const newVersion: OverrideSettings = {
          ...existingSetting,
          id: uuidv4(), // new ID for new version
          previousVersionId: existingSetting.id, // link to old version
          version: existingSetting.version + 1,
          updatedAt: new Date(),
          settings: this.getCurrentSettings(),
        };
        this.overrideSettingsService.saveSetting(newVersion); // Save new version
        this.loadSavedSettings(); // Refresh list

        // Update state to reflect the newly saved version
        this.selectedSettingId = newVersion.id;
        this.loadedSettingName = newVersion.name;
        this.currentSettingVersion = newVersion.version;
        this.originalSettings = JSON.parse(JSON.stringify(newVersion.settings)); // current settings are now original
        this.isModified = false;
      }
    }
  }

  // Get the current settings from the component
  getCurrentSettings() {
    if (!this.lendPeak) {
      return {}; // Return empty object if no lendPeak
    }
    return {
      termPaymentAmountOverride: this.lendPeak.amortization.termPaymentAmountOverride.json,
      rateSchedules: this.lendPeak.amortization.rateSchedules.json, // Assuming ratesSchedule is the correct property holding RateSchedules
      changePaymentDates: this.lendPeak.amortization.changePaymentDates.json,
      preBillDays: this.lendPeak.amortization.preBillDays.json,
      dueBillDays: this.lendPeak.amortization.dueBillDays.json,
      balanceModifications: this.lendPeak.amortization.balanceModifications.json,
      feesForAllTerms: this.lendPeak.amortization.feesForAllTerms.json,
      feesPerTerm: this.lendPeak.amortization.feesPerTerm.json,
      termInterestAmountOverride: this.lendPeak.amortization.termInterestAmountOverride.json,
      termExtensions: this.lendPeak.amortization.termExtensions.json, // Added for Term Extensions
      // Add other settings as needed
    };
  }

  // Apply settings to the component
  applySettings(setting: OverrideSettings) {
    if (!this.lendPeak) {
      return;
    }
    const settings = setting.settings;
    // Ensure proper instantiation from JSON
    this.lendPeak.amortization.termPaymentAmountOverride = new TermPaymentAmounts(settings.termPaymentAmountOverride || []);
    this.lendPeak.amortization.rateSchedules = new RateSchedules(settings.rateSchedules || []);
    this.lendPeak.amortization.changePaymentDates = new ChangePaymentDates(settings.changePaymentDates || []);
    this.lendPeak.amortization.preBillDays = new PreBillDaysConfigurations(settings.preBillDays || []);
    this.lendPeak.amortization.dueBillDays = new BillDueDaysConfigurations(settings.dueBillDays || []);
    this.lendPeak.amortization.balanceModifications = new BalanceModifications(settings.balanceModifications || []);
    this.lendPeak.amortization.feesForAllTerms = new Fees(settings.feesForAllTerms || []);
    this.lendPeak.amortization.feesPerTerm = FeesPerTerm.fromJSON(settings.feesPerTerm || { termFees: [] });
    this.lendPeak.amortization.termInterestAmountOverride = new TermInterestAmountOverrides(settings.termInterestAmountOverride || []);
    this.lendPeak.amortization.termExtensions = new TermExtensions(settings.termExtensions || []); // Added for Term Extensions

    // Apply other settings as needed
    this.originalSettings = JSON.parse(JSON.stringify(settings)); // Store the applied settings as original
    this.emitLoanChange();
    this.isModified = false;
  }

  // Load saved settings from the service
  loadSavedSettings() {
    this.savedSettings = this.overrideSettingsService.getAllSettings();
  }

  // Open Save Settings Dialog
  openSaveSettingsDialog(setting: OverrideSettings) {
    this.newSetting = { ...setting, name: '', isDefault: false }; // Reset name and isDefault for new save
    this.showSaveSettingsDialog = true;
  }

  confirmSaveSettings() {
    // Save the setting
    this.overrideSettingsService.saveSetting(this.newSetting);
    this.loadSavedSettings();
    this.showSaveSettingsDialog = false;

    // Update state
    this.selectedSettingId = this.newSetting.id;
    this.loadedSettingName = this.newSetting.name;
    this.currentSettingVersion = this.newSetting.version;
    this.originalSettings = JSON.parse(JSON.stringify(this.newSetting.settings));
    this.isModified = false;
  }

  // Open Load Settings Dialog
  openLoadSettingsDialog() {
    this.loadSavedSettings();
    this.showLoadSettingsDialog = true;
  }

  getVersionById(id: string | undefined): OverrideSettings | undefined {
    if (!id) return undefined;
    return this.savedSettings.find((s) => s.id === id);
  }

  // Confirm Load Settings
  confirmLoadSettings() {
    if (this.selectedSetting) {
      this.applySettings(this.selectedSetting);
      this.selectedSettingId = this.selectedSetting.id;
      this.loadedSettingName = this.selectedSetting.name;
      this.currentSettingVersion = this.selectedSetting.version;
      this.isModified = false;
    }
    this.showLoadSettingsDialog = false;
  }

  // Preview Settings
  previewSettings(setting: OverrideSettings) {
    this.selectedSetting = setting;
    this.showPreviewSettingsDialog = true;
  }

  // Delete a setting
  deleteSetting(id: string) {
    this.overrideSettingsService.deleteSetting(id);
    this.loadSavedSettings();
    if (this.selectedSettingId === id) { // If deleted setting was active
      this.selectedSettingId = null;
      this.loadedSettingName = '';
      this.currentSettingVersion = null;
      this.applyDefaultSettings(); // Revert to defaults
    }
  }

  onInputChange(event: any = null) {
    this.isModified = true;
    this.emitLoanChange();
  }

  saveSettings() {
    if (this.selectedSettingId && this.isModified) { // Check if a setting is loaded AND modified
      // Ask user if they want to save as a new version of the current setting
      if (confirm('You have unsaved changes to a loaded setting. Save as a new version? (Cancel to save as a new setting)')) {
        this.updateCurrentSettings();
      } else {
        this.saveCurrentSettings(); // Save as entirely new setting
      }
    } else { // No setting loaded or not modified, save as new
      this.saveCurrentSettings();
    }
  }

  // Methods related to Term Payment Amount Overrides
  addTermPaymentAmountOverride() {
    if (!this.lendPeak) {
      return;
    }
    const termPaymentAmountOverride =
      this.lendPeak.amortization.termPaymentAmountOverride;

    let termNumber: number;
    let paymentAmount: Currency;

    if (termPaymentAmountOverride.length === 0) {
      // First entry
      termNumber = 1; // Term numbers are typically 1-based for display
      paymentAmount = Currency.Zero();
    } else {
      // Following entries
      termNumber = termPaymentAmountOverride.last.termNumber + 1;
      paymentAmount = termPaymentAmountOverride.last.paymentAmount;
    }

    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
      termNumber = Math.max(1, this.lendPeak.amortization.actualTerms -1); // Ensure it's at least 1
    }


    termPaymentAmountOverride.addPaymentAmount(
      new TermPaymentAmount({
        termNumber: termNumber,
        paymentAmount: paymentAmount,
      }),
    );

    // No need to reassign, direct modification
    // this.lendPeak.amortization.termPaymentAmountOverride = termPaymentAmountOverride;
    this.onInputChange(true);
  }

  refreshSortForTermCalendarOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.calendars.reSort();
  }

  refreshSortForTermPaymentAmountOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.termPaymentAmountOverride.reSort();
  }

  refreshSortForChangePaymentDates() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.changePaymentDates.reSort();
  }

  toggleAllTermInterestOverrides(event: any) {
    if (!this.lendPeak) {
      return;
    }
    if (event.checked === true) {
      this.lendPeak.amortization.termInterestAmountOverride.activateAll();
    } else {
      this.lendPeak.amortization.termInterestAmountOverride.deactivateAll();
    }
    this.onInputChange(true);
  }

  toggleAllTermCalendarOverrides(event: any) {
    if (!this.lendPeak) {
      return;
    }
    if (event.checked === true) {
      this.lendPeak.amortization.calendars.activateAll();
    } else {
      this.lendPeak.amortization.calendars.deactivateAll();
    }
    this.onInputChange(true);
  }

  refreshSortForTermInterestOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.termInterestAmountOverride.reSort();
  }

  removeTermPaymentAmountOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.termPaymentAmountOverride.length > 0) {
      this.lendPeak.amortization.termPaymentAmountOverride.removePaymentAmountAtIndex(
        index,
      );
      this.emitLoanChange();
    }
  }

  // Methods related to Rate Overrides
  addRateOverride() {
    if (!this.lendPeak) {
      return;
    }

    const rateSchedules = this.lendPeak.amortization.rateSchedules;
    let newStartDate = this.lendPeak.amortization.startDate;
    let newInterestRate = this.lendPeak.amortization.annualInterestRate;

    if (rateSchedules.length > 0) {
        newStartDate = rateSchedules.last.endDate;
        newInterestRate = rateSchedules.last.annualInterestRate;
    }
    
    // Ensure newStartDate is not after loan's actual end date
    const loanEndDate = this.lendPeak.amortization.endDate;
    if (newStartDate.isAfter(loanEndDate)) {
        newStartDate = loanEndDate.minusDays(1); // Or handle as error
    }

    let newEndDate = newStartDate.plusMonths(1);
    if (newEndDate.isAfter(loanEndDate)) {
        newEndDate = loanEndDate;
    }


    rateSchedules.addSchedule(
      new RateSchedule({
        startDate: newStartDate,
        endDate: newEndDate,
        annualInterestRate: newInterestRate,
        type: 'custom',
      }),
    );

    this.lendPeak.amortization.hasCustomRateSchedule = true;
    this.emitLoanChange();
  }

  removeRateOverride(id: string) {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.rateSchedules.removeScheduleById(id);
    this.emitLoanChange();
  }

  // Methods related to Change Payment Date
  addNewChangePaymentTermRow() {
    if (!this.lendPeak) {
      return;
    }
    const changePaymentDates = this.lendPeak.amortization.changePaymentDates;
    let newTermNumber = 0; // 0-indexed
    let newPaymentDate = this.lendPeak.amortization.startDate.plusMonths(1);


    if (changePaymentDates.length > 0) {
      newTermNumber = changePaymentDates.last.termNumber + 1;
      newPaymentDate = changePaymentDates.last.newDate.plusMonths(1);
    }
    
    // Ensure termNumber does not exceed actual loan term (0-indexed vs 1-indexed actualTerms)
    if (newTermNumber >= this.lendPeak.amortization.actualTerms) {
        newTermNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }


    changePaymentDates.addChangePaymentDate(
      new ChangePaymentDate({
        termNumber: newTermNumber,
        newDate: newPaymentDate,
      }),
    );
    this.emitLoanChange();
  }

  getEndDateForTerm(termNumber: number): LocalDate {
    if (!this.lendPeak || termNumber === undefined || termNumber < 0) {
      return DateUtil.today();
    }
    const termEntry =
      this.lendPeak.amortization.repaymentSchedule.getBillableEntryByTerm(
        termNumber,
      );
    return termEntry ? termEntry.periodEndDate : DateUtil.today();
  }

  getStartDateForTerm(termNumber: number): LocalDate {
     if (!this.lendPeak || termNumber === undefined || termNumber < 0 || termNumber >= this.lendPeak.amortization.actualTerms) {
      return DateUtil.today();
    }
    const termEntry =
      this.lendPeak.amortization.repaymentSchedule.getBillableEntryByTerm(
        termNumber,
      );
    return termEntry ? termEntry.periodStartDate : DateUtil.today();
  }

  removeChangePaymentDate(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.changePaymentDates.length > 0) {
      this.lendPeak.amortization.changePaymentDates.removeConfigurationAtIndex(
        index,
      );
      this.emitLoanChange();
    }
  }

  refreshSortForDueBillDays(): void {
    if (!this.lendPeak) return;
    this.lendPeak.amortization.dueBillDays.reSort();
  }

  toggleAllDueBillDays(ev: any): void {
    if (!this.lendPeak) return;
    const db = this.lendPeak.amortization.dueBillDays;
    ev.checked ? db.activateAll() : db.deactivateAll();
    this.onInputChange(true);
  }

  toggleAllPreBillDays(ev: any): void {
    if (!this.lendPeak) return;
    const pb = this.lendPeak.amortization.preBillDays;
    ev.checked ? pb.activateAll() : pb.deactivateAll();
    this.onInputChange(true);
  }

  toggleAllFeesForAllTerms(ev: any): void {
    if (!this.lendPeak) return;
    const ffa = this.lendPeak.amortization.feesForAllTerms;
    ev.checked ? ffa.activateAll() : ffa.deactivateAll();
    this.onInputChange(true);
  }

  toggleAllFeesPerTerm(ev: any): void {
    if (!this.lendPeak) return;
    const fpt = this.lendPeak.amortization.feesPerTerm;
    ev.checked ? fpt.activateAll() : fpt.deactivateAll();
    this.onInputChange(true);
  }

  // Methods related to Pre Bill Day Term
  addPrebillDayTermRow() {
    if (!this.lendPeak) {
      return;
    }
    const preBillDaysConfiguration = this.lendPeak.amortization.preBillDays;
    let termNumber: number;
    let preBillDaysValue: number; // Renamed to avoid conflict

    if (!preBillDaysConfiguration.hasCustom) {
      termNumber = 0; // Assuming 0-indexed for consistency if it's the first custom
      preBillDaysValue = this.lendPeak.amortization.defaultPreBillDaysConfiguration;
    } else {
      termNumber = preBillDaysConfiguration.allCustom[preBillDaysConfiguration.allCustom.length - 1].termNumber + 1;
      preBillDaysValue = preBillDaysConfiguration.last.preBillDays; // Use value from last config
    }
    
    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
        termNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }

    preBillDaysConfiguration.addConfiguration(
      new PreBillDaysConfiguration({
        termNumber: termNumber,
        preBillDays: preBillDaysValue,
        type: 'custom',
      }),
    );
    this.emitLoanChange();
  }

  removePreBillDayTerm(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.preBillDays.length > 0) { // Should check .allCustom.length or similar
      this.lendPeak.amortization.preBillDays.removeConfigurationAtIndex(index); // This index might need to be for .allCustom array
      this.emitLoanChange();
    }
  }

  // Methods related to Due Bill Day Term
  addDueBillDayTermRow() {
    if (!this.lendPeak) {
      return;
    }
    const dueBillDaysConfiguration = this.lendPeak.amortization.dueBillDays;
    let termNumber: number;
    let daysDueAfterPeriodEndValue: number; // Renamed

    if (!dueBillDaysConfiguration.hasCustom) { // Check hasCustom
      termNumber = 0; // Assuming 0-indexed for first custom
      daysDueAfterPeriodEndValue = this.lendPeak.amortization.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      termNumber = dueBillDaysConfiguration.allCustom[dueBillDaysConfiguration.allCustom.length - 1].termNumber + 1;
      daysDueAfterPeriodEndValue = dueBillDaysConfiguration.last.daysDueAfterPeriodEnd;
    }

    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
        termNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }

    dueBillDaysConfiguration.addConfiguration(
      new BillDueDaysConfiguration({
        termNumber: termNumber,
        daysDueAfterPeriodEnd: daysDueAfterPeriodEndValue,
        type: 'custom',
      }),
    );
    this.emitLoanChange();
  }

  removeDueBillDayTerm(index: number) {
    if (!this.lendPeak) {
      return;
    }
     if (this.lendPeak.amortization.dueBillDays.length > 0) { // Check .allCustom.length or similar
      this.lendPeak.amortization.dueBillDays.removeConfigurationAtIndex(index);  // This index might need to be for .allCustom array
      this.emitLoanChange();
    }
  }

  /* ────────── Term-Payment-Amount toggle-all ────────── */
  toggleAllTermPaymentAmountOverrides(ev: any): void {
    if (!this.lendPeak) return;
    const tpa = this.lendPeak.amortization.termPaymentAmountOverride;
    ev.checked ? tpa.activateAll() : tpa.deactivateAll();
    this.onInputChange(true);
  }

  /* ────────── Change-Payment-Date toggle-all ────────── */
  toggleAllChangePaymentDates(ev: any): void {
    if (!this.lendPeak) return;
    const cpd = this.lendPeak.amortization.changePaymentDates;
    ev.checked ? cpd.activateAll() : cpd.deactivateAll();
    this.onInputChange(true);
  }

  /* (optional) helpers if you want quick access elsewhere */
  activateAllTPA() {
    this.toggleAllTermPaymentAmountOverrides({ checked: true });
  }
  deactivateAllTPA() {
    this.toggleAllTermPaymentAmountOverrides({ checked: false });
  }

  // Methods related to Balance Modifications
  addBalanceModificationRow() {
    if (!this.lendPeak) {
      return;
    }
    const dateOfTheModification =
      this.lendPeak.amortization.balanceModifications.lastModification?.date ||
      this.lendPeak.amortization.startDate;

    const balanceModificationToAdd = new BalanceModification({
      amount: 0,
      date: dateOfTheModification,
      type: 'decrease', // Default type
    });

    this.lendPeak.amortization.balanceModifications.addBalanceModification(
      balanceModificationToAdd,
    );
    this.emitLoanChange();
  }

  deleteBalanceModificationRow(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.balanceModifications.length > 0) {
      this.lendPeak.amortization.balanceModifications.removeBalanceModificationAtIndex(
        index,
      );
    }
    this.emitLoanChange();
  }

  balanceModificationChanged() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.balanceModifications.updateModelValues();
    this.emitLoanChange();
  }

  // Methods related to Fees That Apply to All Terms
  addFeeForAllTerms() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.feesForAllTerms.addFee(
      new Fee({
        type: 'fixed', // Default type
        amount: 0,
        description: '',
        active: true,
      }),
    );
    this.emitLoanChange();
  }

  removeFeeForAllTerms(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (
      this.lendPeak.amortization.feesForAllTerms &&
      this.lendPeak.amortization.feesForAllTerms.length > 0
    ) {
      this.lendPeak.amortization.feesForAllTerms.removeFeeAtIndex(index);
      this.emitLoanChange();
    }
  }

  addFeePerTerm(): void {
    if (!this.lendPeak) {
      return;
    }

    const feesPerTerm = this.lendPeak.amortization.feesPerTerm ?? FeesPerTerm.empty();
    let nextTermNumber = 1; // Default for first fee

    if (feesPerTerm.all.length > 0) {
        const maxTerm = feesPerTerm.all
            .map((tf) => tf.termNumber)
            .reduce((a, b) => Math.max(a, b), 0); // Ensure there's a default for empty array if not handled by .length
        nextTermNumber = maxTerm + 1;
    }
    
    // Ensure termNumber does not exceed actual loan term
    if (nextTermNumber >= this.lendPeak.amortization.actualTerms) {
        nextTermNumber = Math.max(1, this.lendPeak.amortization.actualTerms -1); // Ensure it's at least 1 if actualTerms is 1
         if (this.lendPeak.amortization.actualTerms === 1 && nextTermNumber > 0) nextTermNumber = 0; // If 1 term, index is 0
    }


    feesPerTerm.addFee(
      new TermFees({
        termNumber: nextTermNumber, // Use 0-indexed term number for engine
        fees: [new Fee({ type: 'fixed', amount: 0, description: '', active: true })],
      }),
    );
    this.emitLoanChange();
  }


  isPeriodEndDate(ngDate: {
    day: number;
    month: number;
    year: number;
  }): boolean {
    if (!this.lendPeak) {
      return false;
    }
    const passedDate = DateUtil.normalizeDate(
      new Date(ngDate.year, ngDate.month, ngDate.day),
    );

    for (const row of this.lendPeak.amortization.repaymentSchedule.entries) {
      if (row.periodEndDate.isEqual(passedDate)) {
        return true;
      }
    }
    return false;
  }

  cpdTermUpdated(term: number) {
    if (!this.lendPeak) {
      return;
    }
    // This logic might need re-evaluation based on how terms are identified post-modifications
    this.removeChangePaymentDate(term); // Assuming term is an index or findable key
    const termSchedule =
      this.lendPeak.amortization.repaymentSchedule.getBillableEntryByTerm(term);

    const newDate = termSchedule?.periodEndDate.toString() || DateUtil.today().toString();

    this.lendPeak.amortization.changePaymentDates.addChangePaymentDate(
      new ChangePaymentDate({
        termNumber: term,
        newDate: newDate,
      }),
    );
    this.emitLoanChange();
  }

  cpdUpdated() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.changePaymentDates.updateModelValues();
    this.emitLoanChange();
  }

  removeFeePerTerm(termNumber: number) { // termNumber here is likely the actual term number (1-based from UI)
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.feesPerTerm.removeAllFeesForTerm(termNumber); // Engine might expect 0-indexed
    this.emitLoanChange();
  }


  addTermInterestRateOverrideRow() {
    if (!this.lendPeak) {
      return;
    }
    const overrides = this.lendPeak.amortization.termInterestRateOverride;
    let termNumber = 0; // Default for first override (0-indexed)
    let interestRate = this.lendPeak.amortization.annualInterestRate;

    if (overrides.length > 0) {
      termNumber = overrides.last.termNumber + 1;
      interestRate = overrides.last.interestRate;
    }

    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
        termNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }

    overrides.addOverride(
      new TermInterestRateOverride({
        termNumber: termNumber,
        interestRate: interestRate,
      }),
    );
    this.onInputChange(true);
  }

  addTermCalendarOverrideRow() {
    if (!this.lendPeak) {
      return;
    }
    const calendars = this.lendPeak.amortization.calendars;
    let termNumber = 0; // Default for first override (0-indexed)
    let calendarType = calendars.primary.calendarType;

    if (calendars.length > 0 && calendars.custom.length > 0) { // Check custom length
      termNumber = calendars.custom[calendars.custom.length -1].termNumber + 1;
      calendarType = calendars.custom[calendars.custom.length -1].calendar.calendarType;
    }
    
    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
        termNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }


    calendars.addCalendar(
      new TermCalendar({
        termNumber: termNumber,
        calendar: new Calendar(calendarType),
      }),
    );
    this.onInputChange(true);
  }

  removeTermInterestRateOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.termInterestRateOverride.length > 0) {
      this.lendPeak.amortization.termInterestRateOverride.removeOverrideAtIndex(index);
      this.onInputChange(true);
    }
  }

  removeAllTermInterestOverride() { // This is for TermInterestAmountOverride
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.termInterestAmountOverride.removeAllOverrides();
    this.onInputChange(true);
  }

  removeTermInterestOverride(index: number) { // This is for TermInterestAmountOverride
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.termInterestAmountOverride.length > 0) {
      this.lendPeak.amortization.termInterestAmountOverride.removeOverrideAtIndex(index);
      this.onInputChange(true);
    }
  }

  addTermInterestOverrideRow() { // This is for TermInterestAmountOverride
    if (!this.lendPeak) {
      return;
    }
    const overrides = this.lendPeak.amortization.termInterestAmountOverride;
    let termNumber = 0; // Default for first override (0-indexed)
    let interestAmount = Currency.of(0);

    if (overrides.length > 0) {
      termNumber = overrides.last.termNumber + 1;
      interestAmount = overrides.last.interestAmount;
    }

    // Ensure termNumber does not exceed actual loan term
    if (termNumber >= this.lendPeak.amortization.actualTerms) {
        termNumber = Math.max(0, this.lendPeak.amortization.actualTerms - 1);
    }

    overrides.addOverride(
      new TermInterestAmountOverride({
        termNumber: termNumber,
        interestAmount: interestAmount,
        acceptableRateVariance: this.lendPeak.amortization.acceptableRateVariance.toNumber(),
      }),
    );
    this.onInputChange(true);
  }


  removeAllTermPaymentAmounts() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.termPaymentAmountOverride.removeAll();
    this.onInputChange(true);
  }

  removeAllTermCalendarOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.calendars.removeAllCustomCalendars();
    this.onInputChange(true);
  }

  removeTermCalendarOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.calendars.custom.length > 0) { // Check custom length
      this.lendPeak.amortization.calendars.removeCalendarAtIndex(index); // Index should be for custom array
      this.onInputChange(true);
    }
  }

  removeAllPreBillDayOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.preBillDays.removeAllCustom();
    this.onInputChange(true);
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    tooltipRef.toggle(event);
  }

  private emitLoanChange() {
    if (!this.lendPeak) {
      return;
    }
    this.loanUpdated.emit();
  }

  private tiroSnapshots: Record<number, any> = {};

  get tiroMasterActive(): boolean {
    if (!this.lendPeak) return true;
    return this.lendPeak.amortization.termInterestRateOverride.all.every(
      (o) => o.active,
    );
  }
  set tiroMasterActive(val: boolean) {
    this.toggleAllTiro(val);
  }

  toggleAllTiro(enable: boolean) {
    if (!this.lendPeak) return;
    const tio = this.lendPeak.amortization.termInterestRateOverride;
    enable ? tio.activateAll() : tio.deactivateAll();
    this.isModified = true;
    this.emitLoanChange();
  }

  onTiroEditInit(row: TermInterestRateOverride) {
    this.tiroSnapshots[row.jsTermNumber] = row.json;
  }

  onTiroEditSave(row: TermInterestRateOverride) {
    delete this.tiroSnapshots[row.jsTermNumber];
    this.lendPeak!.amortization.termInterestRateOverride.reSort();
    this.isModified = true;
    this.onInputChange(true);
  }

  onTiroEditCancel(row: TermInterestRateOverride, ri: number) {
    const saved = this.tiroSnapshots[row.jsTermNumber];
    if (!saved) return;
    Object.assign(row, new TermInterestRateOverride(saved));
    delete this.tiroSnapshots[row.jsTermNumber];
  }
}

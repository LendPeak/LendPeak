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
import { TermFees } from 'lendpeak-engine/models/TermFees';
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
import { RateSchedules } from 'lendpeak-engine/models/RateSchedules';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { TermInterestAmountOverrides } from 'lendpeak-engine/models/TermInterestAmountOverrides';

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

  constructor(private overrideSettingsService: OverrideSettingsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // This will fire whenever an @Input changes.
    // If 'loan' has changed, you can re-run your initialization logic or
    // re-apply defaults etc.
    //this.balanceModifications = this.lendPeak.amortization.balanceModifications;
    this.refreshOpenTabs();
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

    this.refreshOpenTabs();
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
    // this.applyDefaultSettings();
    this.isModified = false;
  }

  applyDefaultSettings() {
    if (!this.lendPeak) {
      return;
    }
    // Reset overrides to default values
    this.lendPeak.amortization.termPaymentAmountOverride =
      new TermPaymentAmounts();
    this.lendPeak.amortization.rateSchedules = new RateSchedules();
    this.lendPeak.amortization.changePaymentDates = new ChangePaymentDates();
    this.lendPeak.amortization.preBillDays = new PreBillDaysConfigurations();
    this.lendPeak.amortization.dueBillDays = new BillDueDaysConfigurations();
    this.lendPeak.amortization.balanceModifications =
      new BalanceModifications();
    this.lendPeak.amortization.feesForAllTerms = new Fees();
    this.lendPeak.amortization.feesPerTerm = FeesPerTerm.empty();
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
      const originalSetting = this.overrideSettingsService.getSettingById(
        this.selectedSettingId,
      );
      if (originalSetting) {
        this.applySettings(originalSetting);
        this.isModified = false;
      }
    } else {
      // Reset to stored original settings
      const settings = this.originalSettings;
      this.lendPeak.amortization.termPaymentAmountOverride =
        settings.termPaymentAmountOverride || [];
      this.lendPeak.amortization.rateSchedules = settings.rateSchedules || [];
      this.lendPeak.amortization.changePaymentDates =
        settings.changePaymentDates || [];
      this.lendPeak.amortization.preBillDays = settings.preBillDays || [];
      this.lendPeak.amortization.dueBillDays = settings.dueBillDays || [];
      this.lendPeak.amortization.balanceModifications =
        settings.balanceModifications || [];
      this.lendPeak.amortization.feesForAllTerms =
        settings.feesForAllTerms || [];
      this.lendPeak.amortization.feesPerTerm = settings.feesPerTerm || [];
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
          id: uuidv4(),
          version: existingSetting.version + 1,
          previousVersionId: existingSetting.id,
          updatedAt: new Date(),
          settings: this.getCurrentSettings(),
        };
        this.overrideSettingsService.saveSetting(newVersion);
        this.loadSavedSettings();

        // Update state
        this.selectedSettingId = newVersion.id;
        this.loadedSettingName = newVersion.name;
        this.currentSettingVersion = newVersion.version;
        this.originalSettings = JSON.parse(
          JSON.stringify(this.getCurrentSettings()),
        );
        this.isModified = false;
      }
    }
  }

  // Get the current settings from the component
  getCurrentSettings() {
    if (!this.lendPeak) {
      return;
    }
    return {
      termPaymentAmountOverride:
        this.lendPeak.amortization.termPaymentAmountOverride,
      ratesSchedule: this.lendPeak.amortization.repaymentSchedule,
      changePaymentDates: this.lendPeak.amortization.changePaymentDates,
      preBillDays: this.lendPeak.amortization.preBillDays,
      dueBillDays: this.lendPeak.amortization.dueBillDays,
      balanceModifications: this.lendPeak.amortization.balanceModifications,
      feesForAllTerms: this.lendPeak.amortization.feesForAllTerms,
      feesPerTerm: this.lendPeak.amortization.feesPerTerm,
      termInterestAmountOverride:
        this.lendPeak.amortization.termInterestAmountOverride || [],

      // Add other settings as needed
    };
  }

  // Apply settings to the component
  applySettings(setting: OverrideSettings) {
    if (!this.lendPeak) {
      return;
    }
    const settings = setting.settings;
    this.lendPeak.amortization.termPaymentAmountOverride =
      settings.termPaymentAmountOverride || [];
    this.lendPeak.amortization.repaymentSchedule = settings.ratesSchedule || [];
    this.lendPeak.amortization.changePaymentDates =
      settings.changePaymentDates || [];
    this.lendPeak.amortization.preBillDays = settings.preBillDays || [];
    this.lendPeak.amortization.dueBillDays = settings.dueBillDays || [];
    this.lendPeak.amortization.balanceModifications =
      settings.balanceModifications || [];
    this.lendPeak.amortization.feesForAllTerms = settings.feesForAllTerms || [];
    this.lendPeak.amortization.feesPerTerm = settings.feesPerTerm || [];
    this.lendPeak.amortization.termInterestAmountOverride =
      settings.termInterestAmountOverride || [];

    // Apply other settings as needed

    this.emitLoanChange();
    this.isModified = false;
  }

  // Load saved settings from the service
  loadSavedSettings() {
    this.savedSettings = this.overrideSettingsService.getAllSettings();
  }

  // Open Save Settings Dialog
  openSaveSettingsDialog(setting: OverrideSettings) {
    this.newSetting = setting;
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
    this.originalSettings = JSON.parse(
      JSON.stringify(this.getCurrentSettings()),
    );
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
  }

  onInputChange(event: any = null) {
    // if (event === null || event === undefined) {
    //   return;
    // }
    this.isModified = true;

    this.emitLoanChange();
  }

  saveSettings() {
    if (this.selectedSettingId) {
      // Update existing settings
      this.updateCurrentSettings();
    } else {
      // Save as new settings
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
      termNumber = 1;
      paymentAmount = Currency.Zero();
    } else {
      // Following entries
      termNumber = termPaymentAmountOverride.last.termNumber + 1;
      paymentAmount = termPaymentAmountOverride.last.paymentAmount;
    }

    if (termNumber >= this.lendPeak.amortization.term) {
      termNumber = this.lendPeak.amortization.term - 1;
    }

    termPaymentAmountOverride.addPaymentAmount(
      new TermPaymentAmount({
        termNumber: termNumber,
        paymentAmount: paymentAmount,
      }),
    );

    this.lendPeak.amortization.termPaymentAmountOverride =
      termPaymentAmountOverride;
    this.onInputChange(true);
  }

  refreshSortForTermPaymentAmountOverride() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.termInterestAmountOverride.reSort();
  }

  refreshSortForChangePaymentDates() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.changePaymentDates.reSort();
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
    // const ratesSchedule = this.lendPeak.amortization.rateSchedules;
    // let startDate: Dayjs;
    // let endDate: Dayjs;

    // if (ratesSchedule.length === 0) {
    //   // First entry: use loan's start date
    //   startDate = this.lendPeak.amortization.startDate;
    // } else {
    //   // Following entries: use end date from previous row as start date
    //   startDate = ratesSchedule.last.endDate;
    // }

    // // End date is 1 month from start date
    // endDate = startDate.add(1, 'month');

    // ratesSchedule.addSchedule(
    //   new RateSchedule({
    //     startDate: startDate,
    //     endDate: endDate,
    //     annualInterestRate: 10,
    //   }),
    // );

    this.lendPeak.amortization.hasCustomRateSchedule = true;

    if (this.lendPeak.amortization.rateSchedules.length === 0) {
      this.lendPeak.amortization.rateSchedules.addSchedule(
        new RateSchedule({
          startDate: this.lendPeak.amortization.rateSchedules.first.startDate,
          endDate: this.lendPeak.amortization.rateSchedules.first.endDate,
          annualInterestRate:
            this.lendPeak.amortization.rateSchedules.first.annualInterestRate,
        }),
      );
    } else {
      this.lendPeak.amortization.rateSchedules.addSchedule(
        new RateSchedule({
          startDate: this.lendPeak.amortization.rateSchedules.last.endDate,
          endDate: dayjs(
            this.lendPeak.amortization.rateSchedules.last.endDate,
          ).add(1, 'month'),
          annualInterestRate:
            this.lendPeak.amortization.rateSchedules.last.annualInterestRate,
        }),
      );
    }
    //  this.lendPeak.amortization.rateSchedules = ratesSchedule;
    this.emitLoanChange();
  }

  removeRateOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.rateSchedules.length > 0) {
      this.lendPeak.amortization.rateSchedules.removeScheduleAtIndex(index);
      this.emitLoanChange();
    }
  }

  // Methods related to Change Payment Date
  addNewChangePaymentTermRow() {
    if (!this.lendPeak) {
      return;
    }
    const changePaymentDates = this.lendPeak.amortization.changePaymentDates;

    if (changePaymentDates.length === 0) {
      // First entry: use loan's start date
      changePaymentDates.addChangePaymentDate(
        new ChangePaymentDate({
          termNumber: 0,
          newDate: dayjs(this.lendPeak.amortization.startDate)
            .add(1, 'month')
            .toDate(),
        }),
      );
    } else {
      // Following entries: use term number from previous row + 1
      const lastTermNumber = changePaymentDates.last.termNumber;
      changePaymentDates.addChangePaymentDate(
        new ChangePaymentDate({
          termNumber: lastTermNumber + 1,
          newDate: dayjs(changePaymentDates.last.newDate)
            .add(1, 'month')
            .toDate(),
        }),
      );
    }

    this.lendPeak.amortization.changePaymentDates = changePaymentDates;
    this.emitLoanChange();
  }

  getEndDateForTerm(termNumber: number): Dayjs {
    if (!this.lendPeak) {
      return dayjs().startOf('day');
    }
    if (!termNumber || termNumber < 0) {
      return dayjs().startOf('day');
    }
    const term = this.lendPeak.amortization.repaymentSchedule.entries.filter(
      (row) => row.term === termNumber,
    );
    if (term?.length > 0) {
      return term[term.length - 1].periodEndDate;
    }
    return dayjs().startOf('day');
  }

  getStartDateForTerm(termNumber: number): Dayjs {
    if (!this.lendPeak) {
      return dayjs().startOf('day');
    }
    if (!termNumber || termNumber < 0) {
      return dayjs().startOf('day');
    } else if (termNumber > this.lendPeak.amortization.term) {
      return dayjs().startOf('day');
    }
    const term = this.lendPeak.amortization.repaymentSchedule.entries.filter(
      (row) => row.term === termNumber,
    );
    if (term?.length > 0) {
      return term[term.length - 1].periodStartDate;
    }
    return dayjs().startOf('day');
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

  // Methods related to Pre Bill Day Term
  addPrebillDayTermRow() {
    if (!this.lendPeak) {
      return;
    }
    const preBillDaysConfiguration = this.lendPeak.amortization.preBillDays;
    let termNumber: number;
    let preBillDays: number;

    if (preBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      preBillDays = this.lendPeak.amortization.defaultPreBillDaysConfiguration;
    } else {
      // Following entries
      termNumber = preBillDaysConfiguration.last.termNumber + 1;
      preBillDays = preBillDaysConfiguration.last.preBillDays;
    }

    preBillDaysConfiguration.addConfiguration(
      new PreBillDaysConfiguration({
        termNumber: termNumber,
        preBillDays: preBillDays,
        type: 'custom',
      }),
    );

    this.lendPeak.amortization.preBillDays = preBillDaysConfiguration;
    this.emitLoanChange();
  }

  removePreBillDayTerm(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.preBillDays.length > 0) {
      this.lendPeak.amortization.preBillDays.removeConfigurationAtIndex(index);
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
    let daysDueAfterPeriodEnd: number;

    if (dueBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      daysDueAfterPeriodEnd =
        this.lendPeak.amortization
          .defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      // Following entries
      termNumber = dueBillDaysConfiguration.last.termNumber + 1;
      daysDueAfterPeriodEnd =
        dueBillDaysConfiguration.last.daysDueAfterPeriodEnd;
    }

    dueBillDaysConfiguration.addConfiguration(
      new BillDueDaysConfiguration({
        termNumber: termNumber,
        daysDueAfterPeriodEnd: daysDueAfterPeriodEnd,
        type: 'custom',
      }),
    );

    this.lendPeak.amortization.dueBillDays = dueBillDaysConfiguration;
    this.emitLoanChange();
  }

  removeDueBillDayTerm(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.dueBillDays.length > 0) {
      this.lendPeak.amortization.dueBillDays.removeConfigurationAtIndex(index);
      this.emitLoanChange();
    }
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
      type: 'decrease',
    });

    // this.lendPeak.amortization.balanceModifications.push(balanceModificationToAdd);
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
    // for some reason i cannot map ngModel to date that has getters and setters
    // so i need to manually update the date. I've added jsDate as a simple
    // Date and in this code we know that p-calendar is updating jsDate
    // so we will do a date update here

    //this.lendPeak.amortization.balanceModifications = this.balanceModifications;

    this.lendPeak.amortization.balanceModifications.updateModelValues();
    // Optional: Order the balance modifications by date
    // this.lendPeak.amortization.balanceModifications.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    this.emitLoanChange();
  }

  // Methods related to Fees That Apply to All Terms
  addFeeForAllTerms() {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.feesForAllTerms.addFee(
      new Fee({
        type: 'fixed',
        amount: 0,
        description: '',
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

  // Methods related to Fees Per Term
  addFeePerTerm() {
    if (!this.lendPeak) {
      return;
    }
    if (!this.lendPeak.amortization.feesPerTerm) {
      this.lendPeak.amortization.feesPerTerm = FeesPerTerm.empty();
    }

    this.lendPeak.amortization.feesPerTerm.addFee(
      new TermFees({
        termNumber: 1,
        fees: [
          new Fee({
            type: 'fixed',
            amount: 0,
            description: '',
          }),
        ],
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
    const passedDate = dayjs(
      new Date(ngDate.year, ngDate.month, ngDate.day),
    ).startOf('day');

    for (const row of this.lendPeak.amortization.repaymentSchedule.entries) {
      if (row.periodEndDate.isSame(passedDate)) {
        return true;
      }
    }

    return false;
  }

  cpdTermUpdated(term: number) {
    if (!this.lendPeak) {
      return;
    }
    // when term is changed, we want to populate new oringinal date
    // to do that we need to:
    // - remove modification first
    // - generate new schedule
    // - find end date for the term
    // - populate date
    // - add modification
    // - emit loan change
    this.removeChangePaymentDate(term);
    // find schedule for the term
    const termSchedule =
      this.lendPeak.amortization.repaymentSchedule.entries.find(
        (row) => row.term === term,
      );

    const newDate =
      termSchedule?.periodEndDate.toDate() ||
      this.lendPeak.amortization.repaymentSchedule.lastEntry.periodEndDate.toDate();
    // dayjs(this.lendPeak.amortization.startDate).add(1, 'month').toDate();
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
    // find the term number in the repayment plan
    // const repaymentPlanRow = this.loanRepaymentPlan.find(
    //   (row) => row.period === termNumber
    // );
    // if (repaymentPlanRow) {
    //   this.lendPeak.amortization.changePaymentDates[index].newDate =
    //     repaymentPlanRow.periodEndDate.toDate();
    //   this.emitLoanChange();
    // }
    this.emitLoanChange();
  }

  removeFeePerTerm(termNumber: number) {
    if (!this.lendPeak) {
      return;
    }
    this.lendPeak.amortization.feesPerTerm.removeAllFeesForTerm(termNumber);
  }

  addTermInterestRateOverrideRow() {
    if (!this.lendPeak) {
      return;
    }
    // Default values for a new row
    const lastEntry = this.lendPeak.amortization.termInterestRateOverride.last;
    let termNumber = 1;
    let interestRate = this.lendPeak.amortization.annualInterestRate;

    if (lastEntry) {
      termNumber = lastEntry.termNumber + 1;
      interestRate = lastEntry.interestRate;
    }

    this.lendPeak.amortization.termInterestRateOverride.addOverride(
      new TermInterestRateOverride({
        termNumber: termNumber,
        interestRate: interestRate,
      }),
    );

    this.onInputChange(true);
  }
  // Add row for termInterestOverride
  addTermInterestOverrideRow() {
    if (!this.lendPeak) {
      return;
    }
    // Default values for a new row
    const lastEntry =
      this.lendPeak.amortization.termInterestAmountOverride.last;
    let termNumber = 1;
    let interestAmount = Currency.of(0);

    if (lastEntry) {
      termNumber = lastEntry.termNumber + 1;
      interestAmount = lastEntry.interestAmount;
    }

    this.lendPeak.amortization.termInterestAmountOverride.addOverride(
      new TermInterestAmountOverride({
        termNumber: termNumber,
        interestAmount: interestAmount,
      }),
    );

    this.onInputChange(true);
  }

  removeTermInterestRateOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.termInterestRateOverride.length > 0) {
      this.lendPeak.amortization.termInterestRateOverride.removeOverrideAtIndex(
        index,
      );
      this.onInputChange(true);
    }
  }

  // Remove a specific termInterestOverride row
  removeTermInterestOverride(index: number) {
    if (!this.lendPeak) {
      return;
    }
    if (this.lendPeak.amortization.termInterestAmountOverride.length > 0) {
      this.lendPeak.amortization.termInterestAmountOverride.removeOverrideAtIndex(
        index,
      );
      this.onInputChange(true);
    }
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    tooltipRef.toggle(event);
  }

  // Helper method to emit loan changes
  private emitLoanChange() {
    if (!this.lendPeak) {
      return;
    }
    // this.loanChange.emit(this.lendPeak.amortization);
    this.loanUpdated.emit();
    this.refreshOpenTabs();
  }
}

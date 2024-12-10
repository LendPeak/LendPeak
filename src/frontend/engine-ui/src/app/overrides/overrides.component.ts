// overrides.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import dayjs from 'dayjs';
import { AmortizationEntry } from 'lendpeak-engine/models/Amortization/AmortizationEntry';
import { BalanceModification } from 'lendpeak-engine/models/Amortization/BalanceModification';
import { UILoan } from '../models/loan.model';
import { OverrideSettingsService } from '../services/override-settings.service';
import { OverrideSettings } from '../models/override-settings.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-overrides',
  templateUrl: './overrides.component.html',
  styleUrls: ['./overrides.component.css'],
})
export class OverridesComponent {
  @Input() loan!: UILoan;
  @Input() termOptions: { label: string; value: number }[] = [];
  @Input() balanceIncreaseType: { label: string; value: string }[] = [];
  @Input() loanRepaymentPlan: AmortizationEntry[] = [];

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

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
    this.applyDefaultSettings();
    this.isModified = false;
  }

  applyDefaultSettings() {
    // Reset overrides to default values
    this.loan.termPaymentAmountOverride = [];
    this.loan.ratesSchedule = [];
    this.loan.changePaymentDates = [];
    this.loan.preBillDays = [];
    this.loan.dueBillDays = [];
    this.loan.balanceModifications = [];
    this.loan.feesForAllTerms = [];
    this.loan.feesPerTerm = [];
    // Add other properties as needed

    // Store as original settings
    this.originalSettings = JSON.parse(
      JSON.stringify(this.getCurrentSettings()),
    );

    this.emitLoanChange();
  }

  resetToOriginalSettings() {
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
      this.loan.termPaymentAmountOverride =
        settings.termPaymentAmountOverride || [];
      this.loan.ratesSchedule = settings.ratesSchedule || [];
      this.loan.changePaymentDates = settings.changePaymentDates || [];
      this.loan.preBillDays = settings.preBillDays || [];
      this.loan.dueBillDays = settings.dueBillDays || [];
      this.loan.balanceModifications = settings.balanceModifications || [];
      this.loan.feesForAllTerms = settings.feesForAllTerms || [];
      this.loan.feesPerTerm = settings.feesPerTerm || [];
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
    return {
      termPaymentAmountOverride: this.loan.termPaymentAmountOverride,
      ratesSchedule: this.loan.ratesSchedule,
      changePaymentDates: this.loan.changePaymentDates,
      preBillDays: this.loan.preBillDays,
      dueBillDays: this.loan.dueBillDays,
      balanceModifications: this.loan.balanceModifications,
      feesForAllTerms: this.loan.feesForAllTerms,
      feesPerTerm: this.loan.feesPerTerm,
      termInterestOverride: this.loan.termInterestOverride || [],

      // Add other settings as needed
    };
  }

  // Apply settings to the component
  applySettings(setting: OverrideSettings) {
    const settings = setting.settings;
    this.loan.termPaymentAmountOverride =
      settings.termPaymentAmountOverride || [];
    this.loan.ratesSchedule = settings.ratesSchedule || [];
    this.loan.changePaymentDates = settings.changePaymentDates || [];
    this.loan.preBillDays = settings.preBillDays || [];
    this.loan.dueBillDays = settings.dueBillDays || [];
    this.loan.balanceModifications = settings.balanceModifications || [];
    this.loan.feesForAllTerms = settings.feesForAllTerms || [];
    this.loan.feesPerTerm = settings.feesPerTerm || [];
    this.loan.termInterestOverride = settings.termInterestOverride || [];

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

  onInputChange() {
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
    const termPaymentAmountOverride = this.loan.termPaymentAmountOverride;

    let termNumber: number;
    let paymentAmount: number;

    if (termPaymentAmountOverride.length === 0) {
      // First entry
      termNumber = 1;
      paymentAmount = 0;
    } else {
      // Following entries
      termNumber =
        termPaymentAmountOverride[termPaymentAmountOverride.length - 1]
          .termNumber + 1;
      paymentAmount =
        termPaymentAmountOverride[termPaymentAmountOverride.length - 1]
          .paymentAmount;
    }

    termPaymentAmountOverride.push({
      termNumber: termNumber,
      paymentAmount: paymentAmount,
    });

    this.loan.termPaymentAmountOverride = termPaymentAmountOverride;
    this.emitLoanChange();
  }

  removeTermPaymentAmountOverride(index: number) {
    if (this.loan.termPaymentAmountOverride.length > 0) {
      this.loan.termPaymentAmountOverride.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Rate Overrides
  addRateOverride() {
    const ratesSchedule = this.loan.ratesSchedule;
    let startDate: Date;
    let endDate: Date;

    if (ratesSchedule.length === 0) {
      // First entry: use loan's start date
      startDate = this.loan.startDate;
    } else {
      // Following entries: use end date from previous row as start date
      startDate = ratesSchedule[ratesSchedule.length - 1].endDate;
    }

    // End date is 1 month from start date
    endDate = dayjs(startDate).add(1, 'month').toDate();

    ratesSchedule.push({
      startDate: startDate,
      endDate: endDate,
      annualInterestRate: 10,
    });

    this.loan.ratesSchedule = ratesSchedule;
    this.emitLoanChange();
  }

  removeRateOverride(index: number) {
    if (this.loan.ratesSchedule.length > 0) {
      this.loan.ratesSchedule.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Change Payment Date
  addNewChangePaymentTermRow() {
    const changePaymentDates = this.loan.changePaymentDates;

    if (changePaymentDates.length === 0) {
      // First entry: use loan's start date
      changePaymentDates.push({
        termNumber: 1,
        newDate: dayjs(this.loan.startDate).add(1, 'month').toDate(),
      });
    } else {
      // Following entries: use term number from previous row + 1
      const lastTermNumber =
        changePaymentDates[changePaymentDates.length - 1].termNumber;
      changePaymentDates.push({
        termNumber: lastTermNumber + 1,
        newDate: dayjs(
          changePaymentDates[changePaymentDates.length - 1].newDate,
        )
          .add(1, 'month')
          .toDate(),
      });
    }

    this.loan.changePaymentDates = changePaymentDates;
    this.emitLoanChange();
  }

  removeChangePaymentDate(index: number) {
    if (this.loan.changePaymentDates.length > 0) {
      this.loan.changePaymentDates.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Pre Bill Day Term
  addPrebillDayTermRow() {
    const preBillDaysConfiguration = this.loan.preBillDays;
    let termNumber: number;
    let preBillDays: number;

    if (preBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      preBillDays = this.loan.defaultPreBillDaysConfiguration;
    } else {
      // Following entries
      termNumber =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .termNumber + 1;
      preBillDays =
        preBillDaysConfiguration[preBillDaysConfiguration.length - 1]
          .preBillDays;
    }

    preBillDaysConfiguration.push({
      termNumber: termNumber,
      preBillDays: preBillDays,
    });

    this.loan.preBillDays = preBillDaysConfiguration;
    this.emitLoanChange();
  }

  removePreBillDayTerm(index: number) {
    if (this.loan.preBillDays.length > 0) {
      this.loan.preBillDays.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Due Bill Day Term
  addDueBillDayTermRow() {
    const dueBillDaysConfiguration = this.loan.dueBillDays;
    let termNumber: number;
    let daysDueAfterPeriodEnd: number;

    if (dueBillDaysConfiguration.length === 0) {
      // First entry
      termNumber = 1;
      daysDueAfterPeriodEnd =
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration;
    } else {
      // Following entries
      termNumber =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .termNumber + 1;
      daysDueAfterPeriodEnd =
        dueBillDaysConfiguration[dueBillDaysConfiguration.length - 1]
          .daysDueAfterPeriodEnd;
    }

    dueBillDaysConfiguration.push({
      termNumber: termNumber,
      daysDueAfterPeriodEnd: daysDueAfterPeriodEnd,
    });

    this.loan.dueBillDays = dueBillDaysConfiguration;
    this.emitLoanChange();
  }

  removeDueBillDayTerm(index: number) {
    if (this.loan.dueBillDays.length > 0) {
      this.loan.dueBillDays.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Balance Modifications
  addBalanceModificationRow() {
    const dateOfTheModification =
      this.loan.balanceModifications.length === 0
        ? this.loan.startDate
        : this.loan.balanceModifications[
            this.loan.balanceModifications.length - 1
          ].date;

    const balanceModificationToAdd = new BalanceModification({
      amount: 0,
      date: dateOfTheModification,
      type: 'decrease',
    });

    this.loan.balanceModifications.push(balanceModificationToAdd);
    this.emitLoanChange();
  }

  deleteBalanceModificationRow(index: number) {
    if (this.loan.balanceModifications.length > 0) {
      this.loan.balanceModifications.splice(index, 1);
      this.emitLoanChange();
    }
  }

  balanceModificationChanged() {
    // for some reason i cannot map ngModel to date that has getters and setters
    // so i need to manually update the date. I've added jsDate as a simple
    // Date and in this code we know that p-calendar is updating jsDate
    // so we will do a date update here
    this.loan.balanceModifications.forEach((balanceModification) => {
      balanceModification.syncValuesFromJSProperties();
    });

    // Optional: Order the balance modifications by date
    // this.loan.balanceModifications.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    this.emitLoanChange();
  }

  // Methods related to Fees That Apply to All Terms
  addFeeForAllTerms() {
    if (!this.loan.feesForAllTerms) {
      this.loan.feesForAllTerms = [];
    }

    this.loan.feesForAllTerms.push({
      type: 'fixed',
      amount: 0,
      description: '',
    });

    this.emitLoanChange();
  }

  removeFeeForAllTerms(index: number) {
    if (this.loan.feesForAllTerms && this.loan.feesForAllTerms.length > 0) {
      this.loan.feesForAllTerms.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Methods related to Fees Per Term
  addFeePerTerm() {
    if (!this.loan.feesPerTerm) {
      this.loan.feesPerTerm = [];
    }

    this.loan.feesPerTerm.push({
      termNumber: 1,
      type: 'fixed',
      amount: 0,
      description: '',
    });

    this.emitLoanChange();
  }

  isPeriodEndDate(ngDate: {
    day: number;
    month: number;
    year: number;
  }): boolean {
    const passedDate = dayjs(
      new Date(ngDate.year, ngDate.month, ngDate.day),
    ).startOf('day');

    for (const row of this.loanRepaymentPlan) {
      if (row.periodEndDate.isSame(passedDate)) {
        return true;
      }
    }

    return false;
  }

  updateTermForCPD(index: number, termNumber: number) {
    // find the term number in the repayment plan
    // const repaymentPlanRow = this.loanRepaymentPlan.find(
    //   (row) => row.period === termNumber
    // );
    // if (repaymentPlanRow) {
    //   this.loan.changePaymentDates[index].newDate =
    //     repaymentPlanRow.periodEndDate.toDate();
    //   this.emitLoanChange();
    // }

    if (this.loanRepaymentPlan && this.loanRepaymentPlan.length >= termNumber) {
      this.loan.changePaymentDates[index].newDate =
        this.loanRepaymentPlan[termNumber - 1].periodEndDate.toDate();
      this.emitLoanChange();
    }
  }

  removeFeePerTerm(index: number) {
    if (this.loan.feesPerTerm && this.loan.feesPerTerm.length > 0) {
      this.loan.feesPerTerm.splice(index, 1);
      this.emitLoanChange();
    }
  }

  // Add row for termInterestOverride
  addTermInterestOverrideRow() {
    if (!this.loan.termInterestOverride) {
      this.loan.termInterestOverride = [];
    }

    // Default values for a new row
    const lastEntry =
      this.loan.termInterestOverride[this.loan.termInterestOverride.length - 1];
    let termNumber = 1;
    let interestAmount = 0;

    if (lastEntry) {
      termNumber = lastEntry.termNumber + 1;
      interestAmount = lastEntry.interestAmount;
    }

    this.loan.termInterestOverride.push({
      termNumber: termNumber,
      interestAmount: interestAmount,
    });

    this.onInputChange();
  }

  // Remove a specific termInterestOverride row
  removeTermInterestOverride(index: number) {
    if (
      this.loan.termInterestOverride &&
      this.loan.termInterestOverride.length > 0
    ) {
      this.loan.termInterestOverride.splice(index, 1);
      this.onInputChange();
    }
  }

  showTooltip(event: Event, tooltipRef: OverlayPanel) {
    tooltipRef.toggle(event);
  }

  // Helper method to emit loan changes
  private emitLoanChange() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }
}

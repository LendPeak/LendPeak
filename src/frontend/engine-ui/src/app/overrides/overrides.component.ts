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
import { TermInterestAmountOverrides } from 'lendpeak-engine/models/TermInterestAmountOverrides';

@Component({
  selector: 'app-overrides',
  templateUrl: './overrides.component.html',
  styleUrls: ['./overrides.component.css'],
  standalone: false,
})
export class OverridesComponent implements OnInit {
  @Input() loan!: Amortization;
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
    //this.balanceModifications = this.loan.balanceModifications;
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
    // Clear or initialize the array each time
    this.openPanels = [];

    // Panel: Interest Rate
    if (this.loan?.rateSchedules?.hasCustom) {
      this.openPanels.push('interestRate');
    }

    // Panel: Payment Settings (EIP)
    // You might open this if a certain condition is met, e.g., loan.termPaymentAmount > 0
    if (this.loan.hasCustomEquitedMonthlyPayment) {
      this.openPanels.push('paymentSettings');
    }

    // Panel: Term Payment Amount
    if (this.loan?.termPaymentAmountOverride?.length > 0) {
      this.openPanels.push('termPaymentAmount');
    }

    // Panel: Term Interest Override
    if (
      this.loan?.termInterestAmountOverride &&
      this.loan?.termInterestAmountOverride?.length > 0
    ) {
      this.openPanels.push('termInterestOverride');
    }

    // Panel: Change Payment Date
    if (this.loan?.changePaymentDates?.length > 0) {
      this.openPanels.push('changePaymentDates');
    }

    // Panel: Pre Bill Day Term
    if (this.loan?.preBillDays?.hasCustom) {
      this.openPanels.push('preBillDayTerm');
    }

    // Panel: Due Bill Day Term
    if (this.loan?.dueBillDays?.hasCustom) {
      this.openPanels.push('dueBillDayTerm');
    }

    // Panel: Balance Modifications
    if (this.loan?.balanceModifications?.length > 0) {
      this.openPanels.push('balanceModifications');
    }

    // Panel: Fees That Apply to All Terms
    if (this.loan?.feesForAllTerms?.length > 0) {
      this.openPanels.push('feesForAllTerms');
    }

    // Panel: Fees Per Term
    if (this.loan?.feesPerTerm?.length > 0) {
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
    // Reset overrides to default values
    this.loan.termPaymentAmountOverride = new TermPaymentAmounts();
    this.loan.rateSchedules = new RateSchedules();
    this.loan.changePaymentDates = new ChangePaymentDates();
    this.loan.preBillDays = new PreBillDaysConfigurations();
    this.loan.dueBillDays = new BillDueDaysConfigurations();
    this.loan.balanceModifications = new BalanceModifications();
    this.loan.feesForAllTerms = [];
    this.loan.feesPerTerm = FeesPerTerm.empty();
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
      this.loan.rateSchedules = settings.rateSchedules || [];
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
      ratesSchedule: this.loan.repaymentSchedule,
      changePaymentDates: this.loan.changePaymentDates,
      preBillDays: this.loan.preBillDays,
      dueBillDays: this.loan.dueBillDays,
      balanceModifications: this.loan.balanceModifications,
      feesForAllTerms: this.loan.feesForAllTerms,
      feesPerTerm: this.loan.feesPerTerm,
      termInterestAmountOverride: this.loan.termInterestAmountOverride || [],

      // Add other settings as needed
    };
  }

  // Apply settings to the component
  applySettings(setting: OverrideSettings) {
    const settings = setting.settings;
    this.loan.termPaymentAmountOverride =
      settings.termPaymentAmountOverride || [];
    this.loan.repaymentSchedule = settings.ratesSchedule || [];
    this.loan.changePaymentDates = settings.changePaymentDates || [];
    this.loan.preBillDays = settings.preBillDays || [];
    this.loan.dueBillDays = settings.dueBillDays || [];
    this.loan.balanceModifications = settings.balanceModifications || [];
    this.loan.feesForAllTerms = settings.feesForAllTerms || [];
    this.loan.feesPerTerm = settings.feesPerTerm || [];
    this.loan.termInterestAmountOverride =
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
    if (event === null || event === undefined) {
      return;
    }
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

    if (termNumber > this.loan.term) {
      termNumber = this.loan.term;
    }

    termPaymentAmountOverride.addPaymentAmount(
      new TermPaymentAmount({
        termNumber: termNumber,
        paymentAmount: paymentAmount,
      }),
    );

    this.loan.termPaymentAmountOverride = termPaymentAmountOverride;
    this.onInputChange(true);
  }

  removeTermPaymentAmountOverride(index: number) {
    if (this.loan.termPaymentAmountOverride.length > 0) {
      this.loan.termPaymentAmountOverride.removePaymentAmountAtIndex(index);
      this.emitLoanChange();
    }
  }

  // Methods related to Rate Overrides
  addRateOverride() {
    // const ratesSchedule = this.loan.rateSchedules;
    // let startDate: Dayjs;
    // let endDate: Dayjs;

    // if (ratesSchedule.length === 0) {
    //   // First entry: use loan's start date
    //   startDate = this.loan.startDate;
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

    this.loan.hasCustomRateSchedule = true;

    if (this.loan.rateSchedules.length === 0) {
      this.loan.rateSchedules.addSchedule(
        new RateSchedule({
          startDate: this.loan.rateSchedules.first.startDate,
          endDate: this.loan.rateSchedules.first.endDate,
          annualInterestRate: this.loan.rateSchedules.first.annualInterestRate,
        }),
      );
    } else {
      this.loan.rateSchedules.addSchedule(
        new RateSchedule({
          startDate: this.loan.rateSchedules.last.endDate,
          endDate: dayjs(this.loan.rateSchedules.last.endDate).add(1, 'month'),
          annualInterestRate: this.loan.rateSchedules.last.annualInterestRate,
        }),
      );
    }
    //  this.loan.rateSchedules = ratesSchedule;
    this.emitLoanChange();
  }

  removeRateOverride(index: number) {
    if (this.loan.rateSchedules.length > 0) {
      this.loan.rateSchedules.removeScheduleAtIndex(index);
      this.emitLoanChange();
    }
  }

  // Methods related to Change Payment Date
  addNewChangePaymentTermRow() {
    const changePaymentDates = this.loan.changePaymentDates;

    if (changePaymentDates.length === 0) {
      // First entry: use loan's start date
      changePaymentDates.addChangePaymentDate(
        new ChangePaymentDate({
          termNumber: 1,
          newDate: dayjs(this.loan.startDate).add(1, 'month').toDate(),
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

    this.loan.changePaymentDates = changePaymentDates;
    this.emitLoanChange();
  }

  getEndDateForTerm(termNumber: number): Dayjs {
    if (!termNumber || termNumber < 0) {
      return dayjs().startOf('day');
    }
    const term = this.loan.repaymentSchedule.entries.filter(
      (row) => row.term === termNumber,
    );
    if (term) {
      return term[term.length - 1].periodEndDate;
    }
    return dayjs().startOf('day');
  }

  getStartDateForTerm(termNumber: number): Dayjs {
    if (!termNumber || termNumber < 0) {
      return dayjs().startOf('day');
    } else if (termNumber > this.loan.term) {
      return dayjs().startOf('day');
    }
    const term = this.loan.repaymentSchedule.entries.filter(
      (row) => row.term === termNumber,
    );
    if (term) {
      return term[term.length - 1].periodStartDate;
    }
    return dayjs().startOf('day');
  }

  removeChangePaymentDate(index: number) {
    if (this.loan.changePaymentDates.length > 0) {
      this.loan.changePaymentDates.removeConfigurationAtIndex(index);
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

    this.loan.preBillDays = preBillDaysConfiguration;
    this.emitLoanChange();
  }

  removePreBillDayTerm(index: number) {
    if (this.loan.preBillDays.length > 0) {
      this.loan.preBillDays.removeConfigurationAtIndex(index);
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

    this.loan.dueBillDays = dueBillDaysConfiguration;
    this.emitLoanChange();
  }

  removeDueBillDayTerm(index: number) {
    if (this.loan.dueBillDays.length > 0) {
      this.loan.dueBillDays.removeConfigurationAtIndex(index);
      this.emitLoanChange();
    }
  }

  // Methods related to Balance Modifications
  addBalanceModificationRow() {
    const dateOfTheModification =
      this.loan.balanceModifications.lastModification?.date ||
      this.loan.startDate;

    const balanceModificationToAdd = new BalanceModification({
      amount: 0,
      date: dateOfTheModification,
      type: 'decrease',
    });

    // this.loan.balanceModifications.push(balanceModificationToAdd);
    this.loan.balanceModifications.addBalanceModification(
      balanceModificationToAdd,
    );
    this.emitLoanChange();
  }

  deleteBalanceModificationRow(index: number) {
    if (this.loan.balanceModifications.length > 0) {
      this.loan.balanceModifications.removeBalanceModificationAtIndex(index);
    }
    this.emitLoanChange();
  }

  balanceModificationChanged() {
    // for some reason i cannot map ngModel to date that has getters and setters
    // so i need to manually update the date. I've added jsDate as a simple
    // Date and in this code we know that p-calendar is updating jsDate
    // so we will do a date update here

    //this.loan.balanceModifications = this.balanceModifications;

    this.loan.balanceModifications.updateModelValues();
    // Optional: Order the balance modifications by date
    // this.loan.balanceModifications.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    this.emitLoanChange();
  }

  // Methods related to Fees That Apply to All Terms
  addFeeForAllTerms() {
    if (!this.loan.feesForAllTerms) {
      this.loan.feesForAllTerms = [];
    }

    this.loan.feesForAllTerms.push(
      new Fee({
        type: 'fixed',
        amount: 0,
        description: '',
      }),
    );

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
      this.loan.feesPerTerm = FeesPerTerm.empty();
    }

    this.loan.feesPerTerm.addFee(
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
    const passedDate = dayjs(
      new Date(ngDate.year, ngDate.month, ngDate.day),
    ).startOf('day');

    for (const row of this.loan.repaymentSchedule.entries) {
      if (row.periodEndDate.isSame(passedDate)) {
        return true;
      }
    }

    return false;
  }

  cpdUpdated() {
    this.loan.changePaymentDates.updateModelValues();
    // find the term number in the repayment plan
    // const repaymentPlanRow = this.loanRepaymentPlan.find(
    //   (row) => row.period === termNumber
    // );
    // if (repaymentPlanRow) {
    //   this.loan.changePaymentDates[index].newDate =
    //     repaymentPlanRow.periodEndDate.toDate();
    //   this.emitLoanChange();
    // }
    this.emitLoanChange();
  }

  removeFeePerTerm(termNumber: number) {
    this.loan.feesPerTerm.removeAllFeesForTerm(termNumber);
  }

  addTermInterestRateOverrideRow() {
    if (!this.loan.termInterestRateOverride) {
      this.loan.termInterestRateOverride = [];
    }

    // Default values for a new row
    const lastEntry =
      this.loan.termInterestRateOverride[
        this.loan.termInterestRateOverride.length - 1
      ];
    let termNumber = 1;
    let interestRate = this.loan.annualInterestRate;

    if (lastEntry) {
      termNumber = lastEntry.termNumber + 1;
      interestRate = lastEntry.interestRate;
    }

    this.loan.termInterestRateOverride.push(
      new TermInterestRateOverride({
        termNumber: termNumber,
        interestRate: interestRate,
      }),
    );

    this.onInputChange(true);
  }
  // Add row for termInterestOverride
  addTermInterestOverrideRow() {
    if (!this.loan.termInterestAmountOverride) {
      this.loan.termInterestAmountOverride = new TermInterestAmountOverrides();
    }

    // Default values for a new row
    const lastEntry = this.loan.termInterestAmountOverride.last;
    let termNumber = 1;
    let interestAmount = Currency.of(0);

    if (lastEntry) {
      termNumber = lastEntry.termNumber + 1;
      interestAmount = lastEntry.interestAmount;
    }

    this.loan.termInterestAmountOverride.addOverride(
      new TermInterestAmountOverride({
        termNumber: termNumber,
        interestAmount: interestAmount,
      }),
    );

    this.onInputChange(true);
  }

  removeTermInterestRateOverride(index: number) {
    if (
      this.loan.termInterestRateOverride &&
      this.loan.termInterestRateOverride.length > 0
    ) {
      this.loan.termInterestRateOverride.splice(index, 1);
      this.onInputChange(true);
    }
  }

  // Remove a specific termInterestOverride row
  removeTermInterestOverride(index: number) {
    if (this.loan.termInterestAmountOverride.length > 0) {
      this.loan.termInterestAmountOverride.removeOverrideAtIndex(index);
      this.onInputChange(true);
    }
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    tooltipRef.toggle(event);
  }

  // Helper method to emit loan changes
  private emitLoanChange() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
    this.refreshOpenTabs();
  }
}

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AdvancedSettingsService } from '../services/advanced-settings.service';
import { AdvancedSettings } from '../models/advanced-settings.model';
import { v4 as uuidv4 } from 'uuid';
// REMOVE this import:
// import { OverlayPanel } from 'primeng/overlaypanel';
// ADD this import for p-popover:
import { Popover } from 'primeng/popover';
import { DropDownOptionNumber, DropDownOptionString } from '../models/common.model';
import { CalendarType } from 'lendpeak-engine/models/Calendar';

import { PaymentAllocationStrategyName, PaymentComponent } from 'lendpeak-engine/models/PaymentApplication/Types';
import { Amortization, FlushUnbilledInterestDueToRoundingErrorType } from 'lendpeak-engine/models/Amortization';
import { Calendar } from 'lendpeak-engine/models/Calendar';
import { TermCalendars } from 'lendpeak-engine/models/TermCalendars';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { RoundingMethod, Currency } from 'lendpeak-engine/utils/Currency';

@Component({
  selector: 'app-advanced-settings',
  templateUrl: './advanced-settings.component.html',
  styleUrls: ['./advanced-settings.component.css'],
  standalone: false,
})
export class AdvancedSettingsComponent implements OnInit {
  @Input() lendPeak?: LendPeak;
  @Input() paymentAllocationStrategyName: PaymentAllocationStrategyName = 'FIFO';
  @Output() loanChange = new EventEmitter<Amortization>();
  @Output() loanUpdated = new EventEmitter<void>();

  // For managing settings
  savedSettings: AdvancedSettings[] = [];
  selectedSettingId: string | null = null;
  isModified: boolean = false;
  currentSettingVersion: number = 1;

  // Dialog visibility flags
  showSaveSettingsDialog: boolean = false;
  showLoadSettingsDialog: boolean = false;
  showPreviewSettingsDialog: boolean = false;

  // For displaying loaded settings
  loadedSettingName: string = '';
  loadedSettingVersion: number | null = null;
  originalSettings: any = {};

  // For saving settings
  newSetting: AdvancedSettings = {
    id: '',
    name: '',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: false,
    settings: {},
  };

  selectedSetting: AdvancedSettings | null = null;

  // Dropdown options
  calendarTypes: DropDownOptionNumber[] = [
    { label: 'Actual/Actual', value: CalendarType.ACTUAL_ACTUAL },
    { label: 'Actual/360', value: CalendarType.ACTUAL_360 },
    { label: 'Actual/365', value: CalendarType.ACTUAL_365 },
    { label: 'Actual/365 (No-Leap)', value: CalendarType.ACTUAL_365_NL },
    { label: '30/360 (EU)', value: CalendarType.THIRTY_360 },
    { label: '30/360 (US)', value: CalendarType.THIRTY_360_US }, // NASD / Bond basis
    { label: '30/Actual', value: CalendarType.THIRTY_ACTUAL },
  ];

  termPeriodUnits: DropDownOptionString[] = [
    { label: 'Year', value: 'year' },
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
  ];

  roundingMethods: DropDownOptionNumber[] = [
    { label: 'Round Up', value: RoundingMethod.ROUND_UP },
    { label: 'Round Down', value: RoundingMethod.ROUND_DOWN },
    { label: 'Round Half Up', value: RoundingMethod.ROUND_HALF_UP },
    { label: 'Round Half Down', value: RoundingMethod.ROUND_HALF_DOWN },
    {
      label: 'Round Half Even (Bankers Rounding)',
      value: RoundingMethod.ROUND_HALF_EVEN,
    },
    { label: 'Round Half Ceiling', value: RoundingMethod.ROUND_HALF_CEIL },
    { label: 'Round Half Floor', value: RoundingMethod.ROUND_HALF_FLOOR },
  ];

  flushMethods: DropDownOptionString[] = [
    { label: 'None', value: 'none' },
    { label: 'At End', value: 'at_end' },
    { label: 'At Threshold', value: 'at_threshold' },
  ];

  perDiemCalculationTypes: DropDownOptionString[] = [
    {
      label: 'Annual Rate Divided by Days in Year',
      value: 'AnnualRateDividedByDaysInYear',
    },
    {
      label: 'Monthly Rate Divided by Days in Month',
      value: 'MonthlyRateDividedByDaysInMonth',
    },
  ];

  billingModelOptions: DropDownOptionString[] = [
    { label: 'Amortized Loan', value: 'amortized' },
    { label: 'Daily Simple Interest Loan', value: 'dailySimpleInterest' },
  ];

  paymentAllocationStrategies: DropDownOptionString[] = [
    { label: 'First In First Out (FIFO)', value: 'FIFO' },
    { label: 'Last In First Out (LIFO)', value: 'LIFO' },
    { label: 'Equal Distribution', value: 'EqualDistribution' },
    { label: 'Proportional', value: 'Proportional' },
  ];

  paymentPriorityOptions: PaymentComponent[] = ['interest', 'fees', 'principal'];
  paymentPriority: PaymentComponent[] = ['interest', 'fees', 'principal'];

  hoveredPriorityIndex: number | null = null;

  constructor(private advancedSettingsService: AdvancedSettingsService) {}

  ngOnInit() {
    this.loadSavedSettings();

    // Check for default settings
    const defaultSetting = this.advancedSettingsService.getDefaultSetting();
    if (defaultSetting) {
      this.applySettings(defaultSetting);
      this.selectedSettingId = defaultSetting.id;
    } else {
      // If no default, store the current settings as original
      this.originalSettings = this.getCurrentSettings();
    }
  }

  startWithNewSettings() {
    if (this.isModified) {
      if (!confirm('You have unsaved changes. Do you want to discard them and start with default settings?')) {
        return;
      }
    }
    this.selectedSettingId = null;
    this.loadedSettingName = '';
    this.loadedSettingVersion = null;
    this.applyDefaultSettings();
    this.isModified = false;
  }

  applyDefaultSettings() {
    if (!this.lendPeak) {
      return;
    }
    // Reset to default values
    this.lendPeak.amortization.calendars = new TermCalendars({
      primary: CalendarType.THIRTY_360_US,
    });
    this.lendPeak.amortization.termPeriodDefinition = {
      unit: 'month',
      count: [1],
    };
    this.lendPeak.amortization.roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
    this.lendPeak.amortization.flushUnbilledInterestRoundingErrorMethod =
      FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
    this.lendPeak.amortization.perDiemCalculationType = 'AnnualRateDividedByDaysInYear';
    this.lendPeak.amortization.billingModel = 'amortized';
    this.paymentAllocationStrategyName = 'FIFO';
    this.paymentPriority = ['interest', 'fees', 'principal'];
    this.lendPeak.amortization.defaultPreBillDaysConfiguration = 5;
    this.lendPeak.amortization.defaultBillDueDaysAfterPeriodEndConfiguration = 3;
    this.lendPeak.amortization.allowRateAbove100 = false;
    this.lendPeak.amortization.flushThreshold = Currency.of(0.01);
    this.lendPeak.amortization.roundingPrecision = 2;
    this.lendPeak.autoCloseThreshold = Currency.of(10.0);
    this.lendPeak.amortization.interestAccruesFromDayZero = false;

    // Store as original settings
    this.originalSettings = this.getCurrentSettings();

    this.emitLoanChange();
  }

  // Reset to original settings
  resetToOriginalSettings() {
    if (!this.lendPeak) {
      return;
    }
    if (this.selectedSettingId) {
      const originalSetting = this.advancedSettingsService.getSettingById(this.selectedSettingId);
      if (originalSetting) {
        this.applySettings(originalSetting);
        this.isModified = false;
      }
    } else {
      // Reset to stored original settings
      const settings = this.originalSettings;
      this.lendPeak.amortization.calendars = new TermCalendars(settings.calendarType);
      this.lendPeak.amortization.termPeriodDefinition = settings.termPeriodDefinition;
      this.lendPeak.amortization.roundingMethod = settings.roundingMethod;
      this.lendPeak.amortization.flushUnbilledInterestRoundingErrorMethod = settings.flushMethod;
      this.lendPeak.amortization.perDiemCalculationType = settings.perDiemCalculationType;
      this.lendPeak.amortization.billingModel = settings.billingModel;
      this.paymentAllocationStrategyName = settings.paymentAllocationStrategy;
      this.paymentPriority = settings.paymentPriority;
      this.lendPeak.amortization.defaultPreBillDaysConfiguration = settings.defaultPreBillDaysConfiguration;
      this.lendPeak.amortization.defaultBillDueDaysAfterPeriodEndConfiguration =
        settings.defaultBillDueDaysAfterPeriodEndConfiguration;
      this.lendPeak.amortization.allowRateAbove100 = settings.allowRateAbove100;
      this.lendPeak.amortization.flushThreshold = settings.flushThreshold;
      this.lendPeak.amortization.roundingPrecision = settings.roundingPrecision;

      this.emitLoanChange();
      this.isModified = false;
    }
  }

  // Save the current settings
  saveCurrentSettings() {
    const newSetting: AdvancedSettings = {
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

  // Update the current settings and create a new version
  updateCurrentSettings() {
    if (this.selectedSettingId) {
      const existingSetting = this.advancedSettingsService.getSettingById(this.selectedSettingId);
      if (existingSetting) {
        const newVersionNumber = existingSetting.version + 1;

        const updatedSetting: AdvancedSettings = {
          id: uuidv4(),
          name: existingSetting.name,
          version: newVersionNumber,
          createdAt: existingSetting.createdAt,
          updatedAt: new Date(),
          previousVersionId: existingSetting.id,
          isDefault: existingSetting.isDefault,
          settings: this.getCurrentSettings(),
        };

        // Save the new version
        this.advancedSettingsService.saveSetting(updatedSetting);

        // Update the loaded setting info
        this.selectedSettingId = updatedSetting.id;
        this.loadedSettingName = updatedSetting.name;
        this.loadedSettingVersion = updatedSetting.version;

        // Update original settings
        this.originalSettings = JSON.parse(JSON.stringify(this.getCurrentSettings()));

        // Reload saved settings
        this.loadSavedSettings();

        // Reset the modified flag
        this.isModified = false;
      }
    }
  }

  // Get the current settings
  getCurrentSettings() {
    if (!this.lendPeak) {
      return;
    }
    return {
      calendars: this.lendPeak.amortization.calendars,
      termPeriodDefinition: this.lendPeak.amortization.termPeriodDefinition,
      roundingMethod: this.lendPeak.amortization.roundingMethod,
      flushMethod: this.lendPeak.amortization.flushUnbilledInterestRoundingErrorMethod,
      perDiemCalculationType: this.lendPeak.amortization.perDiemCalculationType,
      billingModel: this.lendPeak.amortization.billingModel,
      paymentAllocationStrategyName: this.paymentAllocationStrategyName,
      paymentPriority: this.paymentPriority,
      defaultPreBillDaysConfiguration: this.lendPeak.amortization.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration:
        this.lendPeak.amortization.defaultBillDueDaysAfterPeriodEndConfiguration,
      allowRateAbove100: this.lendPeak.amortization.allowRateAbove100,
      flushThreshold: this.lendPeak.amortization.flushThreshold.toNumber(),
      roundingPrecision: this.lendPeak.amortization.roundingPrecision,
      autoCloseThreshold: this.lendPeak.autoCloseThreshold.toNumber(),
      interestAccruesFromDayZero: this.lendPeak.amortization.interestAccruesFromDayZero,
    };
  }

  // Apply settings to the component
  applySettings(setting: AdvancedSettings) {
    if (!this.lendPeak) {
      return;
    }

    const settings = setting.settings;

    if (settings.calendars) {
      this.lendPeak.amortization.calendars = new TermCalendars(settings.calendars.primary);
    }

    this.lendPeak.amortization.termPeriodDefinition = settings.termPeriodDefinition || {
      unit: 'month',
      count: [1],
    };
    this.lendPeak.amortization.roundingMethod = settings.roundingMethod || 'ROUND_HALF_EVEN';
    this.lendPeak.amortization.flushUnbilledInterestRoundingErrorMethod = settings.flushMethod || 'at_threshold';
    this.lendPeak.amortization.perDiemCalculationType =
      settings.perDiemCalculationType || 'AnnualRateDividedByDaysInYear';
    this.lendPeak.amortization.billingModel = settings.billingModel || 'amortized';
    this.paymentAllocationStrategyName = settings.paymentAllocationStrategy || 'FIFO';
    this.paymentPriority = settings.paymentPriority || ['interest', 'fees', 'principal'];
    this.lendPeak.amortization.defaultPreBillDaysConfiguration = settings.defaultPreBillDaysConfiguration || 5;
    this.lendPeak.amortization.defaultBillDueDaysAfterPeriodEndConfiguration =
      settings.defaultBillDueDaysAfterPeriodEndConfiguration || 3;
    this.lendPeak.amortization.allowRateAbove100 = settings.allowRateAbove100 || false;
    this.lendPeak.amortization.flushThreshold = settings.flushThreshold || 0.01;
    this.lendPeak.amortization.roundingPrecision = settings.roundingPrecision || 2;
    this.lendPeak.amortization.interestAccruesFromDayZero = settings.interestAccruesFromDayZero ?? false;

    this.lendPeak.autoCloseThreshold = Currency.of(settings.autoCloseThreshold ?? 10);
    // Update loaded settings info
    this.loadedSettingName = setting.name;
    this.loadedSettingVersion = setting.version;
    this.originalSettings = JSON.parse(JSON.stringify(settings));

    // this.emitLoanChange();
    this.isModified = false;
  }

  // Load saved settings from the service
  loadSavedSettings() {
    this.savedSettings = this.advancedSettingsService.getAllSettings();
  }

  // Emit changes to the parent component
  emitLoanChange() {
    this.loanChange.emit();
    this.loanUpdated.emit();
  }

  // Track modifications
  onInputChange() {
    this.isModified = true;
    this.emitLoanChange();
  }

  termPeriodDefinitionChange() {
    if (!this.lendPeak) {
      return;
    }
    const termUnit =
      this.lendPeak.amortization.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.lendPeak.amortization.termPeriodDefinition.unit;
    // Adjust endDate and firstPaymentDate based on termPeriodDefinition
    // ... (implement your logic here)
    this.isModified = true;
    this.emitLoanChange();
  }

  onPaymentPriorityChange() {
    // Ensure that each component is selected only once
    // Remove duplicates
    this.paymentPriority = Array.from(new Set(this.paymentPriority));

    // If the array is less than 3 elements, add missing components
    const allComponents: PaymentComponent[] = ['interest', 'fees', 'principal'];
    for (const component of allComponents) {
      if (!this.paymentPriority.includes(component)) {
        this.paymentPriority.push(component);
      }
    }

    this.isModified = true;
    this.emitLoanChange();
  }

  // Open Save Settings Dialog
  openSaveSettingsDialog(setting: AdvancedSettings) {
    this.newSetting = setting;
    this.showSaveSettingsDialog = true;
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

  // Confirm Save Settings
  confirmSaveSettings() {
    if (!this.newSetting.name) {
      // Handle validation error
      return;
    }

    this.advancedSettingsService.saveSetting(this.newSetting);
    this.loadSavedSettings();
    this.showSaveSettingsDialog = false;
    this.selectedSettingId = this.newSetting.id;
    this.isModified = false;
  }

  // Open Load Settings Dialog
  openLoadSettingsDialog() {
    this.loadSavedSettings();
    this.showLoadSettingsDialog = true;
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
  previewSettings(setting: AdvancedSettings) {
    this.selectedSetting = setting;
    this.showPreviewSettingsDialog = true;
  }

  // Delete a setting
  deleteSetting(id: string) {
    this.advancedSettingsService.deleteSetting(id);
    this.loadSavedSettings();
  }

  // Tooltip display
  // REPLACE 'OverlayPanel' with 'Popover' in the method signature:
  showTooltip(event: Event, tooltipRef: Popover) {
    tooltipRef.toggle(event);
  }

  movePaymentPriorityUp(index: number) {
    if (index > 0) {
      const temp = this.paymentPriority[index - 1];
      this.paymentPriority[index - 1] = this.paymentPriority[index];
      this.paymentPriority[index] = temp;
      this.onPaymentPriorityChange();
    }
  }

  movePaymentPriorityDown(index: number) {
    if (index < this.paymentPriority.length - 1) {
      const temp = this.paymentPriority[index + 1];
      this.paymentPriority[index + 1] = this.paymentPriority[index];
      this.paymentPriority[index] = temp;
      this.onPaymentPriorityChange();
    }
  }
}

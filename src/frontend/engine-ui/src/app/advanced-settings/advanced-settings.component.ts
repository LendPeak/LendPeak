import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AdvancedSettingsService } from '../services/advanced-settings.service';
import { AdvancedSettings } from '../models/advanced-settings.model';
import { v4 as uuidv4 } from 'uuid';
// REMOVE this import:
// import { OverlayPanel } from 'primeng/overlaypanel';
// ADD this import for p-popover:
import { Popover } from 'primeng/popover';
import {
  DropDownOptionNumber,
  DropDownOptionString,
} from '../models/common.model';
import { CalendarType } from 'lendpeak-engine/models/Calendar';

import {
  PaymentAllocationStrategyName,
  PaymentComponent,
} from 'lendpeak-engine/models/PaymentApplication/Types';
import {
  Amortization,
  FlushUnbilledInterestDueToRoundingErrorType,
} from 'lendpeak-engine/models/Amortization';
import { Calendar } from 'lendpeak-engine/models/Calendar';
import { RoundingMethod, Currency } from 'lendpeak-engine/utils/Currency';

@Component({
  selector: 'app-advanced-settings',
  templateUrl: './advanced-settings.component.html',
  styleUrls: ['./advanced-settings.component.css'],
  standalone: false,
})
export class AdvancedSettingsComponent implements OnInit {
  @Input() loan!: Amortization;
  @Input() paymentAllocationStrategyName: PaymentAllocationStrategyName =
    'FIFO';
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
    { label: '30/360', value: CalendarType.THIRTY_360 },
    { label: '30/Actual', value: CalendarType.THIRTY_ACTUAL },
  ];

  termPeriodUnits: DropDownOptionString[] = [
    { label: 'Year', value: 'year' },
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
  ];

  roundingMethods: DropDownOptionString[] = [
    { label: 'Round Up', value: 'ROUND_UP' },
    { label: 'Round Down', value: 'ROUND_DOWN' },
    { label: 'Round Half Up', value: 'ROUND_HALF_UP' },
    { label: 'Round Half Down', value: 'ROUND_HALF_DOWN' },
    { label: 'Round Half Even (Bankers Rounding)', value: 'ROUND_HALF_EVEN' },
    { label: 'Round Half Ceiling', value: 'ROUND_HALF_CEIL' },
    { label: 'Round Half Floor', value: 'ROUND_HALF_FLOOR' },
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

  paymentPriorityOptions: PaymentComponent[] = [
    'interest',
    'fees',
    'principal',
  ];
  paymentPriority: PaymentComponent[] = ['interest', 'fees', 'principal'];

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
    this.loadedSettingVersion = null;
    this.applyDefaultSettings();
    this.isModified = false;
  }

  applyDefaultSettings() {
    // Reset to default values
    this.loan.calendar = new Calendar('THIRTY_360');
    this.loan.termPeriodDefinition = { unit: 'month', count: [1] };
    this.loan.roundingMethod = RoundingMethod.ROUND_HALF_EVEN;
    this.loan.flushUnbilledInterestRoundingErrorMethod =
      FlushUnbilledInterestDueToRoundingErrorType.AT_THRESHOLD;
    this.loan.perDiemCalculationType = 'AnnualRateDividedByDaysInYear';
    this.loan.billingModel = 'amortized';
    this.paymentAllocationStrategyName = 'FIFO';
    this.paymentPriority = ['interest', 'fees', 'principal'];
    this.loan.defaultPreBillDaysConfiguration = 5;
    this.loan.defaultBillDueDaysAfterPeriodEndConfiguration = 3;
    this.loan.allowRateAbove100 = false;
    this.loan.flushThreshold = Currency.of(0.01);
    this.loan.roundingPrecision = 2;

    // Store as original settings
    this.originalSettings = JSON.parse(
      JSON.stringify(this.getCurrentSettings()),
    );

    this.emitLoanChange();
  }

  // Reset to original settings
  resetToOriginalSettings() {
    if (this.selectedSettingId) {
      const originalSetting = this.advancedSettingsService.getSettingById(
        this.selectedSettingId,
      );
      if (originalSetting) {
        this.applySettings(originalSetting);
        this.isModified = false;
      }
    } else {
      // Reset to stored original settings
      const settings = this.originalSettings;
      this.loan.calendar.calendarType = settings.calendarType;
      this.loan.termPeriodDefinition = settings.termPeriodDefinition;
      this.loan.roundingMethod = settings.roundingMethod;
      this.loan.flushUnbilledInterestRoundingErrorMethod = settings.flushMethod;
      this.loan.perDiemCalculationType = settings.perDiemCalculationType;
      this.loan.billingModel = settings.billingModel;
      this.paymentAllocationStrategyName = settings.paymentAllocationStrategy;
      this.paymentPriority = settings.paymentPriority;
      this.loan.defaultPreBillDaysConfiguration =
        settings.defaultPreBillDaysConfiguration;
      this.loan.defaultBillDueDaysAfterPeriodEndConfiguration =
        settings.defaultBillDueDaysAfterPeriodEndConfiguration;
      this.loan.allowRateAbove100 = settings.allowRateAbove100;
      this.loan.flushThreshold = settings.flushThreshold;
      this.loan.roundingPrecision = settings.roundingPrecision;

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
      const existingSetting = this.advancedSettingsService.getSettingById(
        this.selectedSettingId,
      );
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
        this.originalSettings = JSON.parse(
          JSON.stringify(this.getCurrentSettings()),
        );

        // Reload saved settings
        this.loadSavedSettings();

        // Reset the modified flag
        this.isModified = false;
      }
    }
  }

  // Get the current settings
  getCurrentSettings() {
    return {
      calendarType: this.loan.calendar.calendarType,
      termPeriodDefinition: this.loan.termPeriodDefinition,
      roundingMethod: this.loan.roundingMethod,
      flushMethod: this.loan.flushUnbilledInterestRoundingErrorMethod,
      perDiemCalculationType: this.loan.perDiemCalculationType,
      billingModel: this.loan.billingModel,
      paymentAllocationStrategyName: this.paymentAllocationStrategyName,
      paymentPriority: this.paymentPriority,
      defaultPreBillDaysConfiguration:
        this.loan.defaultPreBillDaysConfiguration,
      defaultBillDueDaysAfterPeriodEndConfiguration:
        this.loan.defaultBillDueDaysAfterPeriodEndConfiguration,
      allowRateAbove100: this.loan.allowRateAbove100,
      flushThreshold: this.loan.flushThreshold,
      roundingPrecision: this.loan.roundingPrecision,
    };
  }

  // Apply settings to the component
  applySettings(setting: AdvancedSettings) {
    const settings = setting.settings;
    this.loan.calendar.calendarType = settings.calendarType || 'THIRTY_360';
    this.loan.termPeriodDefinition = settings.termPeriodDefinition || {
      unit: 'month',
      count: [1],
    };
    this.loan.roundingMethod = settings.roundingMethod || 'ROUND_HALF_EVEN';
    this.loan.flushUnbilledInterestRoundingErrorMethod =
      settings.flushMethod || 'at_threshold';
    this.loan.perDiemCalculationType =
      settings.perDiemCalculationType || 'AnnualRateDividedByDaysInYear';
    this.loan.billingModel = settings.billingModel || 'amortized';
    this.paymentAllocationStrategyName =
      settings.paymentAllocationStrategy || 'FIFO';
    this.paymentPriority = settings.paymentPriority || [
      'interest',
      'fees',
      'principal',
    ];
    this.loan.defaultPreBillDaysConfiguration =
      settings.defaultPreBillDaysConfiguration || 5;
    this.loan.defaultBillDueDaysAfterPeriodEndConfiguration =
      settings.defaultBillDueDaysAfterPeriodEndConfiguration || 3;
    this.loan.allowRateAbove100 = settings.allowRateAbove100 || false;
    this.loan.flushThreshold = settings.flushThreshold || 0.01;
    this.loan.roundingPrecision = settings.roundingPrecision || 2;

    // Update loaded settings info
    this.loadedSettingName = setting.name;
    this.loadedSettingVersion = setting.version;
    this.originalSettings = JSON.parse(JSON.stringify(settings));

    this.emitLoanChange();
    this.isModified = false;
  }

  // Load saved settings from the service
  loadSavedSettings() {
    this.savedSettings = this.advancedSettingsService.getAllSettings();
  }

  // Emit changes to the parent component
  emitLoanChange() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }

  // Track modifications
  onInputChange() {
    this.isModified = true;
    this.emitLoanChange();
  }

  termPeriodDefinitionChange() {
    const termUnit =
      this.loan.termPeriodDefinition.unit === 'complex'
        ? 'day'
        : this.loan.termPeriodDefinition.unit;
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
}

// src/app/components/system-settings/system-settings.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  SystemSettingsService,
  AiAssistantType,
  DeveloperModeType,
} from '../services/system-settings.service';

@Component({
  standalone: false,
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.css'],
})
export class SystemSettingsComponent {
  @Input() showSystemSettingsDialog!: boolean;
  @Output() showSystemSettingsDialogChange = new EventEmitter<boolean>();
  @Output() systemsSettingsChange = new EventEmitter<boolean>();

  aiAssistantOptions = [
    { label: 'xAI', value: 'xAI' },
    { label: 'OpenAI', value: 'OpenAI' },
  ];

  selectedAiAssistant: { label: AiAssistantType; value: AiAssistantType } = {
    label: 'xAI',
    value: 'xAI',
  };

  developerModeOptions = [
    { label: 'Disabled', value: 'Disabled' },
    { label: 'Enabled', value: 'Enabled' },
  ];

  selectedDeveloperMode: {
    label: DeveloperModeType;
    value: DeveloperModeType;
  } = {
    label: 'Disabled',
    value: 'Disabled',
  };

  constructor(private settingsService: SystemSettingsService) {}

  /**
   * Called whenever the dialog is first shown (to sync UI with current settings).
   */
  onDialogShow() {
    const assistant = this.settingsService.getAiAssistant();
    const developerMode = this.settingsService.getDeveloperMode();

    this.selectedAiAssistant = {
      label: assistant,
      value: assistant,
    };

    this.selectedDeveloperMode = {
      label: developerMode,
      value: developerMode,
    };
  }

  onDialogHide() {
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
    this.systemsSettingsChange.emit();
  }

  saveAndClose() {
    // persist choice
    // console.log('saving assistant', this.selectedAiAssistant);
    this.settingsService.setAiAssistant(this.selectedAiAssistant.value);
    this.settingsService.setDeveloperMode(this.selectedDeveloperMode.value);
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
    this.systemsSettingsChange.emit();
  }

  closeDialog() {
    // persist choice
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
    this.systemsSettingsChange.emit();
  }
}

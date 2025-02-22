// src/app/components/system-settings/system-settings.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  SystemSettingsService,
  AiAssistantType,
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

  aiAssistantOptions = [
    { label: 'xAI', value: 'xAI' },
    { label: 'OpenAI', value: 'OpenAI' },
  ];

  selectedAiAssistant: { label: AiAssistantType; value: AiAssistantType } = {
    label: 'xAI',
    value: 'xAI',
  };

  constructor(private settingsService: SystemSettingsService) {}

  /**
   * Called whenever the dialog is first shown (to sync UI with current settings).
   */
  onDialogShow() {
    const assistant = this.settingsService.getAiAssistant();
    this.selectedAiAssistant = {
      label: assistant,
      value: assistant,
    };

    // console.log('selectedAiAssistant', this.selectedAiAssistant);
  }

  onDialogHide() {
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
  }

  saveAndClose() {
    // persist choice
    // console.log('saving assistant', this.selectedAiAssistant);
    this.settingsService.setAiAssistant(this.selectedAiAssistant.value);
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
  }

  closeDialog() {
    // persist choice
    this.showSystemSettingsDialog = false;
    this.showSystemSettingsDialogChange.emit(false);
  }
}

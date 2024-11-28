// services/advanced-settings.service.ts

import { Injectable } from '@angular/core';
import { AdvancedSettings } from '../models/advanced-settings.model';

@Injectable({
  providedIn: 'root',
})
export class AdvancedSettingsService {
  private storageKey = 'advancedSettings';

  constructor() {}

  // Get all saved settings
  getAllSettings(): AdvancedSettings[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  // Save a new or updated setting
  saveSetting(setting: AdvancedSettings): void {
    const settings = this.getAllSettings();

    if (setting.isDefault) {
      // Unset previous default
      settings.forEach((s) => (s.isDefault = false));
    }

    settings.push(setting);
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  // Update an existing setting
  updateSetting(updatedSetting: AdvancedSettings): void {
    const settings = this.getAllSettings();

    if (updatedSetting.isDefault) {
      // Unset previous default
      settings.forEach((s) => {
        if (s.id !== updatedSetting.id) {
          s.isDefault = false;
        }
      });
    }

    const index = settings.findIndex((s) => s.id === updatedSetting.id);
    if (index !== -1) {
      settings[index] = updatedSetting;
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    }
  }

  // Delete a setting
  deleteSetting(id: string): void {
    let settings = this.getAllSettings();
    settings = settings.filter((s) => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  // Get a setting by ID
  getSettingById(id: string): AdvancedSettings | undefined {
    const settings = this.getAllSettings();
    return settings.find((s) => s.id === id);
  }

  // Get the default setting
  getDefaultSetting(): AdvancedSettings | undefined {
    const settings = this.getAllSettings();
    return settings.find((s) => s.isDefault);
  }
}

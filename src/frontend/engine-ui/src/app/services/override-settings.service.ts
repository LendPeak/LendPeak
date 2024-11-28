// override-settings.service.ts

import { Injectable } from '@angular/core';
import { OverrideSettings } from '../models/override-settings.model';

@Injectable({
  providedIn: 'root',
})
export class OverrideSettingsService {
  private storageKey = 'overrideSettings';

  constructor() {}

  // Get all saved settings with date conversion
  getAllSettings(): OverrideSettings[] {
    const data = localStorage.getItem(this.storageKey);
    if (!data) {
      return [];
    }
    const settings = JSON.parse(data);
    settings.forEach((setting: OverrideSettings) => {
      this.convertDateStringsToDates(setting);
    });
    return settings;
  }

  // Get a setting by ID with date conversion
  getSettingById(id: string): OverrideSettings | undefined {
    const settings = this.getAllSettings();
    return settings.find((s) => s.id === id);
  }

  // Save a new or updated setting
  saveSetting(setting: OverrideSettings): void {
    const settings = this.getAllSettings();

    if (setting.isDefault) {
      // Unset previous default
      settings.forEach((s) => (s.isDefault = false));
    }

    settings.push(setting);
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  // Delete a setting
  deleteSetting(id: string): void {
    let settings = this.getAllSettings();
    settings = settings.filter((s) => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  // Get the default setting
  getDefaultSetting(): OverrideSettings | undefined {
    const settings = this.getAllSettings();
    return settings.find((s) => s.isDefault);
  }

  // Helper method to convert date strings to Date objects
  private convertDateStringsToDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string' && this.isIsoDateString(value)) {
        obj[key] = new Date(value);
      } else if (typeof value === 'object') {
        this.convertDateStringsToDates(value);
      }
    }
    return obj;
  }

  // Helper method to check if a string is an ISO date string
  private isIsoDateString(value: string): boolean {
    const isoDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    return isoDateFormat.test(value);
  }
}

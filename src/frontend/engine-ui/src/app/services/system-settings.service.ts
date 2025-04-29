// src/app/services/system-settings.service.ts
import { Injectable } from '@angular/core';

/**
 * Available AI Assistant providers.
 */
export type AiAssistantType = 'xAI' | 'OpenAI';
export type DeveloperModeType = 'Enabled' | 'Disabled'; // keeping as string as i might want to ad later different levels of developer mode
/**
 * Manages system-level settings (for now: AI assistant selection).
 * Persists them in local storage for simplicity.
 */
@Injectable({
  providedIn: 'root',
})
export class SystemSettingsService {
  private readonly STORAGE_KEY = 'systemSettings';
  private settingsCache: {
    aiAssistant?: AiAssistantType;
    developerMode?: DeveloperModeType;
    repaymentPlanColumns?: {
      selectedRepaymentPlanCols: any[];
    };
  } = {};

  constructor() {
    this.loadFromStorage();
  }

  getRepaymentPlanColumns() {
    return this.settingsCache?.repaymentPlanColumns;
  }

  setRepaymentPlanColumns(cols: { selectedRepaymentPlanCols: any[] }) {
    this.settingsCache.repaymentPlanColumns = cols;
    this.saveToStorage();
  }

  getDeveloperMode(): DeveloperModeType {
    return this.settingsCache?.developerMode ?? 'Disabled'; // default to disabled
  }

  setDeveloperMode(developerMode: DeveloperModeType) {
    this.settingsCache.developerMode = developerMode;
    this.saveToStorage();
  }

  /* ── Deposits column prefs ───────────────────────── */
  getDepositColumns() {
    return JSON.parse(localStorage.getItem('depositColumns') || 'null');
  }
  setDepositColumns(payload: { selectedDepositCols: any[] }) {
    localStorage.setItem('depositColumns', JSON.stringify(payload));
  }

  /**
   * Returns the currently selected AI assistant (xAI or OpenAI).
   */
  getAiAssistant(): AiAssistantType {
    return this.settingsCache?.aiAssistant ?? 'xAI'; // default to xAI
  }

  /**
   * Sets the AI assistant and persists to local storage.
   */
  setAiAssistant(assistant: AiAssistantType) {
    this.settingsCache.aiAssistant = assistant;
    this.saveToStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.settingsCache = JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse system settings from storage', error);
        this.settingsCache.aiAssistant = 'xAI';
      }
    } else {
      this.settingsCache.aiAssistant = 'xAI';
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settingsCache));
  }
}

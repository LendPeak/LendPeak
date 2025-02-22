// src/app/services/system-settings.service.ts
import { Injectable } from '@angular/core';

/**
 * Available AI Assistant providers.
 */
export type AiAssistantType = 'xAI' | 'OpenAI';

/**
 * Manages system-level settings (for now: AI assistant selection).
 * Persists them in local storage for simplicity.
 */
@Injectable({
  providedIn: 'root',
})
export class SystemSettingsService {
  private readonly STORAGE_KEY = 'systemSettings';
  private settingsCache: { aiAssistant: AiAssistantType } | null = null;

  constructor() {
    this.loadFromStorage();
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
    this.settingsCache = { aiAssistant: assistant };
    this.saveToStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.settingsCache = JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse system settings from storage', error);
        this.settingsCache = { aiAssistant: 'xAI' };
      }
    } else {
      this.settingsCache = { aiAssistant: 'xAI' };
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settingsCache));
  }
}

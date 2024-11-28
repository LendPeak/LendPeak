// models/advanced-settings.model.ts

export interface AdvancedSettings {
  id: string; // Unique identifier
  name: string; // User-defined name
  version: number; // Version number
  createdAt: Date; // Timestamp of creation
  updatedAt: Date; // Timestamp of last update
  previousVersionId?: string; // Reference to the previous version
  isDefault: boolean; // Whether this is the default setting
  settings: any; // The actual advanced settings data
}

export interface OverrideSettings {
  id: string; // Unique identifier
  name: string; // User-defined name
  version: number; // Version number
  createdAt: Date; // Timestamp of creation
  updatedAt: Date; // Timestamp of last update
  previousVersionId?: string; // Reference to the previous version
  isDefault: boolean; // Whether this is the default setting
  settings: any; // The actual settings data (loan overrides)
}
/*
    id: Unique identifier for each setting (e.g., UUID).
    name: A user-friendly name for the setting.
    version: Incremented each time the setting is updated.
    createdAt and updatedAt: Timestamps for tracking.
    previousVersionId: Links to the previous version.
    isDefault: Indicates if this setting is the default for new loans.
    settings: The actual override settings data.
*/
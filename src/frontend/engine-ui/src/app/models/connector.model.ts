// models/connector.model.ts

export interface Connector {
  id: string;
  name: string;
  type: ConnectorType;
  credentials: ConnectorCredentials;
}

export type ConnectorType = 'LoanPro'; // Extendable for future connectors

export interface ConnectorCredentials {
  // For LoanPro
  autopalId?: string;
  apiUrl?: string;
  apiToken?: string;

  // Additional fields for other connectors
}

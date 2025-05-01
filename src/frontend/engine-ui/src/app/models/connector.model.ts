// models/connector.model.ts

export interface Connector {
  id: string;
  name: string;
  type: ConnectorType;
  credentials: ConnectorCredentials;
  isDefault?: boolean;
}

export type ConnectorType = 'LoanPro' | 'Mongo'; // Extendable for future connectors

export interface ConnectorCredentials {
  // For LoanPro
  autopalId?: string;
  apiUrl?: string;
  apiToken?: string;

  /* Mongo */
  mongoUri?: string; // mongodb://…     or  mongodb+srv://…
  mongoUser?: string; // optional
  mongoPass?: string; // optional
  mongoDb?: string; // optional (defaults to cls-archive on BE)
}

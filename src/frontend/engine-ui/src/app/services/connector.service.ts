import { Injectable } from '@angular/core';
import { Connector } from '../models/connector.model';

@Injectable({
  providedIn: 'root',
})
export class ConnectorService {
  private storageKey = 'connectors';

  constructor() {}

  getAllConnectors(): Connector[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  saveConnector(connector: Connector): void {
    const connectors = this.getAllConnectors();
    const index = connectors.findIndex((c) => c.id === connector.id);
    if (index !== -1) {
      // Update existing connector
      connectors[index] = connector;
    } else {
      // Add new connector
      connectors.push(connector);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(connectors));
  }

  deleteConnector(id: string): void {
    let connectors = this.getAllConnectors();
    connectors = connectors.filter((c) => c.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(connectors));
  }

  getConnectorById(id: string): Connector | undefined {
    const connectors = this.getAllConnectors();
    return connectors.find((c) => c.id === id);
  }
}

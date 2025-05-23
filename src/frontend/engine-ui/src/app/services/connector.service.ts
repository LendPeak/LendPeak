import { Injectable } from '@angular/core';
import { Connector, ConnectorType } from '../models/connector.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConnectorService {
  private connectorsSubject = new BehaviorSubject<Connector[]>([]);
  public connectors$ = this.connectorsSubject.asObservable();

  constructor() {
    const fromStorage = this.loadConnectorsFromStorage();
    const withDemo = this.ensureDemoConnector(fromStorage);

    this.connectorsSubject.next(withDemo);
    this.saveConnectorsToStorage(withDemo); // persist baseline
  }

  /** Guarantees exactly **one** Demo connector with empty credentials. */
  private ensureDemoConnector(list: Connector[]): Connector[] {
    const hasDemo = list.some((c) => c.type === 'Demo');
    if (hasDemo) {
      // Ensure the stored Demo connector has credentials = {}
      return list.map((c) =>
        c.type === 'Demo' ? { ...c, credentials: c.credentials ?? {} } : c,
      );
    }

    const demo: Connector = {
      id: 'demo-connector',
      name: 'Demo Loans',
      type: 'Demo' as ConnectorType,
      credentials: {},
      isDefault: list.every((c) => !c.isDefault), // make default only if none exists
    };
    return [...list, demo];
  }

  setAsDefault(connectorId: string) {
    const currentConnectors = this.connectorsSubject.getValue().map((conn) => {
      // For each connector, set isDefault to true only if it’s the chosen one
      return { ...conn, isDefault: conn.id === connectorId };
    });
    this.connectorsSubject.next(currentConnectors);
    this.saveConnectorsToStorage(currentConnectors);
  }

  unsetDefault(connectorId: string) {
    const currentConnectors = this.connectorsSubject.getValue().map((conn) => {
      if (conn.id === connectorId) {
        return { ...conn, isDefault: false };
      }
      return conn;
    });
    this.connectorsSubject.next(currentConnectors);
    this.saveConnectorsToStorage(currentConnectors);
  }

  getAllConnectors(): Connector[] {
    return this.connectorsSubject.getValue();
  }

  getConnectorById(id: string): Connector | undefined {
    return this.connectorsSubject
      .getValue()
      .find((connector) => connector.id === id);
  }

  addConnector(connector: Connector) {
    const currentConnectors = this.connectorsSubject.getValue();
    const updatedConnectors = [...currentConnectors, connector];
    this.connectorsSubject.next(updatedConnectors);
    this.saveConnectorsToStorage(updatedConnectors);
  }

  updateConnector(connector: Connector) {
    const currentConnectors = this.connectorsSubject.getValue();
    const index = currentConnectors.findIndex((c) => c.id === connector.id);
    if (index !== -1) {
      currentConnectors[index] = connector;
      this.connectorsSubject.next([...currentConnectors]);
      this.saveConnectorsToStorage(currentConnectors);
    }
  }

  saveConnector(connector: Connector) {
    const existingConnector = this.getConnectorById(connector.id);
    if (existingConnector) {
      this.updateConnector(connector);
    } else {
      this.addConnector(connector);
    }
  }

  deleteConnector(id: string) {
    const currentConnectors = this.connectorsSubject.getValue();
    const updatedConnectors = currentConnectors.filter(
      (connector) => connector.id !== id,
    );
    this.connectorsSubject.next(updatedConnectors);
    this.saveConnectorsToStorage(updatedConnectors);
  }

  private loadConnectorsFromStorage(): Connector[] {
    const storedConnectors = localStorage.getItem('connectors');
    return storedConnectors ? JSON.parse(storedConnectors) : [];
  }

  private saveConnectorsToStorage(connectors: Connector[]): void {
    localStorage.setItem('connectors', JSON.stringify(connectors));
  }
}

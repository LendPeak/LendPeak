import { Component, OnInit } from '@angular/core';
import { ConnectorService } from '../services/connector.service';
import { Connector, ConnectorType } from '../models/connector.model';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-connector-management',
  templateUrl: './connector-management.component.html',
  styleUrls: ['./connector-management.component.css'],
  providers: [ConfirmationService, MessageService],
})
export class ConnectorManagementComponent implements OnInit {
  connectors: Connector[] = [];
  showConnectorDialog: boolean = false;
  connectorTypes: ConnectorType[] = ['LoanPro']; // Extendable for future connectors
  connectorDialogTitle: string = 'Add New Connector';

  newConnector: Connector = this.getEmptyConnector();

  constructor(
    private connectorService: ConnectorService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadConnectors();
  }

  loadConnectors() {
    this.connectors = this.connectorService.getAllConnectors();
  }

  isEditMode(): boolean {
    // If the connector already exists in the list, we're editing
    return this.connectors.some(
      (connector) => connector.id === this.newConnector.id,
    );
  }

  getEmptyConnector(): Connector {
    return {
      id: uuidv4(),
      name: '',
      type: 'LoanPro',
      credentials: {},
    };
  }

  openNewConnectorDialog() {
    this.connectorDialogTitle = 'Add New Connector';
    this.newConnector = this.getEmptyConnector();
    this.showConnectorDialog = true;
  }

  editConnector(connector: Connector) {
    this.connectorDialogTitle = 'Edit Connector';
    // Create a deep copy to avoid direct mutations
    this.newConnector = JSON.parse(JSON.stringify(connector));
    this.showConnectorDialog = true;
  }

  saveConnector() {
    // Validate credentials based on connector type
    if (this.newConnector.type === 'LoanPro') {
      const { autopalId, apiUrl, apiToken } = this.newConnector.credentials;
      if (!autopalId || !apiUrl || !apiToken) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill in all required fields for LoanPro.',
        });
        return;
      }
    }

    // Save or update the connector
    this.connectorService.saveConnector(this.newConnector);
    this.loadConnectors();
    this.showConnectorDialog = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Connector "${this.newConnector.name}" saved successfully.`,
    });
  }

  deleteConnector(connector: Connector) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete connector "${connector.name}"?`,
      accept: () => {
        this.connectorService.deleteConnector(connector.id);
        this.loadConnectors();
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Connector "${connector.name}" deleted successfully.`,
        });
      },
    });
  }
}

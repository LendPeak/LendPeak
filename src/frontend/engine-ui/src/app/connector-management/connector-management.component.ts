import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ConnectorService } from '../services/connector.service';
import { Connector, ConnectorType } from '../models/connector.model';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-connector-management',
  templateUrl: './connector-management.component.html',
  styleUrls: ['./connector-management.component.css'],
  providers: [ConfirmationService, MessageService],
  standalone: false,
})
export class ConnectorManagementComponent implements OnInit, OnDestroy {
  connectors: Connector[] = [];
  showConnectorDialog: boolean = false;
  connectorTypes: ConnectorType[] = ['LoanPro']; // Extendable for future connectors
  connectorDialogTitle: string = 'Add New Connector';

  newConnector: Connector = this.getEmptyConnector();

  private connectorsSubscription!: Subscription;

  constructor(
    private connectorService: ConnectorService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.connectorsSubscription = this.connectorService.connectors$.subscribe(
      (connectors: Connector[]) => {
        this.connectors = connectors;
      },
    );
  }

  ngOnDestroy(): void {
    if (this.connectorsSubscription) {
      this.connectorsSubscription.unsubscribe();
    }
  }

  /**
   * Determine if we are in edit mode by checking if the connector is already in the list.
   */
  isEditMode(): boolean {
    return this.connectors.some(
      (connector) => connector.id === this.newConnector.id,
    );
  }

  /**
   * Generate a new empty connector with a fresh UUID.
   */
  getEmptyConnector(): Connector {
    return {
      id: uuidv4(),
      name: '',
      type: 'LoanPro',
      credentials: {},
    };
  }

  /**
   * Open the "Add New Connector" dialog.
   */
  openNewConnectorDialog() {
    this.connectorDialogTitle = 'Add New Connector';
    this.newConnector = this.getEmptyConnector();
    this.showConnectorDialog = true;
  }

  /**
   * Open the "Edit Connector" dialog with the selected connector.
   */
  editConnector(connector: Connector) {
    this.connectorDialogTitle = 'Edit Connector';
    // Create a deep copy to avoid direct mutations
    this.newConnector = JSON.parse(JSON.stringify(connector));
    this.showConnectorDialog = true;
  }

  /**
   * Save the connector (either add new or update existing).
   */
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

    this.connectorService.saveConnector(this.newConnector);
    this.showConnectorDialog = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Connector "${this.newConnector.name}" saved successfully.`,
    });
  }

  /**
   * Delete the selected connector after user confirmation.
   */
  deleteConnector(connector: Connector) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete connector "${connector.name}"?`,
      accept: () => {
        this.connectorService.deleteConnector(connector.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Connector "${connector.name}" deleted successfully.`,
        });
      },
    });
  }

  /**
   * Export all connectors as a JSON file and trigger a download.
   */
  exportConnectors(): void {
    // Fetch all connectors
    const connectors = this.connectorService.getAllConnectors();
    // Convert them to JSON
    const dataStr = JSON.stringify(connectors, null, 2);
    // Create a blob
    const blob = new Blob([dataStr], { type: 'application/json' });
    // Create a temporary link to download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'connectors.json';
    link.click();
    // Clean up
    window.URL.revokeObjectURL(url);
  }

  /**
   * Import connectors from a selected JSON file.
   * Each connector is saved as if it were created manually.
   */
  importConnectors(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const content = fileReader.result as string;
        const importedConnectors: Connector[] = JSON.parse(content);

        if (!Array.isArray(importedConnectors)) {
          throw new Error(
            'Invalid file format: expected an array of connectors.',
          );
        }

        for (const connector of importedConnectors) {
          // Ensure each imported connector has an id
          if (!connector.id) {
            connector.id = uuidv4();
          }
          // Save or update the connector
          this.connectorService.saveConnector(connector);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Import Successful',
          detail: 'Connectors imported successfully.',
        });
      } catch (error) {
        console.error('Import error', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Import Failed',
          detail: 'Failed to import connectors. Please check the file format.',
        });
      }
    };

    fileReader.readAsText(file);
  }
}

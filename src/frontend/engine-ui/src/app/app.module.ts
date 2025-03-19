import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Import this module
import { AppComponent } from './app.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { PickListModule } from 'primeng/picklist';

import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';
import { PopoverModule } from 'primeng/popover';
import { TabsModule } from 'primeng/tabs';

import { TableModule } from 'primeng/table';
import { FieldsetModule } from 'primeng/fieldset';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TabMenuModule } from 'primeng/tabmenu';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DividerModule } from 'primeng/divider';
import { ToolbarModule } from 'primeng/toolbar';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ChipModule } from 'primeng/chip';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { TimelineModule } from 'primeng/timeline';
import { DataViewModule } from 'primeng/dataview';
import { MarkdownModule } from 'ngx-markdown';

import { TilaDisclosureComponent } from './tila-disclosure.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { DepositsComponent } from './deposits/deposits.component';
import { BillsComponent } from './bills/bills.component';
import { BasicLoanInfoComponent } from './basic-loan-info/basic-loan-info.component';
import { OverridesComponent } from './overrides/overrides.component';
import { AdvancedSettingsComponent } from './advanced-settings/advanced-settings.component';
import { AdvancedSettingsService } from './services/advanced-settings.service';
import { OverrideSettingsService } from './services/override-settings.service';
import { LoanProService } from './services/loanpro.service';
import { SystemSettingsService } from './services/system-settings.service';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { MessageModule } from 'primeng/message';
import { MenuModule } from 'primeng/menu';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ConnectorManagementComponent } from './connector-management/connector-management.component';
import { LoanImportComponent } from './loan-import/loan-import.component';
import { RepaymentPlanComponent } from './repayment-plan/repayment-plan.component';

import { VersionHistoryComponent } from './version-history/version-history.component';
import { FinancialOpsHistoryComponent } from './financial-ops-history/financial-ops-history.component';
import { ValueRendererComponent } from './value-renderer/value-renderer.component';

import { SystemSettingsComponent } from './system-settings/system-settings.component';

import { HighlightModule, LineNumbersOptions } from 'ngx-highlightjs';
import { provideHighlightOptions } from 'ngx-highlightjs';

import { RouterModule } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import Aura from '@primeng/themes/aura';

import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    TilaDisclosureComponent,
    ToolbarComponent,
    DepositsComponent,
    BillsComponent,
    BasicLoanInfoComponent,
    OverridesComponent,
    AdvancedSettingsComponent,
    ConnectorManagementComponent,
    LoanImportComponent,
    RepaymentPlanComponent,
    VersionHistoryComponent,
    ValueRendererComponent,
    SystemSettingsComponent,
    FinancialOpsHistoryComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ProgressSpinnerModule,
    FormsModule,
    ButtonModule,
    ProgressBarModule,
    ConfirmPopupModule,
    BadgeModule,
    FluidModule,
    ToggleButtonModule,
    ToggleSwitchModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    TableModule,
    FieldsetModule,
    PickListModule,
    PopoverModule,
    CardModule,
    MenuModule,
    InputGroupModule,
    InputGroupAddonModule,
    TabMenuModule,
    InputSwitchModule,
    DividerModule,
    ToolbarModule,
    CheckboxModule,
    DataViewModule,
    TagModule,
    DialogModule,
    PanelModule,
    TabsModule,
    AccordionModule,
    InputNumberModule,
    OverlayPanelModule,
    SplitButtonModule,
    ChipModule,
    PaginatorModule,
    TooltipModule,
    ToastModule,
    MessageModule,
    HighlightModule,
    ConfirmDialogModule,
    TimelineModule,
    MarkdownModule.forRoot(),
    RouterModule.forRoot([]),
  ],
  providers: [
    AdvancedSettingsService,
    OverrideSettingsService,
    LoanProService,
    SystemSettingsService,
    MessageService,
    ConfirmationService,
    provideHttpClient(withInterceptorsFromDi()),
    provideHighlightOptions({
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),

      languages: {
        typescript: () => import('highlight.js/lib/languages/typescript'),
      },
    }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false,
        },
      },
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

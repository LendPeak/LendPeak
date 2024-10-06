import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Import this module
import { AppComponent } from './app.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
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

import { PanelModule } from 'primeng/panel';
import { TabViewModule } from 'primeng/tabview';
import { AccordionModule } from 'primeng/accordion';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ChipModule } from 'primeng/chip';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';

import { TilaDisclosureComponent } from './tila-disclosure.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { DepositsComponent } from './deposits/deposits.component';
import { BillsComponent } from './bills/bills.component';
import { BasicLoanInfoComponent } from './basic-loan-info/basic-loan-info.component';
import { OverridesComponent } from './overrides/overrides.component';

@NgModule({
  declarations: [
    AppComponent,
    TilaDisclosureComponent,
    ToolbarComponent,
    DepositsComponent,
    BillsComponent,
    BasicLoanInfoComponent,
    OverridesComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Add this to enable animations
    FormsModule,
    ButtonModule,
    InputTextModule,
    CalendarModule,
    DropdownModule,
    TableModule,
    FieldsetModule,
    CardModule,
    InputGroupModule,
    InputGroupAddonModule,
    TabMenuModule,
    InputSwitchModule,
    DividerModule,
    ToolbarModule,
    CheckboxModule,
    TagModule,
    DialogModule,
    PanelModule,
    TabViewModule,
    AccordionModule,
    InputNumberModule,
    OverlayPanelModule,
    SplitButtonModule,
    ChipModule,
    PaginatorModule,
    TooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

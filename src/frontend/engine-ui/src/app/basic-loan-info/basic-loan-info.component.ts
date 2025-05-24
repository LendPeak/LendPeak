// basic-loan-info.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
// Removed OverlayPanel, now import Popover from primeng/popover
import { Popover } from 'primeng/popover';
import dayjs from 'dayjs';
import { LendPeak } from 'lendpeak-engine/models/LendPeak';
import { Currency } from 'lendpeak-engine/utils/Currency';
import { Amortization } from 'lendpeak-engine/models/Amortization'; // Ensure Amortization is imported
// TermExtensions might not be directly used here, but good to be mindful if Amortization model changes require it.
// import { TermExtensions } from 'lendpeak-engine/models/TermExtensions';

@Component({
  selector: 'app-basic-loan-info',
  templateUrl: './basic-loan-info.component.html',
  styleUrls: ['./basic-loan-info.component.css'],
  standalone: false,
})
export class BasicLoanInfoComponent {
  @Input({ required: true }) lendPeak!: LendPeak;

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  enableFirstPaymentDate = false;
  enableEndDate = false;

  ngOnChanges(changes: SimpleChanges): void {}

  get contractualTerm(): number | null {
    return this.lendPeak?.amortization?.term || null;
  }

  get actualTerms(): number | null {
    return this.lendPeak?.amortization?.actualTerms || null;
  }

  get hasActiveTermExtensions(): boolean {
    return !!this.lendPeak?.amortization?.termExtensions?.active?.length;
  }

  get termExtensionHighlightText(): string | null {
    if (this.hasActiveTermExtensions && this.contractualTerm !== null && this.actualTerms !== null) {
      if (this.actualTerms > this.contractualTerm) {
        return `Term Extended: ${this.actualTerms} (was ${this.contractualTerm})`;
      } else if (this.actualTerms < this.contractualTerm) {
        return `Term Reduced: ${this.actualTerms} (was ${this.contractualTerm})`;
      } else {
        // This case might indicate an active extension that nets to zero change
        return `Term Modified: ${this.actualTerms} (contractual ${this.contractualTerm})`;
      }
    }
    return null;
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    // Same usage as OverlayPanel
    tooltipRef.toggle(event);
  }

  submitLoan() {
    //  this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }

  inputChanged(event: any) {
    this.submitLoan();
  }
}

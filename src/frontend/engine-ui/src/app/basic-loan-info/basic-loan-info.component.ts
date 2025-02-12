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
import { Amortization } from 'lendpeak-engine/models/Amortization';
import { Currency } from 'lendpeak-engine/utils/Currency';

@Component({
  selector: 'app-basic-loan-info',
  templateUrl: './basic-loan-info.component.html',
  styleUrls: ['./basic-loan-info.component.css'],
  standalone: false,
})
export class BasicLoanInfoComponent {
  @Input() loan!: Amortization;

  @Output() loanChange = new EventEmitter<any>();
  @Output() loanUpdated = new EventEmitter<void>();

  enableFirstPaymentDate = false;
  enableEndDate = false;

  ngOnChanges(changes: SimpleChanges): void {
    // This will fire whenever an @Input changes.
    // If 'loan' has changed, you can re-run your initialization logic or
    // re-apply defaults etc.
    //this.balanceModifications = this.loan.balanceModifications;
    if (this.loan) {
      // this.startDate = this.loan.startDate.toDate();
      // this.endDate = this.loan.endDate.toDate();
      // this.firstPaymentDate = this.loan.firstPaymentDate.toDate();
    }
  }

  showTooltip(event: Event, tooltipRef: Popover) {
    // Same usage as OverlayPanel
    tooltipRef.toggle(event);
  }

  submitLoan() {
    this.loanChange.emit(this.loan);
    this.loanUpdated.emit();
  }

  inputChanged(event: any) {
    this.submitLoan();
  }
}

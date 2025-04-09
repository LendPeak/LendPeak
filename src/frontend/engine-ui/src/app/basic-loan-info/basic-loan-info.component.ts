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

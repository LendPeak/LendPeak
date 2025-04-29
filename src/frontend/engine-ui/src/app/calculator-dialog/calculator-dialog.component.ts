// src/app/calculator-dialog/calculator-dialog.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { evaluate } from 'mathjs';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-calculator-dialog',
  templateUrl: './calculator-dialog.component.html',
  styleUrls: ['./calculator-dialog.component.css'],
  standalone: false,
})
export class CalculatorDialogComponent {
  @Output() accept = new EventEmitter<number>();

  constructor(private ref: DynamicDialogRef) {}

  visible = true;
  expr = '';
  result = 0;
  hasError = false;

  update() {
    try {
      this.result = evaluate(this.expr);
      this.hasError = false;
    } catch {
      this.result = 0;
      this.hasError = true;
    }
  }

  apply() {
    if (!this.hasError) {
      this.ref.close(this.result); // ← send the value back
    } else {
      this.ref.close(0);
    }
  }

  close() {
    this.visible = false; // hides <p-dialog>
    this.ref.close(); // removes DynamicDialog container
  }
}

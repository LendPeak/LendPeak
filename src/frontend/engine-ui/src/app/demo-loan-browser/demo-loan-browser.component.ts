import { Component, EventEmitter, Output } from '@angular/core';
import {
  DEMO_LOANS,
  DemoLoanDescriptor,
  Tag,
} from '../loan-import/demo-loan.catalogue';
import { FormControl } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs/operators';

type Severity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

@Component({
  selector: 'app-demo-loan-browser',
  templateUrl: './demo-loan-browser.component.html',
  styleUrls: ['./demo-loan-browser.component.css'],
  standalone: false,
})
export class DemoLoanBrowserComponent {
  /* ------------------- public API ------------------- */
  @Output() selected = new EventEmitter<DemoLoanDescriptor>();

  /* ------------------- UI state --------------------- */
  categories = [
    { id: 'everyday', label: 'Everyday' },
    { id: 'hardship', label: 'Hardship' },
    { id: 'edge', label: 'Edge-cases' },
    //  { id: 'regression', label: 'Regression' },
  ];
  activeTab = 0;

  /** free-text search bound through pInputText + ngModel */
  searchText = '';

  /** set of active chip filters */
  activeTags = new Set<Tag>();

  /* ------------------- computed helpers -------------- */
  get visibleLoans(): DemoLoanDescriptor[] {
    const cat = this.categories[this.activeTab].id;
    return DEMO_LOANS.filter((d) => d.category === cat).filter(
      (d) => this.matchSearch(d) && this.matchTags(d),
    );
  }

  get tagPalette(): Tag[] {
    const set = new Set<Tag>();
    DEMO_LOANS.filter(
      (d) => d.category === this.categories[this.activeTab].id,
    ).forEach((d) => d.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }

  /* ------------------- actions ----------------------- */
  select(loan: DemoLoanDescriptor) {
    this.selected.emit(loan);
  }
  toggleTag(tag: Tag) {
    this.activeTags.has(tag)
      ? this.activeTags.delete(tag)
      : this.activeTags.add(tag);
  }
  clearFilters() {
    this.activeTags.clear();
    this.searchText = '';
  }

  /* ------------------- utils ------------------------- */
  matchSearch(d: DemoLoanDescriptor): boolean {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return true;
    return (
      d.title.toLowerCase().includes(q) ||
      (d.subtitle ?? '').toLowerCase().includes(q) ||
      d.tags.some((t) => t.includes(q))
    );
  }
  matchTags(d: DemoLoanDescriptor): boolean {
    return (
      this.activeTags.size === 0 || d.tags.some((t) => this.activeTags.has(t))
    );
  }
  tagColor(tag: Tag): Severity {
    switch (tag) {
      case 'payments':
        return 'success';
      case 'missed-payments':
        return 'warn';
      case 'mods':
        return 'info';
      case 'edge':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}

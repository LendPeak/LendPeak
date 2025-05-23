import { Component, EventEmitter, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DEMO_LOANS, DemoLoanDescriptor, Tag } from '../loan-import/demo-loan.catalogue';
import { FormControl } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs/operators';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-demo-loan-browser',
  templateUrl: './demo-loan-browser.component.html',
  styleUrls: ['./demo-loan-browser.component.css'],
  standalone: false,
})
export class DemoLoanBrowserComponent implements OnInit {
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

  // Persist selected tags per category
  private tagsByCategory: Record<string, string[]> = {};

  /** set of active chip filters */
  private _activeTagsArray: string[] = [];
  get activeTagsArray(): string[] {
    return this._activeTagsArray;
  }
  set activeTagsArray(val: string[]) {
    this._activeTagsArray = val;
    // Persist selection for current category
    const cat = this.categories[this.activeTab].id;
    this.tagsByCategory[cat] = [...val];
  }

  get tagPalette() {
    const set = new Set<string>();
    DEMO_LOANS.filter((d) => d.category === this.categories[this.activeTab].id).forEach((d) =>
      d.tags.forEach((t) => set.add(t)),
    );
    return Array.from(set).sort();
  }

  ngOnInit() {
    // Restore tags for initial tab
    const cat = this.categories[this.activeTab].id;
    this._activeTagsArray = this.tagsByCategory[cat] || [];
  }

  onTabChange() {
    // Save current selection
    const prevCat = this.categories[this.activeTab].id;
    this.tagsByCategory[prevCat] = [...this._activeTagsArray];
    // Switch tab
    // (activeTab is already updated by [(value)])
    const newCat = this.categories[this.activeTab].id;
    this._activeTagsArray = this.tagsByCategory[newCat] || [];
  }

  /* ------------------- computed helpers -------------- */
  get visibleLoans(): DemoLoanDescriptor[] {
    const cat = this.categories[this.activeTab].id;
    return DEMO_LOANS.filter((d) => d.category === cat).filter((d) => this.matchSearch(d) && this.matchTags(d));
  }

  /* ------------------- actions ----------------------- */
  select(loan: DemoLoanDescriptor) {
    this.selected.emit(loan);
  }
  clearFilters() {
    this.activeTagsArray = [];
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
    return this.activeTagsArray.length === 0 || d.tags.some((t) => this.activeTagsArray.includes(t));
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

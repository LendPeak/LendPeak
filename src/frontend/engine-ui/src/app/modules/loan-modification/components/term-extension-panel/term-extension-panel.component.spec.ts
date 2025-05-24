import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TermExtensionPanelComponent } from './term-extension-panel.component';

describe('TermExtensionPanelComponent', () => {
  let component: TermExtensionPanelComponent;
  let fixture: ComponentFixture<TermExtensionPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermExtensionPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermExtensionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverridesComponent } from './overrides.component';

describe('OverridesComponent', () => {
  let component: OverridesComponent;
  let fixture: ComponentFixture<OverridesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverridesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverridesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

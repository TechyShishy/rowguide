import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeadCountBottomSheet } from './bead-count-bottom-sheet';

describe('BeadCountBottomSheet', () => {
  let component: BeadCountBottomSheet;
  let fixture: ComponentFixture<BeadCountBottomSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BeadCountBottomSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BeadCountBottomSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

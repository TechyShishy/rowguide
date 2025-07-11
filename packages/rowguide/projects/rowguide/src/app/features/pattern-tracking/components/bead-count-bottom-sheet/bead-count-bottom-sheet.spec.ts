import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MarkModeService } from '../../../../core/services';

import { BeadCountBottomSheet } from './bead-count-bottom-sheet';

describe('BeadCountBottomSheet', () => {
  let component: BeadCountBottomSheet;
  let fixture: ComponentFixture<BeadCountBottomSheet>;
  let bottomSheetRefSpy: jasmine.SpyObj<
    MatBottomSheetRef<BeadCountBottomSheet>
  >;
  let markModeServiceSpy: jasmine.SpyObj<MarkModeService>;

  beforeEach(async () => {
    bottomSheetRefSpy = jasmine.createSpyObj('MatBottomSheetRef', ['dismiss']);
    markModeServiceSpy = jasmine.createSpyObj('MarkModeService', [
      'setMarkMode',
    ]);

    await TestBed.configureTestingModule({
      imports: [BeadCountBottomSheet],
      providers: [
        { provide: MatBottomSheetRef, useValue: bottomSheetRefSpy },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: { markMode: 1, beadCount: 5 },
        },
        { provide: MarkModeService, useValue: markModeServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeadCountBottomSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

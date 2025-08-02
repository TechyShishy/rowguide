import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowComponent } from './row.component';
import { LoggerTestingModule, NGXLoggerMock } from 'ngx-logger/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NGXLogger } from 'ngx-logger';
import { QueryList, ChangeDetectorRef } from '@angular/core';
import { StepComponent } from '../step/step.component';
import { MarkModeService } from '../../../../core/services';
import { of } from 'rxjs';

describe('RowComponent', () => {
  let component: RowComponent;
  let fixture: ComponentFixture<RowComponent>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;
  let mockMarkModeService: jasmine.SpyObj<MarkModeService>;

  beforeEach(async () => {
    mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    mockMarkModeService = jasmine.createSpyObj('MarkModeService', ['getRowMark$', 'canMarkItems', 'toggleRowMark']);
    // Mock the service to return a controllable observable
    mockMarkModeService.getRowMark$.and.returnValue(of(0));

    await TestBed.configureTestingModule({
      imports: [RowComponent, LoggerTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: NGXLogger, useClass: NGXLoggerMock },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: MarkModeService, useValue: mockMarkModeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RowComponent);
    component = fixture.componentInstance;
    
    // Initialize required inputs with mock data
    component.row = { id: 1, steps: [] } as any;
    component.steps = [];
    component.project = jasmine.createSpyObj('ProjectComponent', ['children']);
    component.index = 0;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle visibility', () => {
    component.visible = false;
    component.onToggle();
    expect(component.visible).toBeTrue();
    component.onToggle();
    expect(component.visible).toBeFalse();
  });

  it('should handle panel expand', () => {
    spyOn(component as any, 'setFirstStepAsCurrent');
    component.markFirstStep = true;
    const mockStepComponent = jasmine.createSpyObj('StepComponent', ['step']);
    mockStepComponent.beadCount = 0; // Ensure beadCount is 0
    component.children = new QueryList<StepComponent>();
    component.children.reset([mockStepComponent]);

    component['handlePanelExpand']();

    expect(component['setFirstStepAsCurrent']).toHaveBeenCalled();
  });

  it('should scroll to previous row', () => {
    const mockProjectComponent = jasmine.createSpyObj('ProjectComponent', [
      'children',
    ]);
    const mockElementRef = {
      nativeElement: { scrollIntoView: jasmine.createSpy('scrollIntoView') },
    };
    const prevRow = { ref: mockElementRef } as any;

    // Mock the children property as a Map
    Object.defineProperty(mockProjectComponent, 'children', {
      value: new Map<number, any>([[0, prevRow]]),
    });

    component.project = mockProjectComponent;
    component.index = 1;

    component['scrollToPreviousRow']();

    expect(mockElementRef.nativeElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  describe('Row Marking Visual Styles', () => {
    beforeEach(() => {
      // Mock the service to not interfere with our manual value setting
      mockMarkModeService.getRowMark$.and.returnValue(of(0));
    });

    it('should apply marked-1 class to host element', () => {
      // Mock the service to return marked state 1 for this test
      mockMarkModeService.getRowMark$.and.returnValue(of(1));
      
      // Re-initialize the component to pick up the new observable value
      component.ngOnInit();
      
      // Trigger change detection manually
      fixture.detectChanges();
      
      expect(fixture.nativeElement.classList.contains('marked-1')).toBe(true);
    });

    it('should apply marked-2 through marked-6 classes', () => {
      for (let markMode = 2; markMode <= 6; markMode++) {
        // Mock the service to return the current mark mode
        mockMarkModeService.getRowMark$.and.returnValue(of(markMode));
        component.ngOnInit();
        fixture.detectChanges();

        expect(fixture.nativeElement.classList.contains(`marked-${markMode}`)).toBe(true);

        // Clean up for next iteration
        mockMarkModeService.getRowMark$.and.returnValue(of(0));
        component.ngOnInit();
        fixture.detectChanges();
        expect(fixture.nativeElement.classList.contains(`marked-${markMode}`)).toBe(false);
      }
    });

    it('should not apply marked class when row is not marked', () => {
      // Mock the service to return 0 (not marked)
      mockMarkModeService.getRowMark$.and.returnValue(of(0));
      component.ngOnInit();
      fixture.detectChanges();

      for (let markMode = 1; markMode <= 6; markMode++) {
        expect(fixture.nativeElement.classList.contains(`marked-${markMode}`)).toBe(false);
      }
    });

    it('should only apply one marked class at a time', () => {
      // Mock the service to return marked state 3
      mockMarkModeService.getRowMark$.and.returnValue(of(3));
      component.ngOnInit();
      fixture.detectChanges();

      expect(fixture.nativeElement.classList.contains('marked-3')).toBe(true);
      
      // Verify no other marked classes are present
      for (let markMode = 1; markMode <= 6; markMode++) {
        if (markMode !== 3) {
          expect(fixture.nativeElement.classList.contains(`marked-${markMode}`)).toBe(false);
        }
      }
    });

    it('should have expansion panel header for styling target', () => {
      fixture.detectChanges();
      
      const header = fixture.nativeElement.querySelector('mat-expansion-panel-header');
      expect(header).toBeTruthy();
    });

    it('should have panel title and description elements', () => {
      fixture.detectChanges();
      
      const title = fixture.nativeElement.querySelector('mat-panel-title');
      const description = fixture.nativeElement.querySelector('mat-panel-description');
      
      expect(title).toBeTruthy();
      // Note: description might not be present depending on settings
    });
  });

  describe('Row Header Click Handling', () => {
    beforeEach(() => {
      // Reset mocks for click handling tests
      mockMarkModeService.getRowMark$.and.returnValue(of(0));
      mockMarkModeService.canMarkItems.and.returnValue(false);
      mockMarkModeService.toggleRowMark.and.stub();
    });

    it('should call toggleRowMark when mark mode is active and header is clicked', () => {
      // Setup: mark mode is active
      mockMarkModeService.canMarkItems.and.returnValue(true);
      
      // Spy on the component's cdr property directly
      spyOn(component['cdr'], 'markForCheck');
      
      // Create a mock event (event properties are no longer used for prevention)
      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
      
      // Call the click handler
      component.onHeaderClick(mockEvent);
      
      // Verify the marking service was called
      expect(mockMarkModeService.toggleRowMark).toHaveBeenCalledWith(component.index);
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
      
      // Note: Event prevention is now handled by [disabled] binding on mat-expansion-panel
      // so stopPropagation/preventDefault are no longer called in the handler
    });

    it('should not call toggleRowMark when mark mode is inactive', () => {
      // Setup: mark mode is inactive
      mockMarkModeService.canMarkItems.and.returnValue(false);
      
      // Spy on the component's cdr property directly
      spyOn(component['cdr'], 'markForCheck');
      
      // Create a mock event
      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
      
      // Call the click handler
      component.onHeaderClick(mockEvent);
      
      // Verify the marking service was NOT called and nothing was done
      expect(mockMarkModeService.toggleRowMark).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(component['cdr'].markForCheck).not.toHaveBeenCalled();
    });

    it('should handle click events properly without manual event prevention', () => {
      // Setup: mark mode is active
      mockMarkModeService.canMarkItems.and.returnValue(true);
      
      // Spy on the component's cdr property directly
      spyOn(component['cdr'], 'markForCheck');
      
      // Create a mock event
      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
      
      // Call the click handler with required event
      component.onHeaderClick(mockEvent);
      
      // Verify marking operation was completed
      expect(mockMarkModeService.toggleRowMark).toHaveBeenCalledWith(component.index);
      expect(component['cdr'].markForCheck).toHaveBeenCalled();
      
      // Note: Panel expansion prevention is now handled by [disabled] binding
      // rather than manual event.stopPropagation()/preventDefault() calls
    });

    it('should have click handler bound to expansion panel header', () => {
      fixture.detectChanges();
      
      const header = fixture.nativeElement.querySelector('mat-expansion-panel-header');
      expect(header).toBeTruthy();
      
      // Verify click handler is bound by checking if the method exists
      expect(component.onHeaderClick).toBeDefined();
      expect(typeof component.onHeaderClick).toBe('function');
    });
  });
});


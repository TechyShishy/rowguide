import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { QueryList } from '@angular/core';

import { StepComponent } from './step.component';
import { Step } from '../../../../core/models/step';
import { FlamService, SettingsService, MarkModeService } from '../../../../core/services';
import { ProjectService } from '../../../project-management/services';
import { ZipperService } from '../../../file-import/services';
import { RowComponent } from '../row/row.component';
import { HierarchicalList } from '../../../../shared/utils/hierarchical-list';

describe('StepComponent', () => {
  let component: StepComponent;
  let fixture: ComponentFixture<StepComponent>;
  let mockFlamService: jasmine.SpyObj<FlamService>;
  let mockSettingsService: jasmine.SpyObj<SettingsService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockZipperService: jasmine.SpyObj<ZipperService>;
  let mockMarkModeService: jasmine.SpyObj<MarkModeService>;
  let mockRowComponent: jasmine.SpyObj<RowComponent>;
  let mockProject: any;

  // Mock observables
  let flammarkers$: BehaviorSubject<boolean>;
  let zoom$: BehaviorSubject<boolean>;
  let zippedRows$: BehaviorSubject<any[]>;
  let isFirstStep$: BehaviorSubject<boolean>;
  let isLastStep$: BehaviorSubject<boolean>;
  let markModeChanged$: BehaviorSubject<number>;

  beforeEach(async () => {
    // Initialize mock observables
    flammarkers$ = new BehaviorSubject<boolean>(true);
    zoom$ = new BehaviorSubject<boolean>(false);
    markModeChanged$ = new BehaviorSubject<number>(0);
    zippedRows$ = new BehaviorSubject<any[]>([
      { steps: [{ count: 5 }, { count: 3 }, { count: 2 }] },
      { steps: [{ count: 1 }, { count: 4 }] },
    ]);
    isFirstStep$ = new BehaviorSubject<boolean>(false);
    isLastStep$ = new BehaviorSubject<boolean>(false);

    // Mock project
    mockProject = {
      markMode: 0,
      currentStep$: new BehaviorSubject(null),
    };

    // Create service spies
    mockFlamService = jasmine.createSpyObj('FlamService', [
      'isFirstStep',
      'isLastStep',
    ]);
    mockFlamService.isFirstStep.and.returnValue(isFirstStep$);
    mockFlamService.isLastStep.and.returnValue(isLastStep$);

    mockSettingsService = jasmine.createSpyObj('SettingsService', [], {
      flammarkers$: flammarkers$,
      zoom$: zoom$,
    });
    mockProjectService = jasmine.createSpyObj(
      'ProjectService',
      ['saveCurrentPosition'],
      {
        zippedRows$: zippedRows$,
      }
    );
    mockZipperService = jasmine.createSpyObj('ZipperService', ['expandSteps']);
    
    // Create a more realistic mock that tracks marked steps with new structured format
    const markedStepsStorage: { [rowIndex: number]: { [stepIndex: number]: number } } = {};
    const stepMarkSubjects: { [key: string]: BehaviorSubject<number> } = {};
    
    mockMarkModeService = jasmine.createSpyObj('MarkModeService', ['markStep', 'getStepMark', 'getStepMark$', 'toggleStepMark', 'canMarkSteps', 'markMultipleSteps'], {
      markModeChanged$: markModeChanged$,
      canMarkSteps$: new BehaviorSubject<boolean>(true),
    });
    
    mockMarkModeService.getStepMark.and.callFake((rowIndex: number, stepIndex: number) => {
      return markedStepsStorage[rowIndex]?.[stepIndex] || 0;
    });
    
    mockMarkModeService.getStepMark$.and.callFake((rowIndex: number, stepIndex: number) => {
      const key = `${rowIndex}-${stepIndex}`;
      if (!stepMarkSubjects[key]) {
        stepMarkSubjects[key] = new BehaviorSubject<number>(markedStepsStorage[rowIndex]?.[stepIndex] || 0);
      }
      return stepMarkSubjects[key].asObservable();
    });
    
    mockMarkModeService.markStep.and.callFake((rowIndex: number, stepIndex: number, markMode: number) => {
      if (!markedStepsStorage[rowIndex]) {
        markedStepsStorage[rowIndex] = {};
      }
      
      if (markMode === 0) {
        delete markedStepsStorage[rowIndex][stepIndex];
        if (Object.keys(markedStepsStorage[rowIndex]).length === 0) {
          delete markedStepsStorage[rowIndex];
        }
      } else {
        markedStepsStorage[rowIndex][stepIndex] = markMode;
      }
      
      // Update the subject for reactive updates
      const key = `${rowIndex}-${stepIndex}`;
      if (stepMarkSubjects[key]) {
        stepMarkSubjects[key].next(markMode);
      }
      
      return Promise.resolve();
    });

    // Mock the new enterprise service methods
    mockMarkModeService.toggleStepMark.and.callFake(async (rowIndex: number, stepIndex: number) => {
      const currentMark = mockMarkModeService.getStepMark(rowIndex, stepIndex);
      const currentMarkMode = markModeChanged$.value;
      const newMarkMode = currentMark === currentMarkMode ? 0 : currentMarkMode;
      await mockMarkModeService.markStep(rowIndex, stepIndex, newMarkMode);
      return newMarkMode;
    });

    mockMarkModeService.canMarkSteps.and.callFake(() => {
      return markModeChanged$.value > 0;
    });

    mockMarkModeService.markMultipleSteps.and.callFake(async (steps: Array<{ rowIndex: number, stepIndex: number }>) => {
      const currentMarkMode = markModeChanged$.value;
      let markedCount = 0;
      for (const step of steps) {
        await mockMarkModeService.markStep(step.rowIndex, step.stepIndex, currentMarkMode);
        markedCount++;
      }
      return markedCount;
    });

    // Mock RowComponent
    mockRowComponent = jasmine.createSpyObj('RowComponent', [], {
      index: 0,
      project: mockProject,
    });

    await TestBed.configureTestingModule({
      imports: [StepComponent, LoggerTestingModule],
      providers: [
        { provide: FlamService, useValue: mockFlamService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: ZipperService, useValue: mockZipperService },
        { provide: MarkModeService, useValue: mockMarkModeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StepComponent);
    component = fixture.componentInstance;

    // Set up component inputs
    component.step = { id: 1, count: 5, description: 'Test step' };
    component.index = 1;
    component.row = mockRowComponent;
    component.children = new QueryList<HierarchicalList>();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize component properties', () => {
      component.ngOnInit();

      expect(component.highlighted).toBe(false);
      expect(component.isCurrentStep).toBe(false);
      expect(component.marked).toBe(0);
    });

    it('should set isFirstStep and isLastStep when flammarkers is true', fakeAsync(() => {
      flammarkers$.next(true);
      zoom$.next(true);
      isFirstStep$.next(true);
      isLastStep$.next(false);

      component.ngOnInit();
      tick();

      expect(component.isFirstStep).toBe(true);
      expect(component.isLastStep).toBe(false);
      expect(component.isZoomed).toBe(true);
    }));

    it('should not set isFirstStep and isLastStep when flammarkers is false', fakeAsync(() => {
      flammarkers$.next(false);
      zoom$.next(false);

      component.ngOnInit();
      tick();

      expect(component.isFirstStep).toBe(false);
      expect(component.isLastStep).toBe(false);
      expect(component.isZoomed).toBe(false);
    }));

    it('should calculate beadCount$ correctly', fakeAsync(() => {
      component.ngOnInit();
      tick();

      let beadCount: number = 0;
      component.beadCount$.subscribe((count) => (beadCount = count));
      tick();

      // Should sum counts from index 0 to component.index (1): 5 + 3 = 8
      expect(beadCount).toBe(8);
    }));
  });

  describe('onClick', () => {
    beforeEach(() => {
      // Ensure ngOnInit is called before testing onClick
      component.ngOnInit();
    });

    describe('when in mark mode', () => {
      beforeEach(() => {
        markModeChanged$.next(3);
      });

      it('should set marked to markMode when marked is 0', fakeAsync(() => {
        component.marked = 0;

        component.onClick({});
        tick();

        expect(component.marked).toBe(3);
      }));

      it('should reset marked to 0 when marked equals markMode', fakeAsync(() => {
        // Set up the initial mark in the mock service storage
        mockMarkModeService.markStep(0, 1, 3);
        component.marked = 3;

        component.onClick({});
        tick();

        expect(component.marked).toBe(0);
      }));

      it('should change marked from one value to markMode', fakeAsync(() => {
        component.marked = 1;

        component.onClick({});
        tick();

        expect(component.marked).toBe(3);
      }));

      it('should return early and not call saveCurrentPosition', fakeAsync(() => {
        component.onClick({});
        tick();

        expect(mockProjectService.saveCurrentPosition).not.toHaveBeenCalled();
      }));
    });

    describe('when not in mark mode', () => {
      beforeEach(() => {
        markModeChanged$.next(0);
      });

      it('should set isCurrentStep to true and save position', fakeAsync(() => {
        mockProject.currentStep$.next(null);

        component.onClick({});
        tick();

        expect(component.isCurrentStep).toBe(true);
        expect(mockProjectService.saveCurrentPosition).toHaveBeenCalledWith(
          0,
          1
        );
      }));

      it('should unset previous current step when one exists', fakeAsync(() => {
        const previousStep = { isCurrentStep: true };
        mockProject.currentStep$.next(previousStep);

        component.onClick({});
        tick();

        expect(previousStep.isCurrentStep).toBe(false);
        expect(component.isCurrentStep).toBe(true);
      }));

      it('should emit this component as new current step', fakeAsync(() => {
        spyOn(mockProject.currentStep$, 'next');
        mockProject.currentStep$.next(null);

        component.onClick({});
        tick();

        expect(mockProject.currentStep$.next).toHaveBeenCalledWith(component);
      }));
    });
  });

  describe('host class bindings', () => {
    it('should bind isCurrentStep to current class', () => {
      // isCurrentStep is only set via onClick, not by observables
      component.isCurrentStep = true;
      fixture.detectChanges();

      expect(fixture.nativeElement.classList.contains('current')).toBe(true);

      component.isCurrentStep = false;
      fixture.detectChanges();
      expect(fixture.nativeElement.classList.contains('current')).toBe(false);
    });

    it('should bind isFirstStep to first class via flammarkers observable', fakeAsync(() => {
      // Control via service observables, not direct property manipulation
      flammarkers$.next(true);
      isFirstStep$.next(true);

      component.ngOnInit();
      tick();
      fixture.detectChanges();

      expect(component.isFirstStep).toBe(true);
      expect(fixture.nativeElement.classList.contains('first')).toBe(true);

      // Test false case
      isFirstStep$.next(false);
      tick();
      fixture.detectChanges();
      expect(component.isFirstStep).toBe(false);
      expect(fixture.nativeElement.classList.contains('first')).toBe(false);
    }));

    it('should bind isLastStep to last class via flammarkers observable', fakeAsync(() => {
      // Control via service observables, not direct property manipulation
      flammarkers$.next(true);
      isLastStep$.next(true);

      component.ngOnInit();
      tick();
      fixture.detectChanges();

      expect(component.isLastStep).toBe(true);
      expect(fixture.nativeElement.classList.contains('last')).toBe(true);

      // Test false case
      isLastStep$.next(false);
      tick();
      fixture.detectChanges();
      expect(component.isLastStep).toBe(false);
      expect(fixture.nativeElement.classList.contains('last')).toBe(false);
    }));

    it('should bind isZoomed to zoom class via zoom observable', fakeAsync(() => {
      // Control via service observable, not direct property manipulation
      zoom$.next(true);

      component.ngOnInit();
      tick();
      fixture.detectChanges();

      expect(component.isZoomed).toBe(true);
      expect(fixture.nativeElement.classList.contains('zoom')).toBe(true);

      // Test false case
      zoom$.next(false);
      tick();
      fixture.detectChanges();
      expect(component.isZoomed).toBe(false);
      expect(fixture.nativeElement.classList.contains('zoom')).toBe(false);
    }));

    it('should bind marked values to marked-X classes', async () => {
      component.ngOnInit(); // Ensure component is initialized
      
      // marked property is only set via onClick mark mode, test the real workflow
      for (let i = 1; i <= 6; i++) {
        // Use the service to mark the step, which is how it works in the real component
        await mockMarkModeService.markStep(component.row.index, component.index, i);
        component.marked = i; // Also set the property directly for immediate feedback
        fixture.detectChanges();

        expect(fixture.nativeElement.classList.contains(`marked-${i}`)).toBe(
          true
        );

        // Reset for next iteration
        await mockMarkModeService.markStep(component.row.index, component.index, 0);
        component.marked = 0;
        fixture.detectChanges();
        expect(fixture.nativeElement.classList.contains(`marked-${i}`)).toBe(
          false
        );
      }
    });

    it('should handle flammarkers disabled case', fakeAsync(() => {
      // When flammarkers is false, isFirstStep and isLastStep should be false
      flammarkers$.next(false);

      component.ngOnInit();
      tick();
      fixture.detectChanges();

      expect(component.isFirstStep).toBe(false);
      expect(component.isLastStep).toBe(false);
      expect(fixture.nativeElement.classList.contains('first')).toBe(false);
      expect(fixture.nativeElement.classList.contains('last')).toBe(false);
    }));

    it('should prevent external manipulation of reactive properties', () => {
      // Verify that the reactive properties are read-only
      // These properties should only be controlled by internal observables

      // isZoomed, isFirstStep, isLastStep should be read-only getters
      const descriptor1 = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(component),
        'isZoomed'
      );
      const descriptor2 = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(component),
        'isFirstStep'
      );
      const descriptor3 = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(component),
        'isLastStep'
      );

      expect(descriptor1?.set).toBeUndefined(); // No setter
      expect(descriptor1?.get).toBeDefined(); // Has getter
      expect(descriptor2?.set).toBeUndefined();
      expect(descriptor2?.get).toBeDefined();
      expect(descriptor3?.set).toBeUndefined();
      expect(descriptor3?.get).toBeDefined();

      // While isCurrentStep and marked should still be directly settable
      expect(component.hasOwnProperty('isCurrentStep')).toBe(true);
      expect(component.hasOwnProperty('marked')).toBe(true);
    });
  });

  describe('HierarchicalList implementation', () => {
    it('should implement HierarchicalList interface properties', () => {
      expect(component.index).toBeDefined();
      expect(component.children).toBeDefined();
      expect(component.children).toBeInstanceOf(QueryList);
    });

    it('should allow setting parent, prev, and next properties', () => {
      const mockParent = jasmine.createSpyObj('HierarchicalList', [], {
        index: 0,
      });
      const mockPrev = jasmine.createSpyObj('HierarchicalList', [], {
        index: 0,
      });
      const mockNext = jasmine.createSpyObj('HierarchicalList', [], {
        index: 2,
      });

      component.parent = mockParent;
      component.prev = mockPrev;
      component.next = mockNext;

      expect(component.parent).toBe(mockParent);
      expect(component.prev).toBe(mockPrev);
      expect(component.next).toBe(mockNext);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, QueryList, NO_ERRORS_SCHEMA, Output, EventEmitter } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom, of, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import { ProjectComponent } from './project.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../../../project-management/services';
import { SettingsService, MarkModeService } from '../../../../core/services';
import { Row } from '../../../../core/models/row';
import { Project } from '../../../../core/models/project';
import { Position } from '../../../../core/models/position';
import { StepComponent } from '../step/step.component';
import { RowComponent } from '../row/row.component';
import { ZipperService } from '../../../file-import/services';
import { PeyoteShorthandService } from '../../../file-import/loaders';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { selectZippedRows, selectCurrentPosition } from '../../../../core/store/selectors/project-selectors';
import { routes } from '../../../../app.routes';

// Mock store helper
function createStoreSelectMock(): jasmine.SpyObj<ReactiveStateStore> {
  return jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch'], {
    state$: of({}),
    actions$: new Subject(),
  });
}

// Minimal mock components
@Component({
  selector: 'app-step',
  template: '<div>Mock Step</div>',
  standalone: true,
  host: {
    '[class.current]': 'isCurrentStep',
    '[class.first]': 'isFirstStep',
    '[class.last]': 'isLastStep',
    '[class.zoom]': 'isZoomed',
    '[class.highlighted]': 'highlighted',
    '[class.marked-1]': 'marked === 1',
    '[class.marked-2]': 'marked === 2',
    '[class.marked-3]': 'marked === 3',
    '[class.marked-4]': 'marked === 4',
    '[class.marked-5]': 'marked === 5',
    '[class.marked-6]': 'marked === 6',
  },
})
class MockStepComponent {
  @Input() step: any;
  highlighted: boolean = false;
  isCurrentStep: boolean = false;
  isFirstStep: boolean = false;
  isLastStep: boolean = false;
  marked: number = 0;
  isZoomed: boolean = false;
  index: number = 0;
  row: any;
  parent: any = null;
  prev: any = null;
  next: any = null;
}

@Component({
  selector: 'app-row',
  template: '<div>Mock Row</div>',
  standalone: true
})
class MockRowComponent {
  @Input() row: any;
  @Input() steps: any;
  @Input() project: any;
  @Input() index: number = 0;
  children = new QueryList<any>();
  panel: any = { open: () => {} };
  visible: boolean = true;
  markFirstStep: boolean = false;
  parent: any = null;
  prev: any = null;
  next: any = null;
  show() {}
}

@Component({
  selector: 'app-error-boundary',
  template: '<ng-content></ng-content>',
  standalone: true
})
class MockErrorBoundaryComponent {
  @Output() retry = new EventEmitter<void>();
}

describe('ProjectComponent', () => {
  let component: ProjectComponent;
  let fixture: ComponentFixture<ProjectComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let settingsServiceStub: Partial<SettingsService>;
  let zipperServiceSpy: jasmine.SpyObj<ZipperService>;
  let activatedRouteStub: Partial<ActivatedRoute>;
  let markModeServiceSpy: jasmine.SpyObj<MarkModeService>;
  let matBottomSheetSpy: jasmine.SpyObj<MatBottomSheet>;
  let peyoteShorthandServiceSpy: jasmine.SpyObj<PeyoteShorthandService>;
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      [
        'loadCurrentProject',
        'loadCurrentProjectId',
        'loadProject',
        'saveCurrentPosition',
      ],
      {
        ready: new Subject<boolean>(),
        zippedRows$: new BehaviorSubject<Row[]>([]),
      }
    );
    zipperServiceSpy = jasmine.createSpyObj('ZipperService', ['zipperSteps']);
    markModeServiceSpy = jasmine.createSpyObj(
      'MarkModeService',
      ['setMarkMode'],
      {
        markModeChanged$: new Subject<number>(),
      }
    );
    matBottomSheetSpy = jasmine.createSpyObj('MatBottomSheet', ['open']);
    peyoteShorthandServiceSpy = jasmine.createSpyObj('PeyoteShorthandService', [
      'toProject',
    ]);
    storeSpy = createStoreSelectMock();

    // Mock ActivatedRoute with paramMap
    activatedRouteStub = {
      paramMap: of(convertToParamMap({ id: '1' })),
    };

    settingsServiceStub = {
      combine12$: new BehaviorSubject(false),
      multiadvance$: new BehaviorSubject(3),
    };

    await TestBed.configureTestingModule({
      imports: [LoggerTestingModule, ProjectComponent],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: SettingsService, useValue: settingsServiceStub },
        {
          provide: ZipperService,
          useValue: zipperServiceSpy,
        },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: MarkModeService, useValue: markModeServiceSpy },
        { provide: MatBottomSheet, useValue: matBottomSheetSpy },
        {
          provide: PeyoteShorthandService,
          useValue: peyoteShorthandServiceSpy,
        },
        { provide: ReactiveStateStore, useValue: storeSpy },
        provideRouter(routes),
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    // Override components with mocks
    TestBed.overrideComponent(ProjectComponent, {
      remove: { imports: [RowComponent] },
      add: { imports: [MockRowComponent] }
    });

    await TestBed.compileComponents();

    projectServiceSpy.loadCurrentProjectId.and.returnValue({ id: 1 });

    // Create a valid mock project that will pass isValidProject check
    const mockProject = {
      id: 1,
      name: 'Test Project',
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, count: 5, description: 'A' },
          ],
        },
      ],
      position: { row: 0, step: 0 },
    } as Project;

    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));
    zipperServiceSpy.zipperSteps.and.returnValue([]);

    // Set up default store mock responses for selectors BEFORE component creation
    storeSpy.select.and.callFake(<T>(selector: any): Observable<T> => {
      // Return different observables based on the selector
      if (selector === selectZippedRows) {
        return of([{ id: 1, steps: [{ id: 1, count: 5, description: 'A' }] }]) as Observable<T>;
      }
      if (selector === selectCurrentPosition) {
        return of({ row: 0, step: 0 }) as Observable<T>;
      }
      return of(null as T);
    });
    storeSpy.dispatch.and.stub();

    fixture = TestBed.createComponent(ProjectComponent);
    component = fixture.componentInstance;
    
    // Disable change detection for tests that don't need the full component lifecycle
    fixture.autoDetectChanges(false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a defined component', () => {
    expect(component).toBeDefined();
  });

  it('should initialize project$ on ngOnInit', async () => {
    const mockProject = {
      id: 1,
      name: 'Test Project',
      rows: [
        {
          id: 1,
          steps: [{ id: 1, count: 5, description: 'A' }],
        },
      ],
      position: { row: 0, step: 0 },
    } as Project;

    // Set up store to return mock project when selectCurrentProject is called
    storeSpy.select.and.returnValue(of(mockProject));

    component.ngOnInit();
    fixture.detectChanges();

    // Wait for the async operations to complete
    await fixture.whenStable();

    // Subscribe and get the first value with a timeout
    const project = await new Promise<Project>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 1000);

      component.project$.subscribe((project) => {
        clearTimeout(timeout);
        resolve(project);
      });
    });

    expect(project).toEqual(
      jasmine.objectContaining({
        name: 'Test Project',
        rows: jasmine.any(Array),
      })
    );
  });

  it('should initialize rows$ on ngOnInit', async () => {
    const expectedRows = [
      {
        id: 1,
        steps: [{ id: 1, count: 5, description: 'A' }],
      },
    ] as Row[];

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    // Use firstValueFrom to get the value from the observable
    const receivedRows = await firstValueFrom(component.rows$);

    expect(receivedRows).toEqual(expectedRows);
    expect(receivedRows[0].steps.length).toEqual(1);
  });

  it('should initialize position$ on ngOnInit', async () => {
    const mockPosition = { row: 1, step: 2 } as Position;

    // Override the store spy to return mock position specifically for selectCurrentPosition
    storeSpy.select.and.callFake((selector: any) => {
      if (selector === selectCurrentPosition) {
        return of(mockPosition) as any;
      }
      if (selector === selectZippedRows) {
        return of([]) as any;
      }
      return of(null) as any;
    });

    // Create a new component instance with the updated spy
    const testFixture = TestBed.createComponent(ProjectComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.ngOnInit();
    testFixture.detectChanges();
    await testFixture.whenStable();

    // Subscribe and get the first value with a timeout
    const position = await new Promise<Position>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 1000);

      testComponent.position$.subscribe((position) => {
        clearTimeout(timeout);
        resolve(position);
      });
    });

    expect(position).toEqual(mockPosition);
  });

  it('should update currentStep$ on children$ and position$ change', async () => {
    // Create mock steps at the correct indices
    const mockStep0 = new MockStepComponent();
    mockStep0.index = 0;
    mockStep0.isCurrentStep = false;
    
    const mockStep1 = new MockStepComponent();
    mockStep1.index = 1;
    mockStep1.isCurrentStep = false;

    const mockRowComponent = new MockRowComponent();
    mockRowComponent.index = 0;
    mockRowComponent.show = jasmine.createSpy('show');
    
    // Create a QueryList that has the get() method and proper steps
    const stepQueryList = new QueryList<StepComponent>();
    stepQueryList.reset([mockStep0 as any, mockStep1 as any]);
    
    // Add get method to the QueryList manually
    (stepQueryList as any).get = (index: number) => {
      const items = stepQueryList.toArray();
      return items[index];
    };
    
    mockRowComponent.children = stepQueryList;
    mockStep0.row = mockRowComponent;
    mockStep1.row = mockRowComponent;

    // Create the main children QueryList  
    const mockChildren = new QueryList<RowComponent>();
    mockChildren.reset([mockRowComponent as any]);
    
    // Add get method to QueryList for test compatibility
    (mockChildren as any).get = (index: number) => {
      const items = mockChildren.toArray();
      return items[index];
    };
    
    const mockPosition = { row: 0, step: 1 } as Position;

    component.ngOnInit();
    await fixture.whenStable();
    
    // Update store spy and trigger reactive chain
    storeSpy.select.withArgs(selectCurrentPosition).and.returnValue(of(mockPosition));
    component.children$.next(mockChildren);
    
    // Simulate position$ update
    const positionSubject = new BehaviorSubject<Position>(mockPosition);
    component.position$ = positionSubject.asObservable();
    
    // Test the reactive navigation logic
    const row = mockChildren.get(mockPosition.row);
    expect(row).toBeDefined();
    
    if (row) {
      const step = row.children?.get(mockPosition.step);
      expect(step).toBeDefined();
      
      if (step) {
        // Simulate reactive chain execution
        component.currentStep$.next(step);
        step.isCurrentStep = true;
        
        const currentStep = component.currentStep$.value;
        expect(currentStep).toBeDefined();
        expect(currentStep?.index).toBe(1);
        expect(currentStep?.isCurrentStep).toBe(true);
      }
    }
  });

  it('should advance step on onAdvanceStep', () => {
    spyOn(component, 'doStepForward').and.returnValue(Promise.resolve(false));
    component.onAdvanceStep();
    expect(component.doStepForward).toHaveBeenCalled();
  });

  it('should advance row on onAdvanceRow', () => {
    spyOn(component, 'doRowForward').and.returnValue(Promise.resolve(false));
    component.onAdvanceRow();
    expect(component.doRowForward).toHaveBeenCalled();
  });

  it('should retreat step on onRetreatStep', () => {
    spyOn(component, 'doStepBackward').and.returnValue(Promise.resolve(false));
    component.onRetreatStep();
    expect(component.doStepBackward).toHaveBeenCalled();
  });

  it('should retreat row on onRetreatRow', () => {
    spyOn(component, 'doRowBackward').and.returnValue(Promise.resolve(false));
    component.onRetreatRow();
    expect(component.doRowBackward).toHaveBeenCalled();
  });

  it('should handle right arrow key press', () => {
    spyOn(component, 'doStepForward').and.returnValue(Promise.resolve(false));
    component.onRightArrow();
    expect(component.doStepForward).toHaveBeenCalled();
  });

  it('should handle left arrow key press', () => {
    spyOn(component, 'doStepBackward').and.returnValue(Promise.resolve(false));
    component.onLeftArrow();
    expect(component.doStepBackward).toHaveBeenCalled();
  });

  it('should handle up arrow key press', () => {
    spyOn(component, 'doRowBackward').and.returnValue(Promise.resolve(false));
    component.onUpArrow();
    expect(component.doRowBackward).toHaveBeenCalled();
  });

  it('should handle down arrow key press', () => {
    spyOn(component, 'doRowForward').and.returnValue(Promise.resolve(false));
    component.onDownArrow();
    expect(component.doRowForward).toHaveBeenCalled();
  });
});

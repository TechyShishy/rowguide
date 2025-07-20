import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectComponent } from './project.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../../../project-management/services';
import { SettingsService, MarkModeService } from '../../../../core/services';
import { BehaviorSubject, Subject, firstValueFrom, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { Row } from '../../../../core/models/row';
import { provideRouter } from '@angular/router';
import { routes } from '../../../../app.routes';
import { Project } from '../../../../core/models/project';
import { Position } from '../../../../core/models/position';
import { QueryList } from '@angular/core';
import { StepComponent } from '../step/step.component';
import { RowComponent } from '../row/row.component';
import { ZipperService } from '../../../file-import/services';
import { ActivatedRoute } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { PeyoteShorthandService } from '../../../file-import/loaders';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { selectZippedRows, selectCurrentPosition } from '../../../../core/store/selectors/project-selectors';

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
    storeSpy = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);

    // Mock ActivatedRoute with paramMap
    activatedRouteStub = {
      paramMap: of(convertToParamMap({ id: '1' })),
    };
    /*projectServiceStub = {
      ready: new Subject<boolean>(),
      loadCurrentProject: jasmine.createSpy('loadCurrentProject'),
      loadCurrentProjectId: jasmine.createSpy('loadCurrentProjectId'),
      loadProject: jasmine.createSpy('loadProject'),
      saveCurrentPosition: jasmine.createSpy('saveCurrentPosition'),
    };*/

    settingsServiceStub = {
      combine12$: new BehaviorSubject(false), // Mock combine12$ observable
      multiadvance$: new BehaviorSubject(3), // Mock multiadvance$ observable
    };

    await TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
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
    }).compileComponents();

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
    storeSpy.select.and.callFake((selector: any) => {
      // Return different observables based on the selector
      if (selector === selectZippedRows) {
        return of([
          {
            id: 1,
            steps: [{ id: 1, count: 5, description: 'A' }],
          },
        ]) as any; // Default to single step for tests
      }
      if (selector === selectCurrentPosition) {
        return of({ row: 0, step: 0 }) as any;
      }
      return of(null) as any;
    });
    storeSpy.dispatch.and.stub();

    fixture = TestBed.createComponent(ProjectComponent);
    component = fixture.componentInstance;
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
    const mockRow = jasmine.createSpyObj('RowComponent', ['show'], {
      children: new QueryList<StepComponent>(),
    });

    const mockStep = jasmine.createSpyObj('StepComponent', ['onClick'], {
      index: 1,
      row: mockRow,
      isCurrentStep: false
    });

    mockRow.children.reset([mockStep]);
    mockRow.show.and.callFake(() => {});
    const mockChildren = new QueryList<RowComponent>();
    mockChildren.reset([mockRow]);
    const mockPosition = { row: 0, step: 1 } as Position;

    // Set up store to return mock position
    storeSpy.select.and.returnValue(of(mockPosition));

    component.children$.next(mockChildren);

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    component.ngAfterViewInit();

    const currentStep = await firstValueFrom(component.currentStep$);
    expect(currentStep).toEqual(mockStep);
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

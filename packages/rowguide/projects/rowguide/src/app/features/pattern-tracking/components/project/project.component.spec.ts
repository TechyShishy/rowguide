import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectComponent } from './project.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../../../project-management/services';
import { SettingsService, MarkModeService } from '../../../../core/services';
import { BehaviorSubject, Subject, firstValueFrom, of } from 'rxjs';
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
            { id: 2, count: 3, description: 'B' },
          ],
        },
      ],
      position: { row: 0, step: 0 },
    } as Project;

    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));
    zipperServiceSpy.zipperSteps.and.returnValue([]);
    fixture = TestBed.createComponent(ProjectComponent);
    component = fixture.componentInstance;
    //fixture.detectChanges();
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

    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));

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
    const mockRows = [
      {
        id: 1,
        steps: [{ id: 1, count: 5, description: 'A' }],
      },
    ] as Row[];

    const mockProject = {
      id: 1,
      rows: mockRows,
      position: { row: 0, step: 0 },
    } as Project;

    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    // Subscribe and get the first value with a timeout
    const rows = await new Promise<Row[]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 1000);

      component.rows$.subscribe((rows) => {
        clearTimeout(timeout);
        resolve(rows);
      });
    });

    expect(rows).toEqual(mockRows);
  });

  it('should initialize position$ on ngOnInit', async () => {
    const mockPosition = { row: 1, step: 2 } as Position;
    const mockProject = {
      id: 1,
      rows: [
        {
          id: 1,
          steps: [{ id: 1, count: 5, description: 'A' }],
        },
      ],
      position: mockPosition,
    } as Project;

    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    // Subscribe and get the first value with a timeout
    const position = await new Promise<Position>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 1000);

      component.position$.subscribe((position) => {
        clearTimeout(timeout);
        resolve(position);
      });
    });

    expect(position).toEqual(mockPosition);
  });

  it('should update currentStep$ on children$ and position$ change', async () => {
    const mockStep = jasmine.createSpyObj('StepComponent', ['onClick'], {
      index: 1,
      row: {
        children: new QueryList<StepComponent>(),
        project: component,
      } as RowComponent,
    });
    const mockRow = jasmine.createSpyObj('RowComponent', ['show'], {
      children: new QueryList<StepComponent>(),
    });
    mockRow.children.reset([mockStep]);
    mockRow.show.and.callFake(() => {});
    const mockChildren = new QueryList<RowComponent>();
    mockChildren.reset([mockRow]);
    const mockPosition = { row: 0, step: 1 } as Position;

    component.children$.next(mockChildren);
    component.position$ = of(mockPosition);

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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectComponent } from './project.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../project.service';
import { SettingsService } from '../settings.service';
import { BehaviorSubject, Subject, firstValueFrom, of } from 'rxjs';
import { Row } from '../core/models/row';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { Project } from '../core/models/project';
import { Position } from '../core/models/position';
import { QueryList } from '@angular/core';
import { StepComponent } from '../step/step.component';
import { RowComponent } from '../row/row.component';
import { ZipperService } from '../zipper.service';

describe('ProjectComponent', () => {
  let component: ProjectComponent;
  let fixture: ComponentFixture<ProjectComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let settingsServiceStub: Partial<SettingsService>;
  let zipperServiceSpy: jasmine.SpyObj<ZipperService>;

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
        provideRouter(routes),
      ],
    }).compileComponents();

    projectServiceSpy.loadCurrentProjectId.and.returnValue({ id: 1 });
    projectServiceSpy.loadProject.and.returnValue(
      Promise.resolve({ rows: [], position: { row: 0, step: 0 } } as Project)
    );
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
    const mockProject = { rows: [], position: { row: 0, step: 0 } } as Project;
    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));
    projectServiceSpy.loadCurrentProjectId.and.returnValue({
      id: 1,
    });

    component.ngOnInit();
    //fixture.detectChanges();

    const project = await firstValueFrom(component.project$);
    expect(project).toEqual(mockProject);
  });

  it('should initialize rows$ on ngOnInit', async () => {
    const mockRows = [{}, {}] as Row[];
    const mockProject = {
      rows: mockRows,
      position: { row: 0, step: 0 },
    } as Project;
    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));
    projectServiceSpy.loadCurrentProjectId.and.returnValue({
      id: 1,
    });

    component.ngOnInit();
    //fixture.detectChanges();

    const rows = await firstValueFrom(component.rows$);
    expect(rows).toEqual(mockRows);
  });

  it('should initialize position$ on ngOnInit', async () => {
    const mockPosition = { row: 1, step: 2 } as Position;
    const mockProject = { rows: [], position: mockPosition } as Project;
    projectServiceSpy.loadProject.and.returnValue(Promise.resolve(mockProject));
    projectServiceSpy.loadCurrentProjectId.and.returnValue({
      id: 1,
    });

    component.ngOnInit();
    //fixture.detectChanges();

    const position = await firstValueFrom(component.position$);
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

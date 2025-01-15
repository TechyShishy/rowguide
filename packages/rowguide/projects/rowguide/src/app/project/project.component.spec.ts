import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectComponent } from './project.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../project.service';
import { SettingsService } from '../settings.service';
import { Observable, Subject, of } from 'rxjs';
import { Row } from '../row';

describe('ProjectComponent', () => {
  let component: ProjectComponent;
  let fixture: ComponentFixture<ProjectComponent>;
  let projectServiceStub: Partial<ProjectService>;
  let settingsServiceStub: Partial<SettingsService>;

  beforeEach(async () => {
    projectServiceStub = {
      ready: new Subject<boolean>(),
      loadCurrentProject: jasmine.createSpy('loadCurrentProject'),
      saveCurrentPosition: jasmine.createSpy('saveCurrentPosition'),
    };

    settingsServiceStub = {};

    await TestBed.configureTestingModule({
      imports: [ProjectComponent, LoggerTestingModule],
      providers: [
        { provide: ProjectService, useValue: projectServiceStub },
        { provide: SettingsService, useValue: settingsServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a defined component', () => {
    expect(component).toBeDefined();
  });

  it('should initialize rows on ngOnInit', () => {
    component.ngOnInit();
    expectAsync(component.rows$).toBeResolvedTo(new Observable<Row[]>());
    expect(projectServiceStub.loadCurrentProject).toHaveBeenCalled();
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

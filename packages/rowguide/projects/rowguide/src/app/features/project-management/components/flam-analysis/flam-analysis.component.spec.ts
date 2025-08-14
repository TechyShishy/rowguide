import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { of, BehaviorSubject } from 'rxjs';

import { FlamAnalysisComponent } from './flam-analysis.component';
import { FlamService } from '../../../../core/services/flam.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { ProjectService } from '../../services/project.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

describe('FlamAnalysisComponent', () => {
  let component: FlamAnalysisComponent;
  let fixture: ComponentFixture<FlamAnalysisComponent>;
  let mockFlamService: jasmine.SpyObj<FlamService>;
  let mockSettingsService: jasmine.SpyObj<SettingsService>;
  let mockReactiveStateStore: jasmine.SpyObj<ReactiveStateStore>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;
  let mockLogger: jasmine.SpyObj<NGXLogger>;
  let mockActivatedRoute: any;
  let mockRouteParamsSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    // Create spy objects for all dependencies
    mockFlamService = jasmine.createSpyObj('FlamService', [
      'generateFLAM',
      'resetAllColorCodes'
    ], {
      flam$: of({})
    });

    mockSettingsService = jasmine.createSpyObj('SettingsService', [
      'updateSettings'
    ], {
      flamsort$: of('keyAsc'),
      colorModelPrefix$: of('DB')
    });

    mockReactiveStateStore = jasmine.createSpyObj('ReactiveStateStore', [
      'select',
      'dispatch'
    ]);

    mockProjectService = jasmine.createSpyObj('ProjectService', [
      'getCurrentProject',
      'updateProject',
      'loadProject'
    ], {
      ready$: of(true)
    });

    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
      'logError',
      'getNotifications'
    ]);

    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);

    mockLogger = jasmine.createSpyObj('NGXLogger', [
      'debug',
      'info',
      'warn',
      'error'
    ]);

    // Create controllable route params subject
    mockRouteParamsSubject = new BehaviorSubject({});

    // Mock ActivatedRoute with controllable params observable
    mockActivatedRoute = {
      params: mockRouteParamsSubject.asObservable(),
      snapshot: { url: [{ path: 'flam-analysis' }] }
    };

    // Set up default return values
    mockReactiveStateStore.select.and.returnValue(of(null));
    mockErrorHandler.getNotifications.and.returnValue(of(null));
    mockProjectService.loadProject.and.returnValue(Promise.resolve({ id: 123, name: 'Test Project', rows: [] }));

    await TestBed.configureTestingModule({
      imports: [
        FlamAnalysisComponent,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: FlamService, useValue: mockFlamService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ReactiveStateStore, useValue: mockReactiveStateStore },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: NGXLogger, useValue: mockLogger },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlamAnalysisComponent);
    component = fixture.componentInstance;

    // Spy on subscribeToFlamUpdates to prevent it from being called during route parameter tests
    spyOn(component as any, 'subscribeToFlamUpdates');

    // Don't call fixture.detectChanges() here - let individual tests control when ngOnInit is called
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.dataSource).toBeDefined();
    expect(component.editingColorKey).toBeNull();
  });

  it('should handle empty project data', () => {
    mockReactiveStateStore.select.and.returnValue(of(null));
    component.ngOnInit();
    expect(component.dataSource.data).toEqual([]);
  });

  it('should inject ActivatedRoute for route parameter support', () => {
    expect(component['route']).toBeDefined();
  });

  describe('Route Parameter Handling', () => {
    beforeEach(() => {
      // Reset call counts
      mockProjectService.loadProject?.calls?.reset();
      mockLogger.info?.calls?.reset();
      mockLogger.debug?.calls?.reset();
      mockLogger.warn?.calls?.reset();
      mockErrorHandler.handleError?.calls?.reset();

      // Reset route params to empty
      mockRouteParamsSubject.next({});
    });

    it('should load project when route parameter ID is provided', fakeAsync(() => {
      const projectId = 123;

      // Emit route params with project ID before ngOnInit
      mockRouteParamsSubject.next({ id: projectId.toString() });

      // Trigger ngOnInit by calling detectChanges
      fixture.detectChanges();
      tick();

      expect(mockProjectService.loadProject).toHaveBeenCalledWith(projectId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Loading project from route parameter for FLAM analysis: ${projectId}`
      );
    }));

    it('should handle invalid project ID in route parameter', fakeAsync(() => {
      const invalidId = 'invalid';

      // Emit route params with invalid ID before ngOnInit
      mockRouteParamsSubject.next({ id: invalidId });

      // Trigger ngOnInit by calling detectChanges
      fixture.detectChanges();
      tick();

      // Should not call loadProject with invalid ID
      expect(mockProjectService.loadProject).not.toHaveBeenCalled();
      // Should log error through error handler
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
        jasmine.objectContaining({
          operation: 'loadProjectFromRouteForFlam',
          invalidId: invalidId
        }),
        jasmine.any(String),
        'medium'
      );
    }));    it('should use localStorage loading when no route parameter is provided', fakeAsync(() => {
      // Spy on initializeProjectLoading to verify it's called
      spyOn(component as any, 'initializeProjectLoading').and.stub();

      // Emit empty route params (no ID parameter) before ngOnInit
      mockRouteParamsSubject.next({});

      // Trigger ngOnInit by calling detectChanges
      fixture.detectChanges();
      tick();

      // Should not call loadProject when no ID parameter is present
      expect(mockProjectService.loadProject).not.toHaveBeenCalled();
      // Should call initializeProjectLoading for localStorage-based loading
      expect((component as any).initializeProjectLoading).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No project ID in route for FLAM analysis, using standard project loading'
      );
    }));
  });
});

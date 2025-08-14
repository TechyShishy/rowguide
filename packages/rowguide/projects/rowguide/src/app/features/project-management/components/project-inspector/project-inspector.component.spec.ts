import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { ActivatedRoute } from '@angular/router';
import { ProjectInspectorComponent } from './project-inspector.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../../services';
import { SettingsService } from '../../../../core/services';
import { ProjectDbService } from '../../../../data/services/project-db.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { Project } from '../../../../core/models/project';
import { Row } from '../../../../core/models/row';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveStateStore } from '../../../../core/store/reactive-state-store';
import { selectCurrentProject } from '../../../../core/store/selectors/project-selectors';
import { ErrorHandlerService } from '../../../../core/services';

describe('ProjectInspectorComponent', () => {
  let component: ProjectInspectorComponent;
  let fixture: ComponentFixture<ProjectInspectorComponent>;
  let mockProjectService: Partial<ProjectService>;
  let mockSettingsService: Partial<SettingsService>;
  let mockIndexedDBService: Partial<ProjectDbService>;
  let mockErrorHandler: Partial<ErrorHandlerService>;
  let mockStoreSpy: jasmine.SpyObj<ReactiveStateStore>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let dialog: MatDialog;

  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    rows: [
      {
        id: 1,
        steps: [
          { id: 1, count: 2, description: 'DB' },
          { id: 2, count: 1, description: 'A' },
        ],
      },
    ],
    position: { row: 0, step: 0 },
  };

  beforeEach(async () => {
    const mockProjectBehaviorSubject = new BehaviorSubject<Project>(
      mockProject
    );

    mockProjectService = {
      project$: mockProjectBehaviorSubject,
      zippedRows$: new BehaviorSubject<Row[]>(mockProject.rows),
      ready$: new BehaviorSubject<boolean>(true),
      saveCurrentPosition: jasmine
        .createSpy('saveCurrentPosition')
        .and.returnValue(Promise.resolve()),
    };

    mockSettingsService = {
      ready: new Subject<boolean>(),
      combine12$: new BehaviorSubject<boolean>(false),
      lrdesignators$: new BehaviorSubject<boolean>(false),
      flammarkers$: new BehaviorSubject<boolean>(false),
      zoom$: new BehaviorSubject<boolean>(false),
      scrolloffset$: new BehaviorSubject<number>(-1),
      multiadvance$: new BehaviorSubject<number>(3),
      projectsort$: new BehaviorSubject<string>('dateAsc'),
    };

    mockIndexedDBService = {
      loadProject: jasmine
        .createSpy('loadProject')
        .and.returnValue(Promise.resolve(mockProject)),
      updateProject: jasmine
        .createSpy('updateProject')
        .and.returnValue(Promise.resolve()),
    };

    mockErrorHandler = {
      handleError: jasmine.createSpy('handleError').and.stub(),
      getNotifications: jasmine.createSpy('getNotifications').and.returnValue(of([])),
    };

    // Create ReactiveStateStore spy
    mockStoreSpy = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);
    mockStoreSpy.select.and.returnValue(mockProjectBehaviorSubject.asObservable());
    mockStoreSpy.dispatch.and.stub();

    // Create ActivatedRoute mock with minimal required properties
    // Component only uses: route.params and route.snapshot.url
    mockActivatedRoute = {
      params: of({}), // Observable for route parameters (main usage)
      snapshot: {
        url: [], // Used for error logging: route.snapshot.url.join('/')
        // Required by TypeScript interface but not used by component
        params: {},
        queryParams: {},
        fragment: null,
        data: {},
        outlet: 'primary',
        component: null,
        routeConfig: null,
        root: null as any,
        parent: null,
        firstChild: null,
        children: [],
        pathFromRoot: [],
        title: '',
        paramMap: { get: () => null, has: () => false, getAll: () => [], keys: [] },
        queryParamMap: { get: () => null, has: () => false, getAll: () => [], keys: [] }
      }
    };

    await TestBed.configureTestingModule({
      imports: [
        ProjectInspectorComponent,
        LoggerTestingModule,
        NoopAnimationsModule,
        MatDialogModule,
        OverlayModule,
      ],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ProjectDbService, useValue: mockIndexedDBService },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
        { provide: ReactiveStateStore, useValue: mockStoreSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectInspectorComponent);
    component = fixture.componentInstance;

    // Get the real dialog service
    dialog = TestBed.inject(MatDialog);

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with file property', () => {
      expect(component.file).toBeDefined();
      expect(component.file.name).toBe('');
    });
  });

  describe('Image Loading', () => {
    it('should load project image when project has image data', async () => {
      const mockImageBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const projectWithImage = { ...mockProject, image: mockImageBuffer };

      const result = await component.loadProjectImage(projectWithImage);

      expect(result).toContain('data:image/png;base64,');
    });

    it('should return empty string when project has no image', async () => {
      const projectWithoutImage = { ...mockProject, image: undefined };

      const result = await component.loadProjectImage(projectWithoutImage);

      expect(result).toBe('');
    });

    it('should handle null project gracefully', async () => {
      const result = await component.loadProjectImage(null as any);
      expect(result).toBe('');
    });

    it('should map image$ observable correctly', fakeAsync(() => {
      // Test with a project that has no image - should return placeholder
      const projectWithoutImage = { ...mockProject };
      delete projectWithoutImage.image;

      mockProjectService.project$ = of(projectWithoutImage);

      let imageResult: string = '';
      component.image$.subscribe((image) => (imageResult = image));
      tick();

      // When no image is available, should default to placeholder
      expect(imageResult).toBe('assets/no-image-available.png');
    }));
  });

  describe('File Upload', () => {
    it('should upload valid PNG file', fakeAsync(() => {
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const mockBuffer = new ArrayBuffer(pngHeader.length);
      const view = new Uint8Array(mockBuffer);
      view.set(pngHeader);

      component.file = new File([mockBuffer], 'test.png', {
        type: 'image/png',
      });
      spyOn(component.file, 'arrayBuffer').and.returnValue(
        Promise.resolve(mockBuffer)
      );

      component.uploadPicture();
      tick();

      expect(mockIndexedDBService.updateProject).toHaveBeenCalled();
      // Note: Project state updates now go through store.dispatch
    }));

    it('should reject non-PNG files', fakeAsync(() => {
      const nonPngBuffer = new ArrayBuffer(8);
      const view = new Uint8Array(nonPngBuffer);
      view.fill(0);

      component.file = new File([nonPngBuffer], 'test.jpg', {
        type: 'image/jpeg',
      });
      spyOn(component.file, 'arrayBuffer').and.returnValue(
        Promise.resolve(nonPngBuffer)
      );

      component.uploadPicture();
      tick();

      expect(mockIndexedDBService.updateProject).not.toHaveBeenCalled();
      // Note: Invalid files should not trigger store updates
    }));
  });

  describe('Position Management', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should skip dialog and reset position when "don\'t ask again" is set', async () => {
      // Set the localStorage flag to skip confirmation
      localStorage.setItem('skipResetPositionConfirmation', 'true');

      component.resetPosition();

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      // Position should be reset directly without dialog using new separated architecture
      expect(mockProjectService.saveCurrentPosition).toHaveBeenCalledWith(0, 0);
    });

    it('should test executeReset method directly', async () => {
      // Test the private method directly
      await (component as any).executeReset();

      expect(mockProjectService.saveCurrentPosition).toHaveBeenCalledWith(0, 0);
    });

    it('should have dialog service available for testing', () => {
      // Simple test to verify dialog service is available
      expect(dialog).toBeDefined();
      expect(typeof dialog.open).toBe('function');
    });

    it('should load project image', async () => {
      const mockProject = { id: 1, image: new ArrayBuffer(0), rows: [] };
      const image = await component.loadProjectImage(mockProject);

      expect(image).toContain('data:image/png;base64,');
    });

    it('should not load project image if no image exists', async () => {
      const mockProject = { id: 1, image: undefined, rows: [] };
      if (!mockIndexedDBService.loadProject) {
        mockIndexedDBService.loadProject = jasmine
          .createSpy('loadProject')
          .and.returnValue(Promise.resolve(mockProject));
      }
      (mockIndexedDBService.loadProject as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProject)
      );

      const image = await component.loadProjectImage(mockProject);

      expect(image).toBe('');
    });
  });

  describe('Route Parameter Handling', () => {
    beforeEach(() => {
      // Add loadProject spy to mockProjectService if not already present
      if (!mockProjectService.loadProject) {
        mockProjectService.loadProject = jasmine.createSpy('loadProject').and.returnValue(Promise.resolve(mockProject));
      }
    });

    it('should load project when route parameter ID is provided', fakeAsync(() => {
      const projectId = 123;
      const mockRouteParams = new BehaviorSubject({ id: projectId.toString() });

      // Update the ActivatedRoute mock to emit route parameters
      (mockActivatedRoute as any).params = mockRouteParams.asObservable();

      // Create a new component instance with the updated route
      const newFixture = TestBed.createComponent(ProjectInspectorComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();
      tick();

      expect(mockProjectService.loadProject).toHaveBeenCalledWith(projectId);
    }));

    it('should handle invalid project ID in route parameter', fakeAsync(() => {
      const invalidId = 'invalid';
      const mockRouteParams = new BehaviorSubject({ id: invalidId });

      // Update the ActivatedRoute mock to emit invalid route parameters
      (mockActivatedRoute as any).params = mockRouteParams.asObservable();

      // Create a new component instance with the updated route
      const newFixture = TestBed.createComponent(ProjectInspectorComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();
      tick();

      // Should not call loadProject with invalid ID
      expect(mockProjectService.loadProject).not.toHaveBeenCalled();
      // Should log error through error handler
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    }));

    it('should handle negative project ID in route parameter', fakeAsync(() => {
      const negativeId = -1;
      const mockRouteParams = new BehaviorSubject({ id: negativeId.toString() });

      // Update the ActivatedRoute mock to emit negative route parameters
      (mockActivatedRoute as any).params = mockRouteParams.asObservable();

      // Create a new component instance with the updated route
      const newFixture = TestBed.createComponent(ProjectInspectorComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();
      tick();

      // Should not call loadProject with negative ID
      expect(mockProjectService.loadProject).not.toHaveBeenCalled();
      // Should log error through error handler
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    }));

    it('should use default behavior when no route parameter is provided', fakeAsync(() => {
      const mockRouteParams = new BehaviorSubject({});

      // Update the ActivatedRoute mock to emit no route parameters
      (mockActivatedRoute as any).params = mockRouteParams.asObservable();

      // Create a new component instance with the updated route
      const newFixture = TestBed.createComponent(ProjectInspectorComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();
      tick();

      // Should not call loadProject when no ID parameter is present
      // (relies on ProjectService's localStorage-based loading)
      expect(mockProjectService.loadProject).not.toHaveBeenCalled();
    }));

    it('should handle project loading errors from route parameter', fakeAsync(() => {
      const projectId = 123;
      const mockRouteParams = new BehaviorSubject({ id: projectId.toString() });
      const loadError = new Error('Project not found');

      // Update the ActivatedRoute mock and make loadProject fail
      (mockActivatedRoute as any).params = mockRouteParams.asObservable();
      (mockProjectService.loadProject as jasmine.Spy).and.returnValue(Promise.reject(loadError));

      // Create a new component instance with the updated route
      const newFixture = TestBed.createComponent(ProjectInspectorComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();
      tick();

      expect(mockProjectService.loadProject).toHaveBeenCalledWith(projectId);
      // Should handle the error through error handler
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        loadError,
        jasmine.objectContaining({
          operation: 'loadProjectFromRoute',
          projectId: projectId
        }),
        jasmine.any(String),
        'medium'
      );
    }));
  });
});

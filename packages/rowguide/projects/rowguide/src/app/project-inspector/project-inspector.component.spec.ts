import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectInspectorComponent } from './project-inspector.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { ProjectService } from '../features/project-management/services';
import { SettingsService } from '../core/services';
import { FlamService } from '../core/services';
import { ProjectDbService } from '../project-db.service';
import {
  BehaviorSubject,
} from 'rxjs';
import { Project } from '../core/models/project';
import { FLAM } from '../core/models/flam';

describe('ProjectInspectorComponent', () => {
  let component: ProjectInspectorComponent;
  let fixture: ComponentFixture<ProjectInspectorComponent>;
  let mockProjectService: Partial<ProjectService>;
  let mockSettingsService: Partial<SettingsService>;
  let mockFlamService: Partial<FlamService>;
  let mockIndexedDBService: Partial<ProjectDbService>;
  let mockImage$: BehaviorSubject<string>;

  beforeEach(async () => {
    mockProjectService = {
      project$: new BehaviorSubject<Project>({ id: 1, rows: [] }),
      ready: new BehaviorSubject<boolean>(true),
    };

    mockSettingsService = {
      combine12$: new BehaviorSubject<boolean>(false),
      lrdesignators$: new BehaviorSubject<boolean>(false),
      flammarkers$: new BehaviorSubject<boolean>(false),
      ppinspector$: new BehaviorSubject<boolean>(false),
      zoom$: new BehaviorSubject<boolean>(false),
    };

    mockFlamService = {
      //inititalizeFLAM: jasmine.createSpy('inititalizeFLAM'),
      flam$: new BehaviorSubject<FLAM>({} as FLAM),
    };

    mockIndexedDBService = {
      loadProject: jasmine.createSpy('loadProject').and.returnValue(
        Promise.resolve({
          id: 1,
          rows: [],
          image: new ArrayBuffer(0),
        }) as Promise<Project>
      ),
    };

    mockImage$ = new BehaviorSubject<string>('');

    await TestBed.configureTestingModule({
      imports: [ProjectInspectorComponent, LoggerTestingModule],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: FlamService, useValue: mockFlamService },
        { provide: ProjectDbService, useValue: mockIndexedDBService },
        { provide: 'image$', useValue: mockImage$ },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectInspectorComponent);
    component = fixture.componentInstance;

    spyOn(component, 'loadProjectImage').and.callThrough();

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /*it('should initialize FLAM on projectService ready', async () => {
    component.ngOnInit();
    await fixture.whenStable();

    expect(mockFlamService.inititalizeFLAM).toHaveBeenCalledWith(true);
  });*/

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

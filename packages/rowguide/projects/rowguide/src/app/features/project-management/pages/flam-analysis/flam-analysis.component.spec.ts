import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { of } from 'rxjs';

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
      colorModelPrefix$: of('DB'),
      ppinspector$: of(true)
    });

    mockReactiveStateStore = jasmine.createSpyObj('ReactiveStateStore', [
      'select',
      'dispatch'
    ]);

    mockProjectService = jasmine.createSpyObj('ProjectService', [
      'getCurrentProject',
      'updateProject'
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

    // Set up default return values
    mockReactiveStateStore.select.and.returnValue(of(null));
    mockErrorHandler.getNotifications.and.returnValue(of(null));

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
        { provide: NGXLogger, useValue: mockLogger }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlamAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
});

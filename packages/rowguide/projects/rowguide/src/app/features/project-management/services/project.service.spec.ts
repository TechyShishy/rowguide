import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { of, Subject, throwError } from 'rxjs';

import { ProjectService } from './project.service';
import { PeyoteShorthandService } from '../../file-import/loaders';
import {
  SettingsService,
  ErrorHandlerService,
  ErrorContext,
} from '../../../core/services';
import { ProjectDbService } from '../../../data/services';
import { NullProject, BeadProject } from '../models';
import { ModelFactory, Project, Position } from '../../../core/models';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../../app.routes';

describe('ProjectService', () => {
  let service: ProjectService;
  let peyoteShorthandService: jasmine.SpyObj<PeyoteShorthandService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let projectDbService: jasmine.SpyObj<ProjectDbService>;
  let logger: jasmine.SpyObj<NGXLogger>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;

  const createValidTestProject = (): BeadProject => {
    const project = new BeadProject();
    project.id = 1;
    project.name = 'Test Project';
    project.rows = [
      {
        id: 1,
        steps: [
          { id: 1, count: 5, description: 'A' },
          { id: 2, count: 3, description: 'B' },
        ],
      },
    ];
    project.position = { row: 0, step: 0 };
    project.firstLastAppearanceMap = {
      A: { key: 'A', firstAppearance: [0], lastAppearance: [0], count: 5 },
      B: { key: 'B', firstAppearance: [0], lastAppearance: [0], count: 3 },
    };
    project.colorMapping = {};
    project.image = undefined;
    return project;
  };

  beforeEach(() => {
    const settingsReadySubject = new Subject<boolean>();

    const peyoteShorthandServiceSpy = jasmine.createSpyObj(
      'PeyoteShorthandService',
      ['toProject']
    );
    const settingsServiceSpy = jasmine.createSpyObj('SettingsService', [], {
      ready: settingsReadySubject,
    });
    const projectDbServiceSpy = jasmine.createSpyObj('ProjectDbService', [
      'addProject',
      'loadProject',
      'updateProject',
    ]);
    const loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'debug',
      'warn',
      'error',
      'info',
    ]);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      paramMap: of(new Map()),
    });
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    // Configure ErrorHandlerService mock for ProjectService with structured context handling
    errorHandlerSpyObj.handleError.and.callFake(
      (
        error: any,
        context: string | ErrorContext,
        userMessage?: string,
        severity?: string
      ) => {
        // Handle structured context objects for ProjectService calls
        if (typeof context === 'object' && context !== null) {
          const operation = context['operation'];
          const details = context['details'];

          if (
            operation === 'saveCurrentProject' &&
            details === 'Invalid project ID provided'
          ) {
            loggerSpy.warn(
              'Attempted to save invalid project ID:',
              context['projectId']
            );
          } else if (
            operation === 'saveCurrentProject' &&
            details?.includes('Failed to save project ID')
          ) {
            loggerSpy.error(
              'Failed to save current project to localStorage:',
              error
            );
          } else if (
            operation === 'loadCurrentProjectId' &&
            details === 'Failed to load project ID from localStorage'
          ) {
            loggerSpy.error(
              'Failed to load current project ID from localStorage:',
              error
            );
          } else if (
            operation === 'loadCurrentProject' &&
            details?.includes('Failed to load current project ID')
          ) {
            loggerSpy.error('Failed to load current project:', error);
          } else if (
            operation === 'loadPeyote' &&
            details?.includes('Failed to parse and save peyote project')
          ) {
            loggerSpy.error('Failed to load peyote project:', error);
          } else if (
            operation === 'loadProject' &&
            details === 'Invalid project ID provided'
          ) {
            loggerSpy.warn(
              'Invalid project ID provided:',
              context['projectId']
            );
          } else if (
            operation === 'loadProject' &&
            details === 'Project not found in database'
          ) {
            loggerSpy.warn('Project not found:', context['projectId']);
          } else if (
            operation === 'loadProject' &&
            details?.includes('Project validation failed')
          ) {
            loggerSpy.error(
              'Invalid project data loaded from database:',
              context['invalidProject']
            );
          } else if (
            operation === 'loadProject' &&
            details?.includes('Failed to load project ID')
          ) {
            loggerSpy.error('Failed to load project:', error);
          } else if (
            operation === 'saveCurrentPosition' &&
            details === 'Invalid position coordinates provided'
          ) {
            loggerSpy.warn('Attempted to save invalid position:', {
              row: context['row'],
              step: context['step'],
            });
          } else if (
            operation === 'loadCurrentProjectId' &&
            details === 'Invalid project ID found in localStorage'
          ) {
            loggerSpy.warn(
              'Invalid project ID found in localStorage:',
              context['invalidId']
            );
          } else {
            // Fallback for unhandled structured contexts
            loggerSpy.error('Operation failed:', error);
          }
        } else {
          // Fallback for any remaining string contexts
          loggerSpy.error('Operation failed:', error);
        }

        return {
          error: {
            message: error?.message || error?.toString() || 'Unknown error',
          },
          userMessage: userMessage || 'Operation failed',
          severity: severity || 'medium',
        };
      }
    );

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        ProjectService,
        {
          provide: PeyoteShorthandService,
          useValue: peyoteShorthandServiceSpy,
        },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: ProjectDbService, useValue: projectDbServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
        provideRouter(routes),
      ],
    });

    service = TestBed.inject(ProjectService);
    peyoteShorthandService = TestBed.inject(
      PeyoteShorthandService
    ) as jasmine.SpyObj<PeyoteShorthandService>;
    settingsService = TestBed.inject(
      SettingsService
    ) as jasmine.SpyObj<SettingsService>;
    projectDbService = TestBed.inject(
      ProjectDbService
    ) as jasmine.SpyObj<ProjectDbService>;
    logger = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    activatedRoute = TestBed.inject(
      ActivatedRoute
    ) as jasmine.SpyObj<ActivatedRoute>;
    errorHandlerSpy = TestBed.inject(
      ErrorHandlerService
    ) as jasmine.SpyObj<ErrorHandlerService>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with a NullProject', () => {
      expect(service.project$.value).toBeInstanceOf(NullProject);
    });

    it('should initialize with empty zipped rows', () => {
      expect(service.zippedRows$.value).toEqual([]);
    });

    it('should have required observables', () => {
      expect(service.project$).toBeDefined();
      expect(service.zippedRows$).toBeDefined();
      expect(service.ready).toBeDefined();
    });
  });

  describe('saveCurrentProject', () => {
    it('should save valid project ID to localStorage', async () => {
      const projectId = 123;

      await service.saveCurrentProject(projectId);

      const saved = localStorage.getItem('currentProject');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!)).toEqual({ id: projectId });
    });

    it('should not save invalid project ID (zero)', async () => {
      await service.saveCurrentProject(0);

      expect(localStorage.getItem('currentProject')).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to save invalid project ID:',
        0
      );
    });

    it('should not save invalid project ID (negative)', async () => {
      await service.saveCurrentProject(-1);

      expect(localStorage.getItem('currentProject')).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to save invalid project ID:',
        -1
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      spyOn(localStorage, 'setItem').and.throwError('Storage quota exceeded');

      await service.saveCurrentProject(123);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save current project to localStorage:',
        jasmine.any(Error)
      );
    });
  });

  describe('saveCurrentPosition', () => {
    it('should save valid position for project with valid ID', async () => {
      const testProject = createValidTestProject();
      service.project$.next(testProject);
      projectDbService.updateProject.and.returnValue(Promise.resolve(true));

      await service.saveCurrentPosition(2, 3);

      expect(service.project$.value.position).toEqual({ row: 2, step: 3 });
      expect(projectDbService.updateProject).toHaveBeenCalled();
    });

    it('should not save invalid position (negative row)', async () => {
      await service.saveCurrentPosition(-1, 3);

      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to save invalid position:',
        { row: -1, step: 3 }
      );
    });

    it('should not save invalid position (negative step)', async () => {
      await service.saveCurrentPosition(2, -1);

      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to save invalid position:',
        { row: 2, step: -1 }
      );
    });

    it('should handle database update errors', async () => {
      const testProject = createValidTestProject();
      service.project$.next(testProject);
      projectDbService.updateProject.and.returnValue(
        Promise.reject(new Error('DB Error'))
      );

      await service.saveCurrentPosition(2, 3);

      // The error is handled in the observable subscription
      expect(service.project$.value.position).toEqual({ row: 2, step: 3 });
    });
  });

  describe('loadCurrentProjectId', () => {
    it('should load valid project ID from localStorage', () => {
      const testData = { id: 456 };
      localStorage.setItem('currentProject', JSON.stringify(testData));

      const result = service.loadCurrentProjectId();

      expect(result).toEqual(testData);
    });

    it('should return null when no data in localStorage', () => {
      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
    });

    it('should return null for invalid project ID (zero)', () => {
      localStorage.setItem('currentProject', JSON.stringify({ id: 0 }));

      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid project ID found in localStorage:',
        0
      );
    });

    it('should return null for invalid project ID (negative)', () => {
      localStorage.setItem('currentProject', JSON.stringify({ id: -5 }));

      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid project ID found in localStorage:',
        -5
      );
    });

    it('should return null for missing ID property', () => {
      localStorage.setItem('currentProject', JSON.stringify({ name: 'test' }));

      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid project ID found in localStorage:',
        undefined
      );
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem('currentProject', 'invalid json {');

      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load current project ID from localStorage:',
        jasmine.any(Error)
      );
    });

    it('should handle localStorage access errors', () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage access denied');

      const result = service.loadCurrentProjectId();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load current project ID from localStorage:',
        jasmine.any(Error)
      );
    });
  });

  describe('loadCurrentProject', () => {
    it('should load project when valid ID exists in localStorage', async () => {
      const testProject = createValidTestProject();
      localStorage.setItem('currentProject', JSON.stringify({ id: 123 }));
      spyOn(service, 'loadProject').and.returnValue(
        Promise.resolve(testProject)
      );

      await service.loadCurrentProject();

      expect(service.loadProject).toHaveBeenCalledWith(123);
    });

    it('should handle missing current project gracefully', async () => {
      await service.loadCurrentProject();

      expect(logger.debug).toHaveBeenCalledWith(
        'No current project found in localStorage'
      );
    });

    it('should handle loadProject errors', async () => {
      localStorage.setItem('currentProject', JSON.stringify({ id: 123 }));
      spyOn(service, 'loadProject').and.returnValue(
        Promise.reject(new Error('Load failed'))
      );

      await service.loadCurrentProject();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load current project:',
        jasmine.any(Error)
      );
    });
  });

  describe('loadPeyote', () => {
    it('should load valid peyote project', async () => {
      const projectName = 'Test Peyote Project';
      const data = 'some,peyote,data';
      const testProject = createValidTestProject();

      peyoteShorthandService.toProject.and.returnValue(testProject);
      projectDbService.addProject.and.returnValue(Promise.resolve(456));

      const result = await service.loadPeyote(projectName, data);

      expect(result.name).toBe(projectName);
      expect(result.id).toBe(456);
      expect(service.project$.value).toEqual(result);
      expect(peyoteShorthandService.toProject).toHaveBeenCalledWith(data, ', ');
      expect(projectDbService.addProject).toHaveBeenCalled();
      // Should not call loadProject since we removed the unnecessary reload
      expect(projectDbService.loadProject).not.toHaveBeenCalled();
    });

    it('should reject empty project name', async () => {
      await expectAsync(service.loadPeyote('', 'data')).toBeRejectedWithError(
        'Project name and data are required'
      );
      await expectAsync(
        service.loadPeyote('   ', 'data')
      ).toBeRejectedWithError('Project name and data are required');
    });

    it('should reject empty data', async () => {
      await expectAsync(service.loadPeyote('name', '')).toBeRejectedWithError(
        'Project name and data are required'
      );
      await expectAsync(
        service.loadPeyote('name', '   ')
      ).toBeRejectedWithError('Project name and data are required');
    });

    it('should reject invalid project from parser', async () => {
      const invalidProject = new BeadProject(); // Missing required properties
      peyoteShorthandService.toProject.and.returnValue(invalidProject);

      await expectAsync(
        service.loadPeyote('name', 'data')
      ).toBeRejectedWithError('Invalid project data from peyote shorthand');
    });

    it('should handle database save failure', async () => {
      const testProject = createValidTestProject();
      peyoteShorthandService.toProject.and.returnValue(testProject);
      projectDbService.addProject.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.loadPeyote('name', 'data')
      ).toBeRejectedWithError('Failed to save project to database');
    });

    it('should handle parser errors', async () => {
      peyoteShorthandService.toProject.and.throwError('Parser error');

      await expectAsync(
        service.loadPeyote('name', 'data')
      ).toBeRejectedWithError('Parser error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load peyote project:',
        jasmine.any(Error)
      );
    });
  });

  describe('loadProject', () => {
    it('should load valid project by ID', async () => {
      const testProject = createValidTestProject();
      projectDbService.loadProject.and.returnValue(
        Promise.resolve(testProject)
      );

      const result = await service.loadProject(123);

      expect(result).toEqual(testProject);
      expect(service.project$.value).toEqual(testProject);
      expect(projectDbService.loadProject).toHaveBeenCalledWith(123);
    });

    it('should handle invalid project ID (zero)', async () => {
      const result = await service.loadProject(0);

      expect(result).toBeNull();
      expect(service.project$.value).toBeInstanceOf(NullProject);
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid project ID provided:',
        0
      );
    });

    it('should handle invalid project ID (negative)', async () => {
      const result = await service.loadProject(-1);

      expect(result).toBeNull();
      expect(service.project$.value).toBeInstanceOf(NullProject);
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid project ID provided:',
        -1
      );
    });

    it('should handle project not found', async () => {
      projectDbService.loadProject.and.returnValue(Promise.resolve(null));

      const result = await service.loadProject(999);

      expect(result).toBeNull();
      expect(service.project$.value).toBeInstanceOf(NullProject);
      expect(logger.warn).toHaveBeenCalledWith('Project not found:', 999);
    });

    it('should handle invalid project data from database', async () => {
      const invalidProject = new BeadProject(); // Missing required properties
      projectDbService.loadProject.and.returnValue(
        Promise.resolve(invalidProject)
      );

      const result = await service.loadProject(123);

      expect(result).toBeNull();
      expect(service.project$.value).toBeInstanceOf(NullProject);
      expect(logger.error).toHaveBeenCalledWith(
        'Invalid project data loaded from database:',
        invalidProject
      );
    });

    it('should handle database errors', async () => {
      projectDbService.loadProject.and.returnValue(
        Promise.reject(new Error('DB Error'))
      );

      const result = await service.loadProject(123);

      expect(result).toBeNull();
      expect(service.project$.value).toBeInstanceOf(NullProject);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load project:',
        jasmine.any(Error)
      );
    });

    it('should emit ready signal on successful load', async () => {
      const testProject = createValidTestProject();
      projectDbService.loadProject.and.returnValue(
        Promise.resolve(testProject)
      );

      let readyEmitted = false;
      service.ready.subscribe(() => {
        readyEmitted = true;
      });

      await service.loadProject(123);

      expect(readyEmitted).toBe(true);
    });

    it('should emit ready signal on error', async () => {
      projectDbService.loadProject.and.returnValue(
        Promise.reject(new Error('DB Error'))
      );

      let readyEmitted = false;
      service.ready.subscribe(() => {
        readyEmitted = true;
      });

      await service.loadProject(123);

      expect(readyEmitted).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle settings ready trigger', () => {
      spyOn(service, 'loadCurrentProject');

      // Simulate settings service ready
      (settingsService as any).ready.next(true);

      expect(service.loadCurrentProject).toHaveBeenCalled();
    });

    it('should maintain project state across operations', async () => {
      const testProject = createValidTestProject();
      service.project$.next(testProject);

      // Verify state is maintained
      expect(service.project$.value).toEqual(testProject);

      // Save position and verify it updates
      projectDbService.updateProject.and.returnValue(Promise.resolve(true));
      await service.saveCurrentPosition(5, 10);

      expect(service.project$.value.position).toEqual({ row: 5, step: 10 });
    });
  });
});

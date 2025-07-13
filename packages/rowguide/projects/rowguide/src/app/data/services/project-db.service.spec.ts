import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { LoggerTestingModule } from 'ngx-logger/testing';

import { ProjectDbService } from './project-db.service';
import { IndexedDbService } from './indexed-db.service';
import {
  ErrorHandlerService,
  ErrorContext,
} from '../../core/services/error-handler.service';
import {
  Project,
  ModelFactory,
  isValidProject,
  hasValidId,
} from '../../core/models';

/**
 * @fileoverview Comprehensive Test Suite for ProjectDbService
 *
 * This test suite validates all database operations for the ProjectDbService,
 * including CRUD operations, error handling, validation, and edge cases.
 *
 * Test Categories:
 * - Service Initialization
 * - loadProjects: Loading all projects with validation and error handling
 * - loadProject: Loading specific projects by ID with validation
 * - addProject: Adding new projects with validation and error handling
 * - updateProject: Updating existing projects with validation
 * - deleteProject: Deleting projects with validation and error handling
 * - Integration scenarios: Complex workflows and edge cases
 *
 * The tests use comprehensive mocking of IndexedDB operations and validate
 * both success and error scenarios to ensure robust error handling.
 */

describe('ProjectDbService', () => {
  let service: ProjectDbService;
  let indexedDbServiceSpy: jasmine.SpyObj<IndexedDbService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let mockDb: jasmine.SpyObj<any>;

  // Test data factory
  const createValidTestProject = (
    overrides: Partial<Project> = {}
  ): Project => {
    return ModelFactory.createProject({
      id: 1,
      name: 'Test Project',
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, count: 5, description: 'Chain 5' },
            { id: 2, count: 1, description: 'Single crochet' },
          ],
        },
      ],
      position: { row: 0, step: 0 },
      ...overrides,
    });
  };

  const createInvalidProject = (): any => {
    return {
      id: 'invalid',
      name: null,
      rows: 'not-an-array',
      invalidProperty: 'should-not-exist',
    };
  };

  beforeEach(() => {
    // Create spy objects
    mockDb = jasmine.createSpyObj('IDBPDatabase', [
      'getAll',
      'get',
      'add',
      'put',
      'delete',
    ]);
    indexedDbServiceSpy = jasmine.createSpyObj('IndexedDbService', ['openDB']);
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['warn', 'error']);
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);

    // Configure ErrorHandlerService mock to work with structured context objects
    errorHandlerSpy.handleError.and.callFake(
      (
        error: any,
        context: string | ErrorContext,
        userMessage?: string,
        severity?: string
      ) => {
        // Handle structured context objects
        if (typeof context === 'object' && context !== null) {
          const operation = context['operation'];
          const details = context['details'];

          if (
            operation === 'loadProject' &&
            details === 'invalid key provided'
          ) {
            loggerSpy.warn('Invalid project key provided:', context['key']);
          } else if (
            operation === 'loadProjects' &&
            details === 'Failed to load projects from IndexedDB'
          ) {
            loggerSpy.error('Failed to load projects:', error);
          } else if (
            operation === 'addProject' &&
            details === 'Failed to save project to database'
          ) {
            loggerSpy.error('Failed to add project:', error);
          } else if (
            operation === 'updateProject' &&
            details === 'Failed to update project in database'
          ) {
            loggerSpy.error('Failed to update project:', error);
          } else if (
            operation === 'deleteProject' &&
            details === 'Failed to delete project from database'
          ) {
            loggerSpy.error('Failed to delete project:', error);
          } else if (
            operation === 'loadProject' &&
            details === 'Failed to load project from database'
          ) {
            loggerSpy.error('Failed to load project:', error);
          } else if (
            operation === 'loadProjects' &&
            details === 'project validation failed'
          ) {
            loggerSpy.warn(
              'Invalid project found in database:',
              context['invalidProject']
            );
          } else if (
            operation === 'addProject' &&
            details === 'Project validation failed'
          ) {
            loggerSpy.error(
              'Cannot save invalid project:',
              context['invalidProject']
            );
          } else if (
            operation === 'updateProject' &&
            details === 'Missing ID for project'
          ) {
            loggerSpy.error(
              'Cannot update project without valid ID:',
              context['invalidProject']
            );
          } else if (
            operation === 'updateProject' &&
            details === 'Project validation failed'
          ) {
            loggerSpy.error(
              'Cannot update invalid project:',
              context['invalidProject']
            );
          } else if (
            operation === 'deleteProject' &&
            details === 'Missing ID for project'
          ) {
            loggerSpy.warn(
              'Cannot delete project without valid ID:',
              context['invalidProject']
            );
          } else if (
            operation === 'loadProject' &&
            details === 'Project validation failed'
          ) {
            loggerSpy.error(
              'Invalid project data loaded from database:',
              context['invalidProject']
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

    // Configure TestBed
    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        ProjectDbService,
        { provide: IndexedDbService, useValue: indexedDbServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
      ],
    });

    service = TestBed.inject(ProjectDbService);
    indexedDbServiceSpy = TestBed.inject(
      IndexedDbService
    ) as jasmine.SpyObj<IndexedDbService>;
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    errorHandlerSpy = TestBed.inject(
      ErrorHandlerService
    ) as jasmine.SpyObj<ErrorHandlerService>;

    // Default mock setup
    indexedDbServiceSpy.openDB.and.returnValue(Promise.resolve(mockDb));
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have required dependencies injected', () => {
      expect(indexedDbServiceSpy).toBeTruthy();
      expect(loggerSpy).toBeTruthy();
    });
  });

  describe('loadProjects', () => {
    it('should load and return valid projects', async () => {
      const validProject1 = createValidTestProject({
        id: 1,
        name: 'Project 1',
      });
      const validProject2 = createValidTestProject({
        id: 2,
        name: 'Project 2',
      });
      mockDb.getAll.and.returnValue(
        Promise.resolve([validProject1, validProject2])
      );

      const result = await service.loadProjects();

      expect(result).toEqual([validProject1, validProject2]);
      expect(mockDb.getAll).toHaveBeenCalledWith('projects');
      expect(loggerSpy.warn).not.toHaveBeenCalled();
    });

    it('should filter out invalid projects and log warnings', async () => {
      const validProject = createValidTestProject();
      const invalidProject = createInvalidProject();
      mockDb.getAll.and.returnValue(
        Promise.resolve([validProject, invalidProject])
      );

      const result = await service.loadProjects();

      expect(result).toEqual([validProject]);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Invalid project found in database:',
        invalidProject
      );
    });

    it('should handle empty database', async () => {
      mockDb.getAll.and.returnValue(Promise.resolve([]));

      const result = await service.loadProjects();

      expect(result).toEqual([]);
      expect(mockDb.getAll).toHaveBeenCalledWith('projects');
    });

    it('should handle database errors and return empty array', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.getAll.and.returnValue(Promise.reject(dbError));

      const result = await service.loadProjects();

      expect(result).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to load projects:',
        dbError
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      const result = await service.loadProjects();

      expect(result).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to load projects:',
        serviceError
      );
    });

    it('should handle mixed valid and invalid projects', async () => {
      const projects = [
        createValidTestProject({ id: 1, name: 'Valid 1' }),
        createInvalidProject(),
        createValidTestProject({ id: 3, name: 'Valid 3' }),
        { id: 4, rows: [] }, // Valid minimal project
        null, // Invalid null project
        undefined, // Invalid undefined project
      ];
      mockDb.getAll.and.returnValue(Promise.resolve(projects));

      const result = await service.loadProjects();

      expect(result.length).toBe(2); // Only 2 valid projects (id: 1 and 3)
      expect(result[0].name).toBe('Valid 1');
      expect(result[1].name).toBe('Valid 3');
      expect(loggerSpy.warn).toHaveBeenCalledTimes(4); // Four invalid projects (invalid, minimal without id, null, undefined)
    });
  });

  describe('loadProject', () => {
    it('should load project by valid ID', async () => {
      const testProject = createValidTestProject();
      mockDb.get.and.returnValue(Promise.resolve(testProject));

      const result = await service.loadProject(1);

      expect(result).toEqual(testProject);
      expect(mockDb.get).toHaveBeenCalledWith('projects', 1);
    });

    it('should return null for invalid ID (zero)', async () => {
      const result = await service.loadProject(0);

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Invalid project key provided:',
        0
      );
      expect(mockDb.get).not.toHaveBeenCalled();
    });

    it('should return null for invalid ID (negative)', async () => {
      const result = await service.loadProject(-5);

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Invalid project key provided:',
        -5
      );
      expect(mockDb.get).not.toHaveBeenCalled();
    });

    it('should return null for invalid ID (null)', async () => {
      const result = await service.loadProject(null as any);

      expect(result).toBeNull();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Invalid project key provided:',
        null
      );
      expect(mockDb.get).not.toHaveBeenCalled();
    });

    it('should return null when project not found', async () => {
      mockDb.get.and.returnValue(Promise.resolve(undefined));

      const result = await service.loadProject(999);

      expect(result).toBeNull();
      expect(mockDb.get).toHaveBeenCalledWith('projects', 999);
    });

    it('should return null for invalid project data and log error', async () => {
      const invalidProject = createInvalidProject();
      mockDb.get.and.returnValue(Promise.resolve(invalidProject));

      const result = await service.loadProject(1);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Invalid project data loaded from database:',
        invalidProject
      );
    });

    it('should handle database errors and return null', async () => {
      const dbError = new Error('Database read error');
      mockDb.get.and.returnValue(Promise.reject(dbError));

      const result = await service.loadProject(1);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to load project:',
        dbError
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      const result = await service.loadProject(1);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to load project:',
        serviceError
      );
    });
  });

  describe('addProject', () => {
    it('should add valid project and return generated ID', async () => {
      const testProject = createValidTestProject();
      const generatedId = 42;
      mockDb.add.and.returnValue(Promise.resolve(generatedId));

      const result = await service.addProject(testProject);

      expect(result).toBe(generatedId);
      expect(mockDb.add).toHaveBeenCalledWith('projects', testProject);
    });

    it('should reject invalid project and throw error', async () => {
      const invalidProject = createInvalidProject();

      await expectAsync(
        service.addProject(invalidProject)
      ).toBeRejectedWithError('Invalid project data');

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Cannot save invalid project:',
        invalidProject
      );
      expect(mockDb.add).not.toHaveBeenCalled();
    });

    it('should handle database errors and return null', async () => {
      const testProject = createValidTestProject();
      const dbError = new Error('Database write error');
      mockDb.add.and.returnValue(Promise.reject(dbError));

      const result = await service.addProject(testProject);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to add project:',
        dbError
      );
    });

    it('should handle invalid ID type returned from database', async () => {
      const testProject = createValidTestProject();
      mockDb.add.and.returnValue(Promise.resolve('invalid-id-type'));

      const result = await service.addProject(testProject);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to add project:',
        jasmine.any(Error)
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const testProject = createValidTestProject();
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      const result = await service.addProject(testProject);

      expect(result).toBeNull();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to add project:',
        serviceError
      );
    });

    it('should add project with proper validation using ModelFactory', async () => {
      const testProject = ModelFactory.createProject({
        name: 'Test Project',
        rows: [
          {
            id: 1,
            steps: [
              { id: 1, count: 5, description: 'Chain 5' },
              { id: 2, count: 1, description: 'Single crochet' },
            ],
          },
        ],
      });
      const generatedId = 1;
      mockDb.add.and.returnValue(Promise.resolve(generatedId));

      const result = await service.addProject(testProject);

      expect(result).toBe(generatedId);
      expect(mockDb.add).toHaveBeenCalledWith('projects', testProject);
    });
  });

  describe('updateProject', () => {
    it('should update valid project with valid ID', async () => {
      const testProject = createValidTestProject({ id: 1 });
      mockDb.put.and.returnValue(Promise.resolve());

      const result = await service.updateProject(testProject);

      expect(result).toBe(true);
      expect(mockDb.put).toHaveBeenCalledWith('projects', testProject);
    });

    it('should reject project without valid ID', async () => {
      const projectWithoutId = createValidTestProject();
      delete projectWithoutId.id;

      const result = await service.updateProject(projectWithoutId);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Cannot update project without valid ID:',
        projectWithoutId
      );
      expect(mockDb.put).not.toHaveBeenCalled();
    });

    it('should reject project with invalid ID (zero)', async () => {
      const projectWithInvalidId = createValidTestProject({ id: 0 });

      const result = await service.updateProject(projectWithInvalidId);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Cannot update project without valid ID:',
        projectWithInvalidId
      );
      expect(mockDb.put).not.toHaveBeenCalled();
    });

    it('should reject project with negative ID', async () => {
      const projectWithNegativeId = createValidTestProject({ id: -1 });

      const result = await service.updateProject(projectWithNegativeId);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Cannot update project without valid ID:',
        projectWithNegativeId
      );
      expect(mockDb.put).not.toHaveBeenCalled();
    });

    it('should reject invalid project data and check ID first', async () => {
      const invalidProject = {
        id: 'invalid', // hasValidId will return false first
        ...createInvalidProject(),
      };

      const result = await service.updateProject(invalidProject);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Cannot update project without valid ID:',
        invalidProject
      );
      expect(mockDb.put).not.toHaveBeenCalled();
    });

    it('should handle database errors and return false', async () => {
      const testProject = createValidTestProject({ id: 1 });
      const dbError = new Error('Database update error');
      mockDb.put.and.returnValue(Promise.reject(dbError));

      const result = await service.updateProject(testProject);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to update project:',
        dbError
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const testProject = createValidTestProject({ id: 1 });
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      const result = await service.updateProject(testProject);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to update project:',
        serviceError
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete project with valid ID', async () => {
      const testProject = createValidTestProject({ id: 1 });
      mockDb.delete.and.returnValue(Promise.resolve());

      const result = await service.deleteProject(testProject);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith('projects', 1);
    });

    it('should reject project without valid ID', async () => {
      const projectWithoutId = createValidTestProject();
      delete projectWithoutId.id;

      const result = await service.deleteProject(projectWithoutId);

      expect(result).toBe(false);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Cannot delete project without valid ID:',
        projectWithoutId
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should reject project with invalid ID (zero)', async () => {
      const projectWithInvalidId = createValidTestProject({ id: 0 });

      const result = await service.deleteProject(projectWithInvalidId);

      expect(result).toBe(false);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Cannot delete project without valid ID:',
        projectWithInvalidId
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should reject project with negative ID', async () => {
      const projectWithNegativeId = createValidTestProject({ id: -1 });

      const result = await service.deleteProject(projectWithNegativeId);

      expect(result).toBe(false);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Cannot delete project without valid ID:',
        projectWithNegativeId
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors and return false', async () => {
      const testProject = createValidTestProject({ id: 1 });
      const dbError = new Error('Database delete error');
      mockDb.delete.and.returnValue(Promise.reject(dbError));

      const result = await service.deleteProject(testProject);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to delete project:',
        dbError
      );
    });

    it('should handle IndexedDB service errors', async () => {
      const testProject = createValidTestProject({ id: 1 });
      const serviceError = new Error('Failed to open database');
      indexedDbServiceSpy.openDB.and.returnValue(Promise.reject(serviceError));

      const result = await service.deleteProject(testProject);

      expect(result).toBe(false);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to delete project:',
        serviceError
      );
    });

    it('should delete project even if other data is invalid (only ID matters)', async () => {
      const projectWithInvalidData = {
        id: 1,
        name: null,
        rows: 'invalid',
        invalidProperty: 'test',
      } as any;
      mockDb.delete.and.returnValue(Promise.resolve());

      const result = await service.deleteProject(projectWithInvalidData);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith('projects', 1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete CRUD workflow', async () => {
      // Add project
      const newProject = createValidTestProject();
      delete newProject.id; // Remove ID for new project
      mockDb.add.and.returnValue(Promise.resolve(1));

      const addResult = await service.addProject(newProject);
      expect(addResult).toBe(1);

      // Load project
      const projectWithId = createValidTestProject({ id: 1 });
      mockDb.get.and.returnValue(Promise.resolve(projectWithId));

      const loadResult = await service.loadProject(1);
      expect(loadResult).toEqual(projectWithId);

      // Update project
      const updatedProject = { ...projectWithId, name: 'Updated Project' };
      mockDb.put.and.returnValue(Promise.resolve());

      const updateResult = await service.updateProject(updatedProject);
      expect(updateResult).toBe(true);

      // Delete project
      mockDb.delete.and.returnValue(Promise.resolve());

      const deleteResult = await service.deleteProject(updatedProject);
      expect(deleteResult).toBe(true);
    });

    it('should handle concurrent operations gracefully', async () => {
      const project1 = createValidTestProject({ id: 1, name: 'Project 1' });
      const project2 = createValidTestProject({ id: 2, name: 'Project 2' });

      // Mock concurrent load operations
      mockDb.get.and.callFake((store: string, id: number) => {
        if (id === 1) return Promise.resolve(project1);
        if (id === 2) return Promise.resolve(project2);
        return Promise.resolve(undefined);
      });

      const [result1, result2] = await Promise.all([
        service.loadProject(1),
        service.loadProject(2),
      ]);

      expect(result1).toEqual(project1);
      expect(result2).toEqual(project2);
    });

    it('should handle database corruption scenarios', async () => {
      const corruptedData = [
        createValidTestProject({ id: 1 }), // Valid
        null, // Corrupted
        { id: 'invalid', rows: 'not-array' }, // Invalid structure
        createValidTestProject({ id: 4 }), // Valid
        undefined, // Corrupted
      ];
      mockDb.getAll.and.returnValue(Promise.resolve(corruptedData));

      const result = await service.loadProjects();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(4);
      expect(loggerSpy.warn).toHaveBeenCalledTimes(3); // Three invalid entries
    });

    it('should validate edge cases with type guards', async () => {
      // Test various edge cases that type guards should catch
      const edgeCases = [
        { rows: null },
        { rows: undefined },
        { rows: 'not-array' },
        { id: 'string-id', rows: [] },
        { id: 0, rows: [] },
        { id: -1, rows: [] },
      ];

      for (const testCase of edgeCases) {
        const isValid = isValidProject(testCase as any);
        const hasId = hasValidId(testCase as any);

        // Projects should be rejected appropriately
        if (!isValid) {
          await expectAsync(
            service.addProject(testCase as any)
          ).toBeRejectedWithError('Invalid project data');
        }

        if (!hasId) {
          const updateResult = await service.updateProject(testCase as any);
          expect(updateResult).toBe(false);
        }
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary database issues', async () => {
      const testProject = createValidTestProject();

      // First call fails
      indexedDbServiceSpy.openDB.and.returnValue(
        Promise.reject(new Error('Temporary failure'))
      );

      let result = await service.loadProjects();
      expect(result).toEqual([]);

      // Second call succeeds
      indexedDbServiceSpy.openDB.and.returnValue(Promise.resolve(mockDb));
      mockDb.getAll.and.returnValue(Promise.resolve([testProject]));

      result = await service.loadProjects();
      expect(result).toEqual([testProject]);
    });

    it('should handle partial data corruption gracefully', async () => {
      const mixedData = [
        createValidTestProject({ id: 1, name: 'Valid Project' }),
        ModelFactory.createProject({ id: 2 }), // Minimal valid project created with factory
        { corrupted: 'data' }, // Invalid project
        createValidTestProject({ id: 4, name: 'Another Valid' }),
      ];
      mockDb.getAll.and.returnValue(Promise.resolve(mixedData));

      const result = await service.loadProjects();

      expect(result.length).toBe(2); // Only projects with valid IDs (1 and 4)
      expect(result.every((project) => isValidProject(project))).toBe(true);
      expect(loggerSpy.warn).toHaveBeenCalledTimes(2); // Two invalid entries (minimal without id, corrupted)
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';

import { UpgradeService } from './upgrade.service';
import { MigrationDbService } from '../services';
import { ProjectDbService } from '../services';
import { ZipperService } from '../../features/file-import/services';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { Project, Step, Row, ModelFactory } from '../../core/models';

/**
 * @fileoverview Comprehensive Test Suite for UpgradeService
 *
 * This test suite validates the UpgradeService functionality including:
 * - Service initialization and dependency injection
 * - Migration detection and version management
 * - Migration application logic for database schema updates
 * - Error handling and recovery scenarios
 * - Integration with MigrationDbService, ProjectDbService, and ZipperService
 * - Edge cases for malformed data and migration conditions
 * - Performance with large datasets and multiple projects
 */

describe('UpgradeService', () => {
  let service: UpgradeService;
  let projectDbServiceSpy: jasmine.SpyObj<ProjectDbService>;
  let migrationDbServiceSpy: jasmine.SpyObj<MigrationDbService>;
  let zipperServiceSpy: jasmine.SpyObj<ZipperService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;

  // Test data factories for creating consistent test projects
  const createTestProject = (overrides: Partial<Project> = {}): Project => {
    return ModelFactory.createProject({
      id: 1,
      name: 'Test Project',
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 3 } as Step,
            { id: 3, description: 'step3', count: 2 } as Step,
            { id: 4, description: 'step4', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 2,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
          ],
        } as Row,
      ],
      position: { row: 0, step: 0 },
      ...overrides,
    });
  };

  const createMigrationTestProject = (): Project => {
    // Project that satisfies migration1 condition: expandedRow1.length / 2 === expandedRow2.length
    // Row 1: 2+3+2+1 = 8 steps expanded, Row 2: 2+2 = 4 steps expanded, 8/2 = 4 ✓
    return createTestProject();
  };

  const createNonMigrationProject = (): Project => {
    // Project that does NOT satisfy migration1 condition
    return createTestProject({
      rows: [
        {
          id: 1,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 3 } as Step,
            { id: 3, description: 'step3', count: 1 } as Step, // Changed from 2 to 1
            { id: 4, description: 'step4', count: 1 } as Step,
          ],
        } as Row,
        {
          id: 2,
          steps: [
            { id: 1, description: 'step1', count: 2 } as Step,
            { id: 2, description: 'step2', count: 2 } as Step,
          ],
        } as Row,
      ],
    });
  };

  let mockProjects: Project[];

  beforeEach(() => {
    // Create comprehensive spies for all dependencies
    projectDbServiceSpy = jasmine.createSpyObj('ProjectDbService', [
      'loadProjects',
      'updateProject',
    ]);
    migrationDbServiceSpy = jasmine.createSpyObj('MigrationDbService', [
      'loadMigration',
      'addMigration',
    ]);
    zipperServiceSpy = jasmine.createSpyObj('ZipperService', [
      'expandSteps',
      'compressSteps',
    ]);
    loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'info',
      'warn',
      'error',
      'debug',
    ]);

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        UpgradeService,
        { provide: ProjectDbService, useValue: projectDbServiceSpy },
        { provide: MigrationDbService, useValue: migrationDbServiceSpy },
        { provide: ZipperService, useValue: zipperServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(UpgradeService);

    // Default mock setup for ZipperService
    zipperServiceSpy.expandSteps.and.callFake((steps: Step[]) => {
      if (!steps || steps === null) {
        return []; // Handle malformed data gracefully
      }
      const expanded: Step[] = [];
      steps.forEach((step, stepIndex) => {
        for (let i = 0; i < step.count; i++) {
          expanded.push({
            id: expanded.length,
            count: 1,
            description: step.description,
          });
        }
      });
      return expanded;
    });

    zipperServiceSpy.compressSteps.and.callFake((steps: Step[]) => {
      const compressed: Step[] = [];
      let currentDesc = '';
      let currentCount = 0;

      steps.forEach((step) => {
        if (step.description === currentDesc) {
          currentCount++;
        } else {
          if (currentCount > 0) {
            compressed.push({
              id: compressed.length + 1,
              count: currentCount,
              description: currentDesc,
            });
          }
          currentDesc = step.description;
          currentCount = 1;
        }
      });

      if (currentCount > 0) {
        compressed.push({
          id: compressed.length + 1,
          count: currentCount,
          description: currentDesc,
        });
      }

      return compressed;
    });

    // Default mock behavior
    migrationDbServiceSpy.loadMigration.and.returnValue(Promise.resolve(true));
    migrationDbServiceSpy.addMigration.and.returnValue(Promise.resolve(1));
    projectDbServiceSpy.loadProjects.and.returnValue(Promise.resolve([]));
    projectDbServiceSpy.updateProject.and.returnValue(Promise.resolve(true));

    // Initialize test data
    mockProjects = [createMigrationTestProject(), createNonMigrationProject()];
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have all required dependencies injected', () => {
      expect(projectDbServiceSpy).toBeTruthy();
      expect(migrationDbServiceSpy).toBeTruthy();
      expect(zipperServiceSpy).toBeTruthy();
      expect(loggerSpy).toBeTruthy();
    });

    it('should have highestMigration set to 1', () => {
      expect(service.highestMigration).toBe(1);
    });

    it('should initialize with proper service configuration', () => {
      expect(service).toBeInstanceOf(UpgradeService);
    });
  });

  describe('Migration Detection and Management', () => {
    it('should detect new migrations correctly', async () => {
      migrationDbServiceSpy.loadMigration.and.returnValue(
        Promise.resolve(undefined)
      );
      spyOn(service, 'applyMigration');

      await service.doNewMigrations();

      expect(migrationDbServiceSpy.loadMigration).toHaveBeenCalledWith(1);
      expect(service.applyMigration).toHaveBeenCalledWith(1);
      expect(migrationDbServiceSpy.addMigration).toHaveBeenCalledWith(1, true);
    });

    it('should skip migrations that are already applied', async () => {
      migrationDbServiceSpy.loadMigration.and.returnValue(
        Promise.resolve(true)
      );
      spyOn(service, 'applyMigration');

      await service.doNewMigrations();

      expect(migrationDbServiceSpy.loadMigration).toHaveBeenCalledWith(1);
      expect(service.applyMigration).not.toHaveBeenCalled();
      expect(migrationDbServiceSpy.addMigration).not.toHaveBeenCalled();
    });

    it('should handle multiple migration checks', async () => {
      service.highestMigration = 3;
      migrationDbServiceSpy.loadMigration.and.callFake((id: number) => {
        return Promise.resolve(id === 2); // Only migration 2 is applied
      });
      spyOn(service, 'applyMigration');

      await service.doNewMigrations();

      expect(migrationDbServiceSpy.loadMigration).toHaveBeenCalledTimes(3);
      expect(service.applyMigration).toHaveBeenCalledWith(1);
      expect(service.applyMigration).not.toHaveBeenCalledWith(2);
      expect(service.applyMigration).toHaveBeenCalledWith(3);
      expect(migrationDbServiceSpy.addMigration).toHaveBeenCalledWith(1, true);
      expect(migrationDbServiceSpy.addMigration).toHaveBeenCalledWith(3, true);
    });

    it('should handle migration check errors gracefully', async () => {
      migrationDbServiceSpy.loadMigration.and.returnValue(
        Promise.reject(new Error('Database error'))
      );
      spyOn(service, 'applyMigration');

      await expectAsync(service.doNewMigrations()).toBeRejected();
      expect(service.applyMigration).not.toHaveBeenCalled();
    });
  });

  describe('Migration Application Logic', () => {
    it('should apply migration with proper logging', () => {
      service.applyMigration(1);

      expect(loggerSpy.info).toHaveBeenCalledWith('Applying migration ', 1);
    });

    it('should handle unknown migration IDs gracefully', () => {
      spyOn(service, 'migration1');

      service.applyMigration(999);

      expect(loggerSpy.info).toHaveBeenCalledWith('Applying migration ', 999);
      expect(service.migration1).not.toHaveBeenCalled();
    });

    it('should route migration ID 1 to migration1 method', () => {
      spyOn(service, 'migration1');

      service.applyMigration(1);

      expect(service.migration1).toHaveBeenCalled();
    });
  });

  describe('Migration1 Implementation', () => {
    it('should apply migration1 correctly for single qualifying project', async () => {
      const testProject = createMigrationTestProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );

      await service.migration1();

      expect(zipperServiceSpy.expandSteps).toHaveBeenCalledTimes(2);
      expect(zipperServiceSpy.compressSteps).toHaveBeenCalledTimes(2);
      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(1);
    });

    it('should not apply migration1 if condition is not satisfied', async () => {
      const testProject = createNonMigrationProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should apply migration1 correctly for multiple projects', async () => {
      const testProjects = [
        createMigrationTestProject(),
        createNonMigrationProject(),
      ];
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve(testProjects)
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(1); // Only one qualifies
    });

    it('should handle projects with insufficient rows', async () => {
      const projectWithOneRow = createTestProject({
        rows: [
          {
            id: 1,
            steps: [{ id: 1, description: 'step1', count: 2 } as Step],
          } as Row,
        ],
      });
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([projectWithOneRow])
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should handle projects with no rows', async () => {
      const projectWithNoRows = createTestProject({ rows: [] });
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([projectWithNoRows])
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should handle empty project list', async () => {
      projectDbServiceSpy.loadProjects.and.returnValue(Promise.resolve([]));

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should properly restructure project data during migration', async () => {
      const testProject = createMigrationTestProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );

      await service.migration1();

      const updateCall = projectDbServiceSpy.updateProject.calls.mostRecent();
      const updatedProject = updateCall.args[0] as Project;

      // Verify the project structure after migration
      expect(updatedProject.rows.length).toBe(3); // Original 2 + 1 from shift/unshift
      expect(updatedProject.rows[0].id).toBe(1);
      expect(updatedProject.rows[1].id).toBe(2);
      expect(updatedProject.rows[2].id).toBe(3); // Original second row, ID incremented
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle project loading errors', async () => {
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.reject(new Error('Load failed'))
      );

      await expectAsync(service.migration1()).toBeRejected();
    });

    it('should handle project update errors', async () => {
      const testProject = createMigrationTestProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );
      projectDbServiceSpy.updateProject.and.returnValue(
        Promise.reject(new Error('Update failed'))
      );

      // Now that we fixed the bug, the service properly awaits updateProject and propagates errors
      await expectAsync(service.migration1()).toBeRejected();
    });

    it('should handle zipper service errors gracefully', async () => {
      const testProject = createMigrationTestProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );
      zipperServiceSpy.expandSteps.and.throwError('Expand failed');

      try {
        await service.migration1();
        fail('Expected migration1 to throw an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed project data', async () => {
      const malformedProject = {
        ...createMigrationTestProject(),
        rows: null,
      } as any;
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([malformedProject])
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });

    it('should handle projects with malformed steps', async () => {
      const projectWithMalformedSteps = createTestProject({
        rows: [
          {
            id: 1,
            steps: null as any, // Malformed steps
          } as Row,
          {
            id: 2,
            steps: [{ id: 1, description: 'step1', count: 2 } as Step],
          } as Row,
        ],
      });
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([projectWithMalformedSteps])
      );

      // Should not throw - service handles gracefully by not processing malformed data
      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform complete migration workflow', async () => {
      migrationDbServiceSpy.loadMigration.and.returnValue(
        Promise.resolve(undefined)
      );
      const testProject = createMigrationTestProject();
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([testProject])
      );

      await service.doNewMigrations();

      expect(migrationDbServiceSpy.loadMigration).toHaveBeenCalledWith(1);
      expect(projectDbServiceSpy.loadProjects).toHaveBeenCalled();
      expect(zipperServiceSpy.expandSteps).toHaveBeenCalledTimes(2);
      expect(zipperServiceSpy.compressSteps).toHaveBeenCalledTimes(2);
      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(1);
      expect(migrationDbServiceSpy.addMigration).toHaveBeenCalledWith(1, true);
      expect(loggerSpy.info).toHaveBeenCalledWith('Applying migration ', 1);
    });

    it('should handle mixed project scenarios', async () => {
      migrationDbServiceSpy.loadMigration.and.returnValue(
        Promise.resolve(undefined)
      );
      const mixedProjects = [
        createMigrationTestProject(),
        createNonMigrationProject(),
        createMigrationTestProject(),
      ];
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve(mixedProjects)
      );

      await service.doNewMigrations();

      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(2); // Only 2 qualify
    });

    it('should maintain data integrity during migration', async () => {
      const originalProject = createMigrationTestProject();
      const originalStepCount = originalProject.rows.reduce(
        (total, row) =>
          total +
          row.steps.reduce((rowTotal, step) => rowTotal + step.count, 0),
        0
      );

      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([originalProject])
      );

      await service.migration1();

      const updateCall = projectDbServiceSpy.updateProject.calls.mostRecent();
      const updatedProject = updateCall.args[0] as Project;

      const updatedStepCount = updatedProject.rows.reduce(
        (total, row) =>
          total +
          row.steps.reduce((rowTotal, step) => rowTotal + step.count, 0),
        0
      );

      expect(updatedStepCount).toBe(originalStepCount); // Data integrity maintained
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of projects efficiently', async () => {
      const largeProjectList: Project[] = [];
      for (let i = 0; i < 100; i++) {
        largeProjectList.push(createMigrationTestProject());
      }
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve(largeProjectList)
      );

      const startTime = performance.now();
      await service.migration1();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(100);
    });

    it('should handle projects with many rows', async () => {
      const projectWithManyRows = createTestProject({
        rows: Array.from(
          { length: 50 },
          (_, i) =>
            ({
              id: i + 1,
              steps: [{ id: 1, description: `step${i}`, count: 1 } as Step],
            } as Row)
        ),
      });
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([projectWithManyRows])
      );

      await service.migration1();

      // Should handle projects with many rows without errors
      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled(); // Doesn't meet migration condition
    });

    it('should handle projects with complex step structures', async () => {
      const complexProject = createTestProject({
        rows: [
          {
            id: 1,
            steps: Array.from(
              { length: 20 },
              (_, i) =>
                ({
                  id: i + 1,
                  description: `step${i}`,
                  count: Math.floor(Math.random() * 5) + 1,
                } as Step)
            ),
          } as Row,
          {
            id: 2,
            steps: Array.from(
              { length: 10 },
              (_, i) =>
                ({
                  id: i + 1,
                  description: `step${i}`,
                  count: Math.floor(Math.random() * 3) + 1,
                } as Step)
            ),
          } as Row,
        ],
      });
      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve([complexProject])
      );

      expect(() => service.migration1()).not.toThrow();
    });
  });

  describe('Migration Condition Logic', () => {
    it('should correctly identify qualifying projects', async () => {
      // Test various scenarios of expandedRow1.length / 2 === expandedRow2.length
      const qualifyingProjects = [
        // 8 steps / 2 = 4 steps
        createTestProject({
          rows: [
            {
              id: 1,
              steps: [{ id: 1, description: 'step1', count: 8 }],
            } as Row,
            {
              id: 2,
              steps: [{ id: 1, description: 'step1', count: 4 }],
            } as Row,
          ],
        }),
        // 6 steps / 2 = 3 steps
        createTestProject({
          rows: [
            {
              id: 1,
              steps: [{ id: 1, description: 'step1', count: 6 }],
            } as Row,
            {
              id: 2,
              steps: [{ id: 1, description: 'step1', count: 3 }],
            } as Row,
          ],
        }),
      ];

      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve(qualifyingProjects)
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).toHaveBeenCalledTimes(2);
    });

    it('should correctly identify non-qualifying projects', async () => {
      const nonQualifyingProjects = [
        // 7 steps / 2 = 3.5 ≠ 4 steps
        createTestProject({
          rows: [
            {
              id: 1,
              steps: [{ id: 1, description: 'step1', count: 7 }],
            } as Row,
            {
              id: 2,
              steps: [{ id: 1, description: 'step1', count: 4 }],
            } as Row,
          ],
        }),
        // 6 steps / 2 = 3 ≠ 4 steps
        createTestProject({
          rows: [
            {
              id: 1,
              steps: [{ id: 1, description: 'step1', count: 6 }],
            } as Row,
            {
              id: 2,
              steps: [{ id: 1, description: 'step1', count: 4 }],
            } as Row,
          ],
        }),
      ];

      projectDbServiceSpy.loadProjects.and.returnValue(
        Promise.resolve(nonQualifyingProjects)
      );

      await service.migration1();

      expect(projectDbServiceSpy.updateProject).not.toHaveBeenCalled();
    });
  });
});

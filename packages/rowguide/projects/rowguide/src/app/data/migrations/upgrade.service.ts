import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step } from '../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../core/services';
import { ZipperService } from '../../features/file-import/services';
import { MigrationDbService, ProjectDbService } from '../services';

@Injectable({
  providedIn: 'root',
})
export class UpgradeService {
  highestMigration: number = 1;

  constructor(
    private migrationDbService: MigrationDbService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private zipperService: ZipperService,
    private errorHandler: ErrorHandlerService,
    private dataIntegrityService: DataIntegrityService
  ) {}
  async doNewMigrations() {
    // Validate migration configuration
    if (!Number.isInteger(this.highestMigration) || this.highestMigration < 1) {
      const error = new Error(`Invalid migration configuration: highestMigration must be a positive integer, got ${this.highestMigration}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'doNewMigrations',
          details: 'Migration configuration validation failed',
          invalidValue: this.highestMigration,
          expectedType: 'positive integer',
        },
        'Migration system is misconfigured. Please contact support.',
        'critical'
      );
      throw error;
    }

    const failedMigrations: number[] = [];

    for (let i = 1; i <= this.highestMigration; i++) {
      try {
        if (await this.migrationDbService.loadMigration(i)) {
          continue;
        }
      } catch (loadError) {
        // If we can't check migration status, this is critical
        this.errorHandler.handleError(
          loadError,
          {
            operation: 'doNewMigrations',
            details: 'Failed to apply database migrations',
          },
          'Unable to upgrade your data. Please restart the application and try again.',
          'critical'
        );
        throw loadError; // Re-throw to stop migration process
      }

      try {
        await this.applyMigration(i);
        await this.migrationDbService.addMigration(i, true);
      } catch (migrationError) {
        failedMigrations.push(i);
        this.errorHandler.handleError(
          migrationError,
          {
            operation: 'doNewMigrations',
            details: `Migration ${i} failed, continuing with next migrations`,
            failedMigrationId: i,
            context: {
              totalMigrations: this.highestMigration,
              completedMigrations: i - 1,
              remainingMigrations: this.highestMigration - i,
            },
          },
          undefined,
          'high'
        );
        // Continue with next migration instead of failing all
      }
    }

    // Report summary if any migrations failed
    if (failedMigrations.length > 0) {
      this.errorHandler.handleError(
        new Error(`${failedMigrations.length} migrations failed`),
        {
          operation: 'doNewMigrations',
          details: 'Some data migrations failed to complete',
          failedMigrations: failedMigrations,
          context: {
            totalMigrations: this.highestMigration,
            successfulMigrations:
              this.highestMigration - failedMigrations.length,
            failedCount: failedMigrations.length,
          },
        },
        'Some data upgrades could not be completed. Your data may not display correctly.',
        'high'
      );
    }
  }

  async applyMigration(id: number) {
    // Validate migration ID
    if (!Number.isInteger(id) || id < 1) {
      const error = new Error(`Invalid migration ID: ${id}. Migration ID must be a positive integer.`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'applyMigration',
          details: 'Migration ID validation failed',
          invalidId: id,
          expectedType: 'positive integer',
          availableMigrations: Array.from(
            { length: this.highestMigration },
            (_, i) => i + 1
          ),
        },
        'Invalid migration identifier. Migration process may be corrupted.',
        'critical'
      );
      throw error;
    }

    // Validate migration ID is within expected range
    if (id > this.highestMigration) {
      const error = new Error(`Migration ID ${id} exceeds highest available migration ${this.highestMigration}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'applyMigration',
          details: 'Migration ID out of range',
          requestedId: id,
          highestAvailable: this.highestMigration,
          availableMigrations: Array.from(
            { length: this.highestMigration },
            (_, i) => i + 1
          ),
        },
        'Attempting to run unknown migration. System may be outdated.',
        'critical'
      );
      throw error;
    }

    try {
      this.logger.info('Applying migration ', id);
      switch (id) {
        case 1:
          await this.migration1();
          break;
        default:
          throw new Error(`Unknown migration ID: ${id}`);
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'applyMigration',
          details: `Failed to apply migration ${id}`,
          migrationId: id,
          availableMigrations: Array.from(
            { length: this.highestMigration },
            (_, i) => i + 1
          ),
        },
        'Data migration failed. Your data may be in an inconsistent state.',
        'critical'
      );
      throw error; // Re-throw to prevent migration from being marked as complete
    }
  }
  async migration1() {
    let projectCount = 0;
    try {
      const projects = await this.indexedDBService.loadProjects();
      projectCount = projects.length;

      // Validate projects data integrity
      if (!Array.isArray(projects)) {
        const error = new Error('Projects data is not a valid array');
        this.errorHandler.handleError(
          error,
          {
            operation: 'migration1',
            details: 'Invalid projects data structure detected',
            actualType: typeof projects,
            expectedType: 'array',
          },
          'Project data is corrupted. Migration cannot proceed safely.',
          'critical'
        );
        throw error;
      }

      for (const project of projects) {
        // Validate each project structure before migration
        if (!project || typeof project !== 'object') {
          this.errorHandler.handleError(
            new Error('Invalid project structure in migration'),
            {
              operation: 'migration1',
              details: 'Corrupted project data encountered during migration',
              projectData: project,
              expectedStructure: 'object with rows property',
            },
            'Some project data is corrupted and will be skipped.',
            'high'
          );
          continue; // Skip corrupted project rather than failing entire migration
        }

        // Validate project name if required by DataIntegrityService
        if (project.name && !this.dataIntegrityService.validateProjectName(project.name)) {
          this.errorHandler.handleError(
            new Error(`Invalid project name during migration: ${project.name}`),
            {
              operation: 'migration1',
              details: 'Project name validation failed during migration',
              projectId: project.id,
              projectName: project.name,
            },
            'Some project names are invalid and may cause issues.',
            'medium'
          );
          // Continue with migration despite invalid name
        }

        if (project.rows && project.rows.length >= 2) {
          // Validate row structures
          if (!Array.isArray(project.rows[0]?.steps) || !Array.isArray(project.rows[1]?.steps)) {
            this.errorHandler.handleError(
              new Error('Invalid row structure during migration'),
              {
                operation: 'migration1',
                details: 'Row steps are not valid arrays',
                projectId: project.id,
                row1HasSteps: Array.isArray(project.rows[0]?.steps),
                row2HasSteps: Array.isArray(project.rows[1]?.steps),
              },
              'Some project rows have invalid structure and will be skipped.',
              'medium'
            );
            continue; // Skip this project
          }

          const expandedRow1 = this.zipperService.expandSteps(
            project.rows[0].steps
          );
          const expandedRow2 = this.zipperService.expandSteps(
            project.rows[1].steps
          );

          // Validate expanded step data
          if (!Array.isArray(expandedRow1) || !Array.isArray(expandedRow2)) {
            this.errorHandler.handleError(
              new Error('Step expansion failed during migration'),
              {
                operation: 'migration1',
                details: 'ZipperService returned invalid data',
                projectId: project.id,
                expandedRow1Type: typeof expandedRow1,
                expandedRow2Type: typeof expandedRow2,
              },
              'Step data processing failed for some projects.',
              'high'
            );
            continue; // Skip this project
          }

          if (expandedRow1.length / 2 === expandedRow2.length) {
            // Condition satisfied, apply migration
            const newSteps1: Step[] = [];
            const newSteps2: Step[] = [];
            expandedRow1.forEach((step, index) => {
              if (index % 2 === 0) {
                newSteps1.push(step);
              } else {
                newSteps2.push(step);
              }
            });
            project.rows.shift();
            project.rows.forEach((row) => {
              row.id++;
            });
            project.rows.unshift({
              id: 2,
              steps: this.zipperService.compressSteps(newSteps2),
            });
            project.rows.unshift({
              id: 1,
              steps: this.zipperService.compressSteps(newSteps1),
            });
            await this.indexedDBService.updateProject(project);
          }
        }
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'migration1',
          details: 'Failed to execute data migration for row restructuring',
          projectCount: projectCount,
          migrationScope: 'Row structure reorganization for peyote patterns',
        },
        'Data migration failed. Your projects may not display correctly.',
        'critical'
      );
      throw error; // Re-throw to prevent migration from being marked as complete
    }
  }
}

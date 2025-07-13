import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step } from '../../core/models';
import { ErrorHandlerService } from '../../core/services';
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
    private errorHandler: ErrorHandlerService
  ) {}
  async doNewMigrations() {
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

      for (const project of projects) {
        if (project.rows && project.rows.length >= 2) {
          const expandedRow1 = this.zipperService.expandSteps(
            project.rows[0].steps
          );
          const expandedRow2 = this.zipperService.expandSteps(
            project.rows[1].steps
          );
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

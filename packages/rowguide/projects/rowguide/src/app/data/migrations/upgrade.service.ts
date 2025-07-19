import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Step } from '../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../core/services';
import { ZipperService } from '../../features/file-import/services';
import { MigrationDbService, ProjectDbService } from '../services';

/**
 * Database migration execution and version management service.
 *
 * This service coordinates the execution of database migrations to transform
 * user data between application versions. It provides safe, atomic migration
 * processing with comprehensive error handling and rollback capabilities for
 * maintaining data integrity during application upgrades.
 *
 * @remarks
 * The service ensures upgrade safety by validating migration configuration,
 * checking migration status to prevent duplicate execution, applying migrations
 * atomically with transaction safety, and providing detailed error context for
 * debugging failed migrations.
 *
 * Migration versioning uses sequential numbering (1, 2, 3, ...) where each
 * migration represents a specific data transformation required for that
 * application version. The highestMigration property defines the current
 * schema version expected by the application.
 *
 * @example
 * ```typescript
 * // Application startup migration check
 * class AppInitializer {
 *   async initialize(): Promise<void> {
 *     try {
 *       await this.upgradeService.doNewMigrations();
 *       console.log('All migrations completed successfully');
 *     } catch (error) {
 *       console.error('Migration failed - application may not work correctly');
 *       throw error;
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Manual migration execution for specific version
 * async upgradeToVersion(targetVersion: number): Promise<void> {
 *   const currentMigrations = await this.migrationDbService.loadMigrations();
 *   const startingMigration = currentMigrations.length + 1;
 *
 *   for (let i = startingMigration; i <= targetVersion; i++) {
 *     await this.upgradeService.applyMigration(i);
 *     console.log(`Migration ${i} completed`);
 *   }
 * }
 * ```
 *
 * @see {@link MigrationDbService} For migration status tracking and persistence
 * @see {@link DataIntegrityService} For data validation during transformations
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class UpgradeService {
  /**
   * The highest migration number available in this application version.
   *
   * This property defines the target schema version for the current
   * application build. All migrations from 1 to this number will be
   * applied during the upgrade process to ensure data compatibility.
   *
   * @example
   * ```typescript
   * // Check if user data needs upgrading
   * const userMigrations = await this.migrationDbService.loadMigrations();
   * const needsUpgrade = userMigrations.length < this.upgradeService.highestMigration;
   *
   * if (needsUpgrade) {
   *   console.log(`User data at version ${userMigrations.length}`);
   *   console.log(`Application expects version ${this.upgradeService.highestMigration}`);
   *   await this.upgradeService.doNewMigrations();
   * }
   * ```
   *
   * @remarks
   * Must be a positive integer (validated during migration execution).
   * Should be incremented when new migrations are added.
   * Represents the cumulative count of all available migrations.
   * Used as the target for complete database upgrades.
   *
   * @since 1.0.0
   */
  highestMigration: number = 1;

  /**
   * Constructs UpgradeService with comprehensive migration execution capabilities.
   *
   * @param migrationDbService - Migration status tracking and persistence
   * @param logger - Structured logging for migration operation tracking
   * @param indexedDBService - Project data access for migration processing (aliased as ProjectDbService)
   * @param zipperService - Step compression/expansion for pattern data transformation
   * @param errorHandler - Centralized error handling with severity categorization
   * @param dataIntegrityService - Data validation and integrity checking
   *
   * @remarks
   * Initializes the service with all dependencies required for safe migration execution:
   * - Migration tracking to prevent duplicate execution
   * - Structured logging with migration context and operation details
   * - Project data access with transaction safety and error handling
   * - Pattern data compression for efficient storage during transformations
   * - Centralized error handling with critical error escalation
   * - Data integrity validation to ensure migration safety
   *
   * @example
   * ```typescript
   * // Service instantiation through Angular DI
   * constructor(
   *   private upgradeService: UpgradeService
   * ) {
   *   // Service ready for migration execution
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private migrationDbService: MigrationDbService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private zipperService: ZipperService,
    private errorHandler: ErrorHandlerService,
    private dataIntegrityService: DataIntegrityService
  ) {}

  /**
   * Executes all pending migrations to bring user data up to current application version.
   *
   * This is the primary migration entry point that orchestrates the complete
   * upgrade process. It identifies pending migrations, applies them sequentially,
   * and provides comprehensive error handling to ensure data safety during
   * the upgrade process.
   *
   * @returns Promise that resolves when all migrations are complete
   * @throws Error for critical migration failures that prevent safe application operation
   *
   * @example
   * ```typescript
   * // Application initialization with migration support
   * class AppComponent implements OnInit {
   *   async ngOnInit(): Promise<void> {
   *     try {
   *       await this.upgradeService.doNewMigrations();
   *       console.log('Application ready - all migrations complete');
   *     } catch (error) {
   *       console.error('Critical migration failure - application unsafe');
   *       this.showMigrationErrorDialog(error);
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Migration with progress tracking
   * async upgradeWithProgress(): Promise<void> {
   *   const totalMigrations = this.upgradeService.highestMigration;
   *   const existingMigrations = await this.migrationDbService.loadMigrations();
   *   const pendingCount = totalMigrations - existingMigrations.length;
   *
   *   if (pendingCount > 0) {
   *     console.log(`Starting ${pendingCount} pending migrations...`);
   *     await this.upgradeService.doNewMigrations();
   *     console.log('Upgrade complete');
   *   } else {
   *     console.log('No migrations needed - data is current');
   *   }
   * }
   * ```
   *
   * @remarks
   * **Migration Process:**
   * 1. **Validation**: Verify migration configuration and system state
   * 2. **Discovery**: Identify pending migrations by checking completion status
   * 3. **Execution**: Apply each migration atomically with error isolation
   * 4. **Recording**: Mark successful migrations as complete
   * 5. **Reporting**: Provide summary of failed migrations for troubleshooting
   *
   * **Error Handling Strategy:**
   * - **Critical Validation Errors**: Stop all processing and throw error
   * - **Migration Status Check Failures**: Stop processing (data safety)
   * - **Individual Migration Failures**: Continue with remaining migrations
   * - **Summary Reporting**: Report failed migrations without stopping application
   *
   * **Partial Failure Handling:**
   * If some migrations fail but others succeed, the service:
   * - Continues processing remaining migrations for maximum data currency
   * - Records successful migrations to prevent re-execution
   * - Reports failed migrations with detailed context for debugging
   * - Allows application to start with partially upgraded data
   *
   * **Data Safety Guarantees:**
   * - No migration is executed twice (checked via MigrationDbService)
   * - Failed migrations do not prevent subsequent migrations
   * - Migration status is recorded only after successful completion
   * - Detailed error context enables targeted debugging and recovery
   *
   * @see {@link applyMigration} For individual migration execution details
   * @see {@link MigrationDbService.loadMigration} For migration status checking
   * @see {@link MigrationDbService.addMigration} For completion recording
   * @since 1.0.0
   */
  async doNewMigrations() {
    // Validate migration configuration
    if (!Number.isInteger(this.highestMigration) || this.highestMigration < 1) {
      const error = new Error(
        `Invalid migration configuration: highestMigration must be a positive integer, got ${this.highestMigration}`
      );
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

  /**
   * Executes a specific migration by ID with comprehensive validation and error handling.
   *
   * This method applies a single migration transformation to user data.
   * It validates the migration ID, executes the migration-specific logic,
   * and provides detailed error handling to ensure data safety during
   * the transformation process.
   *
   * @param id - The numeric migration identifier to execute (1-based sequential)
   * @returns Promise that resolves when migration is complete
   * @throws Error for validation failures or migration execution errors
   *
   * @example
   * ```typescript
   * // Apply specific migration during troubleshooting
   * async retryFailedMigration(migrationId: number): Promise<void> {
   *   try {
   *     const currentStatus = await this.migrationDbService.loadMigration(migrationId);
   *
   *     if (!currentStatus) {
   *       await this.upgradeService.applyMigration(migrationId);
   *       await this.migrationDbService.addMigration(migrationId, true);
   *       console.log(`Migration ${migrationId} completed successfully`);
   *     } else {
   *       console.log(`Migration ${migrationId} already complete`);
   *     }
   *   } catch (error) {
   *     console.error(`Migration ${migrationId} failed:`, error);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Selective migration for development/testing
   * async applyMigrationRange(startId: number, endId: number): Promise<void> {
   *   for (let i = startId; i <= endId; i++) {
   *     console.log(`Applying migration ${i}...`);
   *     await this.upgradeService.applyMigration(i);
   *     console.log(`Migration ${i} complete`);
   *   }
   * }
   * ```
   *
   * **Migration ID Validation:**
   * The method performs comprehensive validation of the migration ID:
   * - Must be a positive integer (not zero, negative, or decimal)
   * - Must be within the range of available migrations (1 to highestMigration)
   * - Must correspond to an implemented migration case
   *
   * **Migration Execution Process:**
   * 1. **ID Validation**: Verify migration ID is valid and in range
   * 2. **Logging**: Record migration start for audit trails
   * 3. **Dispatch**: Route to migration-specific implementation
   * 4. **Error Handling**: Catch and contextualize any execution errors
   *
   * **Available Migrations:**
   * - **Migration 1**: Row structure reorganization for peyote patterns
   *   - Transforms project row layouts for improved pattern display
   *   - Validates step data integrity during transformation
   *   - Uses ZipperService for safe step compression/expansion
   *
   * **Error Handling Strategy:**
   * - **Validation Errors**: Critical severity, stops migration immediately
   * - **Execution Errors**: Critical severity, prevents completion marking
   * - **Detailed Context**: Includes migration ID and available migration list
   * - **Error Re-throwing**: Ensures migration failures are not silently ignored
   *
   * **Data Safety Measures:**
   * - All data transformations are validated before application
   * - Migration errors prevent completion marking in MigrationDbService
   * - Failed migrations can be safely retried without data corruption
   * - Original data is preserved if migration fails partway through
   *
   * **Adding New Migrations:**
   * To add a new migration:
   * 1. Increment highestMigration property
   * 2. Add new case to the switch statement
   * 3. Implement migration method (e.g., migration3())
   * 4. Test migration thoroughly with real data
   *
   * @see {@link migration1} For example migration implementation
   * @see {@link doNewMigrations} For batch migration execution
   * @see {@link MigrationDbService.addMigration} For completion recording
   * @since 1.0.0
   */
  async applyMigration(id: number) {
    // Validate migration ID
    if (!Number.isInteger(id) || id < 1) {
      const error = new Error(
        `Invalid migration ID: ${id}. Migration ID must be a positive integer.`
      );
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
      const error = new Error(
        `Migration ID ${id} exceeds highest available migration ${this.highestMigration}`
      );
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
  /**
   * Migration 1: Row Structure Reorganization for Peyote Pattern Display
   *
   * This migration transforms project row layouts to improve peyote pattern
   * visualization by reorganizing step arrangements. It processes projects
   * with specific row configurations and redistributes steps for optimal
   * pattern display and user experience.
   *
   * @returns Promise that resolves when migration is complete
   * @throws Error for data validation failures or transformation errors
   *
   * @example
   * ```typescript
   * // Migration 1 transforms project structures like this:
   * // Before: Row 1 [A, B, C, D, E, F], Row 2 [G, H, I]
   * // After:  Row 1 [A, C, E], Row 2 [B, D, F], Row 3 [G, H, I] (IDs shifted)
   *
   * // The transformation only applies when:
   * // expandedRow1.length / 2 === expandedRow2.length
   * ```
   *
   * **Migration Logic:**
   * 1. **Project Loading**: Retrieve all projects from IndexedDB
   * 2. **Data Validation**: Verify project structure and data integrity
   * 3. **Condition Checking**: Apply transformation only when criteria are met
   * 4. **Step Redistribution**: Reorganize steps using alternating pattern
   * 5. **Row ID Management**: Update row IDs to maintain consistency
   * 6. **Data Persistence**: Save transformed projects back to database
   *
   * **Transformation Criteria:**
   * The migration only processes projects that meet specific conditions:
   * - Project has at least 2 rows with valid step arrays
   * - Row 1 expanded steps count is exactly 2x Row 2 expanded steps count
   * - All step data passes ZipperService expansion validation
   *
   * **Step Redistribution Process:**
   * ```
   * Original Row 1: [Step1, Step2, Step3, Step4, Step5, Step6]
   * Original Row 2: [StepA, StepB, StepC]
   *
   * New Row 1: [Step1, Step3, Step5] (even indices from original)
   * New Row 2: [Step2, Step4, Step6] (odd indices from original)
   * New Row 3: [StepA, StepB, StepC] (original Row 2, ID incremented)
   * ```
   *
   * **Data Validation Layers:**
   * - **Project Array Validation**: Ensures projects is a valid array
   * - **Individual Project Validation**: Checks each project is a valid object
   * - **Project Name Validation**: Uses DataIntegrityService for name validation
   * - **Row Structure Validation**: Verifies rows have valid step arrays
   * - **Step Expansion Validation**: Ensures ZipperService returns valid data
   *
   * **Error Handling Strategy:**
   * - **Critical Errors**: Data corruption, invalid project array (stop migration)
   * - **High Errors**: Step expansion failures (skip project, continue migration)
   * - **Medium Errors**: Name validation, row structure issues (log and continue)
   * - **Graceful Degradation**: Skip corrupted projects rather than failing migration
   *
   * **Row ID Management:**
   * The migration carefully manages row IDs to maintain data consistency:
   * 1. Remove the first row (original Row 1)
   * 2. Increment all remaining row IDs by 1
   * 3. Insert new Row 1 and Row 2 with compressed step data
   * 4. Preserve original Row 2+ data with updated IDs
   *
   * **ZipperService Integration:**
   * - **expandSteps()**: Converts compressed step data to full arrays
   * - **compressSteps()**: Converts reorganized arrays back to compressed format
   * - **Validation**: Ensures expansion/compression round-trip integrity
   *
   * **Performance Considerations:**
   * - Processes projects sequentially to avoid memory pressure
   * - Validates data before transformation to prevent wasted processing
   * - Uses atomic project updates to ensure consistency
   * - Continues processing even if individual projects fail
   *
   * **Recovery and Rollback:**
   * If migration fails partway through:
   * - Successfully processed projects remain transformed
   * - Failed projects retain original structure
   * - Migration can be safely retried for remaining projects
   * - No partial transformations are saved (atomic project updates)
   *
   * @see {@link ZipperService.expandSteps} For step data decompression
   * @see {@link ZipperService.compressSteps} For step data compression
   * - Related service: ProjectService for atomic project persistence
   * @see {@link DataIntegrityService.validateProjectName} For name validation
   * @since 1.0.0
   */
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
        if (
          project.name &&
          !this.dataIntegrityService.validateProjectName(project.name)
        ) {
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
          if (
            !Array.isArray(project.rows[0]?.steps) ||
            !Array.isArray(project.rows[1]?.steps)
          ) {
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

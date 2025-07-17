import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { ErrorHandlerService } from '../../core/services';
import { IndexedDbService } from './indexed-db.service';

/**
 * MigrationDbService - Database Migration Tracking and Version Management
 *
 * This service provides comprehensive migration tracking functionality to ensure
 * database schema and data transformations are applied consistently across
 * application updates. It maintains a persistent record of completed migrations
 * to prevent duplicate execution and enable version rollback capabilities.
 *
 * @example
 * ```typescript
 * // Check if a specific migration has been applied
 * const migrationId = 1;
 * const isComplete = await this.migrationDbService.loadMigration(migrationId);
 * if (!isComplete) {
 *   console.log(`Migration ${migrationId} needs to be applied`);
 * }
 *
 * // Record completion of a migration
 * await this.migrationDbService.addMigration(migrationId, true);
 * console.log(`Migration ${migrationId} marked as complete`);
 * ```
 *
 * @example
 * ```typescript
 * // Migration service integration pattern
 * class UpgradeService {
 *   async runMigrations(): Promise<void> {
 *     const allMigrations = await this.migrationDbService.loadMigrations();
 *
 *     for (let i = 0; i < this.totalMigrations; i++) {
 *       if (!allMigrations[i]) {
 *         await this.applyMigration(i + 1);
 *         await this.migrationDbService.addMigration(i + 1, true);
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Key capabilities include:
 * - Persistent migration status tracking using IndexedDB
 * - Atomic migration recording with transaction safety
 * - Comprehensive error handling with detailed context
 * - Version rollback support through migration deletion
 * - Batch migration status retrieval for upgrade planning
 * - Critical error propagation to prevent unsafe states
 *
 * The service ensures migration consistency by:
 * - Recording completion status for each migration
 * - Providing atomic operations for status updates
 * - Throwing errors on critical failures to halt unsafe operations
 * - Maintaining detailed audit trails for debugging
 *
 * Migration tracking uses numeric keys (1, 2, 3, ...) corresponding to
 * sequential migration versions, with boolean values indicating completion
 * status (true = complete, false/undefined = pending).
 *
 * @see {@link IndexedDbService} For database connection management
 * @see {@link ErrorHandlerService} For error handling and user feedback
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class MigrationDbService {
  /**
   * Constructs MigrationDbService with comprehensive migration tracking capabilities.
   *
   * @param logger - Structured logging service for migration operation tracking
   * @param indexedDbService - Database connection management for migration storage
   * @param errorHandler - Centralized error handling with severity categorization
   *
   * Initializes the service with dependency injection for:
   * - Structured logging with migration context and operation tracking
   * - Database connection management with automatic schema handling
   * - Centralized error handling with critical error propagation
   *
   * @example
   * ```typescript
   * // Service instantiation through Angular DI
   * constructor(
   *   private migrationDbService: MigrationDbService
   * ) {
   *   // Service ready for migration tracking operations
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Loads all migration records from IndexedDB for batch status checking.
   *
   * Retrieves the complete migration tracking table from the database,
   * returning an array of boolean values indicating completion status
   * for each migration. Critical operation that throws on failure to
   * prevent unsafe migration states.
   *
   * @returns Promise resolving to array of migration completion statuses
   * @throws Error when database operation fails (prevents unsafe migration state)
   *
   * @example
   * ```typescript
   * // Check overall migration status
   * try {
   *   const migrations = await this.migrationDbService.loadMigrations();
   *   console.log(`Total migrations: ${migrations.length}`);
   *
   *   const pending = migrations.filter(m => !m).length;
   *   console.log(`Pending migrations: ${pending}`);
   *
   *   const complete = migrations.filter(m => m).length;
   *   console.log(`Completed migrations: ${complete}`);
   * } catch (error) {
   *   console.error('Cannot determine migration status');
   *   // Application should not proceed with unsafe migration state
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Migration planning workflow
   * async planMigrations(): Promise<number[]> {
   *   const existing = await this.migrationDbService.loadMigrations();
   *   const pendingMigrations: number[] = [];
   *
   *   for (let i = 0; i < this.expectedMigrations.length; i++) {
   *     if (!existing[i]) {
   *       pendingMigrations.push(i + 1); // 1-based migration IDs
   *     }
   *   }
   *
   *   return pendingMigrations;
   * }
   * ```
   *
   * **Critical Error Handling:**
   * This method throws errors rather than returning defaults because
   * migration state must be known with certainty. Unsafe migration
   * states could result in:
   * - Data corruption from duplicate migrations
   * - Inconsistent schema states
   * - Loss of user data
   *
   * The error includes detailed context for debugging:
   * - Operation: 'loadMigrations'
   * - Table name: 'migrations'
   * - Error severity: 'critical'
   *
   * @see {@link IndexedDbService.openDB} For database connection handling
   * @see {@link ErrorHandlerService.handleError} For error categorization
   * @since 1.0.0
   */
  async loadMigrations(): Promise<boolean[]> {
    try {
      const db = await this.indexedDbService.openDB();
      const migrations = await db.getAll('migrations');
      return migrations;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMigrations',
          details: 'Failed to load migration records from IndexedDB',
          tableName: 'migrations',
        },
        'Unable to check migration status. The application may not work correctly.',
        'critical'
      );
      throw error; // Re-throw to prevent unsafe migration state
    }
  }

  /**
   * Loads a specific migration record by ID for individual status checking.
   *
   * Retrieves the completion status for a single migration from IndexedDB.
   * Returns undefined if the migration has not been recorded yet, indicating
   * it needs to be applied. Critical for preventing duplicate migration execution
   * and ensuring proper upgrade sequencing.
   *
   * @param key - The numeric migration identifier (1-based sequential numbering)
   * @returns Promise resolving to migration status (true=complete, undefined=pending)
   * @throws Error when database operation fails (prevents unsafe migration assumptions)
   *
   * @example
   * ```typescript
   * // Check specific migration before applying
   * const migrationId = 5;
   * try {
   *   const isComplete = await this.migrationDbService.loadMigration(migrationId);
   *
   *   if (isComplete === true) {
   *     console.log(`Migration ${migrationId} already complete`);
   *   } else {
   *     console.log(`Migration ${migrationId} needs to be applied`);
   *     await this.applyMigration(migrationId);
   *     await this.migrationDbService.addMigration(migrationId, true);
   *   }
   * } catch (error) {
   *   console.error(`Cannot determine status for migration ${migrationId}`);
   *   // Do not proceed with migration - state is unknown
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Sequential migration checking
   * async checkMigrationSequence(startId: number, endId: number): Promise<number[]> {
   *   const pendingMigrations: number[] = [];
   *
   *   for (let i = startId; i <= endId; i++) {
   *     const status = await this.migrationDbService.loadMigration(i);
   *     if (!status) {
   *       pendingMigrations.push(i);
   *     }
   *   }
   *
   *   return pendingMigrations; // IDs that need migration
   * }
   * ```
   *
   * **Return Value Semantics:**
   * - `true`: Migration has been completed successfully
   * - `undefined`: Migration has not been recorded (needs to be applied)
   * - `false`: Reserved for future use (migration failed but recorded)
   *
   * **Critical Error Handling:**
   * Throws on database errors because migration state must be deterministic.
   * Unknown migration status could lead to:
   * - Skipping required migrations (data corruption)
   * - Re-applying completed migrations (duplicate processing)
   * - Inconsistent application state
   *
   * Error context includes:
   * - Migration key for debugging specific migration issues
   * - Operation type for troubleshooting database problems
   * - Severity 'medium' as single migration failure is recoverable
   *
   * @see {@link addMigration} For recording completed migrations
   * @see {@link updateMigration} For modifying migration status
   * @since 1.0.0
   */
  async loadMigration(key: number): Promise<boolean | undefined> {
    try {
      const db = await this.indexedDbService.openDB();
      const migration = await db.get('migrations', key);
      return migration;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadMigration',
          details: 'Failed to load migration from IndexedDB',
          migrationKey: key,
          tableName: 'migrations',
        },
        'Unable to retrieve migration status. Migration tracking may be inconsistent.',
        'medium'
      );
      throw error; // Re-throw to indicate failure
    }
  }

  /**
   * Records a new migration completion status in IndexedDB with atomic safety.
   *
   * Creates a new migration record with the specified completion status.
   * This is the primary method for marking migrations as complete after
   * successful execution. Uses atomic database operations to ensure
   * consistency and prevent partial state corruption.
   *
   * @param key - The numeric migration identifier (1-based sequential numbering)
   * @param migration - Completion status (true=complete, false=failed but recorded)
   * @returns Promise resolving to the database key of the created record
   * @throws Error when database operation fails (prevents false completion marking)
   *
   * @example
   * ```typescript
   * // Standard migration completion workflow
   * async applyMigration(migrationId: number): Promise<void> {
   *   try {
   *     // Apply the migration logic
   *     await this.performMigrationSteps(migrationId);
   *
   *     // Mark as complete only after successful execution
   *     await this.migrationDbService.addMigration(migrationId, true);
   *     console.log(`Migration ${migrationId} completed and recorded`);
   *
   *   } catch (error) {
   *     console.error(`Migration ${migrationId} failed:`, error);
   *     // Do not record completion on failure
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Batch migration with individual tracking
   * async applyMigrationBatch(migrationIds: number[]): Promise<void> {
   *   for (const id of migrationIds) {
   *     try {
   *       await this.executeMigration(id);
   *       await this.migrationDbService.addMigration(id, true);
   *
   *       console.log(`✓ Migration ${id} complete`);
   *     } catch (error) {
   *       console.error(`✗ Migration ${id} failed:`, error);
   *       // Stop batch on first failure to prevent inconsistent state
   *       throw new Error(`Batch migration failed at step ${id}`);
   *     }
   *   }
   * }
   * ```
   *
   * **Atomic Operation Guarantees:**
   * The database add operation is atomic, ensuring that either:
   * - The migration is recorded successfully, or
   * - An error is thrown and no partial state is saved
   *
   * This prevents scenarios where migration logic completes but
   * the completion status is not recorded, which would cause
   * the migration to run again on next application start.
   *
   * **Error Handling Strategy:**
   * - Severity 'high': Migration completion must be recorded reliably
   * - Error re-thrown: Caller must handle migration failure appropriately
   * - Detailed context: Includes migration key and state for debugging
   *
   * **Database Key Return:**
   * Returns the IndexedDB key of the created record, which should
   * match the input key parameter. This can be used for verification
   * or further database operations.
   *
   * @see {@link loadMigration} For checking existing migration status
   * @see {@link updateMigration} For modifying existing records
   * @since 1.0.0
   */
  async addMigration(key: number, migration: boolean): Promise<number> {
    try {
      const db = await this.indexedDbService.openDB();
      return db.add('migrations', migration, key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'addMigration',
          details: 'Failed to record migration in IndexedDB',
          migrationKey: key,
          migrationState: migration,
          tableName: 'migrations',
        },
        'Unable to record migration completion. Data may be migrated again.',
        'high'
      );
      throw error; // Re-throw to prevent migration from being marked as complete
    }
  }

  /**
   * Updates an existing migration record with new completion status.
   *
   * Modifies the completion status of a previously recorded migration.
   * This method is used for correcting migration states, implementing
   * rollback procedures, or updating migration status based on changing
   * application requirements. Uses atomic put operations for consistency.
   *
   * @param key - The numeric migration identifier to update
   * @param migration - New completion status (true=complete, false=failed/rollback)
   * @returns Promise that resolves when update is complete
   * @throws Error when database operation fails (prevents inconsistent migration state)
   *
   * @example
   * ```typescript
   * // Migration rollback scenario
   * async rollbackMigration(migrationId: number): Promise<void> {
   *   try {
   *     // Perform rollback operations
   *     await this.undoMigrationChanges(migrationId);
   *
   *     // Mark migration as not completed
   *     await this.migrationDbService.updateMigration(migrationId, false);
   *     console.log(`Migration ${migrationId} rolled back and marked as incomplete`);
   *
   *   } catch (error) {
   *     console.error(`Rollback failed for migration ${migrationId}:`, error);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Migration state correction
   * async correctMigrationState(migrationId: number): Promise<void> {
   *   // Verify actual database state
   *   const actualState = await this.verifyMigrationApplied(migrationId);
   *   const recordedState = await this.migrationDbService.loadMigration(migrationId);
   *
   *   if (actualState !== recordedState) {
   *     console.log(`Correcting migration ${migrationId} state`);
   *     await this.migrationDbService.updateMigration(migrationId, actualState);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Conditional migration retry
   * async retryFailedMigration(migrationId: number): Promise<void> {
   *   const currentStatus = await this.migrationDbService.loadMigration(migrationId);
   *
   *   if (currentStatus === false) { // Previously failed
   *     try {
   *       await this.executeMigration(migrationId);
   *       await this.migrationDbService.updateMigration(migrationId, true);
   *       console.log(`Migration ${migrationId} retry successful`);
   *     } catch (error) {
   *       console.error(`Migration ${migrationId} retry failed`);
   *       // Keep status as false to allow future retries
   *     }
   *   }
   * }
   * ```
   *
   * **Atomic Update Guarantees:**
   * Uses IndexedDB put operation which ensures atomic updates:
   * - Either the record is updated completely, or
   * - An error is thrown and no changes are made
   *
   * This prevents partial updates that could leave migration
   * tracking in an inconsistent state.
   *
   * **Use Cases:**
   * - **Rollback Operations**: Mark migrations as incomplete after rollback
   * - **State Correction**: Fix inconsistencies between recorded and actual state
   * - **Retry Logic**: Update failed migrations after successful retry
   * - **Debugging**: Manually adjust migration states during development
   *
   * **Error Handling Strategy:**
   * - Severity 'high': Migration state consistency is critical
   * - Error re-thrown: Caller must handle update failure appropriately
   * - Detailed context: Migration key and new state for debugging
   *
   * **Difference from addMigration:**
   * - `addMigration`: Creates new record (fails if key exists)
   * - `updateMigration`: Modifies existing record (creates if not exists)
   *
   * @see {@link addMigration} For creating new migration records
   * @see {@link deleteMigration} For removing migration records
   * @since 1.0.0
   */
  async updateMigration(key: number, migration: boolean): Promise<void> {
    try {
      const db = await this.indexedDbService.openDB();
      await db.put('migrations', migration, key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'updateMigration',
          details: 'Failed to update migration in IndexedDB',
          migrationKey: key,
          migrationState: migration,
          tableName: 'migrations',
        },
        'Unable to update migration status. Migration tracking may be inconsistent.',
        'high'
      );
      throw error; // Re-throw to indicate failure
    }
  }

  /**
   * Removes a migration record from IndexedDB for rollback and cleanup operations.
   *
   * Permanently deletes a migration tracking record from the database.
   * This method is primarily used for complete rollback scenarios where
   * a migration needs to be fully undone and re-applied from scratch.
   * Use with caution as this operation cannot be undone.
   *
   * @param key - The numeric migration identifier to remove
   * @returns Promise that resolves when deletion is complete
   * @throws Error when database operation fails (prevents inconsistent tracking state)
   *
   * @example
   * ```typescript
   * // Complete migration rollback with cleanup
   * async fullRollbackMigration(migrationId: number): Promise<void> {
   *   try {
   *     // First, undo all migration changes
   *     await this.undoMigrationChanges(migrationId);
   *
   *     // Then remove the tracking record so migration can be re-applied
   *     await this.migrationDbService.deleteMigration(migrationId);
   *
   *     console.log(`Migration ${migrationId} completely rolled back`);
   *     console.log(`Migration ${migrationId} can now be re-applied from scratch`);
   *
   *   } catch (error) {
   *     console.error(`Full rollback failed for migration ${migrationId}:`, error);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Development environment cleanup
   * async resetMigrationHistory(fromId: number): Promise<void> {
   *   console.log(`Resetting migration history from ID ${fromId}`);
   *
   *   try {
   *     const allMigrations = await this.migrationDbService.loadMigrations();
   *
   *     // Remove all migrations from specified ID onwards
   *     for (let i = fromId - 1; i < allMigrations.length; i++) {
   *       if (allMigrations[i]) {
   *         await this.migrationDbService.deleteMigration(i + 1);
   *         console.log(`Removed migration ${i + 1} from tracking`);
   *       }
   *     }
   *
   *     console.log('Migration history reset complete');
   *   } catch (error) {
   *     console.error('Failed to reset migration history:', error);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Selective migration cleanup
   * async cleanupFailedMigrations(): Promise<void> {
   *   const allMigrations = await this.migrationDbService.loadMigrations();
   *
   *   for (let i = 0; i < allMigrations.length; i++) {
   *     const migrationId = i + 1;
   *     const status = allMigrations[i];
   *
   *     // Remove records of failed migrations (false status)
   *     if (status === false) {
   *       await this.migrationDbService.deleteMigration(migrationId);
   *       console.log(`Cleaned up failed migration ${migrationId}`);
   *     }
   *   }
   * }
   * ```
   *
   * **Critical Operation Warning:**
   * This method permanently removes migration tracking data. Once deleted:
   * - The migration will appear as "never applied" to the system
   * - The migration will be eligible for re-execution
   * - No history of the previous migration attempt remains
   *
   * **Use Cases:**
   * - **Complete Rollback**: Remove tracking after undoing migration changes
   * - **Development Reset**: Clean migration history during development
   * - **Failed Migration Cleanup**: Remove records of permanently failed migrations
   * - **Migration Reorganization**: Restructure migration numbering
   *
   * **Atomic Deletion Guarantees:**
   * Uses IndexedDB delete operation which ensures atomic removal:
   * - Either the record is completely removed, or
   * - An error is thrown and the record remains unchanged
   *
   * **Error Handling Strategy:**
   * - Severity 'medium': Deletion failure is recoverable
   * - Error re-thrown: Caller must handle deletion failure appropriately
   * - Detailed context: Migration key for debugging specific issues
   *
   * **Best Practices:**
   * 1. Always undo migration changes before deleting tracking record
   * 2. Verify migration state before deletion in production
   * 3. Consider using `updateMigration(key, false)` instead for reversible operations
   * 4. Log deletion operations for audit trails
   *
   * @see {@link updateMigration} For reversible migration state changes
   * @see {@link loadMigration} For verifying migration state before deletion
   * @since 1.0.0
   */
  async deleteMigration(key: number): Promise<void> {
    try {
      const db = await this.indexedDbService.openDB();
      await db.delete('migrations', key);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'deleteMigration',
          details: 'Failed to delete migration from IndexedDB',
          migrationKey: key,
          tableName: 'migrations',
        },
        'Unable to delete migration record. Migration tracking may be inconsistent.',
        'medium'
      );
      throw error; // Re-throw to indicate failure
    }
  }
}

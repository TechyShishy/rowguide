import { DBSchema } from "idb";

/**
 * MigrationDb - Dedicated Migration Tracking Database Schema
 *
 * This interface defines a specialized database schema focused exclusively
 * on migration status tracking and database version management. It provides
 * a lightweight, focused contract for migration-related operations separate
 * from the main application data schema.
 *
 * @example
 * ```typescript
 * // Migration-focused database connection
 * import { openDB, IDBPDatabase } from 'idb';
 * import { MigrationDb } from './schemas/migration-db';
 *
 * const migrationDb: IDBPDatabase<MigrationDb> = await openDB<MigrationDb>('migrations', 1, {
 *   upgrade(db) {
 *     if (!db.objectStoreNames.contains('migrations')) {
 *       db.createObjectStore('migrations');
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Dedicated migration tracking service
 * class MigrationTracker {
 *   constructor(private db: IDBPDatabase<MigrationDb>) {}
 *
 *   async isVersionApplied(version: number): Promise<boolean> {
 *     const status = await this.db.get('migrations', version);
 *     return status === true;
 *   }
 *
 *   async markVersionComplete(version: number): Promise<void> {
 *     await this.db.put('migrations', true, version);
 *   }
 *
 *   async getAllVersions(): Promise<boolean[]> {
 *     return await this.db.getAll('migrations');
 *   }
 * }
 * ```
 *
 * **Schema Purpose and Design:**
 *
 * This schema is designed for scenarios where migration tracking needs to be:
 * - **Isolated**: Separate from main application data
 * - **Lightweight**: Minimal overhead for version checks
 * - **Focused**: Single-purpose migration status storage
 * - **Independent**: Can be used by migration utilities or separate tools
 *
 * **Use Cases:**
 * - Standalone migration tracking databases
 * - Migration utilities that operate independently of main application
 * - Testing scenarios that need isolated migration state
 * - Development tools for migration management
 *
 * **Integration Patterns:**
 * ```typescript
 * // Multiple database integration
 * class MigrationManager {
 *   constructor(
 *     private appDb: IDBPDatabase<RowguideDb>,
 *     private migrationDb: IDBPDatabase<MigrationDb>
 *   ) {}
 *
 *   async runMigrations(): Promise<void> {
 *     const completedMigrations = await this.migrationDb.getAll('migrations');
 *
 *     for (let version = 1; version <= this.latestVersion; version++) {
 *       if (!completedMigrations[version - 1]) {
 *         await this.applyMigration(version);
 *         await this.migrationDb.put('migrations', true, version);
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * **Relationship to RowguideDb:**
 * While RowguideDb includes a migrations object store for integrated scenarios,
 * this MigrationDb schema provides the same migration tracking capability
 * in a standalone context. Choose based on architectural needs:
 * - Use RowguideDb for integrated applications
 * - Use MigrationDb for standalone migration tools
 *
 * - Related schema: RowguideDb for integrated application schema
 * - Related service: MigrationDbService for migration tracking operations
 * - Related service: UpgradeService for migration execution logic
 * @since 1.0.0
 */
export interface MigrationDb extends DBSchema {
  /**
   * Migrations Object Store - Version Status Tracking
   *
   * Dedicated store for tracking database migration completion status
   * across application versions. Designed for fast lookup and minimal
   * storage overhead with simple boolean status values.
   *
   * **Store Configuration:**
   * - **keyPath**: Manual numeric keys representing migration version numbers
   * - **autoIncrement**: false - Explicit version control for predictable keys
   * - **indexes**: None - Small dataset optimized for sequential access
   *
   * **Data Structure and Semantics:**
   * - **key**: Migration version number (1, 2, 3, ...) following semantic versioning
   * - **value**: Boolean completion status with specific meanings:
   *   - `true`: Migration completed successfully
   *   - `false`: Migration attempted but failed (allows retry)
   *   - `undefined`: Migration not yet attempted
   *
   * **Version Numbering Strategy:**
   * ```typescript
   * // Sequential version numbering
   * 1 -> Initial schema setup
   * 2 -> Add new object stores
   * 3 -> Data transformation migration
   * 4 -> Index creation and optimization
   * 5 -> New feature data structures
   * ```
   *
   * **Migration Status Workflow:**
   * ```typescript
   * // Check migration status
   * const status = await db.get('migrations', 3);
   * if (status === undefined) {
   *   console.log('Migration 3 not attempted');
   * } else if (status === false) {
   *   console.log('Migration 3 failed - needs retry');
   * } else if (status === true) {
   *   console.log('Migration 3 completed successfully');
   * }
   *
   * // Record successful migration
   * await db.put('migrations', true, 3);
   *
   * // Mark migration as failed (for retry)
   * await db.put('migrations', false, 3);
   *
   * // Remove migration record (rollback)
   * await db.delete('migrations', 3);
   * ```
   *
   * **Performance Characteristics:**
   * - **Fast Lookups**: O(1) access by version number
   * - **Minimal Storage**: Single boolean per migration
   * - **Cache Friendly**: Small dataset fits entirely in memory
   * - **Atomic Updates**: Individual migration status changes are atomic
   *
   * **Error Recovery and Rollback:**
   * The boolean status system supports sophisticated error recovery:
   * - Failed migrations can be marked `false` for selective retry
   * - Successful migrations marked `true` are skipped on subsequent runs
   * - Migration records can be deleted to force re-execution
   * - Status history provides audit trail for debugging
   *
   * **Integration with Migration Pipeline:**
   * ```typescript
   * // Migration execution with status tracking
   * async applyMigration(version: number): Promise<void> {
   *   try {
   *     // Execute migration logic
   *     await this.executeMigrationSteps(version);
   *
   *     // Mark as successful only after complete execution
   *     await this.db.put('migrations', true, version);
   *
   *   } catch (error) {
   *     // Mark as failed to enable retry
   *     await this.db.put('migrations', false, version);
   *     throw error;
   *   }
   * }
   * ```
   *
   * - Related service methods: MigrationDbService.loadMigration for status checking
   * - Related service methods: MigrationDbService.addMigration for status recording
   * - Related service methods: UpgradeService.applyMigration for migration execution
   */
  migrations: {
    key: number;
    value: boolean;
  };
}

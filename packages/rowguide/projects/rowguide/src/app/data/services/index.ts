/**
 * Data Access Services Module - Database Operations and Persistence
 *
 * This module provides comprehensive data access services for IndexedDB operations,
 * project persistence, and migration management. All services follow consistent
 * patterns for database operations, error handling, and transaction management.
 *
 * @fileoverview
 * Database abstraction layer providing type-safe access to IndexedDB with
 * comprehensive error handling, transaction management, and automated migration
 * support. Supports both single-item and batch operations with optimistic concurrency.
 *
 * **Service Architecture:**
 * ```
 * Data Access Layer
 * ├── IndexedDbService (Connection Management)
 * │   ├── Database connection and schema management
 * │   ├── Transaction handling and error recovery
 * │   └── Automated migration execution
 * ├── ProjectDbService (Project Operations)
 * │   ├── Project CRUD operations
 * │   ├── Batch operations and validation
 * │   └── Data integrity enforcement
 * └── MigrationDbService (Migration Tracking)
 *     ├── Migration status tracking
 *     ├── Version management
 *     └── Rollback capabilities
 * ```
 *
 * **Core Capabilities:**
 * - **Database Management**: Connection pooling, schema versioning, and upgrades
 * - **CRUD Operations**: Type-safe create, read, update, and delete operations
 * - **Batch Processing**: Efficient bulk operations with transaction support
 * - **Migration System**: Automated database schema evolution
 * - **Error Recovery**: Comprehensive error handling and retry mechanisms
 *
 * @example
 * ```typescript
 * // Project database operations
 * import { ProjectDbService } from '@data/services';
 *
 * @Injectable()
 * export class ProjectManager {
 *   constructor(private projectDb: ProjectDbService) {}
 *
 *   async saveProject(project: Project): Promise<void> {
 *     try {
 *       await this.projectDb.addProject(project);
 *       console.log('Project saved successfully');
 *     } catch (error) {
 *       console.error('Failed to save project:', error);
 *       throw error;
 *     }
 *   }
 *
 *   async loadAllProjects(): Promise<Project[]> {
 *     return await this.projectDb.loadProjects();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Migration management
 * import { MigrationDbService } from '@data/services';
 *
 * @Injectable()
 * export class DatabaseUpgrader {
 *   constructor(private migrationDb: MigrationDbService) {}
 *
 *   async checkMigrationStatus(): Promise<boolean> {
 *     const migrations = await this.migrationDb.loadMigrations();
 *     return migrations.every(migration => migration.completed);
 *   }
 * }
 * ```
 *
 * **Transaction Management:**
 * - All operations use appropriate transaction modes (readonly/readwrite)
 * - Automatic retry on transaction conflicts
 * - Proper error handling and rollback mechanisms
 * - Performance optimization through batching
 *
 * **Error Handling Patterns:**
 * - Structured error types with context information
 * - Automatic retry for transient failures
 * - Graceful degradation for non-critical operations
 * - Comprehensive logging for debugging and monitoring
 *
 * @since 1.0.0
 */

// Data access services
export * from './indexed-db.service';
export * from './project-db.service';
export * from './migration-db.service';

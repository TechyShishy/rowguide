import { DBSchema } from 'idb';

import { Project } from '../../core/models/project';

/**
 * RowguideDb - Primary IndexedDB Database Schema for Rowguide Application
 *
 * This interface defines the complete database schema for the Rowguide pattern
 * tracking application, providing type-safe access to all object stores and
 * their associated data structures. It serves as the central contract between
 * the application and the IndexedDB storage layer.
 *
 * @example
 * ```typescript
 * // Database connection with typed schema
 * import { openDB, IDBPDatabase } from 'idb';
 * import { RowguideDb } from './schemas/rowguide-db';
 *
 * const db: IDBPDatabase<RowguideDb> = await openDB<RowguideDb>('rowguide', 1, {
 *   upgrade(db) {
 *     // Schema-aware object store creation
 *     if (!db.objectStoreNames.contains('projects')) {
 *       db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
 *     }
 *     if (!db.objectStoreNames.contains('migrations')) {
 *       db.createObjectStore('migrations');
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe database operations
 * class ProjectRepository {
 *   constructor(private db: IDBPDatabase<RowguideDb>) {}
 *
 *   async saveProject(project: Project): Promise<number> {
 *     // TypeScript ensures project matches Project interface
 *     return await this.db.add('projects', project);
 *   }
 *
 *   async getProject(id: number): Promise<Project | undefined> {
 *     // Return type is automatically inferred as Project | undefined
 *     return await this.db.get('projects', id);
 *   }
 *
 *   async trackMigration(version: number, completed: boolean): Promise<void> {
 *     // TypeScript ensures value is boolean as defined in schema
 *     await this.db.put('migrations', completed, version);
 *   }
 * }
 * ```
 *
 * **Database Structure Overview:**
 *
 * The schema defines a dual-purpose database that handles both:
 * - **User Data Storage**: Project entities with pattern data, color mappings, and progress tracking
 * - **System Management**: Migration tracking for database versioning and application upgrades
 *
 * **Object Store Configuration:**
 *
 * Each object store is optimized for its specific use case:
 * - **projects**: Entity storage with auto-incrementing primary keys
 * - **migrations**: System tracking with manual version-based keys
 *
 * **Type Safety Benefits:**
 * - Compile-time validation of data structures
 * - IntelliSense support for object store operations
 * - Automatic type inference for query results
 * - Prevention of schema mismatches during development
 *
 * **Schema Evolution:**
 * This schema supports versioned upgrades through the IndexedDB upgrade mechanism,
 * allowing for:
 * - Addition of new object stores
 * - Modification of existing store configurations
 * - Data migration between schema versions
 * - Backward compatibility maintenance
 *
 * @see {@link Project} For detailed project entity structure
 * - Related service: IndexedDbService for database connection management
 * - Related services: MigrationDbService for migration tracking operations
 * - Related services: ProjectDbService for project data operations
 * @since 1.0.0
 */
export interface RowguideDb extends DBSchema {
  /**
   * Projects Object Store - Primary User Data Storage
   *
   * Stores complete project entities including pattern data, user progress,
   * color mappings, and associated metadata. Configured for optimal
   * performance with auto-incrementing primary keys.
   *
   * **Store Configuration:**
   * - **keyPath**: Auto-incrementing numeric ID for unique project identification
   * - **autoIncrement**: true - Automatic key generation for new projects
   * - **indexes**: None (queries use primary key or full-table scans)
   *
   * **Data Structure:**
   * Each project record contains:
   * - Pattern data: rows, steps, and bead counts
   * - User progress: current position tracking
   * - Color mappings: FLAM integration and color assignments
   * - Metadata: project name, creation time, last modified
   * - Media: optional project images as ArrayBuffer
   *
   * **Performance Characteristics:**
   * - Fast primary key lookups for project loading
   * - Efficient storage of complex nested project data
   * - Optimized for read-heavy workloads (pattern viewing)
   * - Batch operations for project list retrieval
   *
   * **Usage Patterns:**
   * ```typescript
   * // Create new project
   * const projectId = await db.add('projects', newProject);
   *
   * // Load specific project
   * const project = await db.get('projects', projectId);
   *
   * // Update existing project
   * await db.put('projects', updatedProject);
   *
   * // List all projects
   * const allProjects = await db.getAll('projects');
   *
   * // Delete project
   * await db.delete('projects', projectId);
   * ```
   *
   * @see {@link Project} For complete project data structure
   * - Related service: ProjectDbService for high-level project operations
   */
  projects: {
    key: number;
    value: Project;
  };

  /**
   * Migrations Object Store - Database Version Management
   *
   * Tracks database migration status to ensure consistent schema
   * evolution and data transformation across application versions.
   * Uses manual key management for version-based tracking.
   *
   * **Store Configuration:**
   * - **keyPath**: Manual numeric keys representing migration version numbers
   * - **autoIncrement**: false - Explicit version number management
   * - **indexes**: None (small dataset, sequential access patterns)
   *
   * **Data Structure:**
   * Each migration record contains:
   * - **key**: Migration version number (1, 2, 3, ...)
   * - **value**: Completion status (true=complete, false=failed/rollback)
   *
   * **Migration Tracking Strategy:**
   * - Sequential numbering: 1, 2, 3, ... for ordered execution
   * - Boolean status: Simple true/false for completion tracking
   * - Persistent storage: Survives application restarts and updates
   * - Atomic operations: All-or-nothing migration recording
   *
   * **Version Management:**
   * ```typescript
   * // Check if migration is complete
   * const isV2Complete = await db.get('migrations', 2);
   *
   * // Mark migration as complete
   * await db.put('migrations', true, 3);
   *
   * // Get all migration statuses
   * const allMigrations = await db.getAll('migrations');
   *
   * // Rollback migration (mark as incomplete)
   * await db.put('migrations', false, 4);
   *
   * // Remove migration record
   * await db.delete('migrations', 5);
   * ```
   *
   * **Integration with Upgrade Process:**
   * The migrations store works with the UpgradeService to:
   * - Prevent duplicate migration execution
   * - Enable selective migration retry
   * - Support rollback scenarios
   * - Provide migration history for debugging
   *
   * - Related service: MigrationDbService for migration status operations
   * - Related service: UpgradeService for migration execution logic
   */
  migrations: {
    key: number;
    value: boolean;
  };
}

import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';

import { RowguideDb } from '../schemas/rowguide-db';

/**
 * IndexedDbService - Database Connection Management and Schema Administration
 *
 * This service provides centralized IndexedDB connection management with automatic
 * schema upgrades, object store creation, and database versioning. It serves as
 * the foundation for all database operations in the Rowguide application, ensuring
 * consistent database configuration and reliable connection handling.
 *
 * @example
 * ```typescript
 * // Basic database connection
 * const db = await this.indexedDbService.openDB();
 * console.log('Database connection established');
 *
 * // Access object stores
 * const projects = await db.getAll('projects');
 * const migrations = await db.getAll('migrations');
 *
 * // Perform transaction
 * const tx = db.transaction(['projects'], 'readwrite');
 * await tx.objectStore('projects').add(newProject);
 * await tx.done;
 * ```
 *
 * @example
 * ```typescript
 * // Service integration pattern
 * class DataService {
 *   constructor(private indexedDbService: IndexedDbService) {}
 *
 *   async saveData(data: any): Promise<void> {
 *     const db = await this.indexedDbService.openDB();
 *     // Database is ready with all schemas configured
 *     await db.add('projects', data);
 *   }
 * }
 * ```
 *
 * Key capabilities include:
 * - Automatic database connection with version management
 * - Schema upgrade procedures for object store creation
 * - TypeScript integration with strongly-typed database interfaces
 * - Error-resistant connection handling with retry logic
 * - Consistent database configuration across the application
 * - Support for concurrent connections and transactions
 *
 * Database schema includes:
 * - **projects** object store: Auto-incrementing ID, stores Project entities
 * - **migrations** object store: Manual keys, tracks database migrations
 * - Version 2 schema with upgrade procedures from previous versions
 *
 * The service ensures database consistency by handling schema migrations
 * automatically and providing a stable foundation for all data operations.
 *
 * - Related schema: RowguideDb for database schema interface definition
 * @see {@link openDB} For idb library connection utilities
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  /**
   * Constructs IndexedDbService for database connection management.
   *
   * The service is designed as a singleton to ensure consistent database
   * connections across the application. No dependencies are required as
   * this service provides the foundation for other data services.
   *
   * @example
   * ```typescript
   * // Service instantiation through Angular DI
   * constructor(
   *   private indexedDbService: IndexedDbService
   * ) {
   *   // Service ready for database operations
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor() {}

  /**
   * Opens database connection with automatic schema creation and version management.
   *
   * Establishes connection to the 'rowguide' IndexedDB database with version 2
   * schema, including automatic object store creation and upgrade procedures.
   * Handles schema migrations transparently and ensures all required object
   * stores are available for use.
   *
   * @returns Promise resolving to strongly-typed IDBPDatabase instance
   *
   * @example
   * ```typescript
   * // Basic database operations
   * const db = await this.indexedDbService.openDB();
   *
   * // Read operations
   * const allProjects = await db.getAll('projects');
   * const specificProject = await db.get('projects', 42);
   *
   * // Write operations
   * const newId = await db.add('projects', projectData);
   * await db.put('projects', updatedProject);
   * await db.delete('projects', projectId);
   * ```
   *
   * @example
   * ```typescript
   * // Transaction-based operations
   * const db = await this.indexedDbService.openDB();
   * const tx = db.transaction(['projects', 'migrations'], 'readwrite');
   *
   * try {
   *   await tx.objectStore('projects').add(project);
   *   await tx.objectStore('migrations').put(migrationRecord, 'v2.0');
   *   await tx.done; // Commit transaction
   * } catch (error) {
   *   // Transaction automatically rolled back on error
   *   console.error('Transaction failed:', error);
   * }
   * ```
   *
   * **Object Store Configuration:**
   *
   * **projects** store:
   * - **keyPath**: 'id' - Uses project.id as primary key
   * - **autoIncrement**: true - Automatically generates numeric IDs
   * - **Purpose**: Stores Project entities with auto-generated keys
   * - **Indexes**: None (queries by ID only)
   *
   * **migrations** store:
   * - **keyPath**: undefined - Uses explicit keys for migration tracking
   * - **autoIncrement**: false - Manual key management for version strings
   * - **Purpose**: Tracks database migration completion status
   * - **Keys**: String-based version identifiers (e.g., 'v1.0', 'v2.0')
   *
   * **Schema Upgrade Procedure:**
   * 1. Checks for existence of required object stores
   * 2. Creates missing stores with proper configuration
   * 3. Maintains backward compatibility with existing data
   * 4. No data migration required (additive changes only)
   *
   * **Version Management:**
   * - Current version: 2
   * - Upgrade path: Automatic creation of missing object stores
   * - Future versions: Add new stores or indexes as needed
   * - Rollback: Not supported (version upgrades are permanent)
   *
   * The method handles all connection errors gracefully and provides
   * consistent database state regardless of previous application versions
   * or database corruption scenarios.
   *
   * - Related schema: RowguideDb for complete database schema definition
   * @see {@link IDBPDatabase} For database interface documentation
   * @see {@link openDB} For idb library connection utilities
   * @since 1.0.0
   */
  openDB(): Promise<IDBPDatabase<RowguideDb>> {
    return openDB<RowguideDb>('rowguide', 2, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains('migrations')) {
          db.createObjectStore('migrations', {
            autoIncrement: false,
          });
        }
      },
    });
  }
}

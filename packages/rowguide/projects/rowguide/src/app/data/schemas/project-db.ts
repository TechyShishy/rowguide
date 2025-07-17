import { DBSchema } from 'idb';

import { Project } from '../../core/models/project';

/**
 * ProjectDb - Dedicated Project Data Storage Schema
 *
 * This interface defines a specialized database schema focused exclusively
 * on project entity storage and management. It provides a streamlined,
 * project-centric contract for applications that need dedicated project
 * storage separate from other application data.
 *
 * @example
 * ```typescript
 * // Project-focused database connection
 * import { openDB, IDBPDatabase } from 'idb';
 * import { ProjectDb } from './schemas/project-db';
 *
 * const projectDb: IDBPDatabase<ProjectDb> = await openDB<ProjectDb>('projects', 1, {
 *   upgrade(db) {
 *     if (!db.objectStoreNames.contains('projects')) {
 *       db.createObjectStore('projects', {
 *         keyPath: 'id',
 *         autoIncrement: true
 *       });
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Dedicated project repository service
 * class ProjectRepository {
 *   constructor(private db: IDBPDatabase<ProjectDb>) {}
 *
 *   async createProject(project: Omit<Project, 'id'>): Promise<number> {
 *     return await this.db.add('projects', project as Project);
 *   }
 *
 *   async getProject(id: number): Promise<Project | undefined> {
 *     return await this.db.get('projects', id);
 *   }
 *
 *   async getAllProjects(): Promise<Project[]> {
 *     return await this.db.getAll('projects');
 *   }
 *
 *   async updateProject(project: Project): Promise<void> {
 *     await this.db.put('projects', project);
 *   }
 *
 *   async deleteProject(id: number): Promise<void> {
 *     await this.db.delete('projects', id);
 *   }
 * }
 * ```
 *
 * **Schema Purpose and Design:**
 *
 * This schema is optimized for applications that need:
 * - **Project-Only Storage**: Dedicated project data without system overhead
 * - **Simplified Architecture**: Single-purpose database for project management
 * - **Performance Focus**: Optimized specifically for project operations
 * - **Modularity**: Can be combined with other specialized schemas
 *
 * **Use Cases:**
 * - Project management applications
 * - Pattern design tools
 * - Content management systems focused on creative projects
 * - Multi-tenant applications with isolated project storage
 * - Microservice architectures with dedicated project services
 *
 * **Performance Optimization:**
 * ```typescript
 * // Batch operations for large project sets
 * class BatchProjectManager {
 *   constructor(private db: IDBPDatabase<ProjectDb>) {}
 *
 *   async importProjects(projects: Project[]): Promise<number[]> {
 *     const tx = this.db.transaction('projects', 'readwrite');
 *     const store = tx.objectStore('projects');
 *
 *     const promises = projects.map(project => store.add(project));
 *     const results = await Promise.all(promises);
 *     await tx.done;
 *
 *     return results;
 *   }
 *
 *   async exportAllProjects(): Promise<Project[]> {
 *     return await this.db.getAll('projects');
 *   }
 * }
 * ```
 *
 * **Multi-Database Integration:**
 * ```typescript
 * // Integration with other specialized databases
 * class ApplicationDataManager {
 *   constructor(
 *     private projectDb: IDBPDatabase<ProjectDb>,
 *     private settingsDb: IDBPDatabase<SettingsDb>,
 *     private cacheDb: IDBPDatabase<CacheDb>
 *   ) {}
 *
 *   async initializeApplication(): Promise<void> {
 *     // Load projects from dedicated project database
 *     const projects = await this.projectDb.getAll('projects');
 *
 *     // Load settings from settings database
 *     const settings = await this.settingsDb.get('settings', 'app');
 *
 *     // Initialize application with separated concerns
 *     this.initializeWithData(projects, settings);
 *   }
 * }
 * ```
 *
 * **Relationship to RowguideDb:**
 * While RowguideDb provides an integrated schema including both projects
 * and migrations, ProjectDb offers the same project storage capability
 * in isolation. Choose based on architectural requirements:
 * - Use RowguideDb for integrated applications needing both projects and migrations
 * - Use ProjectDb for project-focused applications or microservice architectures
 * - Combine ProjectDb with other specialized schemas for modular data architecture
 *
 * - Related schema: RowguideDb for integrated application schema
 * @see {@link Project} For complete project data structure
 * - Related service: ProjectDbService for high-level project operations
 * @since 1.0.0
 */
export interface ProjectDb extends DBSchema {
  /**
   * Projects Object Store - Dedicated Project Entity Storage
   *
   * Specialized object store optimized exclusively for project data storage,
   * providing high-performance access to pattern projects with comprehensive
   * data structures for creative pattern tracking applications.
   *
   * **Store Configuration:**
   * - **keyPath**: 'id' - Uses project entity ID as primary key
   * - **autoIncrement**: true - Automatic ID generation for new projects
   * - **indexes**: None (optimized for primary key access patterns)
   *
   * **Project Data Structure:**
   * Each project record contains comprehensive pattern information:
   * - **Basic Metadata**: id, name, creation timestamps
   * - **Pattern Data**: rows array with step-by-step instructions
   * - **Progress Tracking**: current position within the pattern
   * - **Color Management**: FLAM integration and color mappings
   * - **Media Assets**: optional project images as ArrayBuffer
   * - **User Customizations**: settings and preferences per project
   *
   * **Storage Optimization:**
   * ```typescript
   * // Efficient project storage patterns
   * class OptimizedProjectStorage {
   *   async storeProjectWithCompression(project: Project): Promise<number> {
   *     // Compress large step arrays before storage
   *     const optimizedProject = {
   *       ...project,
   *       rows: project.rows.map(row => ({
   *         ...row,
   *         steps: this.compressSteps(row.steps)
   *       }))
   *     };
   *
   *     return await this.db.add('projects', optimizedProject);
   *   }
   *
   *   async loadProjectWithDecompression(id: number): Promise<Project | undefined> {
   *     const project = await this.db.get('projects', id);
   *     if (!project) return undefined;
   *
   *     // Decompress step arrays for use
   *     return {
   *       ...project,
   *       rows: project.rows.map(row => ({
   *         ...row,
   *         steps: this.expandSteps(row.steps)
   *       }))
   *     };
   *   }
   * }
   * ```
   *
   * **Access Patterns and Performance:**
   * - **Single Project Load**: O(1) lookup by primary key
   * - **Project List**: Efficient full-table scan with getAll()
   * - **Project Updates**: Atomic put operations with version control
   * - **Batch Operations**: Transaction-based bulk operations
   *
   * **Data Validation and Integrity:**
   * ```typescript
   * // Project validation before storage
   * async saveProject(project: Project): Promise<number> {
   *   // Validate project structure
   *   if (!this.isValidProject(project)) {
   *     throw new Error('Invalid project structure');
   *   }
   *
   *   // Validate required fields
   *   if (!project.rows || project.rows.length === 0) {
   *     throw new Error('Project must contain at least one row');
   *   }
   *
   *   // Validate step data integrity
   *   for (const row of project.rows) {
   *     if (!Array.isArray(row.steps)) {
   *       throw new Error(`Row ${row.id} has invalid steps array`);
   *     }
   *   }
   *
   *   return await this.db.add('projects', project);
   * }
   * ```
   *
   * **Memory Management:**
   * Large project files with extensive pattern data require careful memory management:
   * - **Lazy Loading**: Load project metadata first, pattern data on demand
   * - **Streaming**: Process large step arrays in chunks
   * - **Caching**: Keep frequently accessed projects in memory
   * - **Cleanup**: Remove unused project data from memory
   *
   * **Backup and Synchronization:**
   * ```typescript
   * // Project export for backup/sync
   * class ProjectBackupManager {
   *   async exportAllProjects(): Promise<Project[]> {
   *     return await this.db.getAll('projects');
   *   }
   *
   *   async importProjects(projects: Project[]): Promise<void> {
   *     const tx = this.db.transaction('projects', 'readwrite');
   *
   *     for (const project of projects) {
   *       await tx.objectStore('projects').put(project);
   *     }
   *
   *     await tx.done;
   *   }
   *
   *   async syncWithRemote(remoteProjects: Project[]): Promise<void> {
   *     // Compare local and remote projects
   *     const localProjects = await this.exportAllProjects();
   *     const conflicts = this.detectConflicts(localProjects, remoteProjects);
   *
   *     // Resolve conflicts and update local storage
   *     const resolvedProjects = await this.resolveConflicts(conflicts);
   *     await this.importProjects(resolvedProjects);
   *   }
   * }
   * ```
   *
   * **Query Patterns:**
   * Although the schema doesn't include indexes, common query patterns can be
   * implemented efficiently:
   *
   * ```typescript
   * // Common project queries
   * class ProjectQueryService {
   *   async findProjectsByName(namePattern: string): Promise<Project[]> {
   *     const allProjects = await this.db.getAll('projects');
   *     return allProjects.filter(p =>
   *       p.name?.toLowerCase().includes(namePattern.toLowerCase())
   *     );
   *   }
   *
   *   async getRecentProjects(limit: number = 10): Promise<Project[]> {
   *     const allProjects = await this.db.getAll('projects');
   *     return allProjects
   *       .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
   *       .slice(0, limit);
   *   }
   *
   *   async getProjectStats(): Promise<{ total: number; withImages: number; }> {
   *     const projects = await this.db.getAll('projects');
   *     return {
   *       total: projects.length,
   *       withImages: projects.filter(p => p.image).length
   *     };
   *   }
   * }
   * ```
   *
   * @see {@link Project} For detailed project entity structure
   * - Related service: ProjectDbService for high-level project operations
   * - Related utility: ZipperService for step compression/expansion utilities
   */
  projects: {
    key: number;
    value: Project;
  };
}

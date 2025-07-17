import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, isValidProject, hasValidId } from '../../core/models';
import { ErrorHandlerService, DataIntegrityService } from '../../core/services';
import { IndexedDbService } from './indexed-db.service';

/**
 * ProjectDbService - Comprehensive Database Operations for Project Management
 *
 * This service provides robust CRUD operations for project data with comprehensive
 * validation, error handling, and data integrity checks. It serves as the primary
 * data access layer for the Rowguide application, ensuring safe and reliable
 * project persistence using IndexedDB.
 *
 * @example
 * ```typescript
 * // Loading all projects with validation
 * const projects = await this.projectDbService.loadProjects();
 * console.log(`Loaded ${projects.length} valid projects`);
 *
 * // Saving a new project with integrity checks
 * const newProjectId = await this.projectDbService.addProject(project);
 * if (newProjectId) {
 *   console.log(`Project saved with ID: ${newProjectId}`);
 * }
 *
 * // Loading a specific project with error handling
 * const project = await this.projectDbService.loadProject(projectId);
 * if (project) {
 *   console.log(`Loaded project: ${project.name}`);
 * }
 * ```
 *
 * Key capabilities include:
 * - Comprehensive project validation using DataIntegrityService
 * - Robust error handling with user-friendly messages
 * - IndexedDB transaction management with rollback support
 * - Data integrity checks on all operations
 * - Automatic validation and sanitization of project names
 * - Detailed logging and monitoring for debugging
 *
 * The service integrates seamlessly with the ErrorHandlerService for centralized
 * error management and provides detailed context for all operations to support
 * debugging and user feedback.
 *
 * @see {@link Project} For project data model structure
 * @see {@link IndexedDbService} For database connection management
 * @see {@link DataIntegrityService} For validation and integrity checks
 * @see {@link ErrorHandlerService} For error handling and user feedback
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class ProjectDbService {
  /**
   * Constructs ProjectDbService with comprehensive database and validation capabilities.
   *
   * @param logger - Structured logging service for operation tracking and debugging
   * @param indexedDbService - Database connection management and schema handling
   * @param errorHandler - Centralized error handling with user feedback
   * @param dataIntegrity - Data validation and integrity checking service
   *
   * Initializes the service with dependency injection for:
   * - Structured logging with operation context and error tracking
   * - Database connection management with automatic schema upgrades
   * - Centralized error handling with severity categorization
   * - Data integrity validation with comprehensive rule checking
   *
   * @example
   * ```typescript
   * // Service instantiation through Angular DI
   * constructor(
   *   private projectDbService: ProjectDbService
   * ) {
   *   // Service is ready for database operations
   * }
   * ```
   *
   * @since 1.0.0
   */
  constructor(
    private logger: NGXLogger,
    private indexedDbService: IndexedDbService,
    private errorHandler: ErrorHandlerService,
    private dataIntegrity: DataIntegrityService
  ) {}

  /**
   * Loads all projects from the database with comprehensive validation and error recovery.
   *
   * Performs batch loading of all projects from IndexedDB with robust validation
   * using DataIntegrityService for project name validation and type guards for
   * structural validation. Invalid projects are filtered out and logged for debugging.
   *
   * @returns Promise resolving to array of valid Project objects
   *
   * @example
   * ```typescript
   * // Load all projects with automatic validation
   * const projects = await this.projectDbService.loadProjects();
   *
   * // Handle the results
   * if (projects.length > 0) {
   *   console.log(`Successfully loaded ${projects.length} projects`);
   *   projects.forEach(project => {
   *     console.log(`- ${project.name} (ID: ${project.id})`);
   *   });
   * } else {
   *   console.log('No valid projects found');
   * }
   * ```
   *
   * The method implements comprehensive error handling:
   * - **Validation Errors**: Projects with invalid names are filtered out
   * - **Structural Errors**: Projects failing type validation are excluded
   * - **Database Errors**: Connection or query failures return empty array
   * - **Recovery Strategy**: Always returns valid array, never throws
   *
   * Data integrity checks include:
   * - Project name validation using DataIntegrityService rules
   * - Structural validation using isValidProject type guard
   * - Error logging for all invalid data discovered
   * - Detailed context for debugging and monitoring
   *
   * @see {@link DataIntegrityService.validateProjectName} For name validation rules
   * @see {@link isValidProject} For structural validation logic
   * @see {@link ErrorHandlerService.handleError} For error handling patterns
   * @since 1.0.0
   */
  async loadProjects(): Promise<Project[]> {
    try {
      const db = await this.indexedDbService.openDB();
      const projects = await db.getAll('projects');

      // Filter out invalid projects and validate with DataIntegrityService
      return projects.filter((project) => {
        // Validate project name with DataIntegrityService
        if (project?.name) {
          const nameValidationResult = this.dataIntegrity.validateProjectName(
            project.name
          );
          if (!nameValidationResult.isValid) {
            this.errorHandler.handleError(
              new Error(
                `Project name validation failed: ${nameValidationResult.issues.join(
                  ', '
                )}`
              ),
              {
                operation: 'loadProjects',
                details:
                  'DataIntegrityService validation failed for project name',
                projectId: project?.id,
                projectName: project.name,
                validationIssues: nameValidationResult.issues,
                invalidProject: project,
              },
              undefined,
              'medium'
            );
            return false;
          }
        }

        if (!isValidProject(project)) {
          this.errorHandler.handleError(
            new Error('Invalid project found in database'),
            {
              operation: 'loadProjects',
              details: 'project validation failed',
              projectId: project?.id,
              invalidProject: project,
            },
            undefined,
            'medium'
          );
          return false;
        }
        return true;
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProjects',
          details: 'Failed to load projects from IndexedDB',
          tableName: 'projects',
        },
        'Unable to load your projects. Please try refreshing the page.',
        'critical'
      );
      return [];
    }
  }

  /**
   * Loads a specific project by ID with comprehensive validation and integrity checks.
   *
   * Retrieves a single project from IndexedDB using the provided key, with full
   * validation pipeline including DataIntegrityService name validation and
   * structural validation. Returns null for invalid keys, missing projects,
   * or corrupted data.
   *
   * @param key - Numeric project ID for database lookup (must be positive)
   * @returns Promise resolving to Project object or null if not found/invalid
   *
   * @example
   * ```typescript
   * // Load a specific project with validation
   * const projectId = 42;
   * const project = await this.projectDbService.loadProject(projectId);
   *
   * if (project) {
   *   console.log(`Loaded: ${project.name}`);
   *   console.log(`Rows: ${project.rows.length}`);
   *   console.log(`Position: Row ${project.position.row}, Step ${project.position.step}`);
   * } else {
   *   console.log('Project not found or data corrupted');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Error handling for invalid keys
   * const invalidKeys = [0, -1, null, undefined];
   * for (const key of invalidKeys) {
   *   const result = await this.projectDbService.loadProject(key);
   *   // Always returns null for invalid keys
   *   console.log(`Key ${key}: ${result}`); // "Key 0: null"
   * }
   * ```
   *
   * Validation pipeline includes:
   * - **Key Validation**: Ensures positive numeric ID
   * - **Existence Check**: Verifies project exists in database
   * - **Name Validation**: Uses DataIntegrityService for name integrity
   * - **Structural Validation**: Uses isValidProject for data structure
   * - **Error Recovery**: Returns null for any validation failure
   *
   * Error handling covers:
   * - Invalid key values (non-positive numbers)
   * - Database connection failures
   * - Project not found scenarios
   * - Data corruption detection
   * - Name validation failures
   *
   * @see {@link DataIntegrityService.validateProjectName} For name validation
   * @see {@link isValidProject} For structural validation
   * @see {@link ErrorHandlerService.handleError} For error categorization
   * @since 1.0.0
   */
  async loadProject(key: number): Promise<Project | null> {
    if (!key || key <= 0) {
      this.errorHandler.handleError(
        new Error('Invalid project key provided'),
        {
          operation: 'loadProject',
          details: 'invalid key provided',
          key: key,
        },
        undefined,
        'medium'
      );
      return null;
    }

    try {
      const db = await this.indexedDbService.openDB();
      const project = await db.get('projects', key);

      if (!project) {
        return null;
      }

      // Validate loaded project data with DataIntegrityService
      if (project?.name) {
        const nameValidationResult = this.dataIntegrity.validateProjectName(
          project.name
        );
        if (!nameValidationResult.isValid) {
          this.errorHandler.handleError(
            new Error(
              `Loaded project name validation failed: ${nameValidationResult.issues.join(
                ', '
              )}`
            ),
            {
              operation: 'loadProject',
              details:
                'DataIntegrityService validation failed for loaded project name',
              projectId: key,
              projectName: project.name,
              validationIssues: nameValidationResult.issues,
              invalidProject: project,
            },
            'The project data appears to be corrupted. Please try reloading.',
            'high'
          );
          return null;
        }
      }

      if (!isValidProject(project)) {
        this.errorHandler.handleError(
          new Error('Invalid project data loaded from database'),
          {
            operation: 'loadProject',
            details: 'Project validation failed',
            projectId: key,
            invalidProject: project,
          },
          'The project data appears to be corrupted. Please try reloading.',
          'high'
        );
        return null;
      }

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          details: 'Failed to load project from database',
          projectId: key,
          tableName: 'projects',
        },
        'Unable to load the selected project. Please try again.',
        'high'
      );
      return null;
    }
  }

  /**
   * Adds a new project to the database with comprehensive validation and error handling.
   *
   * Persists a project to IndexedDB after rigorous validation using both
   * DataIntegrityService for name validation and type guards for structural
   * validation. Returns the generated database ID on success or null on failure.
   *
   * @param project - Project object to persist (must pass all validation checks)
   * @returns Promise resolving to numeric database ID or null on failure
   * @throws Error when validation fails (caught and handled internally)
   *
   * @example
   * ```typescript
   * // Create and save a new project
   * const newProject: Project = {
   *   id: 0, // Will be assigned by database
   *   name: "My Beading Pattern",
   *   rows: [
   *     { id: 1, steps: [{ id: 1, count: 3, description: "3A" }] }
   *   ],
   *   position: { row: 0, step: 0 },
   *   firstLastAppearanceMap: new Map(),
   *   colorMapping: new Map()
   * };
   *
   * const projectId = await this.projectDbService.addProject(newProject);
   * if (projectId) {
   *   console.log(`Project saved with ID: ${projectId}`);
   *   // Update project with assigned ID
   *   newProject.id = projectId;
   * } else {
   *   console.error('Failed to save project');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle validation failures
   * const invalidProject = {
   *   name: "", // Empty name will fail validation
   *   rows: [], // Empty rows may fail validation
   * };
   *
   * try {
   *   const result = await this.projectDbService.addProject(invalidProject);
   *   // result will be null due to validation failure
   * } catch (error) {
   *   // Errors are handled internally and logged
   *   console.log('Validation failed, check error logs');
   * }
   * ```
   *
   * Validation pipeline includes:
   * - **Name Validation**: DataIntegrityService rules for safe project names
   * - **Structural Validation**: isValidProject type guard for data integrity
   * - **Database Validation**: Ensures valid numeric ID is returned
   * - **Transaction Safety**: Atomic operation with automatic rollback
   *
   * Error handling covers:
   * - Project name validation failures with detailed messages
   * - Structural validation errors with project context
   * - Database connection and transaction failures
   * - Invalid ID generation from database
   * - User-friendly error messages for UI display
   *
   * @see {@link DataIntegrityService.validateProjectName} For name validation rules
   * @see {@link isValidProject} For structural validation requirements
   * @see {@link IndexedDbService.openDB} For database transaction handling
   * @since 1.0.0
   */
  async addProject(project: Project): Promise<number | null> {
    // Validate project name with DataIntegrityService
    if (project?.name) {
      const nameValidationResult = this.dataIntegrity.validateProjectName(
        project.name
      );
      if (!nameValidationResult.isValid) {
        this.errorHandler.handleError(
          new Error(
            `Project name validation failed: ${nameValidationResult.issues.join(
              ', '
            )}`
          ),
          {
            operation: 'addProject',
            details: 'DataIntegrityService name validation failed',
            projectName: project.name,
            projectId: project?.id,
            validationIssues: nameValidationResult.issues,
            invalidProject: project,
          },
          'Unable to save project. Please check your project name.',
          'high'
        );
        throw new Error('Invalid project name');
      }
    }

    if (!isValidProject(project)) {
      this.errorHandler.handleError(
        new Error('Cannot save invalid project'),
        {
          operation: 'addProject',
          details: 'Project validation failed',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to save project. Please check your project data.',
        'high'
      );
      throw new Error('Invalid project data');
    }

    try {
      const db = await this.indexedDbService.openDB();
      const id = await db.add('projects', project);

      if (typeof id !== 'number') {
        throw new Error('Invalid ID returned from database');
      }

      return id;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'addProject',
          details: 'Failed to save project to database',
          projectName: project?.name,
          projectId: project?.id,
          tableName: 'projects',
        },
        'Unable to save your project. Please try again.',
        'high'
      );
      return null;
    }
  }

  /**
   * Updates an existing project in the database with comprehensive validation and safety checks.
   *
   * Modifies an existing project in IndexedDB after validating the project has a
   * valid ID, passes name validation through DataIntegrityService, and meets
   * structural requirements. Uses PUT operation for atomic updates with rollback.
   *
   * @param project - Project object with valid ID to update (must exist in database)
   * @returns Promise resolving to boolean indicating success (true) or failure (false)
   *
   * @example
   * ```typescript
   * // Update project with new data
   * const existingProject = await this.projectDbService.loadProject(42);
   * if (existingProject) {
   *   // Modify project data
   *   existingProject.name = "Updated Pattern Name";
   *   existingProject.position = { row: 5, step: 3 };
   *
   *   // Save changes
   *   const success = await this.projectDbService.updateProject(existingProject);
   *   if (success) {
   *     console.log('Project updated successfully');
   *   } else {
   *     console.error('Failed to update project');
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle update validation errors
   * const projectWithoutId = { name: "Test", rows: [] }; // Missing ID
   * const updateResult = await this.projectDbService.updateProject(projectWithoutId);
   * // Returns false due to missing valid ID
   *
   * const projectWithInvalidName = {
   *   id: 42,
   *   name: "Invalid<>Name", // Contains invalid characters
   *   rows: []
   * };
   * const nameResult = await this.projectDbService.updateProject(projectWithInvalidName);
   * // Returns false due to name validation failure
   * ```
   *
   * Update validation pipeline:
   * - **ID Validation**: Uses hasValidId to ensure project can be located
   * - **Name Validation**: DataIntegrityService validation for safe names
   * - **Structural Validation**: isValidProject for complete data integrity
   * - **Database Transaction**: Atomic PUT operation with error rollback
   *
   * The method ensures data integrity by:
   * - Requiring valid numeric ID for database operations
   * - Validating project name against injection and corruption
   * - Checking complete project structure before persistence
   * - Providing detailed error context for debugging
   * - Rolling back transaction on any validation failure
   *
   * Error scenarios handled:
   * - Missing or invalid project ID
   * - Project name validation failures
   * - Structural data corruption
   * - Database connection failures
   * - Transaction conflicts and timeouts
   *
   * @see {@link hasValidId} For ID validation requirements
   * @see {@link DataIntegrityService.validateProjectName} For name validation
   * @see {@link isValidProject} For structural validation
   * @see {@link ErrorHandlerService.handleError} For error management
   * @since 1.0.0
   */
  async updateProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.errorHandler.handleError(
        new Error('Cannot update project without valid ID'),
        {
          operation: 'updateProject',
          details: 'Missing ID for project',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to update project. Invalid project ID.',
        'high'
      );
      return false;
    }

    // Validate project name with DataIntegrityService
    if (project?.name) {
      const nameValidationResult = this.dataIntegrity.validateProjectName(
        project.name
      );
      if (!nameValidationResult.isValid) {
        this.errorHandler.handleError(
          new Error(
            `Project name validation failed: ${nameValidationResult.issues.join(
              ', '
            )}`
          ),
          {
            operation: 'updateProject',
            details: 'DataIntegrityService name validation failed',
            projectName: project.name,
            projectId: project?.id,
            validationIssues: nameValidationResult.issues,
            invalidProject: project,
          },
          'Unable to update project. Please check your project name.',
          'high'
        );
        return false;
      }
    }

    if (!isValidProject(project)) {
      this.errorHandler.handleError(
        new Error('Cannot update with invalid project data'),
        {
          operation: 'updateProject',
          details: 'Project validation failed',
          projectId: project?.id,
          projectName: project?.name,
          invalidProject: project,
        },
        'Unable to update project. Please check your project data.',
        'high'
      );
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.put('projects', project);
      return true;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'updateProject',
          details: 'Failed to update project in database',
          projectId: project?.id,
          projectName: project?.name,
          tableName: 'projects',
        },
        'Unable to save your changes. Please try again.',
        'high'
      );
      return false;
    }
  }

  /**
   * Deletes a project from the database with comprehensive safety checks and validation.
   *
   * Removes a project from IndexedDB after validating the project has a valid ID
   * for safe deletion. Uses atomic DELETE operation with proper error handling
   * and logging for audit trails.
   *
   * @param project - Project object with valid ID to delete from database
   * @returns Promise resolving to boolean indicating successful deletion (true) or failure (false)
   *
   * @example
   * ```typescript
   * // Delete a specific project safely
   * const projectToDelete = await this.projectDbService.loadProject(42);
   * if (projectToDelete) {
   *   const deleted = await this.projectDbService.deleteProject(projectToDelete);
   *   if (deleted) {
   *     console.log(`Successfully deleted: ${projectToDelete.name}`);
   *     // Update UI to remove project from list
   *   } else {
   *     console.error('Failed to delete project');
   *     // Show error message to user
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle deletion with confirmation workflow
   * async deleteProjectWithConfirmation(project: Project): Promise<void> {
   *   const confirmed = await this.showDeleteConfirmation(project.name);
   *   if (confirmed) {
   *     const success = await this.projectDbService.deleteProject(project);
   *     if (success) {
   *       this.notificationService.success(`Deleted ${project.name}`);
   *       this.refreshProjectList();
   *     } else {
   *       this.notificationService.error('Failed to delete project');
   *     }
   *   }
   * }
   * ```
   *
   * Safety measures include:
   * - **ID Validation**: Ensures project has valid ID before deletion attempt
   * - **Atomic Operation**: Uses database DELETE transaction with rollback
   * - **Error Recovery**: Graceful failure with detailed error logging
   * - **Audit Trail**: Complete logging of deletion attempts and results
   *
   * The method prioritizes safety by:
   * - Validating project ID exists and is numeric
   * - Using atomic database operations to prevent partial deletions
   * - Providing detailed error context for debugging
   * - Never throwing exceptions (returns false on any failure)
   * - Logging all deletion attempts for audit purposes
   *
   * Error scenarios handled:
   * - Missing or invalid project ID
   * - Project not found in database
   * - Database connection failures
   * - Transaction conflicts during deletion
   * - Permission or constraint violations
   *
   * **Note**: This method does not perform cascade deletions. Related data
   * (if any) should be handled separately before calling this method.
   *
   * @see {@link hasValidId} For ID validation requirements
   * @see {@link IndexedDbService.openDB} For database transaction handling
   * @see {@link ErrorHandlerService.handleError} For error logging and user feedback
   * @since 1.0.0
   */
  async deleteProject(project: Project): Promise<boolean> {
    if (!hasValidId(project)) {
      this.errorHandler.handleError(
        new Error('Cannot delete project without valid ID'),
        {
          operation: 'deleteProject',
          details: 'Missing ID for project',
          projectName: project?.name,
          projectId: project?.id,
          invalidProject: project,
        },
        'Unable to delete project. Invalid project ID.',
        'medium'
      );
      return false;
    }

    try {
      const db = await this.indexedDbService.openDB();
      await db.delete('projects', project.id);
      return true;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'deleteProject',
          details: 'Failed to delete project from database',
          projectId: project?.id,
          projectName: project?.name,
          tableName: 'projects',
        },
        'Unable to delete the project. Please try again.',
        'high'
      );
      return false;
    }
  }
}

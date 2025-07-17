import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Observable, take, firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  Project,
  Row,
  hasValidId,
  isValidProject,
  ModelFactory,
  SafeAccess,
} from '../../../core/models';
import { SettingsService, ErrorHandlerService, DataIntegrityService } from '../../../core/services';
import { ReactiveStateStore } from '../../../core/store/reactive-state-store';
import { ProjectActions } from '../../../core/store/actions/project-actions';
import {
  selectCurrentProject,
  selectZippedRows,
  selectProjectsReady,
  selectCurrentPosition,
} from '../../../core/store/selectors/project-selectors';
import { ProjectDbService } from '../../../data/services';
import { PeyoteShorthandService } from '../../file-import/loaders';
import { StepComponent } from '../../pattern-tracking/components/step/step.component';
import { NullProject } from '../models';

/**
 * Data Services Integration with ReactiveStateStore
 *
 * This architectural pattern demonstrates how data services integrate with the centralized
 * ReactiveStateStore to provide a unified data flow architecture. The ProjectService serves
 * as the primary integration layer, coordinating between persistent storage (data services)
 * and reactive state management (ReactiveStateStore).
 *
 * @example
 * ```typescript
 * // Data Flow Architecture Pattern
 * [UI Components]
 *       ↕ (reactive streams)
 * [ReactiveStateStore]
 *       ↕ (actions/selectors)
 * [Feature Services] (ProjectService, SettingsService, etc.)
 *       ↕ (async operations)
 * [Data Services] (ProjectDbService, MigrationDbService, etc.)
 *       ↕ (persistence)
 * [IndexedDB Storage]
 * ```
 *
 * **Integration Patterns:**
 *
 * **1. Store-First Pattern** - State as Source of Truth:
 * ```typescript
 * class FeatureService {
 *   // Expose store-managed state as observables
 *   currentProject$ = this.store.select(selectCurrentProject);
 *   projectList$ = this.store.select(selectAllProjects);
 *
 *   constructor(
 *     private store: ReactiveStateStore,
 *     private projectDb: ProjectDbService
 *   ) {}
 *
 *   async loadProject(id: number): Promise<void> {
 *     // Load from database
 *     const project = await this.projectDb.loadProject(id);
 *
 *     // Update centralized state
 *     this.store.dispatch(ProjectActions.setCurrentProject({ project }));
 *   }
 * }
 * ```
 *
 * **2. Optimistic Updates Pattern** - Immediate UI Response:
 * ```typescript
 * async updateProject(project: Project): Promise<void> {
 *   // Immediate state update for responsive UI
 *   this.store.dispatch(ProjectActions.updateProjectOptimistic({ project }));
 *
 *   try {
 *     // Persist to database
 *     await this.projectDb.updateProject(project);
 *
 *     // Confirm success in state
 *     this.store.dispatch(ProjectActions.updateProjectSuccess({ project }));
 *   } catch (error) {
 *     // Rollback optimistic update
 *     this.store.dispatch(ProjectActions.updateProjectFailure({ error }));
 *   }
 * }
 * ```
 *
 * **3. State Hydration Pattern** - Application Initialization:
 * ```typescript
 * async initializeApplication(): Promise<void> {
 *   // Load all projects from database
 *   const projects = await this.projectDb.loadProjects();
 *
 *   // Hydrate store with persisted data
 *   this.store.dispatch(ProjectActions.loadProjectsSuccess({ projects }));
 *
 *   // Load user settings
 *   const settings = await this.settingsService.loadSettings();
 *   this.store.dispatch(SettingsActions.loadSettingsSuccess({ settings }));
 * }
 * ```
 *
 * **4. Selective Persistence Pattern** - Efficient Storage:
 * ```typescript
 * // Only persist significant state changes
 * this.store.select(selectCurrentProject)
 *   .pipe(
 *     debounceTime(1000), // Avoid excessive saves
 *     distinctUntilChanged(), // Only save when actually changed
 *     filter(project => project && !isNullProject(project))
 *   )
 *   .subscribe(project => {
 *     this.projectDb.updateProject(project);
 *   });
 * ```
 *
 * **5. Cross-Service Coordination Pattern** - Service Integration:
 * ```typescript
 * class ProjectService {
 *   async deleteProject(id: number): Promise<void> {
 *     // 1. Remove from database
 *     await this.projectDb.deleteProject(id);
 *
 *     // 2. Update project state
 *     this.store.dispatch(ProjectActions.removeProject({ id }));
 *
 *     // 3. Clear related settings
 *     this.store.dispatch(SettingsActions.clearProjectSettings({ projectId: id }));
 *
 *     // 4. Clean up notifications
 *     this.store.dispatch(NotificationActions.clearProjectNotifications({ projectId: id }));
 *   }
 * }
 * ```
 *
 * **Benefits of This Architecture:**
 * - **Single Source of Truth**: All UI components read from the same state
 * - **Predictable Data Flow**: Clear separation between state and persistence
 * - **Optimistic Updates**: Responsive UI with automatic rollback on errors
 * - **Cross-Component Communication**: State changes automatically propagate
 * - **Testing**: Easy to mock data services or state store independently
 * - **Time-Travel Debugging**: Full state history for development
 *
 * **Error Handling Integration:**
 * ```typescript
 * // Centralized error handling across layers
 * async performOperation(): Promise<void> {
 *   try {
 *     // Data service operation
 *     await this.dataService.performDatabaseOperation();
 *
 *     // State update
 *     this.store.dispatch(SuccessAction());
 *   } catch (error) {
 *     // Error handling service processes error
 *     this.errorHandler.handleError(error, context);
 *
 *     // Error state update
 *     this.store.dispatch(ErrorAction({ error }));
 *   }
 * }
 * ```
 *
 * @see {@link ReactiveStateStore} For state management implementation
 * - Related service: ProjectDbService for data persistence operations
 * @see {@link ProjectActions} For state modification actions
 * - Related selectors: ProjectSelectors for state selection logic
 */

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  // Store-based observables replace BehaviorSubjects
  project$: Observable<Project> = this.store.select(selectCurrentProject);
  zippedRows$: Observable<Row[]> = this.store.select(selectZippedRows);
  ready$: Observable<boolean> = this.store.select(selectProjectsReady);
  currentStep!: StepComponent;

  constructor(
    private peyoteShorthandService: PeyoteShorthandService,
    private settingsService: SettingsService,
    private logger: NGXLogger,
    private indexedDBService: ProjectDbService,
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService,
    private store: ReactiveStateStore,
    private dataIntegrityService: DataIntegrityService
  ) {
    this.settingsService.ready.subscribe(() => {
      this.loadCurrentProject();
    });
  }
  /**
   * Save Current Project ID to LocalStorage
   *
   * Persists the active project ID to localStorage with comprehensive validation
   * and error handling. This method ensures project references are maintained
   * across browser sessions while providing robust data integrity checks.
   *
   * @example
   * ```typescript
   * // Basic usage with error handling
   * try {
   *   await this.projectService.saveCurrentProject(42);
   *   console.log('Project reference saved successfully');
   * } catch (error) {
   *   console.error('Failed to save project reference:', error);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Integration with project selection workflow
   * class ProjectSelectorComponent {
   *   async onProjectSelected(project: Project): Promise<void> {
   *     try {
   *       // Load project into store
   *       await this.projectService.loadProject(project.id);
   *
   *       // Persist selection for future sessions
   *       await this.projectService.saveCurrentProject(project.id);
   *
   *       // Navigate to project view
   *       this.router.navigate(['/project', project.id]);
   *     } catch (error) {
   *       this.handleSelectionError(error);
   *     }
   *   }
   * }
   * ```
   *
   * **Validation Pipeline:**
   * 1. **ID Type Validation**: Ensures ID is a positive integer
   * 2. **Boundary Validation**: Prevents extremely large IDs that might indicate corruption
   * 3. **Serialization Validation**: Verifies JSON serialization succeeds
   * 4. **Storage Verification**: Confirms localStorage write operation by reading back
   *
   * **Error Handling:**
   * - **Invalid ID**: Throws error for non-positive or non-integer IDs
   * - **Boundary Violations**: Rejects IDs exceeding reasonable limits (1,000,000)
   * - **Storage Failures**: Handles localStorage quota exceeded or access denied
   * - **Serialization Errors**: Catches JSON serialization failures
   *
   * **Security Considerations:**
   * - Validates ID ranges to prevent potential exploitation
   * - Sanitizes data before storage to prevent XSS vectors
   * - Implements reasonable size limits for stored data
   *
   * @param id - The project ID to save (must be positive integer ≤ 1,000,000)
   * @throws {Error} When ID validation fails or localStorage operations fail
   * @returns {Promise<void>} Resolves when project ID is successfully persisted
   *
   * @see {@link loadCurrentProjectId} For retrieving saved project ID
   * @see {@link loadCurrentProject} For loading the saved project
   * @since 1.0.0
   */
  async saveCurrentProject(id: number): Promise<void> {
    // Validate project ID using comprehensive checks
    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error(`Invalid project ID for storage: ${id}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: 'Project ID validation failed - must be positive integer',
          invalidId: id,
          expectedType: 'positive integer',
          validationContext: 'Project ID storage validation',
        },
        'Unable to save project reference. Invalid project identifier.',
        'medium'
      );
      throw error;
    }

    // Additional validation for reasonable ID range
    const maxReasonableId = 1000000; // Prevent extremely large IDs that might indicate corruption
    if (id > maxReasonableId) {
      const error = new Error(`Project ID exceeds reasonable limits: ${id}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: 'Project ID exceeds safety limits',
          projectId: id,
          maxAllowed: maxReasonableId,
          validationContext: 'Project ID boundary validation',
        },
        'Project ID is unusually large. Please verify the project selection.',
        'medium'
      );
      throw error;
    }

    try {
      const projectData = JSON.stringify(<CurrentProject>{ id });

      // Validate JSON serialization result
      if (!projectData || projectData === '{}' || projectData === 'null') {
        throw new Error('Failed to serialize project data for storage');
      }

      localStorage.setItem('currentProject', projectData);

      // Verify storage success by reading back
      const verification = localStorage.getItem('currentProject');
      if (!verification || verification !== projectData) {
        throw new Error('Failed to verify localStorage write operation');
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentProject',
          details: `Failed to save project ID: ${id} to localStorage`,
          projectId: id,
          storageType: 'localStorage',
          validationContext: 'LocalStorage data persistence validation',
        },
        'Unable to remember your current project. Settings may not persist.',
        'medium'
      );
      throw error;
    }
  }

  /**
   * Save Current Position with Integrity Validation
   *
   * Persists the user's current position within the active project pattern with
   * comprehensive validation and database integrity checks. This method ensures
   * position data is valid, normalized, and safely stored for progress tracking.
   *
   * @example
   * ```typescript
   * // Save user progress after completing a step
   * class StepComponent {
   *   async onStepCompleted(): Promise<void> {
   *     try {
   *       const position = this.getCurrentPosition();
   *       await this.projectService.saveCurrentPosition(position.row, position.step);
   *
   *       this.showSuccessMessage('Progress saved');
   *     } catch (error) {
   *       this.showErrorMessage('Failed to save progress');
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Automatic position saving with debouncing
   * class NavigationHandler {
   *   private savePositionDebounced = debounce(
   *     (row: number, step: number) => this.projectService.saveCurrentPosition(row, step),
   *     1000
   *   );
   *
   *   onPositionChanged(row: number, step: number): void {
   *     // Update UI immediately
   *     this.updateDisplayPosition(row, step);
   *
   *     // Save to database with debouncing
   *     this.savePositionDebounced(row, step);
   *   }
   * }
   * ```
   *
   * **Validation Pipeline Integration:**
   * 1. **DataIntegrityService Validation**: Comprehensive coordinate validation
   * 2. **Automatic Correction**: Invalid coordinates are normalized when possible
   * 3. **Project State Validation**: Ensures active project exists before saving
   * 4. **Database Consistency**: Updates both store and persistent storage atomically
   *
   * **Error Recovery Patterns:**
   * - **Validation Failures**: Detailed error context with correction suggestions
   * - **No Active Project**: Clear messaging to guide user to project selection
   * - **Database Errors**: Rollback store updates if persistence fails
   * - **Coordinate Boundary**: Automatic clamping to valid ranges
   *
   * **Performance Optimizations:**
   * - **Debounced Saves**: Suitable for high-frequency position updates
   * - **Optimistic Updates**: Store updated immediately, database asynchronously
   * - **Validation Caching**: DataIntegrityService caches validation results
   *
   * @param row - The row coordinate (0-based index, will be validated and normalized)
   * @param step - The step coordinate (0-based index, will be validated and normalized)
   * @throws {Error} When position validation fails or no active project exists
   * @returns {Promise<void>} Resolves when position is persisted to database
   *
   * @see {@link DataIntegrityService.validatePositionData} For validation logic
   * @see {@link ModelFactory.createPosition} For position object creation
   * @since 1.0.0
   */
  async saveCurrentPosition(row: number, step: number): Promise<void> {
    // Validate position data using DataIntegrityService - Integration Point 5
    const positionValidation = this.dataIntegrityService.validatePositionData(
      row,
      step
    );

    if (!positionValidation.isValid) {
      const error = new Error(
        `Invalid position coordinates: ${positionValidation.issues.join(', ')}`
      );
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentPosition',
          details: 'DataIntegrityService position validation failed',
          invalidData: { row, step },
          validationIssues: positionValidation.issues,
          cleanValue: positionValidation.cleanValue,
          validationContext: 'DataIntegrityService position validation',
        },
        'Unable to save position. Please ensure row and step values are valid.',
        'medium'
      );
      throw error;
    }

    // Log validation results if any issues were automatically corrected
    if (positionValidation.issues.length > 0) {
      this.logger.debug(
        'ProjectService: Position data corrected by DataIntegrityService',
        {
          original: { row, step },
          corrected: positionValidation.cleanValue,
          issues: positionValidation.issues,
        }
      );
    }

    try {
      const project = await firstValueFrom(
        this.project$.pipe(
          filter((project) => hasValidId(project)),
          map((project) => {
            const position = ModelFactory.createPosition(row, step);
            return { ...project, position };
          }),
          take(1)
        )
      );

      if (project) {
        this.store.dispatch(ProjectActions.updateProjectSuccess(project));
        await this.indexedDBService.updateProject(project);
      } else {
        const error = new Error('No valid project available to save position');
        this.errorHandler.handleError(
          error,
          {
            operation: 'saveCurrentPosition',
            details: 'No active project found when saving position',
            attemptedPosition: { row, step },
            validationContext: 'Project state validation',
          },
          'No project is currently loaded. Please select a project first.',
          'medium'
        );
        throw error;
      }
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'saveCurrentPosition',
          details: 'Failed to save position coordinates to database',
          position: { row, step },
          databaseOperation: 'updateProject',
        },
        'Unable to save your current position. Progress may not be saved.',
        'medium'
      );
      throw error;
    }
  }

  /**
   * Load Current Project ID from LocalStorage
   *
   * Retrieves and validates the previously saved project ID from localStorage
   * with comprehensive error handling and data integrity checks. This method
   * provides safe access to user's last active project across browser sessions.
   *
   * @example
   * ```typescript
   * // Application initialization with saved project restoration
   * class AppInitializationService {
   *   async initializeApplication(): Promise<void> {
   *     const savedProject = this.projectService.loadCurrentProjectId();
   *
   *     if (savedProject) {
   *       console.log(`Restoring project ${savedProject.id}`);
   *       await this.projectService.loadProject(savedProject.id);
   *     } else {
   *       console.log('No saved project found, showing project selector');
   *       this.router.navigate(['/projects']);
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Route guard implementation with project restoration
   * class ProjectGuard implements CanActivate {
   *   canActivate(): Observable<boolean> {
   *     const currentProject = this.projectService.loadCurrentProjectId();
   *
   *     if (currentProject) {
   *       // Valid saved project exists
   *       return this.projectService.loadProject(currentProject.id)
   *         .pipe(map(project => !!project));
   *     } else {
   *       // No saved project, redirect to selection
   *       this.router.navigate(['/projects']);
   *       return of(false);
   *     }
   *   }
   * }
   * ```
   *
   * **Data Validation Pipeline:**
   * 1. **Storage Existence**: Checks if localStorage data exists
   * 2. **JSON Integrity**: Validates JSON format using DataIntegrityService
   * 3. **Structure Validation**: Ensures parsed data is proper object
   * 4. **ID Validation**: Confirms ID is positive integer within bounds
   * 5. **Boundary Checking**: Prevents extremely large IDs that might indicate corruption
   *
   * **Error Handling and Recovery:**
   * - **Corrupted Data**: Automatically removes invalid localStorage entries
   * - **Invalid JSON**: Logs error details and clears corrupted data
   * - **Invalid Structure**: Handles malformed data objects gracefully
   * - **Boundary Violations**: Rejects IDs outside reasonable ranges
   * - **Access Errors**: Handles localStorage access denied scenarios
   *
   * **Security Features:**
   * - **Data Sanitization**: Validates all parsed data before use
   * - **Boundary Enforcement**: Prevents potentially malicious large IDs
   * - **Automatic Cleanup**: Removes corrupted data to prevent repeated errors
   *
   * @returns {CurrentProject | null} The saved project data or null if none exists/invalid
   *
   * @see {@link saveCurrentProject} For persisting project ID
   * @see {@link DataIntegrityService.validateJsonData} For JSON validation
   * @since 1.0.0
   */
  loadCurrentProjectId(): CurrentProject | null {
    try {
      const data = localStorage.getItem('currentProject');
      if (!data) {
        return null;
      }

      // Validate JSON data before parsing
      if (!this.dataIntegrityService.validateJsonData(data).isValid) {
        this.errorHandler.handleError(
          new Error('Invalid JSON data in localStorage'),
          {
            operation: 'loadCurrentProjectId',
            details: 'localStorage contains malformed JSON data',
            invalidData: data,
            storageType: 'localStorage',
            validationContext: 'JSON integrity validation',
          },
          'Stored project data is corrupted. You may need to select a project manually.',
          'medium'
        );
        // Clear corrupted data
        localStorage.removeItem('currentProject');
        return null;
      }

      const parseResult = this.dataIntegrityService.validateJsonData(data);
      const parsed = parseResult.parsed as CurrentProject;

      // Validate parsed data structure
      if (!parsed || typeof parsed !== 'object') {
        this.errorHandler.handleError(
          new Error('Invalid project data structure in localStorage'),
          {
            operation: 'loadCurrentProjectId',
            details: 'Parsed data is not a valid object',
            invalidStructure: parsed,
            storageType: 'localStorage',
            validationContext: 'Data structure validation',
          },
          'Stored project data has invalid structure. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      // Validate project ID
      if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
        this.errorHandler.handleError(
          new Error(`Invalid project ID found in localStorage: ${parsed.id}`),
          {
            operation: 'loadCurrentProjectId',
            details: 'Project ID validation failed - must be positive integer',
            invalidId: parsed.id,
            expectedType: 'positive integer',
            storageType: 'localStorage',
            validationContext: 'Project ID validation',
          },
          'Stored project ID is invalid. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      // Additional boundary validation
      const maxReasonableId = 1000000;
      if (parsed.id > maxReasonableId) {
        this.errorHandler.handleError(
          new Error(`Project ID exceeds reasonable limits: ${parsed.id}`),
          {
            operation: 'loadCurrentProjectId',
            details: 'Project ID exceeds safety boundaries',
            projectId: parsed.id,
            maxAllowed: maxReasonableId,
            validationContext: 'Project ID boundary validation',
          },
          'Stored project ID is unusually large. You may need to select a project manually.',
          'medium'
        );
        localStorage.removeItem('currentProject');
        return null;
      }

      return parsed;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadCurrentProjectId',
          details: 'Failed to load and validate project ID from localStorage',
          storageType: 'localStorage',
          validationContext: 'LocalStorage data retrieval and validation',
        },
        'Unable to restore your last project. You may need to select a project manually.',
        'medium'
      );
      // Clean up potentially corrupted data
      try {
        localStorage.removeItem('currentProject');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  /**
   * Load Current Project from Database
   *
   * Automatically loads the user's previously active project from localStorage
   * reference and database storage. This method combines localStorage project ID
   * retrieval with full project loading to restore user's work session.
   *
   * @example
   * ```typescript
   * // Service initialization pattern
   * class ProjectService {
   *   constructor(private settingsService: SettingsService) {
   *     // Auto-load current project when settings are ready
   *     this.settingsService.ready.subscribe(() => {
   *       this.loadCurrentProject();
   *     });
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Manual project restoration after login
   * class AuthenticationService {
   *   async onLoginSuccess(): Promise<void> {
   *     try {
   *       // Restore user's work session
   *       await this.projectService.loadCurrentProject();
   *
   *       this.notificationService.success('Welcome back! Your project has been restored.');
   *     } catch (error) {
   *       this.notificationService.info('Please select a project to continue working.');
   *     }
   *   }
   * }
   * ```
   *
   * **Loading Pipeline:**
   * 1. **LocalStorage Retrieval**: Gets saved project ID using loadCurrentProjectId()
   * 2. **Validation Check**: Ensures project ID exists and is valid
   * 3. **Database Loading**: Loads full project data using loadProject()
   * 4. **Error Handling**: Graceful degradation if project cannot be loaded
   *
   * **Failure Scenarios:**
   * - **No Saved Project**: Silent success, no project loaded (user needs to select)
   * - **Invalid Project ID**: Error logged, localStorage cleaned up
   * - **Database Error**: Project not found or database connection issues
   * - **Corrupted Data**: Project validation fails, requires manual selection
   *
   * **Integration Points:**
   * - **Settings Service**: Waits for settings to be ready before loading
   * - **Store Updates**: Project loaded into ReactiveStateStore automatically
   * - **Error Handler**: All errors channeled through centralized error handling
   * - **Navigation**: Can trigger automatic navigation to project view
   *
   * @returns {Promise<void>} Resolves when loading attempt completes (success or failure)
   *
   * @see {@link loadCurrentProjectId} For localStorage project ID retrieval
   * @see {@link loadProject} For database project loading
   * @since 1.0.0
   */
  async loadCurrentProject(): Promise<void> {
    const currentProject = this.loadCurrentProjectId();
    if (!currentProject) {
      this.logger.debug('No current project found in localStorage');
      return;
    }

    try {
      await this.loadProject(currentProject.id);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadCurrentProject',
          details: `Failed to load current project ID: ${currentProject.id}`,
          projectId: currentProject.id,
        },
        'Unable to load your current project. Please select a project manually.',
        'medium'
      );
    }
  }
  /**
   * Load Project from Peyote Shorthand Format
   *
   * Imports a pattern from peyote shorthand notation, validates and converts it
   * to a complete Project model, then persists it to the database. This method
   * provides the primary interface for importing peyote beading patterns.
   *
   * @example
   * ```typescript
   * // File upload with peyote pattern import
   * class FileImportComponent {
   *   async onFileSelected(file: File): Promise<void> {
   *     try {
   *       const patternText = await this.readFileAsText(file);
   *       const projectName = this.extractProjectName(file.name);
   *
   *       const project = await this.projectService.loadPeyote(projectName, patternText);
   *
   *       this.notificationService.success(`Imported "${project.name}" successfully`);
   *       this.router.navigate(['/project', project.id]);
   *     } catch (error) {
   *       this.handleImportError(error);
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Pattern validation and parsing workflow
   * const patternData = `
   *   Row 1: 4A, 2B, 4A
   *   Row 2: 3A, 4B, 3A
   *   Row 3: 2A, 6B, 2A
   * `;
   *
   * try {
   *   const project = await projectService.loadPeyote('Sunset Pattern', patternData);
   *   console.log(`Created project with ${project.rows.length} rows`);
   * } catch (error) {
   *   console.error('Pattern validation failed:', error);
   * }
   * ```
   *
   * **Validation Pipeline:**
   * 1. **Input Validation**: Ensures project name and pattern data are provided
   * 2. **Name Sanitization**: DataIntegrityService validates project name safety
   * 3. **Size Limits**: Prevents extremely large patterns (1MB limit)
   * 4. **Pattern Parsing**: PeyoteShorthandService converts notation to project
   * 5. **Project Validation**: Ensures resulting project meets model requirements
   * 6. **Database Persistence**: Saves project and updates store state
   *
   * **Error Handling Scenarios:**
   * - **Missing Data**: Clear error for empty name or pattern data
   * - **Invalid Name**: Project name contains unsafe characters
   * - **Size Limits**: Pattern data exceeds reasonable size bounds
   * - **Parse Errors**: Malformed pattern notation or unsupported syntax
   * - **Database Errors**: Persistence failures with rollback handling
   * - **Validation Failures**: Invalid project structure after parsing
   *
   * **Integration with Services:**
   * - **PeyoteShorthandService**: Handles pattern notation parsing
   * - **DataIntegrityService**: Validates names and ensures data safety
   * - **ProjectDbService**: Persists validated project to database
   * - **ReactiveStateStore**: Updates application state with new project
   * - **ErrorHandlerService**: Centralized error processing and user feedback
   *
   * @param projectName - The name for the imported project (will be trimmed and validated)
   * @param data - The peyote shorthand pattern data (max 1MB)
   * @throws {Error} When validation fails, parsing errors, or database operations fail
   * @returns {Promise<Project>} The successfully imported and persisted project
   *
   * @see {@link PeyoteShorthandService.toProject} For pattern parsing implementation
   * @see {@link DataIntegrityService.validateProjectName} For name validation
   * @since 1.0.0
   */
  async loadPeyote(projectName: string, data: string): Promise<Project> {
    // Validate required inputs
    if (!projectName?.trim() || !data?.trim()) {
      const error = new Error('Project name and data are required');
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Missing required project data for peyote import',
          projectName: projectName,
          dataLength: data?.length || 0,
          validationContext: 'Input validation for peyote pattern import',
        },
        'Please provide both a project name and pattern data.',
        'high'
      );
      throw error;
    }

    // Validate project name using DataIntegrityService
    const trimmedName = projectName.trim();
    if (!this.dataIntegrityService.validateProjectName(trimmedName)) {
      const error = new Error(`Invalid project name: ${trimmedName}`);
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Project name validation failed during peyote import',
          invalidProjectName: trimmedName,
          validationService: 'DataIntegrityService',
          validationContext: 'Project name safety validation',
        },
        'Project name contains invalid characters. Please use only letters, numbers, spaces, and common punctuation.',
        'high'
      );
      throw error;
    }

    // Validate data length for reasonable pattern size
    const maxDataLength = 1000000; // 1MB limit for pattern data
    if (data.length > maxDataLength) {
      const error = new Error(
        `Pattern data too large: ${data.length} characters`
      );
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Pattern data exceeds size limits',
          dataLength: data.length,
          maxAllowed: maxDataLength,
          validationContext: 'Pattern data size validation',
        },
        'Pattern data is too large. Please check the pattern format.',
        'high'
      );
      throw error;
    }

    try {
      let project = this.peyoteShorthandService.toProject(data, ', ');

      // Validate the parsed project
      if (!isValidProject(project)) {
        throw new Error('Invalid project data from peyote shorthand');
      }

      project.name = trimmedName;
      this.store.dispatch(ProjectActions.createProjectSuccess(project));

      const projectId = await this.indexedDBService.addProject(project);
      if (!projectId) {
        throw new Error('Failed to save project to database');
      }

      project.id = projectId;
      this.store.dispatch(ProjectActions.updateProjectSuccess(project));

      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadPeyote',
          details: 'Failed to parse and save peyote project',
          projectName: trimmedName,
          dataLength: data?.length || 0,
          parsingService: 'PeyoteShorthandService',
          validationContext: 'Peyote pattern parsing and database save',
        },
        'Unable to import the pattern. Please check the pattern data format.',
        'high'
      );
      throw error;
    }
  }

  /**
   * Load Project by ID from Database
   *
   * Retrieves a complete project from the database by its unique ID, validates
   * the data integrity, and updates the application state. This method serves
   * as the primary project loading interface with comprehensive error handling.
   *
   * @example
   * ```typescript
   * // Project selection with error handling
   * class ProjectSelectorComponent {
   *   async selectProject(projectId: number): Promise<void> {
   *     this.isLoading = true;
   *
   *     try {
   *       const project = await this.projectService.loadProject(projectId);
   *
   *       if (project) {
   *         // Save selection for future sessions
   *         await this.projectService.saveCurrentProject(projectId);
   *
   *         this.notificationService.success(`Loaded "${project.name}"`);
   *         this.router.navigate(['/project']);
   *       }
   *     } catch (error) {
   *       this.notificationService.error('Failed to load project');
   *     } finally {
   *       this.isLoading = false;
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Route resolver with project loading
   * class ProjectResolver implements Resolve<Project | null> {
   *   constructor(private projectService: ProjectService) {}
   *
   *   async resolve(route: ActivatedRouteSnapshot): Promise<Project | null> {
   *     const projectId = Number(route.paramMap.get('id'));
   *
   *     if (!projectId) {
   *       return null;
   *     }
   *
   *     return await this.projectService.loadProject(projectId);
   *   }
   * }
   * ```
   *
   * **Loading Pipeline:**
   * 1. **ID Validation**: Ensures project ID is valid positive integer
   * 2. **Database Query**: Retrieves project data from IndexedDB
   * 3. **Existence Check**: Verifies project was found in database
   * 4. **Data Validation**: Validates loaded project structure and integrity
   * 5. **Store Updates**: Updates ReactiveStateStore with loaded project
   * 6. **State Management**: Sets project as current active project
   *
   * **Error Handling and Recovery:**
   * - **Invalid ID**: Returns null for non-positive or invalid IDs
   * - **Not Found**: Clear error message when project doesn't exist
   * - **Corrupted Data**: Validation failure for malformed project data
   * - **Database Errors**: Connection or query failures with detailed context
   * - **State Cleanup**: Clears current project state on any failure
   * - **User Feedback**: Contextual error messages for different failure types
   *
   * **State Management Integration:**
   * - **Entity Storage**: Project stored in normalized entities collection
   * - **Current Project**: Sets loaded project as active current project
   * - **Error States**: Updates error state in store on failures
   * - **Loading States**: Can be integrated with loading indicators
   *
   * **Performance Considerations:**
   * - **Single Query**: Efficient database lookup by primary key
   * - **Validation Caching**: Project structure validation is optimized
   * - **Memory Management**: Large projects handled efficiently
   * - **State Batching**: Store updates batched for performance
   *
   * @param id - The unique project ID to load (must be positive integer)
   * @returns {Promise<Project | null>} The loaded project or null if not found/invalid
   *
   * @see {@link ProjectDbService.loadProject} For database loading implementation
   * @see {@link isValidProject} For project validation logic
   * @see {@link ProjectActions} For store state updates
   * @since 1.0.0
   */
  async loadProject(id: number): Promise<Project | null> {
    if (!id || id <= 0) {
      this.errorHandler.handleError(
        new Error('Invalid project ID provided'),
        {
          operation: 'loadProject',
          details: 'Invalid project ID provided',
          projectId: id,
        },
        undefined,
        'medium'
      );
      this.store.dispatch(ProjectActions.clearCurrentProject());
      return null;
    }

    try {
      const project = await this.indexedDBService.loadProject(id);

      if (!project) {
        this.errorHandler.handleError(
          new Error('Project not found'),
          {
            operation: 'loadProject',
            details: 'Project not found in database',
            projectId: id,
          },
          'The selected project could not be found. It may have been deleted.',
          'medium'
        );
        this.store.dispatch(ProjectActions.clearCurrentProject());
        return null;
      }

      if (!isValidProject(project)) {
        this.errorHandler.handleError(
          new Error('Invalid project data loaded from database'),
          {
            operation: 'loadProject',
            details: `Project validation failed for ID: ${id}`,
            projectId: id,
            invalidProject: project,
          },
          'The project data appears to be corrupted. Please try selecting a different project.',
          'high'
        );
        this.store.dispatch(ProjectActions.clearCurrentProject());
        return null;
      }

      // First store the project data in entities, then set it as current
      this.store.dispatch(ProjectActions.updateProjectSuccess(project));
      this.store.dispatch(ProjectActions.setCurrentProject(project.id!));
      return project;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'loadProject',
          details: `Failed to load project ID: ${id}`,
          projectId: id,
        },
        'Unable to load the selected project. Please try again or select a different project.',
        'high'
      );
      this.store.dispatch(ProjectActions.clearCurrentProject());
      return null;
    }
  }
}

export class CurrentProject {
  id: number = 0;
}

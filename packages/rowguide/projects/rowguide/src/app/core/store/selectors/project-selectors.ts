/**
 * Project State Selectors - Memoized State Access Patterns
 *
 * Provides memoized selectors for accessing project-related state
 * with optimal performance and type safety. All selectors are automatically
 * memoized through the ReactiveStateStore implementation.
 *
 * @fileoverview
 * This module provides comprehensive selectors for project state management
 * including entity access, current project selection, position tracking,
 * and derived state computations. All selectors follow memoization patterns
 * for optimal performance.
 *
 * @example
 * ```typescript
 * // Basic selector usage
 * import { ProjectSelectors } from './project-selectors';
 *
 * // Select current project
 * const currentProject$ = store.select(ProjectSelectors.selectCurrentProject);
 *
 * // Select with ID parameter
 * const project$ = store.select(ProjectSelectors.selectProjectById(123));
 *
 * // Complex state selection
 * const projectData$ = combineLatest([
 *   store.select(ProjectSelectors.selectCurrentProject),
 *   store.select(ProjectSelectors.selectCurrentPosition),
 *   store.select(ProjectSelectors.selectZippedRows)
 * ]);
 * ```
 */

import { AppState } from '../app-state.interface';
import { Project } from '../../models/project';
import { Position } from '../../models/position';
import { Row } from '../../models/row';
import { SafeAccess } from '../../models/model-factory';
import { NullProject } from '../../../features/project-management/models/null-project';

/**
 * Project State Selectors
 *
 * Centralized collection of project state selectors with automatic memoization.
 * Use these selectors with ReactiveStateStore.select() for optimal performance.
 */
export const ProjectSelectors = {
  /**
   * Select Project State Slice
   *
   * Selects the entire project state slice from the application state.
   * Useful for accessing multiple project properties or debugging state.
   *
   * @param {AppState} state - Application state
   * @returns {ProjectState} Complete project state slice
   *
   * @example
   * ```typescript
   * // Access entire project state
   * const projectState$ = store.select(ProjectSelectors.selectProjectState);
   * projectState$.subscribe(state => {
   *   console.log('Loading:', state.loading);
   *   console.log('Error:', state.error);
   *   console.log('Project count:', Object.keys(state.entities).length);
   * });
   * ```
   */
  selectProjectState: (state: AppState) => state.projects,

  /**
   * Select All Projects Array
   *
   * Converts the normalized project entities to an array for list rendering
   * and iteration. Automatically memoized for performance.
   *
   * @param {AppState} state - Application state
   * @returns {Project[]} Array of all projects
   *
   * @example
   * ```typescript
   * // List all projects
   * const allProjects$ = store.select(ProjectSelectors.selectAllProjects);
   * allProjects$.subscribe(projects => {
   *   this.projectList = projects;
   *   this.projectCount = projects.length;
   * });
   *
   * // Use with async pipe in template
   * // <div *ngFor="let project of allProjects$ | async">
   * ```
   */
  selectAllProjects: (state: AppState): Project[] => {
    const projectEntities = state.projects.entities;
    return Object.values(projectEntities);
  },

  /**
   * Select Project Entities Object
   *
   * Provides direct access to the normalized project entities object
   * for O(1) lookups by ID. Use for performance-critical operations.
   *
   * @param {AppState} state - Application state
   * @returns {Record<number, Project>} Project entities keyed by ID
   *
   * @example
   * ```typescript
   * // Direct entity access
   * const entities$ = store.select(ProjectSelectors.selectProjectEntities);
   * entities$.subscribe(entities => {
   *   const project = entities[projectId]; // O(1) lookup
   *   if (project) {
   *     this.processProject(project);
   *   }
   * });
   * ```
   */
  selectProjectEntities: (state: AppState) => state.projects.entities,

  /**
   * Select Current Project ID
   *
   * Returns the ID of the currently selected project. Null when no project
   * is selected. Use for navigation and conditional rendering.
   *
   * @param {AppState} state - Application state
   * @returns {number | null} Current project ID or null
   *
   * @example
   * ```typescript
   * // Track current project selection
   * const currentId$ = store.select(ProjectSelectors.selectCurrentProjectId);
   * currentId$.subscribe(id => {
   *   this.showProjectDetails = id !== null;
   *   this.updateBreadcrumbs(id);
   * });
   * ```
   */
  selectCurrentProjectId: (state: AppState): number | null =>
    state.projects.currentProjectId,

  /**
   * Select Current Project
   *
   * Returns the currently selected project or NullProject if none selected.
   * Always returns a valid Project object for safe property access.
   *
   * @param {AppState} state - Application state
   * @returns {Project} Current project or NullProject
   *
   * @example
   * ```typescript
   * // Safe current project access
   * const current$ = store.select(ProjectSelectors.selectCurrentProject);
   * current$.subscribe(project => {
   *   this.projectName = project.name; // Safe even if null
   *   this.isValidProject = !project.isNull?.();
   * });
   *
   * // Use with template
   * // <div *ngIf="(currentProject$ | async) as project">
   * //   <h2>{{ project.name }}</h2>
   * // </div>
   * ```
   */
  selectCurrentProject: (state: AppState): Project => {
    const projectId = state.projects.currentProjectId;
    if (!projectId) {
      return new NullProject();
    }

    const project = state.projects.entities[projectId];
    return project || new NullProject();
  },

  /**
   * Select Project By ID
   *
   * Returns a selector function that finds a project by its ID.
   * Returns null if the project doesn't exist.
   *
   * @param {number} projectId - ID of the project to select
   * @returns {(state: AppState) => Project | null} Selector function
   *
   * @example
   * ```typescript
   * // Select specific project
   * const project$ = store.select(ProjectSelectors.selectProjectById(123));
   * project$.subscribe(project => {
   *   if (project) {
   *     this.displayProject(project);
   *   } else {
   *     this.showNotFound();
   *   }
   * });
   *
   * // Dynamic project selection
   * const projectId = 456;
   * const dynamicProject$ = store.select(ProjectSelectors.selectProjectById(projectId));
   * ```
   */
  selectProjectById:
    (projectId: number) =>
    (state: AppState): Project | null => {
      return state.projects.entities[projectId] || null;
    },

  /**
   * Select Current Project Rows
   *
   * Returns the rows of the currently selected project using safe access.
   * Always returns an array, empty if no project is selected.
   *
   * @param {AppState} state - Application state
   * @returns {Row[]} Array of project rows
   *
   * @example
   * ```typescript
   * // Access project rows safely
   * const rows$ = store.select(ProjectSelectors.selectCurrentProjectRows);
   * rows$.subscribe(rows => {
   *   this.totalRows = rows.length;
   *   this.setupRowNavigation(rows);
   * });
   *
   * // Use with virtual scrolling
   * // <cdk-virtual-scroll-viewport>
   * //   <div *cdkVirtualFor="let row of rows$ | async">
   * ```
   */
  selectCurrentProjectRows: (state: AppState): Row[] => {
    const currentProject = ProjectSelectors.selectCurrentProject(state);
    return SafeAccess.getProjectRows(currentProject);
  },

  /**
   * Select Zipped Rows
   *
   * Returns rows processed through the zipper service for combined patterns.
   * This selector will be enhanced with actual zipping logic when the
   * zipper service integration is completed.
   *
   * @param {AppState} state - Application state
   * @returns {Row[]} Array of zipped rows
   *
   * @example
   * ```typescript
   * // Access zipped rows for pattern display
   * const zippedRows$ = store.select(ProjectSelectors.selectZippedRows);
   * zippedRows$.subscribe(rows => {
   *   this.renderPattern(rows);
   *   this.calculatePatternMetrics(rows);
   * });
   *
   * // Use with pattern visualization
   * // <app-pattern-grid [rows]="zippedRows$ | async"></app-pattern-grid>
   * ```
   */
  selectZippedRows: (state: AppState): Row[] => {
    const currentProject = ProjectSelectors.selectCurrentProject(state);
    const rows = SafeAccess.getProjectRows(currentProject);

    // For now, return rows as-is. This can be enhanced with actual zipping logic
    // when the zipper service integration is completed
    return rows;
  },

  /**
   * Select Current Position
   *
   * Returns the current position within the active project pattern.
   * Null if no project is selected or position is not set.
   *
   * @param {AppState} state - Application state
   * @returns {Position | null} Current position or null
   *
   * @example
   * ```typescript
   * // Track current position
   * const position$ = store.select(ProjectSelectors.selectCurrentPosition);
   * position$.subscribe(position => {
   *   if (position) {
   *     this.currentRow = position.row;
   *     this.currentStep = position.step;
   *     this.updateNavigationHighlight(position);
   *   }
   * });
   * ```
   */
  selectCurrentPosition: (state: AppState): Position | null => {
    const currentProject = ProjectSelectors.selectCurrentProject(state);
    return currentProject.position || null;
  },

  /**
   * Select Projects Loading State
   *
   * Returns true when projects are being loaded from storage.
   * Use for showing loading indicators and disabling UI.
   *
   * @param {AppState} state - Application state
   * @returns {boolean} Loading state
   *
   * @example
   * ```typescript
   * // Show loading spinner
   * const loading$ = store.select(ProjectSelectors.selectProjectsLoading);
   * loading$.subscribe(loading => {
   *   this.showSpinner = loading;
   *   this.disableActions = loading;
   * });
   * ```
   */
  selectProjectsLoading: (state: AppState): boolean => state.projects.loading,

  /**
   * Select Projects Error
   *
   * Returns the current error message or null if no error.
   * Use for displaying error messages to users.
   *
   * @param {AppState} state - Application state
   * @returns {string | null} Error message or null
   *
   * @example
   * ```typescript
   * // Handle error display
   * const error$ = store.select(ProjectSelectors.selectProjectsError);
   * error$.subscribe(error => {
   *   if (error) {
   *     this.showErrorMessage(error);
   *   } else {
   *     this.hideErrorMessage();
   *   }
   * });
   * ```
   */
  selectProjectsError: (state: AppState): string | null => state.projects.error,

  /**
   * Select Projects Dirty State
   *
   * Returns true when the current project has unsaved changes.
   * Use for showing save indicators and preventing data loss.
   *
   * @param {AppState} state - Application state
   * @returns {boolean} Dirty state
   *
   * @example
   * ```typescript
   * // Show save indicator
   * const isDirty$ = store.select(ProjectSelectors.selectProjectsIsDirty);
   * isDirty$.subscribe(isDirty => {
   *   this.showSaveIndicator = isDirty;
   *   this.confirmBeforeLeaving = isDirty;
   * });
   * ```
   */
  selectProjectsIsDirty: (state: AppState): boolean => state.projects.isDirty,

  /**
   * Select Last Saved Timestamp
   *
   * Returns the timestamp when the project was last saved.
   * Null if never saved or no project is loaded.
   *
   * @param {AppState} state - Application state
   * @returns {Date | null} Last saved timestamp or null
   *
   * @example
   * ```typescript
   * // Show last saved time
   * const lastSaved$ = store.select(ProjectSelectors.selectProjectsLastSaved);
   * lastSaved$.subscribe(timestamp => {
   *   this.lastSavedText = timestamp
   *     ? `Last saved: ${timestamp.toLocaleString()}`
   *     : 'Never saved';
   * });
   * ```
   */
  selectProjectsLastSaved: (state: AppState): Date | null =>
    state.projects.lastSaved,

  /**
   * Select Has Current Project
   *
   * Returns true if a valid project is currently selected and loaded.
   * Use for conditional rendering of project-specific UI.
   *
   * @param {AppState} state - Application state
   * @returns {boolean} Whether a current project exists
   *
   * @example
   * ```typescript
   * // Conditional UI rendering
   * const hasProject$ = store.select(ProjectSelectors.selectHasCurrentProject);
   * hasProject$.subscribe(hasProject => {
   *   this.showProjectUI = hasProject;
   *   this.showWelcomeScreen = !hasProject;
   * });
   * ```
   */
  selectHasCurrentProject: (state: AppState): boolean => {
    const projectId = state.projects.currentProjectId;
    return projectId !== null && !!state.projects.entities[projectId];
  },

  /**
   * Select Projects Ready State
   *
   * Returns true when the project system is ready for use.
   * Projects are ready when they're not loading.
   *
   * @param {AppState} state - Application state
   * @returns {boolean} Ready state
   *
   * @example
   * ```typescript
   * // Wait for system ready
   * const ready$ = store.select(ProjectSelectors.selectProjectsReady);
   * ready$.subscribe(ready => {
   *   if (ready) {
   *     this.initializeProjectFeatures();
   *   }
   * });
   * ```
   */
  selectProjectsReady: (state: AppState): boolean => {
    // Projects are ready when they're not loading and either:
    // 1. We have a current project, or
    // 2. We've finished loading and determined there's no current project
    return !state.projects.loading;
  },

  /**
   * Select Project Count
   *
   * Returns the total number of projects in storage.
   * Use for statistics and empty state detection.
   *
   * @param {AppState} state - Application state
   * @returns {number} Number of projects
   *
   * @example
   * ```typescript
   * // Show project statistics
   * const count$ = store.select(ProjectSelectors.selectProjectCount);
   * count$.subscribe(count => {
   *   this.totalProjects = count;
   *   this.showEmptyState = count === 0;
   * });
   * ```
   */
  selectProjectCount: (state: AppState): number => {
    return Object.keys(state.projects.entities).length;
  },

  /**
   * Select Has Valid Position
   *
   * Returns true if the current project has a valid position set.
   * Use for navigation and position-dependent features.
   *
   * @param {AppState} state - Application state
   * @returns {boolean} Whether position is valid
   *
   * @example
   * ```typescript
   * // Enable navigation controls
   * const hasValidPos$ = store.select(ProjectSelectors.selectHasValidPosition);
   * hasValidPos$.subscribe(hasValid => {
   *   this.enableNavigation = hasValid;
   *   this.showPositionIndicator = hasValid;
   * });
   * ```
   */
  selectHasValidPosition: (state: AppState): boolean => {
    const position = ProjectSelectors.selectCurrentPosition(state);
    return position !== null && position.row >= 0 && position.step >= 0;
  },

  /**
   * Select Current Step Index
   *
   * Returns the current step index within the active row.
   * Returns 0 if no position is set.
   *
   * @param {AppState} state - Application state
   * @returns {number} Current step index
   *
   * @example
   * ```typescript
   * // Track step progress
   * const stepIndex$ = store.select(ProjectSelectors.selectCurrentStepIndex);
   * stepIndex$.subscribe(stepIndex => {
   *   this.currentStepNumber = stepIndex + 1; // 1-based display
   *   this.updateProgressBar(stepIndex);
   * });
   * ```
   */
  selectCurrentStepIndex: (state: AppState): number => {
    const position = ProjectSelectors.selectCurrentPosition(state);
    return position?.step || 0;
  },

  /**
   * Select Current Row Index
   *
   * Returns the current row index within the active project.
   * Returns 0 if no position is set.
   *
   * @param {AppState} state - Application state
   * @returns {number} Current row index
   *
   * @example
   * ```typescript
   * // Track row progress
   * const rowIndex$ = store.select(ProjectSelectors.selectCurrentRowIndex);
   * rowIndex$.subscribe(rowIndex => {
   *   this.currentRowNumber = rowIndex + 1; // 1-based display
   *   this.highlightCurrentRow(rowIndex);
   * });
   * ```
   */
  selectCurrentRowIndex: (state: AppState): number => {
    const position = ProjectSelectors.selectCurrentPosition(state);
    return position?.row || 0;
  },
};

/**
 * Legacy Individual Selector Exports
 *
 * These exports maintain backward compatibility with existing code.
 * New code should use the ProjectSelectors object for better organization.
 *
 * @deprecated Use ProjectSelectors.selectCurrentProject instead
 */
export const selectCurrentProject = ProjectSelectors.selectCurrentProject;

/**
 * @deprecated Use ProjectSelectors.selectProjectById instead
 */
export const selectProjectById = ProjectSelectors.selectProjectById;

/**
 * @deprecated Use ProjectSelectors.selectCurrentProjectRows instead
 */
export const selectCurrentProjectRows = ProjectSelectors.selectCurrentProjectRows;

/**
 * @deprecated Use ProjectSelectors.selectZippedRows instead
 */
export const selectZippedRows = ProjectSelectors.selectZippedRows;

/**
 * @deprecated Use ProjectSelectors.selectCurrentPosition instead
 */
export const selectCurrentPosition = ProjectSelectors.selectCurrentPosition;

/**
 * Memoization Strategies and Performance Characteristics
 *
 * All selectors in this module are automatically memoized by the ReactiveStateStore
 * implementation. This provides several performance benefits:
 *
 * **Automatic Caching**: Selectors cache their results and only recompute when
 * their input state changes. This prevents unnecessary recalculations.
 *
 * **Reference Equality**: Selectors maintain reference equality for unchanged
 * results, preventing unnecessary re-renders in components.
 *
 * **Shared Observables**: Multiple subscriptions to the same selector share
 * the same observable stream, reducing memory usage.
 *
 * @example
 * ```typescript
 * // Memoization in action
 * const project1$ = store.select(ProjectSelectors.selectCurrentProject);
 * const project2$ = store.select(ProjectSelectors.selectCurrentProject);
 * // project1$ and project2$ are the same observable instance
 *
 * // Performance optimization
 * const expensiveSelector = (state: AppState) => {
 *   const project = ProjectSelectors.selectCurrentProject(state);
 *   return computeExpensiveMetrics(project); // Only runs when project changes
 * };
 * ```
 *
 * **Performance Recommendations:**
 *
 * 1. **Use Selectors Instead of Direct State Access**: Always use selectors
 *    rather than accessing state properties directly.
 *
 * 2. **Compose Selectors**: Build complex selectors by composing simpler ones
 *    to leverage memoization at multiple levels.
 *
 * 3. **Avoid Inline Functions**: Don't create selectors inline in components
 *    as this defeats memoization.
 *
 * 4. **Use TrackBy Functions**: When displaying selector results in templates,
 *    use trackBy functions to optimize change detection.
 *
 * @example
 * ```typescript
 * // ✅ Good: Composed selectors with memoization
 * const selectProjectMetrics = (state: AppState) => {
 *   const project = ProjectSelectors.selectCurrentProject(state);
 *   const rows = ProjectSelectors.selectCurrentProjectRows(state);
 *   return {
 *     totalSteps: rows.reduce((sum, row) => sum + row.steps.length, 0),
 *     completedSteps: calculateCompletedSteps(project, rows)
 *   };
 * };
 *
 * // ❌ Bad: Inline selector defeats memoization
 * const component = {
 *   ngOnInit() {
 *     this.data$ = this.store.select(state => state.projects.entities);
 *   }
 * };
 * ```
 */

/**
 * Project Reducer - State Transitions and Immutable Updates
 *
 * Implements pure functions for project state management following Redux patterns.
 * All state updates are immutable and predictable, ensuring consistent application
 * behavior and enabling time-travel debugging.
 *
 * @fileoverview
 * This module provides the core project state reducer with comprehensive action
 * handling for CRUD operations, position tracking, and state management. All
 * state transitions maintain immutability and include proper error handling.
 *
 * @example
 * ```typescript
 * // Basic usage with ReactiveStateStore
 * import { projectReducer } from './project-reducer';
 *
 * // Initialize store with project reducer
 * const store = new ReactiveStateStore(initialState, rootReducer);
 *
 * // State transitions through actions
 * store.dispatch(ProjectActions.loadProjectsStart());
 * store.dispatch(ProjectActions.loadProjectsSuccess(projects));
 * store.dispatch(ProjectActions.setCurrentProject(projectId));
 * ```
 */

import { ProjectState } from '../app-state.interface';
import {
  ProjectAction,
  PROJECT_ACTION_TYPES,
} from '../actions/project-actions';
import { Project } from '../../models/project';

/**
 * Initial Project State
 *
 * Defines the default state for the project slice of the application state.
 * Used for store initialization and state resets.
 *
 * @example
 * ```typescript
 * // State structure
 * const initialState = {
 *   entities: {},              // Normalized project storage
 *   currentProjectId: null,    // Active project ID
 *   loading: false,            // Loading state indicator
 *   error: null,              // Error message
 *   lastSaved: null,          // Last save timestamp
 *   isDirty: false            // Unsaved changes flag
 * };
 * ```
 */
export const initialProjectState: ProjectState = {
  entities: {},
  currentProjectId: null,
  loading: false,
  error: null,
  lastSaved: null,
  isDirty: false,
};

/**
 * Project Reducer Function
 *
 * Pure function that handles all project-related state transitions.
 * Implements immutable updates following Redux patterns with comprehensive
 * action handling and error management.
 *
 * @param {ProjectState} state - Current project state (defaults to initial state)
 * @param {ProjectAction} action - Action object with type and payload
 * @returns {ProjectState} New immutable state after applying action
 *
 * @example
 * ```typescript
 * // Basic reducer usage
 * const newState = projectReducer(currentState, action);
 *
 * // Handling different action types
 * const loadingState = projectReducer(state, ProjectActions.loadProjectsStart());
 * const successState = projectReducer(state, ProjectActions.loadProjectsSuccess(projects));
 * const errorState = projectReducer(state, ProjectActions.loadProjectsFailure(error));
 * ```
 */
export function projectReducer(
  state: ProjectState = initialProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    /**
     * Loading Actions
     *
     * Handle the project loading lifecycle with proper state management.
     */

    /**
     * Load Projects Start
     *
     * Initiates project loading process by setting loading state and clearing errors.
     * Prepares the state for incoming project data.
     */
    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    /**
     * Load Projects Success
     *
     * Completes project loading by storing normalized project entities.
     * Clears loading state and errors while updating the project entities.
     */
    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        entities: createProjectEntities(action.payload.projects),
      };

    /**
     * Load Projects Failure
     *
     * Handles project loading errors by storing error message and clearing entities.
     * Resets loading state and clears any partial data.
     */
    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        entities: {},
      };

    /**
     * Project CRUD Actions
     *
     * Handle create, update, and delete operations with proper lifecycle management.
     */

    /**
     * Create Project Start
     *
     * Initiates project creation by setting loading state and clearing errors.
     * Prepares the state for the new project creation process.
     */
    case PROJECT_ACTION_TYPES.CREATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    /**
     * Create Project Success
     *
     * Completes project creation by adding the new project to entities and
     * setting it as the current project. Clears dirty state and sets save timestamp.
     */
    case PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        entities: {
          ...state.entities,
          [action.payload.project.id!]: action.payload.project,
        },
        currentProjectId: action.payload.project.id!,
        isDirty: false,
        lastSaved: new Date(),
      };

    /**
     * Create Project Failure
     *
     * Handles project creation errors by storing error message and clearing loading state.
     * Maintains existing entities and current project selection.
     */
    case PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
      };

    /**
     * Update Project Start
     *
     * Initiates project update by setting loading state, clearing errors, and
     * marking the project as dirty for unsaved changes indication.
     */
    case PROJECT_ACTION_TYPES.UPDATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
        isDirty: true,
      };

    /**
     * Update Project Success
     *
     * Completes project update by storing the updated project in entities.
     * Clears loading state, dirty flag, and updates the last saved timestamp.
     */
    case PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        entities: {
          ...state.entities,
          [action.payload.project.id!]: action.payload.project,
        },
        isDirty: false,
        lastSaved: new Date(),
      };

    /**
     * Update Project Failure
     *
     * Handles project update errors with rollback capability. Restores the
     * previous project state and stores the error message.
     */
    case PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        // Rollback to previous project state
        entities: {
          ...state.entities,
          [action.payload.project.id!]: action.payload.project,
        },
        isDirty: false,
      };

    /**
     * Current Project Management Actions
     *
     * Handle current project selection and navigation.
     */

    /**
     * Set Current Project
     *
     * Updates the current project selection and clears any existing errors.
     * Used for navigation and project switching.
     */
    case PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT:
      return {
        ...state,
        currentProjectId: action.payload.projectId,
        error: null,
      };

    /**
     * Clear Current Project
     *
     * Clears the current project selection, typically used when navigating
     * away from project views or returning to the project list.
     */
    case PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT:
      return {
        ...state,
        currentProjectId: null,
      };

    /**
     * Position Tracking Actions
     *
     * Handle position updates with optimistic updates and rollback capability.
     */

    /**
     * Update Position Optimistic
     *
     * Performs immediate position update for responsive UI before persistence.
     * Includes null safety checks and sets dirty flag for unsaved changes.
     */
    case PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC:
      if (!state.currentProjectId) {
        return state;
      }

      const currentProject = state.entities[state.currentProjectId];
      if (!currentProject) {
        return state;
      }

      return {
        ...state,
        entities: {
          ...state.entities,
          [state.currentProjectId]: {
            ...currentProject,
            position: action.payload.position,
          },
        },
        isDirty: true,
      };

    /**
     * Update Position Success
     *
     * Confirms successful position persistence by clearing errors,
     * dirty flag, and updating the last saved timestamp.
     */
    case PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS:
      return {
        ...state,
        error: null,
        isDirty: false,
        lastSaved: new Date(),
      };

    /**
     * Update Position Failure
     *
     * Handles position update failures with rollback to previous position.
     * Includes null safety checks and error message storage.
     */
    case PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE:
      if (!state.currentProjectId) {
        return {
          ...state,
          error: action.payload.error,
        };
      }

      const projectToRollback = state.entities[state.currentProjectId];
      if (!projectToRollback) {
        return {
          ...state,
          error: action.payload.error,
        };
      }

      return {
        ...state,
        error: action.payload.error,
        entities: {
          ...state.entities,
          [state.currentProjectId]: {
            ...projectToRollback,
            position: action.payload.previousPosition,
          },
        },
        isDirty: false,
      };

    /**
     * State Management Actions
     *
     * Handle application state flags and metadata updates.
     */

    /**
     * Set Dirty
     *
     * Marks the project as having unsaved changes. Used to trigger
     * save indicators and prevent accidental data loss.
     */
    case PROJECT_ACTION_TYPES.SET_DIRTY:
      return {
        ...state,
        isDirty: true,
      };

    /**
     * Clear Dirty
     *
     * Clears the unsaved changes flag after successful save operations.
     * Used to remove save indicators and allow safe navigation.
     */
    case PROJECT_ACTION_TYPES.CLEAR_DIRTY:
      return {
        ...state,
        isDirty: false,
      };

    /**
     * Set Last Saved
     *
     * Updates the last saved timestamp for user feedback and
     * save status indication.
     */
    case PROJECT_ACTION_TYPES.SET_LAST_SAVED:
      return {
        ...state,
        lastSaved: action.payload.timestamp,
      };

    /**
     * Default Case
     *
     * Returns the current state unchanged for unrecognized actions.
     * Essential for Redux pattern compliance and middleware compatibility.
     */
    default:
      return state;
  }
}

/**
 * Helper Functions
 *
 * Utility functions for project state management and data transformation.
 */

/**
 * Create Project Entities Map
 *
 * Transforms an array of projects into a normalized entities object keyed by ID.
 * Provides O(1) lookup performance and efficient state updates.
 *
 * @param {Project[]} projects - Array of project objects
 * @returns {Record<number, Project>} Normalized entities object
 *
 * @example
 * ```typescript
 * // Transform projects array to entities
 * const projects = [
 *   { id: 1, name: 'Project A', rows: [] },
 *   { id: 2, name: 'Project B', rows: [] }
 * ];
 * const entities = createProjectEntities(projects);
 * // Result: { 1: { id: 1, name: 'Project A', rows: [] }, 2: { ... } }
 *
 * // Safe usage with validation
 * const safeEntities = createProjectEntities(projects.filter(p => p.id));
 * ```
 */
function createProjectEntities(projects: Project[]): { [id: number]: Project } {
  return projects.reduce((entities, project) => {
    if (project.id !== undefined) {
      entities[project.id] = project;
    }
    return entities;
  }, {} as { [id: number]: Project });
}

/**
 * Project Reducer Selector Utilities
 *
 * Helper functions for accessing project state data with type safety and
 * null checks. These selectors are designed for use within the reducer
 * module and provide convenient access patterns.
 *
 * @deprecated Use the main project selectors in selectors/project-selectors.ts
 * These utilities are maintained for internal reducer use only.
 *
 * @example
 * ```typescript
 * // Internal reducer usage
 * const currentProject = ProjectSelectors.getCurrentProject(state);
 * const isLoading = ProjectSelectors.isLoading(state);
 *
 * // For component usage, prefer:
 * import { ProjectSelectors } from '../selectors/project-selectors';
 * const project$ = store.select(ProjectSelectors.selectCurrentProject);
 * ```
 */
export const ProjectSelectors = {
  /**
   * Get All Projects Array
   *
   * Converts the normalized entities object to an array of projects.
   * Useful for iteration and list rendering within reducer logic.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {Project[]} Array of all projects
   *
   * @example
   * ```typescript
   * const projects = ProjectSelectors.getAllProjects(state);
   * const projectCount = projects.length;
   * ```
   */
  getAllProjects: (state: ProjectState): Project[] => {
    return Object.values(state.entities);
  },

  /**
   * Get Project By ID
   *
   * Retrieves a specific project by its ID with safe access.
   * Returns undefined if the project doesn't exist.
   *
   * @param {ProjectState} state - Project state slice
   * @param {number} id - Project ID to retrieve
   * @returns {Project | undefined} Project object or undefined
   *
   * @example
   * ```typescript
   * const project = ProjectSelectors.getProjectById(state, 123);
   * if (project) {
   *   console.log(project.name);
   * }
   * ```
   */
  getProjectById: (state: ProjectState, id: number): Project | undefined => {
    return state.entities[id];
  },

  /**
   * Get Current Project
   *
   * Retrieves the currently selected project with null safety.
   * Returns null if no project is selected or if the selected project doesn't exist.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {Project | null} Current project or null
   *
   * @example
   * ```typescript
   * const currentProject = ProjectSelectors.getCurrentProject(state);
   * if (currentProject) {
   *   console.log('Current project:', currentProject.name);
   * }
   * ```
   */
  getCurrentProject: (state: ProjectState): Project | null => {
    if (!state.currentProjectId) {
      return null;
    }
    return state.entities[state.currentProjectId] || null;
  },

  /**
   * Get Current Project Position
   *
   * Retrieves the position of the currently selected project.
   * Returns null if no project is selected or position is not set.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {any} Position object or null
   *
   * @example
   * ```typescript
   * const position = ProjectSelectors.getCurrentPosition(state);
   * if (position) {
   *   console.log(`Row: ${position.row}, Step: ${position.step}`);
   * }
   * ```
   */
  getCurrentPosition: (state: ProjectState): any => {
    const currentProject = ProjectSelectors.getCurrentProject(state);
    return currentProject?.position || null;
  },

  /**
   * Check Loading State
   *
   * Returns true if any project operation is currently in progress.
   * Used for showing loading indicators and disabling UI.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {boolean} Loading state
   *
   * @example
   * ```typescript
   * const isLoading = ProjectSelectors.isLoading(state);
   * if (isLoading) {
   *   showSpinner();
   * }
   * ```
   */
  isLoading: (state: ProjectState): boolean => {
    return state.loading;
  },

  /**
   * Get Error Message
   *
   * Retrieves the current error message or null if no error exists.
   * Used for error display and user feedback.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {string | null} Error message or null
   *
   * @example
   * ```typescript
   * const error = ProjectSelectors.getError(state);
   * if (error) {
   *   showErrorMessage(error);
   * }
   * ```
   */
  getError: (state: ProjectState): string | null => {
    return state.error;
  },

  /**
   * Check Dirty State
   *
   * Returns true if the current project has unsaved changes.
   * Used for save indicators and preventing data loss.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {boolean} Dirty state
   *
   * @example
   * ```typescript
   * const isDirty = ProjectSelectors.isDirty(state);
   * if (isDirty) {
   *   showSaveIndicator();
   * }
   * ```
   */
  isDirty: (state: ProjectState): boolean => {
    return state.isDirty;
  },

  /**
   * Get Last Saved Timestamp
   *
   * Retrieves the timestamp when the project was last saved.
   * Returns null if never saved or no save timestamp exists.
   *
   * @param {ProjectState} state - Project state slice
   * @returns {Date | null} Last saved timestamp or null
   *
   * @example
   * ```typescript
   * const lastSaved = ProjectSelectors.getLastSaved(state);
   * if (lastSaved) {
   *   console.log(`Last saved: ${lastSaved.toLocaleString()}`);
   * }
   * ```
   */
  getLastSaved: (state: ProjectState): Date | null => {
    return state.lastSaved;
  },
};

/**
 * Immutable Update Patterns and Error State Management
 *
 * This reducer follows strict immutability patterns for predictable state updates:
 *
 * **Immutable Updates**:
 * - All state updates use object spread syntax `{ ...state }`
 * - Nested updates use spread for each level: `{ ...state.entities, [id]: { ...entity } }`
 * - Array operations create new arrays rather than mutating existing ones
 *
 * **Error State Management**:
 * - Errors are stored in the `error` field and cleared on successful operations
 * - Failed operations maintain previous valid state while storing error information
 * - Rollback patterns restore previous state when operations fail
 *
 * **Optimistic Updates**:
 * - Position updates are applied immediately for responsive UI
 * - Failures trigger rollback to previous valid state
 * - Dirty flag indicates unsaved changes requiring persistence
 *
 * @example
 * ```typescript
 * // ✅ Correct: Immutable update pattern
 * return {
 *   ...state,
 *   entities: {
 *     ...state.entities,
 *     [projectId]: {
 *       ...existingProject,
 *       name: newName
 *     }
 *   }
 * };
 *
 * // ❌ Incorrect: Mutating state
 * state.entities[projectId].name = newName;
 * return state;
 * ```
 */

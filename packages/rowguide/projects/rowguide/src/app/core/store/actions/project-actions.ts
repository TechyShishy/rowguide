/**
 * Project-related Redux-style actions for state management.
 *
 * Follows Action Creator pattern with type-safe action objects
 * and helper functions for creating actions consistently.
 *
 * @fileoverview
 * This module provides comprehensive action creators for project management
 * operations including CRUD operations, position tracking, and state management.
 * All actions follow the Redux pattern with consistent type definitions and
 * payload structures.
 *
 * @example
 * ```typescript
 * // Basic project management
 * import { ProjectActions } from './project-actions';
 *
 * // Load projects
 * store.dispatch(ProjectActions.loadProjectsStart());
 *
 * // Create new project
 * const newProject = ModelFactory.createProject({ name: 'My Pattern' });
 * store.dispatch(ProjectActions.createProjectStart(newProject));
 *
 * // Update position with optimistic updates
 * const position = { row: 5, step: 3 };
 * store.dispatch(ProjectActions.updatePositionOptimistic(position));
 * ```
 */

import { Project } from '../../models/project';
import { Position } from '../../models/position';

/**
 * Action Type Constants
 *
 * Centralized action type definitions following Redux naming conventions.
 * Uses consistent pattern: [Domain] Action Name (Present Tense)
 *
 * @example
 * ```typescript
 * // Usage in reducers
 * switch (action.type) {
 *   case PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS:
 *     return { ...state, projects: action.payload.projects };
 *   default:
 *     return state;
 * }
 * ```
 */
export const PROJECT_ACTION_TYPES = {
  // Loading actions
  LOAD_PROJECTS_START: '[Projects] Load Projects Start',
  LOAD_PROJECTS_SUCCESS: '[Projects] Load Projects Success',
  LOAD_PROJECTS_FAILURE: '[Projects] Load Projects Failure',

  // Project CRUD actions
  CREATE_PROJECT_START: '[Projects] Create Project Start',
  CREATE_PROJECT_SUCCESS: '[Projects] Create Project Success',
  CREATE_PROJECT_FAILURE: '[Projects] Create Project Failure',

  UPDATE_PROJECT_START: '[Projects] Update Project Start',
  UPDATE_PROJECT_SUCCESS: '[Projects] Update Project Success',
  UPDATE_PROJECT_FAILURE: '[Projects] Update Project Failure',

  DELETE_PROJECT_START: '[Projects] Delete Project Start',
  DELETE_PROJECT_SUCCESS: '[Projects] Delete Project Success',
  DELETE_PROJECT_FAILURE: '[Projects] Delete Project Failure',

  // Current project actions
  SET_CURRENT_PROJECT: '[Projects] Set Current Project',
  CLEAR_CURRENT_PROJECT: '[Projects] Clear Current Project',

  // Position tracking actions
  UPDATE_POSITION: '[Projects] Update Position',
  UPDATE_POSITION_OPTIMISTIC: '[Projects] Update Position Optimistic',
  UPDATE_POSITION_SUCCESS: '[Projects] Update Position Success',
  UPDATE_POSITION_FAILURE: '[Projects] Update Position Failure',

  // State management
  SET_DIRTY: '[Projects] Set Dirty',
  CLEAR_DIRTY: '[Projects] Clear Dirty',
  SET_LAST_SAVED: '[Projects] Set Last Saved',
} as const;

/**
 * Loading Action Interfaces
 *
 * Actions for managing project loading lifecycle with proper error handling.
 */

/**
 * Load Projects Start Action
 *
 * Dispatched when project loading begins. Typically triggers loading state
 * in UI components and initializes the loading process.
 *
 * @interface LoadProjectsStartAction
 * @example
 * ```typescript
 * // Dispatch from service
 * store.dispatch(ProjectActions.loadProjectsStart());
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.LOAD_PROJECTS_START:
 *   return { ...state, loading: true, error: null };
 * ```
 */
export interface LoadProjectsStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_START;
}

/**
 * Load Projects Success Action
 *
 * Dispatched when projects are successfully loaded from storage.
 * Contains the loaded projects array for state update.
 *
 * @interface LoadProjectsSuccessAction
 * @example
 * ```typescript
 * // Dispatch with loaded projects
 * const projects = await loadProjectsFromStorage();
 * store.dispatch(ProjectActions.loadProjectsSuccess(projects));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS:
 *   return {
 *     ...state,
 *     entities: normalizeProjects(action.payload.projects),
 *     loading: false,
 *     error: null
 *   };
 * ```
 */
export interface LoadProjectsSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS;
  readonly payload: {
    readonly projects: Project[];
  };
}

/**
 * Load Projects Failure Action
 *
 * Dispatched when project loading fails. Contains error message for
 * user feedback and debugging.
 *
 * @interface LoadProjectsFailureAction
 * @example
 * ```typescript
 * // Dispatch on error
 * try {
 *   await loadProjectsFromStorage();
 * } catch (error) {
 *   store.dispatch(ProjectActions.loadProjectsFailure(error.message));
 * }
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE:
 *   return { ...state, loading: false, error: action.payload.error };
 * ```
 */
export interface LoadProjectsFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

/**
 * Project CRUD Action Interfaces
 *
 * Actions for creating, updating, and deleting projects with proper
 * lifecycle management and error handling.
 */

/**
 * Create Project Start Action
 *
 * Dispatched when project creation begins. Contains project data without
 * ID as it will be assigned during creation process.
 *
 * @interface CreateProjectStartAction
 * @example
 * ```typescript
 * // Create new project
 * const projectData = { name: 'New Pattern', rows: [] };
 * store.dispatch(ProjectActions.createProjectStart(projectData));
 *
 * // Handle in reducer with optimistic updates
 * case PROJECT_ACTION_TYPES.CREATE_PROJECT_START:
 *   return { ...state, creating: true, error: null };
 * ```
 */
export interface CreateProjectStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_START;
  readonly payload: {
    readonly project: Omit<Project, 'id'>;
  };
}

/**
 * Create Project Success Action
 *
 * Dispatched when project is successfully created and persisted.
 * Contains the complete project with assigned ID.
 *
 * @interface CreateProjectSuccessAction
 * @example
 * ```typescript
 * // Dispatch after successful creation
 * const createdProject = await createProjectInStorage(projectData);
 * store.dispatch(ProjectActions.createProjectSuccess(createdProject));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS:
 *   return {
 *     ...state,
 *     entities: { ...state.entities, [project.id]: project },
 *     creating: false
 *   };
 * ```
 */
export interface CreateProjectSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS;
  readonly payload: {
    readonly project: Project;
  };
}

/**
 * Create Project Failure Action
 *
 * Dispatched when project creation fails. Contains error message for
 * user feedback and debugging.
 *
 * @interface CreateProjectFailureAction
 * @example
 * ```typescript
 * // Dispatch on creation error
 * try {
 *   await createProjectInStorage(projectData);
 * } catch (error) {
 *   store.dispatch(ProjectActions.createProjectFailure(error.message));
 * }
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE:
 *   return { ...state, creating: false, error: action.payload.error };
 * ```
 */
export interface CreateProjectFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

/**
 * Update Project Start Action
 *
 * Dispatched when project update begins. Contains the updated project data
 * for optimistic updates and persistence.
 *
 * @interface UpdateProjectStartAction
 * @example
 * ```typescript
 * // Update existing project
 * const updatedProject = { ...project, name: 'Updated Name' };
 * store.dispatch(ProjectActions.updateProjectStart(updatedProject));
 *
 * // Handle in reducer with optimistic updates
 * case PROJECT_ACTION_TYPES.UPDATE_PROJECT_START:
 *   return {
 *     ...state,
 *     entities: { ...state.entities, [project.id]: project },
 *     updating: true
 *   };
 * ```
 */
export interface UpdateProjectStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_START;
  readonly payload: {
    readonly project: Project;
  };
}

/**
 * Update Project Success Action
 *
 * Dispatched when project update is successfully persisted.
 * Contains the final updated project data.
 *
 * @interface UpdateProjectSuccessAction
 * @example
 * ```typescript
 * // Dispatch after successful update
 * const updatedProject = await updateProjectInStorage(project);
 * store.dispatch(ProjectActions.updateProjectSuccess(updatedProject));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS:
 *   return {
 *     ...state,
 *     entities: { ...state.entities, [project.id]: project },
 *     updating: false,
 *     lastSaved: new Date()
 *   };
 * ```
 */
export interface UpdateProjectSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS;
  readonly payload: {
    readonly project: Project;
  };
}

/**
 * Update Project Failure Action
 *
 * Dispatched when project update fails. Contains error message and
 * original project data for rollback scenarios.
 *
 * @interface UpdateProjectFailureAction
 * @example
 * ```typescript
 * // Dispatch on update error with rollback
 * try {
 *   await updateProjectInStorage(updatedProject);
 * } catch (error) {
 *   store.dispatch(ProjectActions.updateProjectFailure(error.message, originalProject));
 * }
 *
 * // Handle in reducer with rollback
 * case PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE:
 *   return {
 *     ...state,
 *     entities: { ...state.entities, [project.id]: project },
 *     updating: false,
 *     error: action.payload.error
 *   };
 * ```
 */
export interface UpdateProjectFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE;
  readonly payload: {
    readonly error: string;
    readonly project: Project; // For rollback
  };
}

/**
 * Current Project Action Interfaces
 *
 * Actions for managing the currently selected project for navigation
 * and editing operations.
 */

/**
 * Set Current Project Action
 *
 * Dispatched when a project is selected as the current active project.
 * Triggers navigation and UI updates to show the selected project.
 *
 * @interface SetCurrentProjectAction
 * @example
 * ```typescript
 * // Select project by ID
 * store.dispatch(ProjectActions.setCurrentProject(projectId));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT:
 *   return { ...state, currentProjectId: action.payload.projectId };
 * ```
 */
export interface SetCurrentProjectAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT;
  readonly payload: {
    readonly projectId: number;
  };
}

/**
 * Clear Current Project Action
 *
 * Dispatched when no project should be selected. Typically used during
 * navigation or when returning to project list view.
 *
 * @interface ClearCurrentProjectAction
 * @example
 * ```typescript
 * // Clear current project selection
 * store.dispatch(ProjectActions.clearCurrentProject());
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT:
 *   return { ...state, currentProjectId: null };
 * ```
 */
export interface ClearCurrentProjectAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT;
}

/**
 * Position Tracking Action Interfaces
 *
 * Actions for managing user position within patterns with optimistic
 * updates and rollback capabilities.
 */

/**
 * Update Position Optimistic Action
 *
 * Dispatched for immediate UI updates before persistence. Allows for
 * responsive user experience during position changes.
 *
 * @interface UpdatePositionOptimisticAction
 * @example
 * ```typescript
 * // Update position immediately for responsive UI
 * const newPosition = { row: 5, step: 3 };
 * store.dispatch(ProjectActions.updatePositionOptimistic(newPosition));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC:
 *   return { ...state, currentPosition: action.payload.position };
 * ```
 */
export interface UpdatePositionOptimisticAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC;
  readonly payload: {
    readonly position: Position;
  };
}

/**
 * Update Position Success Action
 *
 * Dispatched when position update is successfully persisted.
 * Confirms the optimistic update was successful.
 *
 * @interface UpdatePositionSuccessAction
 * @example
 * ```typescript
 * // Dispatch after successful position save
 * const savedPosition = await savePositionToStorage(position);
 * store.dispatch(ProjectActions.updatePositionSuccess(savedPosition));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS:
 *   return { ...state, lastSaved: new Date(), error: null };
 * ```
 */
export interface UpdatePositionSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS;
  readonly payload: {
    readonly position: Position;
  };
}

/**
 * Update Position Failure Action
 *
 * Dispatched when position update fails. Contains error message and
 * previous position for rollback.
 *
 * @interface UpdatePositionFailureAction
 * @example
 * ```typescript
 * // Dispatch on position save error with rollback
 * try {
 *   await savePositionToStorage(newPosition);
 * } catch (error) {
 *   store.dispatch(ProjectActions.updatePositionFailure(error.message, previousPosition));
 * }
 *
 * // Handle in reducer with rollback
 * case PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE:
 *   return {
 *     ...state,
 *     currentPosition: action.payload.previousPosition,
 *     error: action.payload.error
 *   };
 * ```
 */
export interface UpdatePositionFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE;
  readonly payload: {
    readonly error: string;
    readonly previousPosition: Position; // For rollback
  };
}

/**
 * State Management Action Interfaces
 *
 * Actions for managing application state flags and metadata.
 */

/**
 * Set Dirty Action
 *
 * Dispatched when project has unsaved changes. Triggers save indicators
 * and prevents accidental data loss.
 *
 * @interface SetDirtyAction
 * @example
 * ```typescript
 * // Mark project as dirty after changes
 * store.dispatch(ProjectActions.setDirty());
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.SET_DIRTY:
 *   return { ...state, isDirty: true };
 * ```
 */
export interface SetDirtyAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_DIRTY;
}

/**
 * Clear Dirty Action
 *
 * Dispatched when project changes are saved. Clears save indicators
 * and allows safe navigation.
 *
 * @interface ClearDirtyAction
 * @example
 * ```typescript
 * // Clear dirty flag after successful save
 * store.dispatch(ProjectActions.clearDirty());
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.CLEAR_DIRTY:
 *   return { ...state, isDirty: false };
 * ```
 */
export interface ClearDirtyAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CLEAR_DIRTY;
}

/**
 * Set Last Saved Action
 *
 * Dispatched when project is successfully saved. Updates last saved
 * timestamp for user feedback.
 *
 * @interface SetLastSavedAction
 * @example
 * ```typescript
 * // Set last saved timestamp
 * store.dispatch(ProjectActions.setLastSaved(new Date()));
 *
 * // Handle in reducer
 * case PROJECT_ACTION_TYPES.SET_LAST_SAVED:
 *   return { ...state, lastSaved: action.payload.timestamp };
 * ```
 */
export interface SetLastSavedAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_LAST_SAVED;
  readonly payload: {
    readonly timestamp: Date;
  };
}

/**
 * Project Action Union Type
 *
 * Discriminated union of all project-related actions for type-safe
 * reducer implementation and middleware integration.
 *
 * @example
 * ```typescript
 * // Usage in reducer
 * const projectReducer = (state: ProjectState, action: ProjectAction): ProjectState => {
 *   switch (action.type) {
 *     case PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS:
 *       return { ...state, entities: normalizeProjects(action.payload.projects) };
 *     case PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT:
 *       return { ...state, currentProjectId: action.payload.projectId };
 *     default:
 *       return state;
 *   }
 * };
 *
 * // Usage in middleware
 * const projectMiddleware: Middleware = store => next => (action: ProjectAction) => {
 *   if (action.type.startsWith('[Projects]')) {
 *     console.log('Project action:', action);
 *   }
 *   return next(action);
 * };
 * ```
 */
export type ProjectAction =
  | LoadProjectsStartAction
  | LoadProjectsSuccessAction
  | LoadProjectsFailureAction
  | CreateProjectStartAction
  | CreateProjectSuccessAction
  | CreateProjectFailureAction
  | UpdateProjectStartAction
  | UpdateProjectSuccessAction
  | UpdateProjectFailureAction
  | SetCurrentProjectAction
  | ClearCurrentProjectAction
  | UpdatePositionOptimisticAction
  | UpdatePositionSuccessAction
  | UpdatePositionFailureAction
  | SetDirtyAction
  | ClearDirtyAction
  | SetLastSavedAction;

/**
 * Project Action Creators
 *
 * Centralized action creator functions for type-safe action creation
 * and consistent payload structure. All action creators follow the
 * pattern of returning properly typed action objects.
 *
 * @example
 * ```typescript
 * // Basic usage
 * import { ProjectActions } from './project-actions';
 *
 * // Loading projects
 * store.dispatch(ProjectActions.loadProjectsStart());
 *
 * // Project management
 * const newProject = { name: 'My Pattern', rows: [] };
 * store.dispatch(ProjectActions.createProjectStart(newProject));
 *
 * // Position tracking with optimistic updates
 * const position = { row: 5, step: 3 };
 * store.dispatch(ProjectActions.updatePositionOptimistic(position));
 *
 * // Error handling
 * try {
 *   await saveProject(project);
 *   store.dispatch(ProjectActions.updateProjectSuccess(project));
 * } catch (error) {
 *   store.dispatch(ProjectActions.updateProjectFailure(error.message, originalProject));
 * }
 * ```
 */
export const ProjectActions = {
  /**
   * Loading Action Creators
   *
   * Manage project loading lifecycle with proper error handling.
   */

  /**
   * Load Projects Start
   *
   * Creates action to initiate project loading process.
   *
   * @returns {LoadProjectsStartAction} Action to start project loading
   */
  loadProjectsStart: (): LoadProjectsStartAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_START,
  }),

  /**
   * Load Projects Success
   *
   * Creates action for successful project loading with project data.
   *
   * @param {Project[]} projects - Array of loaded projects
   * @returns {LoadProjectsSuccessAction} Action with loaded projects
   */
  loadProjectsSuccess: (projects: Project[]): LoadProjectsSuccessAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS,
    payload: { projects },
  }),

  /**
   * Load Projects Failure
   *
   * Creates action for failed project loading with error message.
   *
   * @param {string} error - Error message describing the failure
   * @returns {LoadProjectsFailureAction} Action with error details
   */
  loadProjectsFailure: (error: string): LoadProjectsFailureAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE,
    payload: { error },
  }),

  /**
   * Project CRUD Action Creators
   *
   * Manage project creation, updates, and deletions with lifecycle support.
   */

  /**
   * Create Project Start
   *
   * Creates action to initiate project creation process.
   *
   * @param {Omit<Project, 'id'>} project - Project data without ID
   * @returns {CreateProjectStartAction} Action to start project creation
   */
  createProjectStart: (
    project: Omit<Project, 'id'>
  ): CreateProjectStartAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_START,
    payload: { project },
  }),

  /**
   * Create Project Success
   *
   * Creates action for successful project creation with complete project data.
   *
   * @param {Project} project - Complete project with assigned ID
   * @returns {CreateProjectSuccessAction} Action with created project
   */
  createProjectSuccess: (project: Project): CreateProjectSuccessAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS,
    payload: { project },
  }),

  /**
   * Create Project Failure
   *
   * Creates action for failed project creation with error message.
   *
   * @param {string} error - Error message describing the failure
   * @returns {CreateProjectFailureAction} Action with error details
   */
  createProjectFailure: (error: string): CreateProjectFailureAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE,
    payload: { error },
  }),

  /**
   * Update Project Start
   *
   * Creates action to initiate project update process.
   *
   * @param {Project} project - Updated project data
   * @returns {UpdateProjectStartAction} Action to start project update
   */
  updateProjectStart: (project: Project): UpdateProjectStartAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_START,
    payload: { project },
  }),

  /**
   * Update Project Success
   *
   * Creates action for successful project update with final project data.
   *
   * @param {Project} project - Successfully updated project
   * @returns {UpdateProjectSuccessAction} Action with updated project
   */
  updateProjectSuccess: (project: Project): UpdateProjectSuccessAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS,
    payload: { project },
  }),

  /**
   * Update Project Failure
   *
   * Creates action for failed project update with error and rollback data.
   *
   * @param {string} error - Error message describing the failure
   * @param {Project} project - Original project data for rollback
   * @returns {UpdateProjectFailureAction} Action with error and rollback data
   */
  updateProjectFailure: (
    error: string,
    project: Project
  ): UpdateProjectFailureAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE,
    payload: { error, project },
  }),

  /**
   * Current Project Action Creators
   *
   * Manage currently selected project for navigation and editing.
   */

  /**
   * Set Current Project
   *
   * Creates action to set the currently active project.
   *
   * @param {number} projectId - ID of project to set as current
   * @returns {SetCurrentProjectAction} Action to set current project
   */
  setCurrentProject: (projectId: number): SetCurrentProjectAction => ({
    type: PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT,
    payload: { projectId },
  }),

  /**
   * Clear Current Project
   *
   * Creates action to clear the currently active project.
   *
   * @returns {ClearCurrentProjectAction} Action to clear current project
   */
  clearCurrentProject: (): ClearCurrentProjectAction => ({
    type: PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT,
  }),

  /**
   * Position Action Creators
   *
   * Manage user position within patterns with optimistic updates.
   */

  /**
   * Update Position Optimistic
   *
   * Creates action for immediate position update before persistence.
   *
   * @param {Position} position - New position to update to
   * @returns {UpdatePositionOptimisticAction} Action for optimistic position update
   */
  updatePositionOptimistic: (
    position: Position
  ): UpdatePositionOptimisticAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC,
    payload: { position },
  }),

  /**
   * Update Position Success
   *
   * Creates action for successful position update persistence.
   *
   * @param {Position} position - Successfully saved position
   * @returns {UpdatePositionSuccessAction} Action with saved position
   */
  updatePositionSuccess: (position: Position): UpdatePositionSuccessAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS,
    payload: { position },
  }),

  /**
   * Update Position Failure
   *
   * Creates action for failed position update with rollback data.
   *
   * @param {string} error - Error message describing the failure
   * @param {Position} previousPosition - Previous position for rollback
   * @returns {UpdatePositionFailureAction} Action with error and rollback data
   */
  updatePositionFailure: (
    error: string,
    previousPosition: Position
  ): UpdatePositionFailureAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE,
    payload: { error, previousPosition },
  }),

  /**
   * State Management Action Creators
   *
   * Manage application state flags and metadata.
   */

  /**
   * Set Dirty
   *
   * Creates action to mark project as having unsaved changes.
   *
   * @returns {SetDirtyAction} Action to set dirty flag
   */
  setDirty: (): SetDirtyAction => ({
    type: PROJECT_ACTION_TYPES.SET_DIRTY,
  }),

  /**
   * Clear Dirty
   *
   * Creates action to clear unsaved changes flag.
   *
   * @returns {ClearDirtyAction} Action to clear dirty flag
   */
  clearDirty: (): ClearDirtyAction => ({
    type: PROJECT_ACTION_TYPES.CLEAR_DIRTY,
  }),

  /**
   * Set Last Saved
   *
   * Creates action to update last saved timestamp.
   *
   * @param {Date} timestamp - Save timestamp (defaults to current time)
   * @returns {SetLastSavedAction} Action with save timestamp
   */
  setLastSaved: (timestamp: Date = new Date()): SetLastSavedAction => ({
    type: PROJECT_ACTION_TYPES.SET_LAST_SAVED,
    payload: { timestamp },
  }),
};

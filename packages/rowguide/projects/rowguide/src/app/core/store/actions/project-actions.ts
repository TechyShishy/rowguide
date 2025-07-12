/**
 * Project-related Redux-style actions for state management.
 *
 * Follows Action Creator pattern with type-safe action objects
 * and helper functions for creating actions consistently.
 */

import { Project } from '../../models/project';
import { Position } from '../../models/position';

// Action Types
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

// Action interfaces
export interface LoadProjectsStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_START;
}

export interface LoadProjectsSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS;
  readonly payload: {
    readonly projects: Project[];
  };
}

export interface LoadProjectsFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

export interface CreateProjectStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_START;
  readonly payload: {
    readonly project: Omit<Project, 'id'>;
  };
}

export interface CreateProjectSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS;
  readonly payload: {
    readonly project: Project;
  };
}

export interface CreateProjectFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

export interface UpdateProjectStartAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_START;
  readonly payload: {
    readonly project: Project;
  };
}

export interface UpdateProjectSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS;
  readonly payload: {
    readonly project: Project;
  };
}

export interface UpdateProjectFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE;
  readonly payload: {
    readonly error: string;
    readonly project: Project; // For rollback
  };
}

export interface SetCurrentProjectAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT;
  readonly payload: {
    readonly projectId: number;
  };
}

export interface ClearCurrentProjectAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT;
}

export interface UpdatePositionOptimisticAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC;
  readonly payload: {
    readonly position: Position;
  };
}

export interface UpdatePositionSuccessAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS;
  readonly payload: {
    readonly position: Position;
  };
}

export interface UpdatePositionFailureAction {
  readonly type: typeof PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE;
  readonly payload: {
    readonly error: string;
    readonly previousPosition: Position; // For rollback
  };
}

export interface SetDirtyAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_DIRTY;
}

export interface ClearDirtyAction {
  readonly type: typeof PROJECT_ACTION_TYPES.CLEAR_DIRTY;
}

export interface SetLastSavedAction {
  readonly type: typeof PROJECT_ACTION_TYPES.SET_LAST_SAVED;
  readonly payload: {
    readonly timestamp: Date;
  };
}

// Union type for all project actions
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

// Action creators
export const ProjectActions = {
  // Loading actions
  loadProjectsStart: (): LoadProjectsStartAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_START,
  }),

  loadProjectsSuccess: (projects: Project[]): LoadProjectsSuccessAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS,
    payload: { projects },
  }),

  loadProjectsFailure: (error: string): LoadProjectsFailureAction => ({
    type: PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE,
    payload: { error },
  }),

  // Project CRUD actions
  createProjectStart: (
    project: Omit<Project, 'id'>
  ): CreateProjectStartAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_START,
    payload: { project },
  }),

  createProjectSuccess: (project: Project): CreateProjectSuccessAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_SUCCESS,
    payload: { project },
  }),

  createProjectFailure: (error: string): CreateProjectFailureAction => ({
    type: PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE,
    payload: { error },
  }),

  updateProjectStart: (project: Project): UpdateProjectStartAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_START,
    payload: { project },
  }),

  updateProjectSuccess: (project: Project): UpdateProjectSuccessAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_SUCCESS,
    payload: { project },
  }),

  updateProjectFailure: (
    error: string,
    project: Project
  ): UpdateProjectFailureAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_PROJECT_FAILURE,
    payload: { error, project },
  }),

  // Current project actions
  setCurrentProject: (projectId: number): SetCurrentProjectAction => ({
    type: PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT,
    payload: { projectId },
  }),

  clearCurrentProject: (): ClearCurrentProjectAction => ({
    type: PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT,
  }),

  // Position actions
  updatePositionOptimistic: (
    position: Position
  ): UpdatePositionOptimisticAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_OPTIMISTIC,
    payload: { position },
  }),

  updatePositionSuccess: (position: Position): UpdatePositionSuccessAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS,
    payload: { position },
  }),

  updatePositionFailure: (
    error: string,
    previousPosition: Position
  ): UpdatePositionFailureAction => ({
    type: PROJECT_ACTION_TYPES.UPDATE_POSITION_FAILURE,
    payload: { error, previousPosition },
  }),

  // State management actions
  setDirty: (): SetDirtyAction => ({
    type: PROJECT_ACTION_TYPES.SET_DIRTY,
  }),

  clearDirty: (): ClearDirtyAction => ({
    type: PROJECT_ACTION_TYPES.CLEAR_DIRTY,
  }),

  setLastSaved: (timestamp: Date = new Date()): SetLastSavedAction => ({
    type: PROJECT_ACTION_TYPES.SET_LAST_SAVED,
    payload: { timestamp },
  }),
};

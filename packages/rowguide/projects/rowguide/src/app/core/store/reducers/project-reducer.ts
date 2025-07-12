/**
 * Project reducer for managing project state changes.
 *
 * Implements pure functions for state transitions following Redux patterns.
 * All state updates are immutable and predictable.
 */

import { ProjectState } from '../app-state.interface';
import {
  ProjectAction,
  PROJECT_ACTION_TYPES,
} from '../actions/project-actions';
import { Project } from '../../models/project';

/**
 * Initial project state
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
 * Project reducer function
 */
export function projectReducer(
  state: ProjectState = initialProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    // Loading actions
    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        entities: createProjectEntities(action.payload.projects),
      };

    case PROJECT_ACTION_TYPES.LOAD_PROJECTS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        entities: {},
      };

    // Create project actions
    case PROJECT_ACTION_TYPES.CREATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

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

    case PROJECT_ACTION_TYPES.CREATE_PROJECT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
      };

    // Update project actions
    case PROJECT_ACTION_TYPES.UPDATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
        isDirty: true,
      };

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

    // Current project actions
    case PROJECT_ACTION_TYPES.SET_CURRENT_PROJECT:
      return {
        ...state,
        currentProjectId: action.payload.projectId,
        error: null,
      };

    case PROJECT_ACTION_TYPES.CLEAR_CURRENT_PROJECT:
      return {
        ...state,
        currentProjectId: null,
      };

    // Position actions (optimistic updates)
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

    case PROJECT_ACTION_TYPES.UPDATE_POSITION_SUCCESS:
      return {
        ...state,
        error: null,
        isDirty: false,
        lastSaved: new Date(),
      };

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

    // State management actions
    case PROJECT_ACTION_TYPES.SET_DIRTY:
      return {
        ...state,
        isDirty: true,
      };

    case PROJECT_ACTION_TYPES.CLEAR_DIRTY:
      return {
        ...state,
        isDirty: false,
      };

    case PROJECT_ACTION_TYPES.SET_LAST_SAVED:
      return {
        ...state,
        lastSaved: action.payload.timestamp,
      };

    default:
      return state;
  }
}

/**
 * Helper function to create project entities map from array
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
 * Selector helper functions for accessing project state
 */
export const ProjectSelectors = {
  /**
   * Get all projects as array
   */
  getAllProjects: (state: ProjectState): Project[] => {
    return Object.values(state.entities);
  },

  /**
   * Get project by ID
   */
  getProjectById: (state: ProjectState, id: number): Project | undefined => {
    return state.entities[id];
  },

  /**
   * Get current project
   */
  getCurrentProject: (state: ProjectState): Project | null => {
    if (!state.currentProjectId) {
      return null;
    }
    return state.entities[state.currentProjectId] || null;
  },

  /**
   * Get current project position
   */
  getCurrentPosition: (state: ProjectState): any => {
    const currentProject = ProjectSelectors.getCurrentProject(state);
    return currentProject?.position || null;
  },

  /**
   * Check if any project is loading
   */
  isLoading: (state: ProjectState): boolean => {
    return state.loading;
  },

  /**
   * Get error message
   */
  getError: (state: ProjectState): string | null => {
    return state.error;
  },

  /**
   * Check if current project has unsaved changes
   */
  isDirty: (state: ProjectState): boolean => {
    return state.isDirty;
  },

  /**
   * Get last saved timestamp
   */
  getLastSaved: (state: ProjectState): Date | null => {
    return state.lastSaved;
  },
};

/**
 * Project state selectors for ReactiveStateStore.
 *
 * Provides memoized selectors for accessing project-related state
 * with optimal performance and type safety.
 */

import { AppState } from '../app-state.interface';
import { Project } from '../../models/project';
import { Position } from '../../models/position';
import { Row } from '../../models/row';
import { SafeAccess } from '../../models/model-factory';
import { NullProject } from '../../../features/project-management/models/null-project';

/**
 * Select project state slice
 */
export const selectProjectState = (state: AppState) => state.projects;

/**
 * Select all projects as array
 */
export const selectAllProjects = (state: AppState): Project[] => {
  const projectEntities = state.projects.entities;
  return Object.values(projectEntities);
};

/**
 * Select projects entities object
 */
export const selectProjectEntities = (state: AppState) => 
  state.projects.entities;

/**
 * Select current project ID
 */
export const selectCurrentProjectId = (state: AppState): number | null =>
  state.projects.currentProjectId;

/**
 * Select current project
 */
export const selectCurrentProject = (state: AppState): Project => {
  const projectId = state.projects.currentProjectId;
  if (!projectId) {
    return new NullProject();
  }
  
  const project = state.projects.entities[projectId];
  return project || new NullProject();
};

/**
 * Select project by ID
 */
export const selectProjectById = (projectId: number) => (state: AppState): Project | null => {
  return state.projects.entities[projectId] || null;
};

/**
 * Select current project rows
 */
export const selectCurrentProjectRows = (state: AppState): Row[] => {
  const currentProject = selectCurrentProject(state);
  return SafeAccess.getProjectRows(currentProject);
};

/**
 * Select zipped rows (combination of rows for pattern tracking)
 */
export const selectZippedRows = (state: AppState): Row[] => {
  const currentProject = selectCurrentProject(state);
  const rows = SafeAccess.getProjectRows(currentProject);
  
  // For now, return rows as-is. This can be enhanced with actual zipping logic
  // when the zipper service integration is completed
  return rows;
};

/**
 * Select current position
 */
export const selectCurrentPosition = (state: AppState): Position | null => {
  const currentProject = selectCurrentProject(state);
  return currentProject.position || null;
};

/**
 * Select projects loading state
 */
export const selectProjectsLoading = (state: AppState): boolean =>
  state.projects.loading;

/**
 * Select projects error
 */
export const selectProjectsError = (state: AppState): string | null =>
  state.projects.error;

/**
 * Select projects dirty state
 */
export const selectProjectsIsDirty = (state: AppState): boolean =>
  state.projects.isDirty;

/**
 * Select last saved timestamp
 */
export const selectProjectsLastSaved = (state: AppState): Date | null =>
  state.projects.lastSaved;

/**
 * Select if any project is loaded
 */
export const selectHasCurrentProject = (state: AppState): boolean => {
  const projectId = state.projects.currentProjectId;
  return projectId !== null && !!state.projects.entities[projectId];
};

/**
 * Select ready state (equivalent to ProjectService.ready)
 */
export const selectProjectsReady = (state: AppState): boolean => {
  // Projects are ready when they're not loading and either:
  // 1. We have a current project, or
  // 2. We've finished loading and determined there's no current project
  return !state.projects.loading;
};

/**
 * Select project count
 */
export const selectProjectCount = (state: AppState): number => {
  return Object.keys(state.projects.entities).length;
};

/**
 * Select if current project has valid position
 */
export const selectHasValidPosition = (state: AppState): boolean => {
  const position = selectCurrentPosition(state);
  return position !== null && position.row >= 0 && position.step >= 0;
};

/**
 * Select current step index
 */
export const selectCurrentStepIndex = (state: AppState): number => {
  const position = selectCurrentPosition(state);
  return position?.step || 0;
};

/**
 * Select current row index
 */
export const selectCurrentRowIndex = (state: AppState): number => {
  const position = selectCurrentPosition(state);
  return position?.row || 0;
};

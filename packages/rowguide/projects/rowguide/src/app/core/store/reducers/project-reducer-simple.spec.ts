/**
 * Test suite for project reducer - simplified version
 */

import { ProjectState } from '../app-state.interface';
import {
  projectReducer,
  initialProjectState,
  ProjectSelectors,
} from './project-reducer';
import { ProjectActions } from '../actions/project-actions';
import { Project } from '../../models/project';
import { Position } from '../../models/position';

describe('ProjectReducer', () => {
  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    rows: [],
    position: { row: 0, step: 0 } as Position,
  };

  describe('load projects actions', () => {
    it('should handle LOAD_PROJECTS_START', () => {
      const action = ProjectActions.loadProjectsStart();
      const newState = projectReducer(initialProjectState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBe(null);
    });

    it('should handle LOAD_PROJECTS_SUCCESS', () => {
      const projects = [
        mockProject,
        { ...mockProject, id: 2, name: 'Project 2' },
      ];
      const action = ProjectActions.loadProjectsSuccess(projects);
      const newState = projectReducer(initialProjectState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe(null);
      expect(Object.keys(newState.entities).length).toBe(2);
      expect(newState.entities[1]).toEqual(projects[0]);
      expect(newState.entities[2]).toEqual(projects[1]);
    });

    it('should handle LOAD_PROJECTS_FAILURE', () => {
      const errorMessage = 'Failed to load projects';
      const action = ProjectActions.loadProjectsFailure(errorMessage);
      const newState = projectReducer(initialProjectState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe(errorMessage);
      expect(newState.entities).toEqual({});
    });
  });

  describe('current project actions', () => {
    it('should handle SET_CURRENT_PROJECT', () => {
      const action = ProjectActions.setCurrentProject(1);
      const newState = projectReducer(initialProjectState, action);

      expect(newState.currentProjectId).toBe(1);
      expect(newState.error).toBe(null);
    });

    it('should handle CLEAR_CURRENT_PROJECT', () => {
      const stateWithCurrentProject: ProjectState = {
        ...initialProjectState,
        currentProjectId: 1,
      };
      const action = ProjectActions.clearCurrentProject();
      const newState = projectReducer(stateWithCurrentProject, action);

      expect(newState.currentProjectId).toBe(null);
    });
  });

  describe('state management actions', () => {
    it('should handle SET_DIRTY', () => {
      const action = ProjectActions.setDirty();
      const newState = projectReducer(initialProjectState, action);

      expect(newState.isDirty).toBe(true);
    });

    it('should handle CLEAR_DIRTY', () => {
      const dirtyState: ProjectState = {
        ...initialProjectState,
        isDirty: true,
      };
      const action = ProjectActions.clearDirty();
      const newState = projectReducer(dirtyState, action);

      expect(newState.isDirty).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not mutate original state', () => {
      const originalState = { ...initialProjectState };
      const action = ProjectActions.setDirty();

      projectReducer(initialProjectState, action);

      expect(initialProjectState).toEqual(originalState);
    });
  });
});

describe('ProjectSelectors', () => {
  const mockProjects: Project[] = [
    {
      id: 1,
      name: 'Project 1',
      rows: [],
      position: { row: 0, step: 0 } as Position,
    },
    {
      id: 2,
      name: 'Project 2',
      rows: [],
      position: { row: 1, step: 1 } as Position,
    },
  ];

  const testState: ProjectState = {
    entities: {
      1: mockProjects[0],
      2: mockProjects[1],
    },
    currentProjectId: 1,
    loading: false,
    error: null,
    lastSaved: new Date(),
    isDirty: false,
  };

  describe('getAllProjects', () => {
    it('should return all projects as array', () => {
      const projects = ProjectSelectors.getAllProjects(testState);

      expect(projects.length).toBe(2);
      expect(projects).toContain(mockProjects[0]);
      expect(projects).toContain(mockProjects[1]);
    });

    it('should return empty array when no projects', () => {
      const emptyState: ProjectState = { ...testState, entities: {} };
      const projects = ProjectSelectors.getAllProjects(emptyState);

      expect(projects).toEqual([]);
    });
  });

  describe('getProjectById', () => {
    it('should return project by ID', () => {
      const project = ProjectSelectors.getProjectById(testState, 1);

      expect(project).toEqual(mockProjects[0]);
    });

    it('should return undefined for non-existent ID', () => {
      const project = ProjectSelectors.getProjectById(testState, 999);

      expect(project).toBeUndefined();
    });
  });

  describe('getCurrentProject', () => {
    it('should return current project', () => {
      const project = ProjectSelectors.getCurrentProject(testState);

      expect(project).toEqual(mockProjects[0]);
    });

    it('should return null when no current project ID', () => {
      const stateWithoutCurrent: ProjectState = {
        ...testState,
        currentProjectId: null,
      };
      const project = ProjectSelectors.getCurrentProject(stateWithoutCurrent);

      expect(project).toBe(null);
    });
  });

  describe('state flags', () => {
    it('should return loading state', () => {
      const loadingState: ProjectState = { ...testState, loading: true };
      expect(ProjectSelectors.isLoading(loadingState)).toBe(true);
      expect(ProjectSelectors.isLoading(testState)).toBe(false);
    });

    it('should return error state', () => {
      const errorState: ProjectState = { ...testState, error: 'Test error' };
      expect(ProjectSelectors.getError(errorState)).toBe('Test error');
      expect(ProjectSelectors.getError(testState)).toBe(null);
    });

    it('should return dirty state', () => {
      const dirtyState: ProjectState = { ...testState, isDirty: true };
      expect(ProjectSelectors.isDirty(dirtyState)).toBe(true);
      expect(ProjectSelectors.isDirty(testState)).toBe(false);
    });
  });
});

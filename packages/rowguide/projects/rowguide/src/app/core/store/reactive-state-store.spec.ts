/**
 * Comprehensive test suite for ReactiveStateStore
 */

import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { firstValueFrom } from 'rxjs';

import {
  ReactiveStateStore,
  StateAction,
  Middleware,
} from './reactive-state-store';
import { AppState, createInitialState } from './app-state.interface';
import { ProjectActions } from './actions/project-actions';
import { Project } from '../models/project';
import { Position } from '../models/position';

describe('ReactiveStateStore', () => {
  let store: ReactiveStateStore;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;

  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    rows: [],
    position: { row: 0, step: 0 } as Position,
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('NGXLogger', [
      'debug',
      'info',
      'warn',
      'error',
    ]);

    TestBed.configureTestingModule({
      providers: [ReactiveStateStore, { provide: NGXLogger, useValue: spy }],
    });

    store = TestBed.inject(ReactiveStateStore);
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
  });

  afterEach(() => {
    store.reset();
  });

  describe('initialization', () => {
    it('should create store with initial state', () => {
      const state = store.getState();
      const expectedInitialState = createInitialState();

      // Compare all properties except the timestamp which varies
      expect(state.projects).toEqual(expectedInitialState.projects);
      expect(state.ui).toEqual(expectedInitialState.ui);
      expect(state.system.isOnline).toEqual(
        expectedInitialState.system.isOnline
      );
      expect(state.system.storageQuota).toEqual(
        expectedInitialState.system.storageQuota
      );
      expect(state.system.featureFlags).toEqual(
        expectedInitialState.system.featureFlags
      );

      // Check performance metrics structure without exact timestamp comparison
      expect(state.system.performanceMetrics.renderTime).toBe(0);
      expect(state.system.performanceMetrics.memoryUsage).toBe(0);
      expect(state.system.performanceMetrics.errorCount).toBe(0);
      expect(state.system.performanceMetrics.lastUpdate).toBeInstanceOf(Date);

      expect(loggerSpy.info).toHaveBeenCalledWith(
        'ReactiveStateStore initialized'
      );
    });

    it('should provide observable state stream', async () => {
      const state$ = store.getState$();
      const state = await firstValueFrom(state$);
      const expectedInitialState = createInitialState();

      expect(state.projects).toEqual(expectedInitialState.projects);
      expect(state.ui).toEqual(expectedInitialState.ui);
      expect(state.system.isOnline).toEqual(
        expectedInitialState.system.isOnline
      );
      expect(state.system.featureFlags).toEqual(
        expectedInitialState.system.featureFlags
      );
    });
  });

  describe('action dispatching', () => {
    it('should dispatch and process project actions', () => {
      const action = ProjectActions.loadProjectsStart();

      store.dispatch(action);

      const state = store.getState();
      expect(state.projects.loading).toBe(true);
      expect(state.projects.error).toBe(null);
    });

    it('should log dispatched actions', () => {
      const action = ProjectActions.loadProjectsStart();

      store.dispatch(action);

      expect(loggerSpy.debug).toHaveBeenCalledWith(
        jasmine.stringContaining('[ACTION]'),
        jasmine.objectContaining({
          action,
        })
      );
    });

    it('should handle action errors gracefully', () => {
      const invalidAction = { type: 'INVALID_ACTION' } as StateAction;

      expect(() => store.dispatch(invalidAction)).not.toThrow();
    });

    it('should maintain state immutability', () => {
      const initialState = store.getState();
      const action = ProjectActions.setDirty();

      store.dispatch(action);

      const newState = store.getState();
      expect(newState).not.toBe(initialState);
      expect(newState.projects.isDirty).toBe(true);
      expect(initialState.projects.isDirty).toBe(false);
    });
  });

  describe('state selection', () => {
    it('should select project loading state', async () => {
      const isLoading$ = store.select((state) => state.projects.loading);

      // Initial state
      let isLoading = await firstValueFrom(isLoading$);
      expect(isLoading).toBe(false);

      // After loading action
      store.dispatch(ProjectActions.loadProjectsStart());
      isLoading = await firstValueFrom(isLoading$);
      expect(isLoading).toBe(true);
    });

    it('should memoize selectors for performance', async () => {
      const selector = (state: AppState) => state.projects.loading;
      const selector1$ = store.select(selector);
      const selector2$ = store.select(selector);

      expect(selector1$).toBe(selector2$); // Same observable instance
    });

    it('should only emit when selected value changes', async () => {
      const currentProjectId$ = store.select(
        (state) => state.projects.currentProjectId
      );
      const emissions: (number | null)[] = [];

      const subscription = currentProjectId$.subscribe((id) =>
        emissions.push(id)
      );

      // Initial emission
      expect(emissions).toEqual([null]);

      // Set project ID
      store.dispatch(ProjectActions.setCurrentProject(1));
      expect(emissions).toEqual([null, 1]);

      // Set same project ID (should not emit)
      store.dispatch(ProjectActions.setCurrentProject(1));
      expect(emissions).toEqual([null, 1]);

      // Set different project ID
      store.dispatch(ProjectActions.setCurrentProject(2));
      expect(emissions).toEqual([null, 1, 2]);

      subscription.unsubscribe();
    });
  });

  describe('middleware system', () => {
    it('should apply middleware to actions', () => {
      const middleware: Middleware = jasmine
        .createSpy('middleware')
        .and.returnValue({
          type: 'MODIFIED_ACTION',
        });

      store.addMiddleware(middleware);
      const action = ProjectActions.loadProjectsStart();
      store.dispatch(action);

      expect(middleware).toHaveBeenCalledWith(action, jasmine.any(Function));
    });

    it('should cancel actions when middleware returns null', () => {
      const cancellingMiddleware: Middleware = jasmine
        .createSpy('middleware')
        .and.returnValue(null);

      store.addMiddleware(cancellingMiddleware);
      const initialState = store.getState();

      store.dispatch(ProjectActions.loadProjectsStart());

      expect(store.getState()).toEqual(initialState);
      expect(loggerSpy.debug).toHaveBeenCalledWith(
        'Action cancelled by middleware:',
        jasmine.any(Object)
      );
    });

    it('should handle middleware errors gracefully', () => {
      const errorMiddleware: Middleware = () => {
        throw new Error('Middleware error');
      };

      store.addMiddleware(errorMiddleware);

      expect(() =>
        store.dispatch(ProjectActions.loadProjectsStart())
      ).toThrow();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Error dispatching action:',
        jasmine.any(Error),
        jasmine.any(Object)
      );
    });
  });

  describe('state listeners', () => {
    it('should notify listeners of state changes', () => {
      const listener = jasmine.createSpy('listener');
      const unsubscribe = store.addListener(listener);

      store.dispatch(ProjectActions.loadProjectsStart());

      expect(listener).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.objectContaining({
          type: ProjectActions.loadProjectsStart().type,
        })
      );

      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jasmine
        .createSpy('listener')
        .and.throwError('Listener error');
      store.addListener(errorListener);

      expect(() =>
        store.dispatch(ProjectActions.loadProjectsStart())
      ).not.toThrow();
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Error in state change listener:',
        jasmine.any(Error)
      );
    });

    it('should allow unsubscribing listeners', () => {
      const listener = jasmine.createSpy('listener');
      const unsubscribe = store.addListener(listener);

      // First action - should be called
      store.dispatch(ProjectActions.loadProjectsStart());
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Second action - should not be called
      store.dispatch(ProjectActions.clearDirty());
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('time-travel debugging', () => {
    it('should maintain state history', () => {
      store.dispatch(ProjectActions.loadProjectsStart());
      store.dispatch(ProjectActions.setDirty());
      store.dispatch(ProjectActions.clearDirty());

      const history = store.getStateHistory();
      expect(history.length).toBe(3);
      expect(history[0].action.type).toBe(ProjectActions.clearDirty().type);
      expect(history[1].action.type).toBe(ProjectActions.setDirty().type);
      expect(history[2].action.type).toBe(
        ProjectActions.loadProjectsStart().type
      );
    });

    it('should limit history size to prevent memory issues', () => {
      // Dispatch more than max history size (50) actions
      for (let i = 0; i < 60; i++) {
        store.dispatch(ProjectActions.setDirty());
        store.dispatch(ProjectActions.clearDirty());
      }

      const history = store.getStateHistory();
      expect(history.length).toBe(50);
    });

    it('should restore state from history', () => {
      const initialState = store.getState();

      store.dispatch(ProjectActions.loadProjectsStart());
      const stateAfterFirstAction = store.getState();

      store.dispatch(ProjectActions.setDirty());
      const stateAfterSecondAction = store.getState();

      expect(stateAfterSecondAction.projects.loading).toBe(true);
      expect(stateAfterSecondAction.projects.isDirty).toBe(true);

      const history = store.getStateHistory();
      expect(history.length).toBe(2);

      // Restore to first action state (index 1 = second item in history)
      store.restoreStateFromHistory(1);

      const restoredState = store.getState();
      expect(restoredState.projects.loading).toBe(true);
      expect(restoredState.projects.isDirty).toBe(false);
    });

    it('should throw error for invalid history index', () => {
      expect(() => store.restoreStateFromHistory(-1)).toThrow();
      expect(() => store.restoreStateFromHistory(100)).toThrow();
    });
  });

  describe('memory management', () => {
    it('should clear selector cache', () => {
      // Create multiple selectors to populate cache
      for (let i = 0; i < 10; i++) {
        store.select((state) => (state.projects.loading ? i : 0));
      }

      store.clearSelectorCache();

      expect(loggerSpy.debug).toHaveBeenCalledWith('Selector cache cleared');
    });

    it('should reset store to initial state', () => {
      store.dispatch(ProjectActions.loadProjectsStart());
      store.dispatch(ProjectActions.setDirty());

      const modifiedState = store.getState();
      expect(modifiedState.projects.loading).toBe(true);
      expect(modifiedState.projects.isDirty).toBe(true);

      store.reset();

      const resetState = store.getState();
      expect(resetState).toEqual(createInitialState());
      expect(store.getStateHistory().length).toBe(0);
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'Store reset to initial state'
      );
    });
  });

  describe('complex project workflows', () => {
    it('should handle complete project creation workflow', async () => {
      const newProject = { name: 'New Project', rows: [] };

      // Start creation
      store.dispatch(ProjectActions.createProjectStart(newProject));

      let state = store.getState();
      expect(state.projects.loading).toBe(true);

      // Complete creation
      store.dispatch(
        ProjectActions.createProjectSuccess({ ...newProject, id: 1 })
      );

      state = store.getState();
      expect(state.projects.loading).toBe(false);
      expect(state.projects.entities[1]).toEqual({ ...newProject, id: 1 });
      expect(state.projects.currentProjectId).toBe(1);
      expect(state.projects.isDirty).toBe(false);
      expect(state.projects.lastSaved).toBeInstanceOf(Date);
    });

    it('should handle optimistic position updates with rollback', () => {
      // Setup project
      store.dispatch(ProjectActions.createProjectSuccess(mockProject));
      store.dispatch(ProjectActions.setCurrentProject(1));

      const newPosition = { row: 5, step: 3 } as Position;
      const originalPosition = { row: 0, step: 0 } as Position;

      // Optimistic update
      store.dispatch(ProjectActions.updatePositionOptimistic(newPosition));

      let state = store.getState();
      expect(state.projects.entities[1]?.position).toEqual(newPosition);
      expect(state.projects.isDirty).toBe(true);

      // Simulate failure and rollback
      store.dispatch(
        ProjectActions.updatePositionFailure('Network error', originalPosition)
      );

      state = store.getState();
      expect(state.projects.entities[1]?.position).toEqual(originalPosition);
      expect(state.projects.error).toBe('Network error');
      expect(state.projects.isDirty).toBe(false);
    });

    it('should handle multiple projects in entities', () => {
      const project1 = { ...mockProject, id: 1, name: 'Project 1' };
      const project2 = { ...mockProject, id: 2, name: 'Project 2' };

      store.dispatch(ProjectActions.loadProjectsSuccess([project1, project2]));

      const state = store.getState();
      expect(Object.keys(state.projects.entities).length).toBe(2);
      expect(state.projects.entities[1]).toEqual(project1);
      expect(state.projects.entities[2]).toEqual(project2);
    });
  });

  describe('action stream monitoring', () => {
    it('should provide observable action stream', async () => {
      const actions$ = store.getActions$();
      const actions: (StateAction | null)[] = [];

      const subscription = actions$.subscribe((action) => actions.push(action));

      store.dispatch(ProjectActions.loadProjectsStart());
      store.dispatch(ProjectActions.setDirty());

      expect(actions.length).toBe(3); // Initial null + 2 actions
      expect(actions[0]).toBe(null);
      expect(actions[1]?.type).toBe(ProjectActions.loadProjectsStart().type);
      expect(actions[2]?.type).toBe(ProjectActions.setDirty().type);

      subscription.unsubscribe();
    });
  });
});

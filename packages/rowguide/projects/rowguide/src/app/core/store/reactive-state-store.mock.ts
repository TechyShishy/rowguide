import { BehaviorSubject, Observable, of } from 'rxjs';
import { AppState, createInitialState } from './app-state.interface';

/**
 * Mock ReactiveStateStore for testing
 */
export class MockReactiveStateStore {
  private state$ = new BehaviorSubject<AppState>(createInitialState());

  select<T>(selector: (state: AppState) => T): Observable<T> {
    return this.state$.pipe(
      selector as any // Simplified for testing
    );
  }

  dispatch(action: any): void {
    // Simple mock implementation - in real tests you'd handle specific actions
    const currentState = this.state$.value;

    switch (action.type) {
      case '[Project] Set Current Project':
        this.state$.next({
          ...currentState,
          projects: {
            ...currentState.projects,
            currentProjectId: action.payload,
          },
        });
        break;
      case '[Project] Update Project Success':
        const project = action.payload;
        this.state$.next({
          ...currentState,
          projects: {
            ...currentState.projects,
            entities: {
              ...currentState.projects.entities,
              [project.id]: project,
            },
          },
        });
        break;
      case '[Project] Set Projects Ready':
        this.state$.next({
          ...currentState,
          ui: {
            ...currentState.ui,
            // Note: 'ready' state moved to UI state for proper separation
            // This mock represents legacy behavior - should be refactored
          },
        });
        break;
      case '[Project] Update Zipped Rows':
        this.state$.next({
          ...currentState,
          ui: {
            ...currentState.ui,
            // Note: 'zippedRows' should be computed from project entities
            // This mock represents legacy behavior - should be refactored
          },
        });
        break;
      case '[Project] Update Position Optimistic':
      case '[Project] Update Position Success':
        const currentProjectId = currentState.projects.currentProjectId;
        if (
          currentProjectId &&
          currentState.projects.entities[currentProjectId]
        ) {
          const currentProject =
            currentState.projects.entities[currentProjectId];
          this.state$.next({
            ...currentState,
            projects: {
              ...currentState.projects,
              entities: {
                ...currentState.projects.entities,
                [currentProjectId]: {
                  ...currentProject,
                  position: action.payload,
                },
              },
            },
          });
        }
        break;
    }
  }

  getState(): AppState {
    return this.state$.value;
  }

  setState(state: AppState): void {
    this.state$.next(state);
  }
}

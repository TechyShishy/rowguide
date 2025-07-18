---
layout: default
title: ReactiveStateStore Usage Examples
permalink: /code-examples/reactive-state-store/
---

# ReactiveStateStore Usage Examples

Comprehensive examples demonstrating how to implement and use the `ReactiveStateStore` for centralized state management in the Rowguide application.

## Store Overview

The `ReactiveStateStore` provides Redux-like state management with TypeScript integration, memoized selectors, and time-travel debugging.

```typescript
interface IStateStore<T> {
  getState(): T;
  select<K>(selector: (state: T) => K): Observable<K>;
  dispatch(action: Action): void;
  getHistory(): StateHistory<T>;
  timeTravel(index: number): void;
}
```

## Basic Store Setup

### 1. State Interface Definition

```typescript
// Define the application state structure
interface AppState {
  projects: ProjectState;
  ui: UiState;
  settings: SettingsState;
  system: SystemState;
}

interface ProjectState {
  entities: { [id: number]: Project };
  loading: boolean;
  error: string | null;
  lastSaved: string | null;
  isDirty: boolean;
}

interface UiState {
  currentPosition: Position;
  darkMode: boolean;
  notifications: UiNotification[];
}
```

### 2. Store Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class ReactiveStateStore implements IStateStore<AppState> {
  private readonly stateSubject = new BehaviorSubject<AppState>(createInitialState());
  private readonly actionHistory: Action[] = [];
  private readonly stateHistory: AppState[] = [];

  constructor(private logger: NGXLogger) {
    // Subscribe to state changes for logging
    this.stateSubject.subscribe(state => {
      this.logger.debug('State updated', {
        timestamp: new Date().toISOString(),
        stateSnapshot: this.getStateSnapshot(state)
      });
    });
  }

  getState(): AppState {
    return this.stateSubject.value;
  }

  select<K>(selector: (state: AppState) => K): Observable<K> {
    return this.stateSubject.pipe(
      map(selector),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  dispatch(action: Action): void {
    const currentState = this.getState();

    // Log action for debugging
    this.logger.debug('Action dispatched', {
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toISOString()
    });

    // Store action and state in history
    this.actionHistory.push(action);
    this.stateHistory.push(currentState);

    // Apply reducer
    const newState = this.rootReducer(currentState, action);

    // Update state
    this.stateSubject.next(newState);
  }

  private rootReducer(state: AppState, action: Action): AppState {
    return {
      projects: projectReducer(state.projects, action),
      ui: uiReducer(state.ui, action),
      settings: settingsReducer(state.settings, action),
      system: systemReducer(state.system, action)
    };
  }
}
```

## Action Patterns

### 3. Action Creators

```typescript
// Project actions
export const ProjectActions = {
  loadProject: (payload: { id: number }) => ({
    type: 'LOAD_PROJECT' as const,
    payload
  }),

  loadProjectSuccess: (payload: { project: Project }) => ({
    type: 'LOAD_PROJECT_SUCCESS' as const,
    payload
  }),

  loadProjectFailure: (payload: { error: string }) => ({
    type: 'LOAD_PROJECT_FAILURE' as const,
    payload
  }),

  updateProject: (payload: { id: number; updates: Partial<Project> }) => ({
    type: 'UPDATE_PROJECT' as const,
    payload
  }),

  updateProjectOptimistic: (payload: { id: number; updates: Partial<Project> }) => ({
    type: 'UPDATE_PROJECT_OPTIMISTIC' as const,
    payload
  }),

  updatePosition: (payload: { position: Position }) => ({
    type: 'UPDATE_POSITION' as const,
    payload
  })
};

// Type union for all project actions
export type ProjectAction = ReturnType<typeof ProjectActions[keyof typeof ProjectActions]>;
```

### 4. Reducer Implementation

```typescript
const initialProjectState: ProjectState = {
  entities: {},
  loading: false,
  error: null,
  lastSaved: null,
  isDirty: false
};

export function projectReducer(
  state: ProjectState = initialProjectState,
  action: Action
): ProjectState {
  switch (action.type) {
    case 'LOAD_PROJECT':
      return {
        ...state,
        loading: true,
        error: null
      };

    case 'LOAD_PROJECT_SUCCESS':
      return {
        ...state,
        loading: false,
        entities: {
          ...state.entities,
          [action.payload.project.id]: action.payload.project
        },
        lastSaved: new Date().toISOString(),
        isDirty: false
      };

    case 'LOAD_PROJECT_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload.error
      };

    case 'UPDATE_PROJECT':
      const { id, updates } = action.payload;
      const existingProject = state.entities[id];

      if (!existingProject) {
        return state;
      }

      return {
        ...state,
        entities: {
          ...state.entities,
          [id]: { ...existingProject, ...updates }
        },
        isDirty: true
      };

    case 'UPDATE_PROJECT_OPTIMISTIC':
      // Optimistic update - immediately update UI
      return {
        ...state,
        entities: {
          ...state.entities,
          [action.payload.id]: {
            ...state.entities[action.payload.id],
            ...action.payload.updates
          }
        },
        isDirty: true
      };

    default:
      return state;
  }
}
```

## Selector Patterns

### 5. Memoized Selectors

```typescript
// Basic selectors
export const selectProjectState = (state: AppState) => state.projects;
export const selectUiState = (state: AppState) => state.ui;
export const selectCurrentPosition = (state: AppState) => state.ui.currentPosition;

// Memoized selectors using createSelector pattern
export const selectAllProjects = createSelector(
  selectProjectState,
  (projectState) => Object.values(projectState.entities)
);

export const selectProjectById = (id: number) => createSelector(
  selectProjectState,
  (projectState) => projectState.entities[id] || null
);

export const selectCurrentProject = createSelector(
  selectProjectState,
  selectCurrentPosition,
  (projectState, position) => {
    // Find project that contains the current position
    const projects = Object.values(projectState.entities);
    return projects.find(project =>
      project.position.row === position.row &&
      project.position.step === position.step
    ) || null;
  }
);

export const selectCurrentProjectRows = createSelector(
  selectCurrentProject,
  (project) => project?.rows || []
);

export const selectZippedRows = createSelector(
  selectCurrentProjectRows,
  (rows) => {
    // Combine adjacent rows with same step pattern
    return rows.reduce((zipped, row, index) => {
      if (index === 0) {
        return [row];
      }

      const prevRow = zipped[zipped.length - 1];
      if (this.canZipRows(prevRow, row)) {
        // Merge rows
        const mergedRow = this.zipRows(prevRow, row);
        zipped[zipped.length - 1] = mergedRow;
      } else {
        zipped.push(row);
      }

      return zipped;
    }, [] as Row[]);
  }
);

export const selectProjectMetrics = createSelector(
  selectCurrentProject,
  (project) => {
    if (!project) return null;

    return {
      totalRows: project.rows.length,
      totalSteps: project.rows.reduce((sum, row) => sum + row.steps.length, 0),
      uniqueSteps: new Set(
        project.rows.flatMap(row => row.steps.map(step => step.description))
      ).size,
      completionPercentage: this.calculateCompletionPercentage(project)
    };
  }
);
```

## Service Integration

### 6. Service Layer Integration

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(
    private store: ReactiveStateStore,
    private projectDb: ProjectDbService,
    private errorHandler: ErrorHandlerService
  ) {}

  // Load project with state management
  async loadProject(id: number): Promise<void> {
    this.store.dispatch(ProjectActions.loadProject({ id }));

    try {
      const project = await this.projectDb.getProject(id);

      if (project) {
        this.store.dispatch(ProjectActions.loadProjectSuccess({ project }));
      } else {
        this.store.dispatch(ProjectActions.loadProjectFailure({
          error: `Project ${id} not found`
        }));
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        service: 'ProjectService',
        method: 'loadProject',
        parameters: { id }
      });

      this.store.dispatch(ProjectActions.loadProjectFailure({
        error: (error as Error).message
      }));
    }
  }

  // Update project with optimistic updates
  async updateProject(id: number, updates: Partial<Project>): Promise<void> {
    // Optimistic update
    this.store.dispatch(ProjectActions.updateProjectOptimistic({ id, updates }));

    try {
      // Persist changes
      const currentProject = this.store.select(selectProjectById(id)).pipe(take(1)).toPromise();
      const updatedProject = { ...await currentProject, ...updates };

      await this.projectDb.saveProject(updatedProject);

      // Confirm update
      this.store.dispatch(ProjectActions.updateProject({ id, updates }));
    } catch (error) {
      // Rollback optimistic update
      this.store.dispatch(ProjectActions.loadProject({ id })); // Reload from DB

      this.errorHandler.handleError(error as Error, {
        service: 'ProjectService',
        method: 'updateProject',
        optimisticUpdate: true,
        rollbackPerformed: true
      });
    }
  }

  // Reactive data access
  getCurrentProject$(): Observable<Project | null> {
    return this.store.select(selectCurrentProject);
  }

  getProjectMetrics$(): Observable<ProjectMetrics | null> {
    return this.store.select(selectProjectMetrics);
  }
}
```

## Component Integration

### 7. Component State Management

```typescript
@Component({
  selector: 'app-project-display',
  template: `
    <div *ngIf="project$ | async as project" class="project-container">
      <h2>{{ project.name }}</h2>

      <div class="project-metrics">
        <div *ngIf="metrics$ | async as metrics">
          <span>Rows: {{ metrics.totalRows }}</span>
          <span>Steps: {{ metrics.totalSteps }}</span>
          <span>Progress: {{ metrics.completionPercentage }}%</span>
        </div>
      </div>

      <div class="project-rows">
        <app-row
          *ngFor="let row of (zippedRows$ | async); trackBy: trackByRowId"
          [row]="row"
          [currentPosition]="currentPosition$ | async"
          (positionChange)="onPositionChange($event)"
        ></app-row>
      </div>

      <div *ngIf="loading$ | async" class="loading">
        <mat-spinner></mat-spinner>
        <span>Loading project...</span>
      </div>

      <div *ngIf="error$ | async as error" class="error">
        <mat-error>{{ error }}</mat-error>
        <button mat-button (click)="retryLoad()">Retry</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDisplayComponent implements OnInit, OnDestroy {
  // Observable streams from store
  project$ = this.store.select(selectCurrentProject);
  metrics$ = this.store.select(selectProjectMetrics);
  zippedRows$ = this.store.select(selectZippedRows);
  currentPosition$ = this.store.select(selectCurrentPosition);
  loading$ = this.store.select(state => state.projects.loading);
  error$ = this.store.select(state => state.projects.error);

  private destroy$ = new Subject<void>();

  constructor(
    private store: ReactiveStateStore,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Subscribe to project changes for side effects
    this.project$.pipe(
      takeUntil(this.destroy$),
      filter(project => project !== null)
    ).subscribe(project => {
      this.logger.info('Project loaded', {
        projectId: project?.id,
        rowCount: project?.rows.length
      });
    });

    // Handle errors
    this.error$.pipe(
      takeUntil(this.destroy$),
      filter(error => error !== null)
    ).subscribe(error => {
      this.logger.error('Project error', { error });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPositionChange(position: Position) {
    this.store.dispatch(ProjectActions.updatePosition({ position }));
  }

  retryLoad() {
    // Get current project ID and retry
    this.project$.pipe(take(1)).subscribe(project => {
      if (project) {
        this.projectService.loadProject(project.id);
      }
    });
  }

  trackByRowId(index: number, row: Row): number {
    return row.id;
  }
}
```

### 8. Advanced State Patterns

```typescript
@Injectable({ providedIn: 'root' })
export class AdvancedStateService {
  constructor(private store: ReactiveStateStore) {}

  // Combine multiple selectors
  getProjectSummary$(): Observable<ProjectSummary> {
    return combineLatest([
      this.store.select(selectCurrentProject),
      this.store.select(selectProjectMetrics),
      this.store.select(selectCurrentPosition)
    ]).pipe(
      map(([project, metrics, position]) => ({
        project,
        metrics,
        position,
        isComplete: metrics?.completionPercentage === 100,
        currentStep: this.getCurrentStep(project, position)
      }))
    );
  }

  // Debounced state updates
  createDebouncedUpdater<T>(
    selector: (state: AppState) => T,
    action: (value: T) => Action,
    debounceMs: number = 300
  ): (value: T) => void {
    const subject = new Subject<T>();

    subject.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged()
    ).subscribe(value => {
      this.store.dispatch(action(value));
    });

    return (value: T) => subject.next(value);
  }

  // Batch state updates
  batchUpdates(actions: Action[]): void {
    // Start batch
    this.store.dispatch({ type: 'START_BATCH_UPDATE' });

    // Apply all actions
    actions.forEach(action => this.store.dispatch(action));

    // End batch
    this.store.dispatch({ type: 'END_BATCH_UPDATE' });
  }

  // State snapshots for undo/redo
  createSnapshot(): AppState {
    return JSON.parse(JSON.stringify(this.store.getState()));
  }

  restoreSnapshot(snapshot: AppState): void {
    this.store.dispatch({
      type: 'RESTORE_SNAPSHOT',
      payload: { snapshot }
    });
  }
}
```

## Testing Patterns

### 9. Store Testing

```typescript
describe('ReactiveStateStore', () => {
  let store: ReactiveStateStore;
  let mockState: AppState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReactiveStateStore]
    });

    store = TestBed.inject(ReactiveStateStore);
    mockState = createInitialState();
  });

  it('should dispatch actions and update state', () => {
    // Arrange
    const action = ProjectActions.loadProject({ id: 1 });

    // Act
    store.dispatch(action);

    // Assert
    const newState = store.getState();
    expect(newState.projects.loading).toBe(true);
    expect(newState.projects.error).toBe(null);
  });

  it('should select state correctly', (done) => {
    // Arrange
    const project = createMockProject();

    // Act
    store.dispatch(ProjectActions.loadProjectSuccess({ project }));

    // Assert
    store.select(selectProjectById(project.id)).subscribe(selectedProject => {
      expect(selectedProject).toEqual(project);
      done();
    });
  });

  it('should handle optimistic updates', () => {
    // Arrange
    const project = createMockProject();
    store.dispatch(ProjectActions.loadProjectSuccess({ project }));

    const updates = { name: 'Updated Name' };

    // Act
    store.dispatch(ProjectActions.updateProjectOptimistic({
      id: project.id,
      updates
    }));

    // Assert
    const updatedProject = store.select(selectProjectById(project.id)).pipe(take(1)).toPromise();
    expect(updatedProject.name).toBe('Updated Name');
  });
});
```

### 10. Integration Testing

```typescript
describe('ProjectService State Integration', () => {
  let service: ProjectService;
  let store: ReactiveStateStore;
  let mockProjectDb: jasmine.SpyObj<ProjectDbService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ProjectDbService', ['getProject', 'saveProject']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectDbService, useValue: spy }
      ]
    });

    service = TestBed.inject(ProjectService);
    store = TestBed.inject(ReactiveStateStore);
    mockProjectDb = TestBed.inject(ProjectDbService) as jasmine.SpyObj<ProjectDbService>;
  });

  it('should load project and update state', async () => {
    // Arrange
    const mockProject = createMockProject();
    mockProjectDb.getProject.and.returnValue(Promise.resolve(mockProject));

    // Act
    await service.loadProject(mockProject.id);

    // Assert
    const project = await store.select(selectProjectById(mockProject.id)).pipe(take(1)).toPromise();
    expect(project).toEqual(mockProject);
    expect(store.getState().projects.loading).toBe(false);
  });

  it('should handle optimistic updates with rollback', async () => {
    // Arrange
    const mockProject = createMockProject();
    store.dispatch(ProjectActions.loadProjectSuccess({ project: mockProject }));
    mockProjectDb.saveProject.and.rejectWith(new Error('Save failed'));

    // Act
    const updatePromise = service.updateProject(mockProject.id, { name: 'New Name' });

    // Assert optimistic update
    let currentProject = await store.select(selectProjectById(mockProject.id)).pipe(take(1)).toPromise();
    expect(currentProject.name).toBe('New Name');

    // Wait for rollback
    await expectAsync(updatePromise).toBeRejected();

    // Assert rollback occurred
    currentProject = await store.select(selectProjectById(mockProject.id)).pipe(take(1)).toPromise();
    expect(currentProject.name).toBe(mockProject.name);
  });
});
```

## Performance Optimization

### 11. Performance Best Practices

```typescript
@Injectable({ providedIn: 'root' })
export class PerformanceOptimizedService {
  private selectorCache = new Map<string, Observable<any>>();

  constructor(private store: ReactiveStateStore) {}

  // Cached selectors
  getCachedSelector<T>(key: string, selector: (state: AppState) => T): Observable<T> {
    if (!this.selectorCache.has(key)) {
      const cached$ = this.store.select(selector).pipe(
        shareReplay(1),
        takeUntil(this.getCacheClearTrigger())
      );
      this.selectorCache.set(key, cached$);
    }
    return this.selectorCache.get(key)!;
  }

  // Memoized complex selectors
  @Memoize({ ttl: 5000 })
  getExpensiveProjectAnalysis(project: Project): ProjectAnalysis {
    // Expensive computation
    return this.performComplexAnalysis(project);
  }

  // Throttled state updates
  createThrottledDispatcher(throttleMs: number = 100): (action: Action) => void {
    const actionQueue: Action[] = [];
    let isProcessing = false;

    return (action: Action) => {
      actionQueue.push(action);

      if (!isProcessing) {
        isProcessing = true;
        setTimeout(() => {
          // Process all queued actions
          actionQueue.forEach(queuedAction => this.store.dispatch(queuedAction));
          actionQueue.length = 0;
          isProcessing = false;
        }, throttleMs);
      }
    };
  }
}
```

## Best Practices Summary

### State Management Checklist

- ✅ **Immutable state updates** - Always return new state objects
- ✅ **Memoized selectors** - Use createSelector for performance
- ✅ **Typed actions** - Strong TypeScript typing for actions
- ✅ **Error handling** - Proper error states in reducers
- ✅ **Optimistic updates** - Immediate UI updates with rollback
- ✅ **Performance optimization** - Caching and throttling where appropriate
- ✅ **Testing coverage** - Unit and integration tests for state logic
- ✅ **DevTools integration** - Redux DevTools for debugging

### Integration Patterns

1. **Service Layer**: Coordinate between API calls and state updates
2. **Component Layer**: Subscribe to state changes reactively
3. **Selector Layer**: Provide memoized, computed state values
4. **Reducer Layer**: Handle state transitions immutably

## See Also

- [ErrorHandlerService Examples]({{ site.baseurl }}/code-examples/error-handler-service) - Error handling integration
- [DataIntegrityService Examples]({{ site.baseurl }}/code-examples/data-integrity-service) - Validation with state
- [Component Integration Guide]({{ site.baseurl }}/code-examples/component-integration) - Component patterns

/**
 * Enterprise-grade reactive state store implementing Redux-like patterns with advanced features.
 * Provides centralized state management for the entire Rowguide application with immutable state,
 * time-travel debugging, middleware support, and performance optimizations.
 *
 * Architecture Features:
 * - **Immutable State Management**: All state changes create new state objects
 * - **Time-Travel Debugging**: Store last 50 state snapshots with action history
 * - **Memoized Selectors**: Automatic caching and optimization of state selections
 * - **Middleware Pipeline**: Extensible action processing with cancellation support
 * - **Observable Streams**: Reactive state updates for UI components
 * - **Memory Management**: Automatic cleanup and leak prevention
 * - **Performance Monitoring**: Built-in logging and debugging capabilities
 *
 * State Structure:
 * - **projects**: Project data, current selection, loading states
 * - **settings**: User preferences and configuration
 * - **notifications**: User feedback and message queue
 * - **markMode**: Pattern marking state and history
 * - **ui**: Interface state (positions, zoom, selections)
 * - **system**: Performance metrics and system status
 *
 * Redux Pattern Implementation:
 * - Actions describe what happened
 * - Reducers specify state transitions
 * - Store holds the complete application state tree
 * - Selectors provide optimized state access
 *
 * @example
 * ```typescript
 * // Basic store usage
 * constructor(private store: ReactiveStateStore) {}
 *
 * // Dispatch actions
 * this.store.dispatch(ProjectActions.loadProject(projectId));
 * this.store.dispatch(SettingsActions.updateZoom(true));
 *
 * // Select state slices
 * const currentProject$ = this.store.select(selectCurrentProject);
 * const isLoading$ = this.store.select(state => state.projects.loading);
 *
 * // Subscribe to state changes
 * currentProject$.subscribe(project => {
 *   if (project) {
 *     this.updateUI(project);
 *   }
 * });
 *
 * // Add middleware for logging
 * this.store.addMiddleware((action, getState) => {
 *   console.log('Action:', action.type);
 *   return action; // Continue processing
 * });
 *
 * // Time-travel debugging
 * const history = this.store.getStateHistory();
 * this.store.restoreStateFromHistory(5); // Go back 5 actions
 *
 * // Add state listeners
 * const unsubscribe = this.store.addListener((state, action) => {
 *   this.trackAnalytics(action.type, state);
 * });
 * ```
 */

import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  map,
  shareReplay,
} from 'rxjs';
import { NGXLogger } from 'ngx-logger';

import { AppState, createInitialState } from './app-state.interface';
import { ProjectAction } from './actions/project-actions';
import { projectReducer } from './reducers/project-reducer';
import { SettingsAction } from './actions/settings-actions';
import { settingsReducer } from './reducers/settings-reducer';
import { NotificationAction } from './actions/notification-actions';
import { notificationReducer } from './reducers/notification-reducer';
import { MarkModeAction } from './actions/mark-mode-actions';
import { markModeReducer } from './reducers/mark-mode-reducer';

/**
 * Base interface for all state actions in the Redux-like pattern.
 * All actions must have a type for identification and routing to appropriate reducers.
 */
export interface StateAction {
  /** Unique string identifier for the action type */
  readonly type: string;
  /** Optional payload data for the action */
  readonly payload?: any;
}

/**
 * Function type for state selectors with memoization support.
 * Selectors extract and transform specific portions of the application state.
 *
 * @template T - The type of data returned by the selector
 */
export type Selector<T> = (state: AppState) => T;

/**
 * Middleware function for intercepting and processing actions.
 * Middleware can modify, cancel, or log actions before they reach reducers.
 *
 * @param action - The action being processed
 * @param getState - Function to access current state
 * @returns Modified action to continue processing, or null to cancel
 */
export type Middleware = (
  action: StateAction,
  getState: () => AppState
) => StateAction | null;

/**
 * Listener function for state change notifications.
 * Called after each successful state transition for analytics and side effects.
 *
 * @param state - The new state after the action
 * @param action - The action that caused the state change
 */
export type StateChangeListener = (
  state: AppState,
  action: StateAction
) => void;

/**
 * Reactive state store implementing Redux-like architecture with enterprise features.
 */
@Injectable({ providedIn: 'root' })
export class ReactiveStateStore {
  /**
   * Core state observable holding the complete application state tree.
   * All state changes flow through this single source of truth.
   */
  private readonly state$ = new BehaviorSubject<AppState>(createInitialState());

  /**
   * Action stream for monitoring and debugging dispatched actions.
   * Useful for development tools and analytics integration.
   */
  private readonly actions$ = new BehaviorSubject<StateAction | null>(null);

  /**
   * Registered middleware functions for action processing pipeline.
   * Middleware executes in registration order before reaching reducers.
   */
  private readonly middlewares: Middleware[] = [];

  /**
   * State change listeners for side effects and analytics.
   * Called after each successful state transition.
   */
  private readonly listeners: StateChangeListener[] = [];

  /**
   * Memoized selector cache for performance optimization.
   * Prevents redundant computation of frequently accessed state slices.
   */
  private readonly selectorCache = new Map<string, Observable<any>>();

  /**
   * State history for time-travel debugging and undo functionality.
   * Maintains snapshots of the last 50 state transitions with metadata.
   */
  private readonly stateHistory: {
    state: AppState;
    action: StateAction;
    timestamp: Date;
  }[] = [];

  /** Maximum number of state snapshots to retain in history */
  private readonly maxHistorySize = 50;

  /**
   * Creates an instance of ReactiveStateStore with logging and initialization.
   *
   * @param logger - NGX logger for debugging and monitoring
   */
  constructor(private logger: NGXLogger) {
    this.setupLogging();
    this.initializeStore();
  }

  /**
   * Retrieves the current state snapshot synchronously.
   * Use this for one-time state access. For reactive updates, use getState$() or select().
   *
   * @returns Current complete application state
   *
   * @example
   * ```typescript
   * // Get current state for immediate use
   * const currentState = this.store.getState();
   * const hasProjects = currentState.projects.entities.length > 0;
   *
   * // Access specific state properties
   * const currentProjectId = this.store.getState().projects.currentProjectId;
   * ```
   */
  getState(): AppState {
    return this.state$.value;
  }

  /**
   * Returns the complete state as an observable stream.
   * Subscribe to this for reactive updates to the entire application state.
   * Consider using select() for better performance when accessing specific state slices.
   *
   * @returns Observable stream of complete application state
   *
   * @example
   * ```typescript
   * // Subscribe to all state changes
   * this.store.getState$().subscribe(state => {
   *   console.log('State updated:', state);
   * });
   *
   * // Use with async pipe in templates
   * state$ = this.store.getState$();
   *
   * // Combine with operators
   * this.store.getState$().pipe(
   *   map(state => state.projects.loading),
   *   distinctUntilChanged()
   * ).subscribe(loading => {
   *   this.toggleLoader(loading);
   * });
   * ```
   */
  getState$(): Observable<AppState> {
    return this.state$.asObservable();
  }

  /**
   * Selects a specific portion of state with automatic memoization and caching.
   * Provides optimized access to state slices with built-in distinctUntilChanged
   * and shareReplay for performance. Automatically caches selectors to prevent
   * redundant computations.
   *
   * @template T - The type of data returned by the selector
   * @param selector - Function that extracts data from the state
   * @returns Memoized observable of the selected state slice
   *
   * @example
   * ```typescript
   * // Select current project
   * const currentProject$ = this.store.select(state => state.projects.currentProject);
   *
   * // Select with transformation
   * const projectCount$ = this.store.select(state => state.projects.entities.length);
   *
   * // Select nested data
   * const currentPosition$ = this.store.select(state =>
   *   state.projects.currentProject?.position || { row: 0, step: 0 }
   * );
   *
   * // Use with predefined selectors
   * const currentProject$ = this.store.select(selectCurrentProject);
   *
   * // Combine multiple selections
   * combineLatest([
   *   this.store.select(selectCurrentProject),
   *   this.store.select(selectCurrentPosition)
   * ]).subscribe(([project, position]) => {
   *   this.updateDisplay(project, position);
   * });
   * ```
   */
  select<T>(selector: Selector<T>): Observable<T> {
    const selectorKey = selector.toString();

    if (!this.selectorCache.has(selectorKey)) {
      const selected$ = this.state$.pipe(
        map(selector),
        distinctUntilChanged(),
        shareReplay(1)
      );
      this.selectorCache.set(selectorKey, selected$);
    }

    return this.selectorCache.get(selectorKey)!;
  }

  /**
   * Dispatches an action through the middleware pipeline to update application state.
   * Processes actions through registered middleware, applies state changes via reducers,
   * maintains state history, and notifies listeners. Provides comprehensive error handling
   * and logging for debugging.
   *
   * Action Processing Flow:
   * 1. Validates action structure
   * 2. Applies middleware transformations (can cancel action)
   * 3. Stores current state in history
   * 4. Applies action through root reducer
   * 5. Updates state observable
   * 6. Adds new state to history with metadata
   * 7. Notifies all registered listeners
   * 8. Logs action and state changes
   *
   * @param action - State action to dispatch
   * @throws Error if reducer throws or action is malformed
   *
   * @example
   * ```typescript
   * // Simple action dispatch
   * this.store.dispatch(ProjectActions.loadProject(projectId));
   *
   * // Action with payload
   * this.store.dispatch(SettingsActions.updateSettings({
   *   zoom: true,
   *   combine12: false
   * }));
   *
   * // Optimistic update pattern
   * this.store.dispatch(ProjectActions.saveProjectOptimistic(project));
   * try {
   *   await this.projectService.saveProject(project);
   *   this.store.dispatch(ProjectActions.saveProjectSuccess(project));
   * } catch (error) {
   *   this.store.dispatch(ProjectActions.saveProjectFailure(error));
   * }
   *
   * // Conditional dispatch
   * const currentState = this.store.getState();
   * if (!currentState.projects.loading) {
   *   this.store.dispatch(ProjectActions.loadProjects());
   * }
   * ```
   */
  dispatch(action: StateAction): void {
    try {
      let processedAction = action;

      // Apply middleware
      for (const middleware of this.middlewares) {
        const result = middleware(processedAction, () => this.getState());
        if (result === null) {
          // Middleware cancelled the action
          this.logger.debug('Action cancelled by middleware:', processedAction);
          return;
        }
        processedAction = result;
      }

      // Store current state in history before applying changes
      const previousState = this.getState();

      // Apply reducer
      const newState = this.rootReducer(previousState, processedAction);

      // Update state
      this.state$.next(newState);
      this.actions$.next(processedAction);

      // Add to history after state is updated
      this.addToHistory(newState, processedAction);

      // Notify listeners
      this.notifyListeners(newState, processedAction);

      this.logger.debug('Action dispatched:', processedAction.type, {
        action: processedAction,
        previousState: this.getState(),
        newState,
      });
    } catch (error) {
      this.logger.error('Error dispatching action:', error, { action });
      throw error;
    }
  }

  /**
   * Registers middleware for action processing pipeline.
   * Middleware executes in registration order and can transform, cancel, or log actions.
   * Useful for logging, authentication, validation, or side effects.
   *
   * @param middleware - Function to process actions before they reach reducers
   *
   * @example
   * ```typescript
   * // Logging middleware
   * this.store.addMiddleware((action, getState) => {
   *   console.log(`[${new Date().toISOString()}] ${action.type}`, action.payload);
   *   return action;
   * });
   *
   * // Authentication middleware
   * this.store.addMiddleware((action, getState) => {
   *   if (action.type.startsWith('PROTECTED_') && !this.authService.isAuthenticated()) {
   *     console.warn('Action blocked: not authenticated');
   *     return null; // Cancel action
   *   }
   *   return action;
   * });
   *
   * // Validation middleware
   * this.store.addMiddleware((action, getState) => {
   *   if (action.type === 'SAVE_PROJECT' && !action.payload?.name) {
   *     return {
   *       ...action,
   *       type: 'VALIDATION_ERROR',
   *       payload: { error: 'Project name is required' }
   *     };
   *   }
   *   return action;
   * });
   *
   * // Analytics middleware
   * this.store.addMiddleware((action, getState) => {
   *   this.analytics.track(action.type, action.payload);
   *   return action;
   * });
   * ```
   */
  addMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.logger.debug('Middleware added:', middleware.name || 'Anonymous');
  }

  /**
   * Registers a listener for state changes with automatic unsubscription support.
   * Listeners are notified after state updates and can react to specific changes.
   * Useful for side effects, persistence, analytics, or cross-service communication.
   *
   * @param listener - Function called when state changes occur with new state and action
   * @returns Unsubscribe function to remove the listener and prevent memory leaks
   *
   * @example
   * ```typescript
   * // React to project changes for autosave
   * const unsubscribe = this.store.addListener((state, action) => {
   *   if (action.type === 'UPDATE_PROJECT_POSITION') {
   *     this.autosaveService.scheduleBackup(state.project.current);
   *   }
   * });
   *
   * // Sync settings to localStorage
   * this.store.addListener((state, action) => {
   *   if (action.type.startsWith('SETTINGS_')) {
   *     localStorage.setItem('app-settings', JSON.stringify(state.settings));
   *   }
   * });
   *
   * // Analytics tracking
   * this.store.addListener((state, action) => {
   *   if (action.type.startsWith('USER_')) {
   *     this.analytics.trackUserAction(action.type, action.payload);
   *   }
   * });
   *
   * // Cross-service notifications
   * this.store.addListener((state, action) => {
   *   if (action.type === 'PROJECT_LOADED') {
   *     this.notificationService.info('Project loaded successfully');
   *     this.flamService.generateFLAM(state.project.current);
   *   }
   * });
   *
   * // Component cleanup
   * export class MyComponent implements OnDestroy {
   *   private unsubscribeListener = this.store.addListener((state, action) => {
   *     // Handle state changes...
   *   });
   *
   *   ngOnDestroy() {
   *     this.unsubscribeListener(); // Prevent memory leaks
   *   }
   * }
   * ```
   */
  addListener(listener: StateChangeListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Returns an observable stream of all dispatched actions for debugging and monitoring.
   * Useful for logging, analytics, debugging, or creating reactive side effects based on actions.
   * Actions are emitted after middleware processing but before reducer execution.
   *
   * @returns Observable stream of StateAction objects or null for cancelled actions
   *
   * @example
   * ```typescript
   * // Debug action flow
   * this.store.getActions$().subscribe(action => {
   *   if (action) {
   *     console.log(`[${new Date().toISOString()}] Action: ${action.type}`, action.payload);
   *   } else {
   *     console.log('Action was cancelled by middleware');
   *   }
   * });
   *
   * // Filter specific action types
   * this.store.getActions$()
   *   .pipe(
   *     filter(action => action?.type.startsWith('PROJECT_')),
   *     map(action => action as ProjectAction)
   *   )
   *   .subscribe(projectAction => {
   *     this.handleProjectAction(projectAction);
   *   });
   *
   * // Analytics tracking
   * this.store.getActions$()
   *   .pipe(
   *     filter(action => action?.type.startsWith('USER_')),
   *     debounceTime(1000) // Batch analytics events
   *   )
   *   .subscribe(userAction => {
   *     this.analytics.track(userAction.type, userAction.payload);
   *   });
   *
   * // Create side effects
   * this.store.getActions$()
   *   .pipe(
   *     filter(action => action?.type === 'SAVE_PROJECT_SUCCESS'),
   *     switchMap(() => this.notificationService.success('Project saved!'))
   *   )
   *   .subscribe();
   * ```
   */
  getActions$(): Observable<StateAction | null> {
    return this.actions$.asObservable();
  }

  /**
   * Returns the complete state history for time-travel debugging and analysis.
   * History contains up to 50 state snapshots with associated actions and timestamps.
   * Useful for debugging state mutations, analyzing user behavior, or implementing undo/redo.
   *
   * @returns Array of historical state entries with state, action, and timestamp
   *
   * @example
   * ```typescript
   * // Get complete history
   * const history = this.store.getStateHistory();
   * console.log(`Total actions in history: ${history.length}`);
   *
   * // Find specific action in history
   * const lastProjectAction = history
   *   .reverse()
   *   .find(entry => entry.action.type.startsWith('PROJECT_'));
   *
   * if (lastProjectAction) {
   *   console.log('Last project action:', lastProjectAction.action.type);
   *   console.log('Timestamp:', lastProjectAction.timestamp);
   * }
   *
   * // Analyze action frequency
   * const actionCounts = history.reduce((counts, entry) => {
   *   counts[entry.action.type] = (counts[entry.action.type] || 0) + 1;
   *   return counts;
   * }, {} as Record<string, number>);
   *
   * // Debug time intervals
   * history.forEach((entry, index) => {
   *   if (index > 0) {
   *     const timeDiff = entry.timestamp.getTime() - history[index - 1].timestamp.getTime();
   *     console.log(`${entry.action.type}: ${timeDiff}ms since last action`);
   *   }
   * });
   *
   * // Export for analysis
   * const exportData = history.map(entry => ({
   *   type: entry.action.type,
   *   timestamp: entry.timestamp.toISOString(),
   *   payload: entry.action.payload
   * }));
   * ```
   */
  getStateHistory(): Array<{
    state: AppState;
    action: StateAction;
    timestamp: Date;
  }> {
    return [...this.stateHistory];
  }

  /**
   * Restores application state from a specific point in history for time-travel debugging.
   * Allows reverting to any previously recorded state snapshot without replaying actions.
   * Useful for debugging, testing scenarios, or implementing undo/redo functionality.
   *
   * @param index - Zero-based index in the state history array (0 = oldest, length-1 = most recent)
   * @throws Error if index is out of bounds
   *
   * @example
   * ```typescript
   * // Basic time travel
   * const history = this.store.getStateHistory();
   * console.log(`Available history entries: ${history.length}`);
   *
   * // Go back 3 actions
   * if (history.length >= 4) {
   *   this.store.restoreStateFromHistory(history.length - 4);
   * }
   *
   * // Restore to initial state
   * this.store.restoreStateFromHistory(0);
   *
   * // Implement undo functionality
   * class UndoService {
   *   private currentHistoryIndex = -1;
   *
   *   undo() {
   *     const history = this.store.getStateHistory();
   *     if (this.currentHistoryIndex === -1) {
   *       this.currentHistoryIndex = history.length - 2; // Skip current state
   *     } else if (this.currentHistoryIndex > 0) {
   *       this.currentHistoryIndex--;
   *     }
   *
   *     if (this.currentHistoryIndex >= 0) {
   *       this.store.restoreStateFromHistory(this.currentHistoryIndex);
   *     }
   *   }
   *
   *   redo() {
   *     const history = this.store.getStateHistory();
   *     if (this.currentHistoryIndex < history.length - 1) {
   *       this.currentHistoryIndex++;
   *       this.store.restoreStateFromHistory(this.currentHistoryIndex);
   *     }
   *   }
   * }
   *
   * // Debugging specific scenarios
   * const projectLoadIndex = history.findIndex(
   *   entry => entry.action.type === 'LOAD_PROJECT_SUCCESS'
   * );
   * if (projectLoadIndex !== -1) {
   *   this.store.restoreStateFromHistory(projectLoadIndex);
   *   console.log('Restored to state after project load');
   * }
   * ```
   */
  restoreStateFromHistory(index: number): void {
    if (index < 0 || index >= this.stateHistory.length) {
      throw new Error(`Invalid history index: ${index}`);
    }

    const historicalEntry = this.stateHistory[index];
    this.state$.next(historicalEntry.state);

    this.logger.info('State restored from history:', {
      index,
      action: historicalEntry.action,
      timestamp: historicalEntry.timestamp,
    });
  }

  /**
   * Clears all cached selector results to force recomputation on next access.
   * Useful for testing, debugging memoization issues, or memory optimization.
   * All cached selector results are invalidated and will be recalculated on next invocation.
   *
   * @example
   * ```typescript
   * // During testing to ensure fresh selector calculations
   * beforeEach(() => {
   *   this.store.clearSelectorCache();
   * });
   *
   * // Memory optimization after major state changes
   * this.store.dispatch(ProjectActions.loadProject(newProject));
   * this.store.clearSelectorCache(); // Clear old cached results
   *
   * // Debugging selector memoization
   * console.log('Cache size before:', this.store.selectorCache.size);
   * this.store.clearSelectorCache();
   * console.log('Cache size after:', this.store.selectorCache.size); // Should be 0
   *
   * // Force selector recomputation
   * const selector = (state: AppState) => state.projects.items.length;
   * console.log('First call:', this.store.select(selector).getValue()); // Computes fresh
   * console.log('Second call:', this.store.select(selector).getValue()); // Uses cache
   *
   * this.store.clearSelectorCache();
   * console.log('After clear:', this.store.select(selector).getValue()); // Computes fresh again
   *
   * // Performance testing
   * const startTime = performance.now();
   * this.store.clearSelectorCache();
   * const result = this.store.select(complexSelector).getValue();
   * const computeTime = performance.now() - startTime;
   * console.log(`Fresh computation took ${computeTime}ms`);
   * ```
   */
  clearSelectorCache(): void {
    this.selectorCache.clear();
    this.logger.debug('Selector cache cleared');
  }

  /**
   * Resets the entire store to its initial state, clearing all data and history.
   * This completely restores the application to its startup condition, clearing all projects,
   * settings, notifications, and cached data. Use with caution in production.
   *
   * @example
   * ```typescript
   * // Complete application reset
   * this.store.reset();
   * console.log('Application state reset to initial values');
   *
   * // Testing scenario setup
   * beforeEach(() => {
   *   this.store.reset(); // Ensure clean state for each test
   * });
   *
   * // User logout functionality
   * logout() {
   *   this.store.reset(); // Clear all user data
   *   this.router.navigate(['/login']);
   * }
   *
   * // Error recovery
   * handleCriticalError() {
   *   console.error('Critical error detected, resetting application state');
   *   this.store.reset();
   *   this.notificationService.error('Application reset due to error');
   * }
   *
   * // Development/debugging
   * resetForTesting() {
   *   const currentState = this.store.getState();
   *   console.log('State before reset:', currentState);
   *
   *   this.store.reset();
   *
   *   const newState = this.store.getState();
   *   console.log('State after reset:', newState);
   *   console.log('History length:', this.store.getStateHistory().length); // Should be 0
   * }
   *
   * // Conditional reset based on version
   * if (this.configService.shouldResetOnVersionChange()) {
   *   this.store.reset();
   *   localStorage.setItem('app-version', this.configService.getCurrentVersion());
   * }
   * ```
   */
  reset(): void {
    const initialState = createInitialState();
    this.state$.next(initialState);
    this.stateHistory.length = 0;
    this.clearSelectorCache();

    this.logger.info('Store reset to initial state');
  }

  /**
   * Root reducer that combines all domain reducers
   */
  private rootReducer(state: AppState, action: StateAction): AppState {
    return {
      ...state,
      projects: projectReducer(state.projects, action as ProjectAction),
      settings: settingsReducer(state.settings, action as SettingsAction),
      notifications: notificationReducer(
        state.notifications,
        action as NotificationAction
      ),
      markMode: markModeReducer(state.markMode, action as MarkModeAction),
      // Add other domain reducers here as they're implemented
      ui: state.ui, // TODO: Implement UI reducer
      system: state.system, // TODO: Implement system reducer
    };
  }

  /**
   * Add state to history for time-travel debugging
   */
  private addToHistory(state: AppState, action: StateAction): void {
    this.stateHistory.unshift({
      state: this.deepCopy(state), // Deep copy for immutability
      action,
      timestamp: new Date(),
    });

    // Maintain history size limit
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.splice(this.maxHistorySize);
    }
  }

  /**
   * Create deep copy of state for history storage
   */
  private deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCopy(item)) as unknown as T;
    }

    const copy: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        copy[key] = this.deepCopy(obj[key]);
      }
    }
    return copy;
  }

  /**
   * Notify all registered listeners of state changes
   */
  private notifyListeners(state: AppState, action: StateAction): void {
    for (const listener of this.listeners) {
      try {
        listener(state, action);
      } catch (error) {
        this.logger.error('Error in state change listener:', error);
      }
    }
  }

  /**
   * Setup logging middleware for debugging
   */
  private setupLogging(): void {
    this.addMiddleware((action, getState) => {
      this.logger.debug(`[ACTION] ${action.type}`, {
        action,
        stateBefore: getState(),
      });
      return action;
    });
  }

  /**
   * Initialize store with default configuration
   */
  private initializeStore(): void {
    this.logger.info('ReactiveStateStore initialized');

    // Setup memory management
    this.setupMemoryManagement();
  }

  /**
   * Setup memory management to prevent leaks
   */
  private setupMemoryManagement(): void {
    // Clear selector cache periodically to prevent memory buildup
    setInterval(() => {
      if (this.selectorCache.size > 100) {
        this.logger.warn('Selector cache growing large, clearing...', {
          cacheSize: this.selectorCache.size,
        });
        this.clearSelectorCache();
      }
    }, 60000); // Check every minute
  }
}

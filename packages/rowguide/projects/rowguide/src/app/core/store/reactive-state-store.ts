/**
 * Enterprise-grade reactive state store with Redux-like patterns.
 *
 * Features:
 * - Immutable state management with time-travel debugging
 * - Memoized selectors for performance optimization
 * - Action dispatching with middleware support
 * - State persistence and restoration
 * - Observable streams for reactive UI updates
 * - Memory-safe state storage with cleanup
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

/**
 * Action interface for all state actions
 */
export interface StateAction {
  readonly type: string;
  readonly payload?: any;
}

/**
 * Selector function type for memoized state access
 */
export type Selector<T> = (state: AppState) => T;

/**
 * Middleware function for action processing
 */
export type Middleware = (
  action: StateAction,
  getState: () => AppState
) => StateAction | null;

/**
 * State change listener function
 */
export type StateChangeListener = (
  state: AppState,
  action: StateAction
) => void;

/**
 * Reactive state store with Redux-like architecture
 */
@Injectable({ providedIn: 'root' })
export class ReactiveStateStore {
  private readonly state$ = new BehaviorSubject<AppState>(createInitialState());
  private readonly actions$ = new BehaviorSubject<StateAction | null>(null);
  private readonly middlewares: Middleware[] = [];
  private readonly listeners: StateChangeListener[] = [];
  private readonly selectorCache = new Map<string, Observable<any>>();

  // State history for time-travel debugging (last 50 states)
  private readonly stateHistory: {
    state: AppState;
    action: StateAction;
    timestamp: Date;
  }[] = [];
  private readonly maxHistorySize = 50;

  constructor(private logger: NGXLogger) {
    this.setupLogging();
    this.initializeStore();
  }

  /**
   * Get current state snapshot
   */
  getState(): AppState {
    return this.state$.value;
  }

  /**
   * Get state observable stream
   */
  getState$(): Observable<AppState> {
    return this.state$.asObservable();
  }

  /**
   * Select a portion of state with memoization
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
   * Dispatch an action to update state
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
   * Add middleware for action processing
   */
  addMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.logger.debug('Middleware added:', middleware.name || 'Anonymous');
  }

  /**
   * Add state change listener
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
   * Get action stream for debugging/monitoring
   */
  getActions$(): Observable<StateAction | null> {
    return this.actions$.asObservable();
  }

  /**
   * Get state history for time-travel debugging
   */
  getStateHistory(): Array<{
    state: AppState;
    action: StateAction;
    timestamp: Date;
  }> {
    return [...this.stateHistory];
  }

  /**
   * Restore state from history (time-travel debugging)
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
   * Clear selector cache (useful for testing)
   */
  clearSelectorCache(): void {
    this.selectorCache.clear();
    this.logger.debug('Selector cache cleared');
  }

  /**
   * Reset store to initial state
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
      notifications: notificationReducer(state.notifications, action as NotificationAction),
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

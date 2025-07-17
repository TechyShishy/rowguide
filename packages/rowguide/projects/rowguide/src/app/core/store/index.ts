/**
 * State Management Module - Centralized Exports
 *
 * Provides centralized access to all state management components for the Rowguide
 * pattern tracking application. Implements Redux-style state management with
 * reactive patterns, immutable state, and comprehensive action/reducer architecture.
 *
 * @example
 * ```typescript
 * // Core store usage
 * import {
 *   ReactiveStateStore,
 *   AppState,
 *   createInitialState,
 *   ProjectActions,
 *   SettingsActions
 * } from './core/store';
 *
 * class PatternService {
 *   constructor(private store: ReactiveStateStore<AppState>) {}
 *
 *   async loadProject(id: number): Promise<void> {
 *     this.store.dispatch(ProjectActions.loadProjectStart({ id }));
 *     try {
 *       const project = await this.api.getProject(id);
 *       this.store.dispatch(ProjectActions.loadProjectSuccess({ project }));
 *     } catch (error) {
 *       this.store.dispatch(ProjectActions.loadProjectFailure({ error }));
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Selector usage
 * import { selectCurrentProject, selectSettings } from './core/store';
 *
 * @Component({
 *   template: `
 *     <app-pattern-view
 *       [project]="currentProject$ | async"
 *       [settings]="settings$ | async">
 *     </app-pattern-view>
 *   `
 * })
 * class PatternComponent {
 *   currentProject$ = this.store.select(selectCurrentProject);
 *   settings$ = this.store.select(selectSettings);
 *
 *   constructor(private store: ReactiveStateStore<AppState>) {}
 * }
 * ```
 *
 * **Module Architecture:**
 *
 * **Core Components:**
 * - **ReactiveStateStore**: Main store implementation with middleware support
 * - **AppState**: Complete state tree interface with domain separation
 * - **createInitialState**: Factory for clean application state initialization
 *
 * **Action Creators:**
 * - **ProjectActions**: Project lifecycle, CRUD operations, and state management
 * - **SettingsActions**: User preference updates and configuration management
 *
 * **Reducers:**
 * - **ProjectReducer**: Handles project state transitions and entity management
 * - **SettingsReducer**: Manages user preference state and validation
 *
 * **Selectors:**
 * - **SettingsSelectors**: Memoized settings access with computed derivatives
 * - Additional selectors available for other state domains
 *
 * **State Management Patterns:**
 * - **Immutable Updates**: All state changes create new state objects
 * - **Action-Reducer Flow**: Predictable state transitions through pure functions
 * - **Selector Optimization**: Memoized state access with reference equality
 * - **Middleware Support**: Extensible action processing pipeline
 * - **Time Travel**: State history for debugging and undo functionality
 *
 * **Performance Features:**
 * - **Lazy Loading**: State slices loaded on demand
 * - **Memory Management**: Automatic cleanup and circular reference prevention
 * - **Observable Optimization**: Efficient change detection and subscription management
 *
 * @see {@link ReactiveStateStore} For store implementation details
 * @see {@link AppState} For complete state tree structure
 * @since 1.0.0
 */

// Core store
export * from './reactive-state-store';
export * from './app-state.interface';

// Actions
export * from './actions/project-actions';
export * from './actions/settings-actions';

// Reducers
export * from './reducers/project-reducer';
export * from './reducers/settings-reducer';

// Selectors
export * from './selectors/settings-selectors';

// Re-export commonly used types
export type { StateAction, Selector, Middleware } from './reactive-state-store';
export type {
  AppState,
  ProjectState,
  UiState,
  SystemState,
  SettingsState,
} from './app-state.interface';
export type { ProjectAction } from './actions/project-actions';
export type { SettingsAction } from './actions/settings-actions';

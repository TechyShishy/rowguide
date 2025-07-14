/**
 * State management module exports
 *
 * Centralized exports for all state management components
 * following Angular and Redux best practices.
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

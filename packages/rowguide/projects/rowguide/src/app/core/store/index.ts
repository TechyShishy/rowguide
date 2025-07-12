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

// Reducers
export * from './reducers/project-reducer';

// Re-export commonly used types
export type { StateAction, Selector, Middleware } from './reactive-state-store';
export type {
  AppState,
  ProjectState,
  UiState,
  SystemState,
} from './app-state.interface';
export type { ProjectAction } from './actions/project-actions';

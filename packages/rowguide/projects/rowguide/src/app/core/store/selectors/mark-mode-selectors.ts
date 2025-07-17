import { AppState } from '../app-state.interface';
import { MarkModeState } from '../reducers/mark-mode-reducer';

/**
 * Mark Mode Selectors
 *
 * Memoized selectors for accessing mark mode state from the ReactiveStateStore.
 * Provides optimized access to current mode, history, and derived state.
 */

/**
 * Select the entire mark mode state
 */
export const selectMarkModeState = (state: AppState): MarkModeState =>
  state.markMode;

/**
 * Select the current active mark mode
 */
export const selectCurrentMarkMode = (state: AppState): number =>
  state.markMode.currentMode;

/**
 * Select the previous mark mode (for undo functionality)
 */
export const selectPreviousMarkMode = (state: AppState): number | undefined =>
  state.markMode.previousMode;

/**
 * Select the mark mode change history
 */
export const selectMarkModeHistory = (state: AppState): number[] =>
  state.markMode.history;

/**
 * Select the timestamp of last mark mode change
 */
export const selectMarkModeLastUpdated = (state: AppState): number =>
  state.markMode.lastUpdated;

/**
 * Select the total number of mark mode changes
 */
export const selectMarkModeChangeCount = (state: AppState): number =>
  state.markMode.changeCount;

/**
 * Select whether mark mode is at default (0)
 */
export const selectIsDefaultMarkMode = (state: AppState): boolean =>
  state.markMode.currentMode === 0;

/**
 * Select whether there is a previous mode available for undo
 */
export const selectCanUndoMarkMode = (state: AppState): boolean =>
  state.markMode.previousMode !== undefined;

/**
 * Select the most recent modes from history (last 3)
 */
export const selectRecentMarkModes = (state: AppState): number[] =>
  state.markMode.history.slice(-3);

/**
 * Select unique mark modes used in history
 */
export const selectUniqueMarkModes = (state: AppState): number[] =>
  [...new Set(state.markMode.history)].sort((a: number, b: number) => a - b);

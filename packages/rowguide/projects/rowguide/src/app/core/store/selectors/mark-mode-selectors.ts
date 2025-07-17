import { AppState } from '../app-state.interface';
import { MarkModeState } from '../reducers/mark-mode-reducer';

/**
 * Mark Mode Selectors - Memoized State Access for Pattern Marking
 *
 * Provides optimized, memoized selectors for accessing mark mode state
 * from the ReactiveStateStore. Enables efficient reactive component updates
 * and computed state derivations for pattern marking functionality.
 *
 * @fileoverview
 * Memoized selectors for accessing mark mode state including current mode,
 * history tracking, undo functionality, and derived state computations.
 * All selectors follow memoization patterns for optimal performance.
 *
 * @example
 * ```typescript
 * // Component usage with reactive selectors
 * import { selectCurrentMarkMode, selectCanUndoMarkMode } from './mark-mode-selectors';
 *
 * @Component({
 *   template: `
 *     <app-mark-mode-controls
 *       [currentMode]="currentMode$ | async"
 *       [canUndo]="canUndo$ | async"
 *       [recentModes]="recentModes$ | async">
 *     </app-mark-mode-controls>
 *   `
 * })
 * class MarkModeComponent {
 *   currentMode$ = this.store.select(selectCurrentMarkMode);
 *   canUndo$ = this.store.select(selectCanUndoMarkMode);
 *   recentModes$ = this.store.select(selectRecentMarkModes);
 *
 *   constructor(private store: ReactiveStateStore<AppState>) {}
 * }
 * ```
 */

/**
 * Select the entire mark mode state slice
 *
 * @param {AppState} state - Application state
 * @returns {MarkModeState} Complete mark mode state object
 *
 * @example
 * ```typescript
 * // Access complete mark mode state
 * const markModeState$ = store.select(selectMarkModeState);
 * ```
 */
export const selectMarkModeState = (state: AppState): MarkModeState =>
  state.markMode;

/**
 * Select the current active mark mode
 *
 * @param {AppState} state - Application state
 * @returns {number} Current mark mode value (0-4)
 *
 * @example
 * ```typescript
 * // Track current mark mode for UI updates
 * const currentMode$ = store.select(selectCurrentMarkMode);
 * currentMode$.subscribe(mode => console.log(`Current mode: ${mode}`));
 * ```
 */
export const selectCurrentMarkMode = (state: AppState): number =>
  state.markMode.currentMode;

/**
 * Select the previous mark mode for undo functionality
 *
 * @param {AppState} state - Application state
 * @returns {number | undefined} Previous mark mode or undefined if none
 *
 * @example
 * ```typescript
 * // Enable undo functionality
 * const previousMode$ = store.select(selectPreviousMarkMode);
 * ```
 */
export const selectPreviousMarkMode = (state: AppState): number | undefined =>
  state.markMode.previousMode;

/**
 * Select the complete mark mode change history
 *
 * @param {AppState} state - Application state
 * @returns {number[]} Array of mark mode history (max 10 entries)
 *
 * @example
 * ```typescript
 * // Access mode change history for analytics
 * const history$ = store.select(selectMarkModeHistory);
 * ```
 */
export const selectMarkModeHistory = (state: AppState): number[] =>
  state.markMode.history;

/**
 * Select the timestamp of last mark mode change
 *
 * @param {AppState} state - Application state
 * @returns {number} Timestamp of last mode change
 *
 * @example
 * ```typescript
 * // Track when mode was last changed
 * const lastUpdated$ = store.select(selectMarkModeLastUpdated);
 * ```
 */
export const selectMarkModeLastUpdated = (state: AppState): number =>
  state.markMode.lastUpdated;

/**
 * Select the total number of mark mode changes
 *
 * @param {AppState} state - Application state
 * @returns {number} Total count of mode changes
 *
 * @example
 * ```typescript
 * // Track user interaction patterns
 * const changeCount$ = store.select(selectMarkModeChangeCount);
 * ```
 */
export const selectMarkModeChangeCount = (state: AppState): number =>
  state.markMode.changeCount;

/**
 * Select whether mark mode is at default state (0)
 *
 * @param {AppState} state - Application state
 * @returns {boolean} True if mark mode is at default (0)
 *
 * @example
 * ```typescript
 * // Check if in default marking mode
 * const isDefault$ = store.select(selectIsDefaultMarkMode);
 * ```
 */
export const selectIsDefaultMarkMode = (state: AppState): boolean =>
  state.markMode.currentMode === 0;

/**
 * Select whether there is a previous mode available for undo
 *
 * @param {AppState} state - Application state
 * @returns {boolean} True if undo is available
 *
 * @example
 * ```typescript
 * // Enable/disable undo button based on availability
 * const canUndo$ = store.select(selectCanUndoMarkMode);
 * ```
 */
export const selectCanUndoMarkMode = (state: AppState): boolean =>
  state.markMode.previousMode !== undefined;

/**
 * Select the most recent modes from history (last 3)
 *
 * @param {AppState} state - Application state
 * @returns {number[]} Array of recent mark modes (max 3)
 *
 * @example
 * ```typescript
 * // Show recent modes in UI for quick selection
 * const recentModes$ = store.select(selectRecentMarkModes);
 * ```
 */
export const selectRecentMarkModes = (state: AppState): number[] =>
  state.markMode.history.slice(-3);

/**
 * Select unique mark modes used in history
 *
 * @param {AppState} state - Application state
 * @returns {number[]} Sorted array of unique mark modes
 *
 * @example
 * ```typescript
 * // Display available mark modes for selection
 * const uniqueModes$ = store.select(selectUniqueMarkModes);
 * ```
 */
export const selectUniqueMarkModes = (state: AppState): number[] =>
  [...new Set(state.markMode.history)].sort((a: number, b: number) => a - b);

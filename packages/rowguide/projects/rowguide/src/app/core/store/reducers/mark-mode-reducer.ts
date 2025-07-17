import { StateAction } from '../reactive-state-store';
import {
  SET_MARK_MODE,
  UPDATE_MARK_MODE,
  RESET_MARK_MODE,
  SetMarkModePayload,
  UpdateMarkModePayload,
  ResetMarkModePayload,
} from '../actions/mark-mode-actions';

/**
 * Mark Mode Reducer - State Transitions for Pattern Marking
 *
 * Manages mark mode state in the ReactiveStateStore with comprehensive
 * state transitions for pattern marking behavior, history tracking,
 * and undo functionality. Handles all mark mode changes with immutable
 * updates following Redux patterns.
 *
 * @fileoverview
 * This reducer handles the visual highlighting and marking behavior for
 * beading pattern navigation and step tracking. It maintains a history
 * of mode changes for undo functionality and tracks user interaction
 * patterns for analytics.
 *
 * @example
 * ```typescript
 * // Basic reducer usage
 * import { markModeReducer } from './mark-mode-reducer';
 *
 * // State transitions
 * const newState = markModeReducer(currentState, action);
 *
 * // Action handling examples
 * const setModeState = markModeReducer(state, {
 *   type: SET_MARK_MODE,
 *   payload: { mode: 2, timestamp: Date.now() }
 * });
 *
 * const updateModeState = markModeReducer(state, {
 *   type: UPDATE_MARK_MODE,
 *   payload: { mode: 3, previousMode: 1 }
 * });
 *
 * const resetState = markModeReducer(state, {
 *   type: RESET_MARK_MODE,
 *   payload: { timestamp: Date.now() }
 * });
 * ```
 */

/**
 * Mark Mode State Interface
 *
 * Defines the complete structure of mark mode state with comprehensive
 * tracking for user interactions, mode history, and analytics data.
 *
 * @example
 * ```typescript
 * // State structure example
 * const exampleState: MarkModeState = {
 *   currentMode: 2,           // Current row highlighting mode
 *   previousMode: 1,          // Previous step highlighting mode
 *   history: [0, 1, 2],      // Mode change history
 *   lastUpdated: 1642608000, // Timestamp of last change
 *   changeCount: 15          // Total number of mode changes
 * };
 * ```
 */
export interface MarkModeState {
  /** Current active mark mode (0-4, see MarkModeActions for values) */
  currentMode: number;
  /** Previous mark mode for undo functionality */
  previousMode?: number;
  /** History of mark mode changes (limited to last 10) */
  history: number[];
  /** Timestamp of last mode change */
  lastUpdated: number;
  /** Total number of mode changes */
  changeCount: number;
}

/**
 * Default Mark Mode State
 *
 * Provides the initial state for mark mode management with safe defaults.
 * Used for store initialization and state resets.
 *
 * @example
 * ```typescript
 * // Usage in store initialization
 * const store = new ReactiveStateStore({
 *   markMode: initialMarkModeState,
 *   // ... other state slices
 * });
 * ```
 */
export const initialMarkModeState: MarkModeState = {
  currentMode: 0,
  previousMode: undefined,
  history: [],
  lastUpdated: Date.now(),
  changeCount: 0,
};

/**
 * Mark Mode Reducer Function
 *
 * Pure function that handles all mark mode state transitions with immutable
 * updates. Manages mode changes, history tracking, and provides undo functionality
 * for user interaction patterns.
 *
 * @param {MarkModeState} state - Current mark mode state (defaults to initial state)
 * @param {StateAction} action - Action object with type and payload
 * @returns {MarkModeState} New immutable state after applying action
 *
 * @example
 * ```typescript
 * // Reducer usage examples
 * const newState = markModeReducer(currentState, action);
 *
 * // Handle mode setting
 * const setAction = { type: SET_MARK_MODE, payload: { mode: 2 } };
 * const stateAfterSet = markModeReducer(state, setAction);
 *
 * // Handle mode update with history
 * const updateAction = {
 *   type: UPDATE_MARK_MODE,
 *   payload: { mode: 3, previousMode: 1 }
 * };
 * const stateAfterUpdate = markModeReducer(state, updateAction);
 * ```
 */
export function markModeReducer(
  state: MarkModeState = initialMarkModeState,
  action: StateAction
): MarkModeState {
  switch (action.type) {
    case SET_MARK_MODE: {
      const payload = action.payload as SetMarkModePayload;

      /**
       * Set Mark Mode Handler
       *
       * Sets a specific mark mode value with automatic history tracking
       * and timestamp generation. Preserves previous mode for undo functionality.
       */
      return {
        ...state,
        currentMode: payload.mode,
        previousMode: state.currentMode,
        history: addToHistory(state.history, payload.mode),
        lastUpdated: payload.timestamp || Date.now(),
        changeCount: state.changeCount + 1,
      };
    }

    case UPDATE_MARK_MODE: {
      const payload = action.payload as UpdateMarkModePayload;

      /**
       * Update Mark Mode Handler
       *
       * Updates mark mode with explicit previous mode tracking.
       * Allows for complex mode transitions with custom history management.
       */
      return {
        ...state,
        currentMode: payload.mode,
        previousMode: payload.previousMode ?? state.currentMode,
        history: addToHistory(state.history, payload.mode),
        lastUpdated: payload.timestamp || Date.now(),
        changeCount: state.changeCount + 1,
      };
    }

    case RESET_MARK_MODE: {
      const payload = action.payload as ResetMarkModePayload;

      /**
       * Reset Mark Mode Handler
       *
       * Resets mark mode to default (0) while preserving history
       * and maintaining change tracking for analytics.
       */
      return {
        ...state,
        currentMode: 0,
        previousMode: state.currentMode,
        history: addToHistory(state.history, 0),
        lastUpdated: payload.timestamp || Date.now(),
        changeCount: state.changeCount + 1,
      };
    }

    default:
      return state;
  }
}

/**
 * History Management Utility
 *
 * Helper function to add mode to history with size limit.
 * Maintains a history of the last 10 mode changes to prevent
 * memory bloat while preserving undo functionality.
 *
 * @param {number[]} history - Current history array
 * @param {number} mode - New mode to add to history
 * @returns {number[]} Updated history array (max 10 entries)
 *
 * @example
 * ```typescript
 * // Add mode to history
 * const newHistory = addToHistory([0, 1, 2], 3);
 * // Result: [0, 1, 2, 3]
 *
 * // History size limit enforcement
 * const longHistory = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const limitedHistory = addToHistory(longHistory, 11);
 * // Result: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] (first entry removed)
 * ```
 */
function addToHistory(history: number[], mode: number): number[] {
  const newHistory = [...history, mode];

  // Keep only the last 10 entries to prevent memory bloat
  if (newHistory.length > 10) {
    return newHistory.slice(-10);
  }

  return newHistory;
}

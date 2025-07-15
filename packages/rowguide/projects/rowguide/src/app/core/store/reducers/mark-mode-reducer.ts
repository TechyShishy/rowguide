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
 * @fileoverview Mark Mode Reducer
 * 
 * Manages mark mode state in the ReactiveStateStore.
 * Handles setting, updating, and resetting mark mode with history tracking.
 */

/**
 * Mark Mode State Interface
 * Defines the structure of mark mode state
 */
export interface MarkModeState {
  /** Current active mark mode */
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
 * Default/initial mark mode state
 */
export const initialMarkModeState: MarkModeState = {
  currentMode: 0,
  previousMode: undefined,
  history: [],
  lastUpdated: Date.now(),
  changeCount: 0,
};

/**
 * Mark Mode Reducer
 * Handles all mark mode state transitions with immutable updates
 */
export function markModeReducer(
  state: MarkModeState = initialMarkModeState,
  action: StateAction
): MarkModeState {
  switch (action.type) {
    case SET_MARK_MODE: {
      const payload = action.payload as SetMarkModePayload;
      
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
 * Helper function to add mode to history with size limit
 * Maintains a history of the last 10 mode changes
 */
function addToHistory(history: number[], mode: number): number[] {
  const newHistory = [...history, mode];
  
  // Keep only the last 10 entries to prevent memory bloat
  if (newHistory.length > 10) {
    return newHistory.slice(-10);
  }
  
  return newHistory;
}

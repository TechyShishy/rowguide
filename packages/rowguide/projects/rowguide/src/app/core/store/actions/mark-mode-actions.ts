import { StateAction } from '../reactive-state-store';

/**
 * @fileoverview Mark Mode Actions
 * 
 * Actions for managing mark mode state in the ReactiveStateStore.
 * Mark mode represents the current marking/highlighting mode for beading patterns.
 */

// Action type constants
export const SET_MARK_MODE = '[MarkMode] Set Mark Mode';
export const UPDATE_MARK_MODE = '[MarkMode] Update Mark Mode';
export const RESET_MARK_MODE = '[MarkMode] Reset Mark Mode';

// Action payload interfaces
export interface SetMarkModePayload {
  mode: number;
  timestamp?: number;
}

export interface UpdateMarkModePayload {
  mode: number;
  previousMode?: number;
  timestamp?: number;
}

export interface ResetMarkModePayload {
  timestamp?: number;
}

// Action interfaces for type safety
export interface SetMarkModeAction extends StateAction {
  type: typeof SET_MARK_MODE;
  payload: SetMarkModePayload;
}

export interface UpdateMarkModeAction extends StateAction {
  type: typeof UPDATE_MARK_MODE;
  payload: UpdateMarkModePayload;
}

export interface ResetMarkModeAction extends StateAction {
  type: typeof RESET_MARK_MODE;
  payload: ResetMarkModePayload;
}

/**
 * Union type for all mark mode actions
 */
export type MarkModeAction = 
  | SetMarkModeAction
  | UpdateMarkModeAction
  | ResetMarkModeAction;

/**
 * Mark Mode Actions
 * Provides action creators for mark mode state management
 */
export class MarkModeActions {
  /**
   * Set the current mark mode
   * @param mode The mark mode number to set
   * @returns Action to set mark mode
   */
  static setMarkMode(mode: number): StateAction {
    return {
      type: SET_MARK_MODE,
      payload: {
        mode,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Update the current mark mode (tracks previous mode)
   * @param mode The new mark mode number
   * @param previousMode The previous mark mode (optional)
   * @returns Action to update mark mode
   */
  static updateMarkMode(mode: number, previousMode?: number): StateAction {
    return {
      type: UPDATE_MARK_MODE,
      payload: {
        mode,
        previousMode,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Reset mark mode to default (0)
   * @returns Action to reset mark mode
   */
  static resetMarkMode(): StateAction {
    return {
      type: RESET_MARK_MODE,
      payload: {
        timestamp: Date.now(),
      },
    };
  }
}

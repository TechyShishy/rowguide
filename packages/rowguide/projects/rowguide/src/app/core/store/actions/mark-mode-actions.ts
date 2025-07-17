/**
 * Mark Mode Actions for ReactiveStateStore
 *
 * This module defines all actions related to mark mode state management in the Redux-style
 * state store. Mark mode controls the visual highlighting and marking behavior for beading
 * pattern navigation and step tracking.
 *
 * ## Action Categories
 *
 * - **Direct Actions**: SET_MARK_MODE for setting specific mark mode values
 * - **Transition Actions**: UPDATE_MARK_MODE for tracking mode changes with history
 * - **Reset Actions**: RESET_MARK_MODE for returning to default marking behavior
 *
 * ## Mark Mode Values
 *
 * - `0`: No marking (default mode)
 * - `1`: Current step highlighting
 * - `2`: Current row highlighting
 * - `3`: Pattern section highlighting
 * - `4`: Custom marking mode
 *
 * ## State Management
 *
 * Mark mode actions include automatic timestamp generation for tracking
 * user interaction patterns and providing undo/redo functionality.
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Set specific mark mode
 * store.dispatch(MarkModeActions.setMarkMode(2));
 *
 * // Update mark mode with history tracking
 * store.dispatch(MarkModeActions.updateMarkMode(3, 1));
 *
 * // Reset to default mode
 * store.dispatch(MarkModeActions.resetMarkMode());
 * ```
 *
 * @module MarkModeActions
 * @since 2.0.0
 */

import { StateAction } from '../reactive-state-store';

/**
 * Mark Mode action type constants
 *
 * String constants for Redux action types following the pattern:
 * '[Domain] Action Description'
 */

/** Set mark mode to specific value */
export const SET_MARK_MODE = '[MarkMode] Set Mark Mode';
/** Update mark mode with history tracking */
export const UPDATE_MARK_MODE = '[MarkMode] Update Mark Mode';
/** Reset mark mode to default value */
export const RESET_MARK_MODE = '[MarkMode] Reset Mark Mode';

/**
 * Mark Mode action payload interfaces
 *
 * Type-safe payload structures for mark mode operations.
 * All payloads include automatic timestamp generation.
 */

/**
 * Payload for setting mark mode to specific value
 *
 * @interface SetMarkModePayload
 */
export interface SetMarkModePayload {
  /** The mark mode value to set (0-4) */
  mode: number;
  /** Timestamp when action was created (auto-generated) */
  timestamp?: number;
}

/**
 * Payload for updating mark mode with history tracking
 *
 * @interface UpdateMarkModePayload
 */
export interface UpdateMarkModePayload {
  /** The new mark mode value (0-4) */
  mode: number;
  /** The previous mark mode value for undo functionality */
  previousMode?: number;
  /** Timestamp when action was created (auto-generated) */
  timestamp?: number;
}

/**
 * Payload for resetting mark mode to default
 *
 * @interface ResetMarkModePayload
 */
export interface ResetMarkModePayload {
  /** Timestamp when action was created (auto-generated) */
  timestamp?: number;
}

/**
 * Mark Mode action interfaces
 *
 * Type-safe action interfaces for all mark mode operations.
 * Each action extends StateAction and includes strongly-typed payload.
 */

/**
 * Action to set mark mode to specific value
 *
 * Used for direct mark mode setting without history tracking.
 * Typically used for initial mode setting or programmatic changes.
 *
 * @interface SetMarkModeAction
 * @extends StateAction
 */
export interface SetMarkModeAction extends StateAction {
  type: typeof SET_MARK_MODE;
  payload: SetMarkModePayload;
}

/**
 * Action to update mark mode with history tracking
 *
 * Used for user-initiated mark mode changes that should be tracked
 * for undo/redo functionality.
 *
 * @interface UpdateMarkModeAction
 * @extends StateAction
 */
export interface UpdateMarkModeAction extends StateAction {
  type: typeof UPDATE_MARK_MODE;
  payload: UpdateMarkModePayload;
}

/**
 * Action to reset mark mode to default value
 *
 * Used for resetting mark mode to default state (0).
 * Typically used for clearing all marking or error recovery.
 *
 * @interface ResetMarkModeAction
 * @extends StateAction
 */
export interface ResetMarkModeAction extends StateAction {
  type: typeof RESET_MARK_MODE;
  payload: ResetMarkModePayload;
}

/**
 * Union type for all mark mode actions
 *
 * Type-safe union for Redux reducer and middleware processing.
 * Ensures exhaustive handling of all mark mode actions.
 *
 * @type {MarkModeAction}
 */
export type MarkModeAction =
  | SetMarkModeAction
  | UpdateMarkModeAction
  | ResetMarkModeAction;

/**
 * Mark Mode Actions
 *
 * Factory class providing static methods for creating type-safe mark mode actions.
 * All methods include automatic timestamp generation and type safety.
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Set mark mode directly
 * const action = MarkModeActions.setMarkMode(2);
 * store.dispatch(action);
 *
 * // Update mark mode with history
 * const action = MarkModeActions.updateMarkMode(3, 1);
 * store.dispatch(action);
 *
 * // Reset to default mode
 * const action = MarkModeActions.resetMarkMode();
 * store.dispatch(action);
 * ```
 *
 * @class MarkModeActions
 */
export class MarkModeActions {
  /**
   * Set the current mark mode to specific value
   *
   * Creates action to set mark mode without history tracking.
   * Automatically generates timestamp for action tracking.
   *
   * @param {number} mode - The mark mode number to set (0-4)
   * @returns {StateAction} Action to set mark mode
   *
   * @example
   * ```typescript
   * // Set to step highlighting mode
   * const action = MarkModeActions.setMarkMode(1);
   * store.dispatch(action);
   *
   * // Set to row highlighting mode
   * const action = MarkModeActions.setMarkMode(2);
   * store.dispatch(action);
   *
   * // Set to no marking mode
   * const action = MarkModeActions.setMarkMode(0);
   * store.dispatch(action);
   * ```
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
   * Update the current mark mode with history tracking
   *
   * Creates action to update mark mode while tracking the previous mode
   * for undo/redo functionality. Automatically generates timestamp.
   *
   * @param {number} mode - The new mark mode number (0-4)
   * @param {number} [previousMode] - The previous mark mode for undo functionality
   * @returns {StateAction} Action to update mark mode
   *
   * @example
   * ```typescript
   * // Update from step highlighting (1) to row highlighting (2)
   * const action = MarkModeActions.updateMarkMode(2, 1);
   * store.dispatch(action);
   *
   * // Update without previous mode tracking
   * const action = MarkModeActions.updateMarkMode(3);
   * store.dispatch(action);
   * ```
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
   * Reset mark mode to default value (0)
   *
   * Creates action to reset mark mode to default state.
   * Automatically generates timestamp for action tracking.
   *
   * @returns {StateAction} Action to reset mark mode
   *
   * @example
   * ```typescript
   * // Reset to default mode (no marking)
   * const action = MarkModeActions.resetMarkMode();
   * store.dispatch(action);
   * ```
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

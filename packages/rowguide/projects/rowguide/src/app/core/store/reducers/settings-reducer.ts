/**
 * Settings Reducer - Configuration State Management
 *
 * Handles all settings-related state changes with immutable updates
 * following Redux patterns for predictable state management. Manages
 * user preferences, feature flags, and application configuration.
 *
 * @fileoverview
 * This reducer provides comprehensive settings management including
 * loading from persistence, updating individual settings, bulk updates,
 * and reset functionality. All state transitions maintain immutability
 * and include proper error handling.
 *
 * @example
 * ```typescript
 * // Basic reducer usage
 * import { settingsReducer } from './settings-reducer';
 *
 * // State transitions
 * const newState = settingsReducer(currentState, action);
 *
 * // Settings management examples
 * const setSettingsState = settingsReducer(state, {
 *   type: SettingsActionTypes.SET_SETTINGS,
 *   payload: { settings: { zoom: true, combine12: false } }
 * });
 *
 * const updateSettingState = settingsReducer(state, {
 *   type: SettingsActionTypes.UPDATE_SETTING,
 *   payload: { key: 'zoom', value: true }
 * });
 *
 * const resetState = settingsReducer(state, {
 *   type: SettingsActionTypes.RESET_SETTINGS,
 *   payload: {}
 * });
 * ```
 */

import { SettingsState } from '../app-state.interface';
import { SettingsAction, SettingsActionTypes } from '../actions/settings-actions';

/**
 * Initial Settings State
 *
 * Defines the default configuration state matching SettingsService defaults.
 * Used for store initialization and settings reset operations.
 *
 * @example
 * ```typescript
 * // State structure
 * const initialState = {
 *   combine12: false,        // Combine first and second rows
 *   lrdesignators: false,    // Show left/right designators
 *   flammarkers: false,      // Show FLAM markers
 *   ppinspector: false,      // Pattern inspector enabled
 *   zoom: false,             // Zoom functionality enabled
 *   scrolloffset: -1,        // Scroll offset (pixels)
 *   multiadvance: 3,         // Multi-step advance count
 *   flamsort: 'keyAsc',      // FLAM sorting method
 *   projectsort: 'dateAsc',  // Project sorting method
 *   ready: false             // Settings loaded and ready
 * };
 * ```
 */
const initialSettingsState: SettingsState = {
  combine12: false,
  lrdesignators: false,
  flammarkers: false,
  ppinspector: false,
  zoom: false,
  scrolloffset: -1,
  multiadvance: 3,
  flamsort: 'keyAsc',
  projectsort: 'dateAsc',
  ready: false,
};

/**
 * Settings Reducer Function
 *
 * Pure function that handles all settings-related state transitions.
 * Implements immutable updates following Redux patterns with comprehensive
 * action handling for configuration management.
 *
 * @param {SettingsState} state - Current settings state (defaults to initial state)
 * @param {SettingsAction} action - Action object with type and payload
 * @returns {SettingsState} New immutable state after applying action
 *
 * @example
 * ```typescript
 * // Reducer usage examples
 * const newState = settingsReducer(currentState, action);
 *
 * // Handle settings loading
 * const loadedState = settingsReducer(state, {
 *   type: SettingsActionTypes.LOAD_SETTINGS_SUCCESS,
 *   payload: { settings: loadedSettings }
 * });
 *
 * // Handle individual setting update
 * const updatedState = settingsReducer(state, {
 *   type: SettingsActionTypes.UPDATE_SETTING,
 *   payload: { key: 'zoom', value: true }
 * });
 * ```
 */
export function settingsReducer(
  state: SettingsState = initialSettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case SettingsActionTypes.SET_SETTINGS:
      /**
       * Set Settings Handler
       *
       * Bulk update settings with provided values and mark as ready.
       * Used for initial settings loading and complete configuration updates.
       */
      return {
        ...state,
        ...action.payload.settings,
        ready: true,
      };

    case SettingsActionTypes.UPDATE_SETTING:
      /**
       * Update Setting Handler
       *
       * Updates a single setting property with type-safe key-value updates.
       * Maintains existing state while updating only the specified property.
       */
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };

    case SettingsActionTypes.LOAD_SETTINGS_SUCCESS:
      /**
       * Load Settings Success Handler
       *
       * Applies loaded settings from persistence and marks as ready.
       * Merges loaded settings with current state for partial updates.
       */
      return {
        ...state,
        ...action.payload.settings,
        ready: true,
      };

    case SettingsActionTypes.LOAD_SETTINGS_FAILURE:
      /**
       * Load Settings Failure Handler
       *
       * On failure, maintain current state but ensure ready is false.
       * Prevents application from proceeding with potentially invalid settings.
       */
      // On failure, maintain current state but ensure ready is false
      return {
        ...state,
        ready: false,
      };

    case SettingsActionTypes.RESET_SETTINGS:
      /**
       * Reset Settings Handler
       *
       * Resets all settings to their default values while maintaining
       * ready state to indicate settings are available.
       */
      return {
        ...initialSettingsState,
        ready: true,
      };

    case SettingsActionTypes.SET_SETTINGS_READY:
      /**
       * Set Settings Ready Handler
       *
       * Updates the ready flag to indicate settings loading completion.
       * Used for application initialization and settings availability tracking.
       */
      return {
        ...state,
        ready: action.payload.ready,
      };

    default:
      return state;
  }
}

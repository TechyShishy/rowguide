/**
 * Settings reducer for ReactiveStateStore
 *
 * Handles all settings-related state changes with immutable updates
 * following Redux patterns for predictable state management.
 */

import { SettingsState } from '../app-state.interface';
import { SettingsAction, SettingsActionTypes } from '../actions/settings-actions';

/**
 * Initial settings state matching SettingsService defaults
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
 * Settings reducer function
 */
export function settingsReducer(
  state: SettingsState = initialSettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case SettingsActionTypes.SET_SETTINGS:
      return {
        ...state,
        ...action.payload.settings,
        ready: true,
      };

    case SettingsActionTypes.UPDATE_SETTING:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };

    case SettingsActionTypes.LOAD_SETTINGS_SUCCESS:
      return {
        ...state,
        ...action.payload.settings,
        ready: true,
      };

    case SettingsActionTypes.LOAD_SETTINGS_FAILURE:
      // On failure, maintain current state but ensure ready is false
      return {
        ...state,
        ready: false,
      };

    case SettingsActionTypes.RESET_SETTINGS:
      return {
        ...initialSettingsState,
        ready: true,
      };

    case SettingsActionTypes.SET_SETTINGS_READY:
      return {
        ...state,
        ready: action.payload.ready,
      };

    default:
      return state;
  }
}
